package com.fafoguesser.app.ui

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.fafoguesser.app.BuildConfig
import com.fafoguesser.app.net.GameClient
import com.fafoguesser.app.net.Intermission
import com.fafoguesser.app.net.MatchSnapshot
import com.fafoguesser.app.net.PlayerPublic
import com.fafoguesser.app.net.RoundReveal
import com.fafoguesser.app.net.RoundStart
import com.maptiler.maptilersdk.map.MTMapViewController
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID
import kotlin.math.abs

    enum class Screen { LANDING, GAME }

data class Guess(val lat: Double, val lng: Double)

private val ERROR_TEXT = mapOf(
    "not_authed" to "Sign in first",
    "rate_limited" to "Too many attempts — slow down",
    "in_match" to "You're already in a match",
    "room_not_found" to "Room not found — check the code",
    "room_started" to "Room already started",
    "room_full" to "Room is full",
    "already_in_room" to "You're already in that room",
    "already_online" to "That nickname is already online",
    "session_mismatch" to "That account is mid-reconnect — try again in a moment",
    "invalid_nickname" to "Letters, numbers and underscores · 2–16 chars",
    "invalid_code" to "Invalid room code",
    "invalid_guess" to "Invalid guess coordinates",
    "not_in_match" to "You're not in a match",
    "round_closed" to "Round is closed",
    "wrong_round" to "Round mismatch — reconnect",
    "already_guessed" to "Guess already locked in",
    "time_expired" to "Time expired",
    "not_host" to "Only the host can start",
    "already_started" to "Match already started",
    "room_join_failed" to "Couldn't join room",
    "room_start_failed" to "Couldn't start room",
    "guess_failed" to "Couldn't submit guess",
)

class GameViewModel(application: Application) : AndroidViewModel(application) {

    private val client = GameClient(BuildConfig.SERVER_URL)
    private var removeListener: () -> Unit = {}

    // Stable per-device credential, minted once and persisted. Sent with every
    // auth so the server can verify a rejoin belongs to this app install.
    private val sessionId: String by lazy {
        val prefs = getApplication<Application>()
            .getSharedPreferences("fafo", android.content.Context.MODE_PRIVATE)
        prefs.getString("session", null)
            ?: UUID.randomUUID().toString().also {
                prefs.edit().putString("session", it).apply()
            }
    }

    var screen by mutableStateOf(Screen.LANDING)
        private set
    var nickname by mutableStateOf("")
        private set
    var busy by mutableStateOf<String?>(null)
        private set
    var error by mutableStateOf<String?>(null)
        private set

    var snapshot by mutableStateOf<MatchSnapshot?>(null)
        private set
    var panorama by mutableStateOf<String?>(null)
        private set
    var round by mutableStateOf(0)
        private set
    var roundEndsAt by mutableStateOf<Long?>(null)
        private set
    var guess by mutableStateOf<Guess?>(null)
        private set
    var submitted by mutableStateOf(false)
        private set
    var reveal by mutableStateOf<RoundReveal?>(null)
        private set
    var players by mutableStateOf<List<PlayerPublic>>(emptyList())
        private set
    // Whether the user panned the map off the round's world-view start point;
    // only then does an unsubmitted round auto-submit the crosshair position.
    private var mapMovedThisRound = false
    var intermission by mutableStateOf<Intermission?>(null)
        private set
    var host by mutableStateOf<String?>(null)
        private set
    var matchNumber by mutableStateOf(1)
        private set
    var now by mutableStateOf(0L)
        private set

    private var ticker: Job? = null

    init {
        removeListener = client.addListener(object : GameClient.Listener {
            override fun onAuthOk(nickname: String) {
                this@GameViewModel.nickname = nickname
                busy = null
                error = null
                screen = Screen.LANDING
                val act = pendingAction
                pendingAction = null
                act?.invoke()
            }

            override fun onAuthError(message: String) {
                pendingAction = null
                busy = null
                error = message
            }

            override fun onSnapshot(s: MatchSnapshot) {
                snapshot = s
                matchNumber = s.matchNumber
                host = s.host
                round = s.round
                roundEndsAt = s.roundEndsAt
                panorama = s.panorama
                players = s.players
                intermission = null
                reveal = null
                guess = null
                submitted = false
                mapMovedThisRound = false
                busy = null
                error = null
                screen = Screen.GAME
                startTicker()
            }

            override fun onRoundStart(r: RoundStart) {
                round = r.round
                roundEndsAt = r.roundEndsAt
                panorama = r.key
                reveal = null
                guess = null
                submitted = false
                mapMovedThisRound = false
                // The next match auto-starts right after intermission; the
                // overlay must not linger over the new match.
                intermission = null
            }

            override fun onRoundReveal(r: RoundReveal) {
                reveal = r
            }

            override fun onIntermission(i: Intermission) {
                intermission = i
                roundEndsAt = null
            }

            override fun onPlayers(players: List<PlayerPublic>) {
                this@GameViewModel.players = players
            }

            override fun onHost(host: String?) {
                this@GameViewModel.host = host
            }

            override fun onReconnected() {
                // Socket reconnected (possibly to a fresh server session):
                // re-auth to recover, mirroring the web client.
                if (screen != Screen.GAME && nickname.isNotEmpty()) {
                    client.auth(nickname, sessionId)
                }
            }

            override fun onMatchLeft() {
                snapshot = null
                intermission = null
                reveal = null
                panorama = null
                stopTicker()
                screen = Screen.LANDING
            }

            override fun onError(code: String) {
                busy = null
                error = ERROR_TEXT[code] ?: code
            }

            override fun onConnectError(message: String) {
                busy = null
                error = message
            }
        })
    }

    private fun startTicker() {
        if (ticker != null) return
        ticker = viewModelScope.launch {
            while (true) {
                now = client.serverNow()
                // The map resets to the world view (0,20) at round start; any
                // other center means the user panned the crosshair into place.
                // Only then is a pin "dropped" (web parity: no draft, no guess).
                val center = mapController?.getCenter()
                if (center != null && (abs(center.lng - 0.0) > 0.001 || abs(center.lat - 20.0) > 0.001)) {
                    mapMovedThisRound = true
                }
                // If the round is about to end and the user positioned a pin
                // but never pressed PLACE GUESS, auto-submit their last
                // position — a dropped pin must never silently score 0.
                val rem = remainingMs
                if (!submitted && mapMovedThisRound && rem in 1..1500) placeGuessAtCenter()
                delay(100)
            }
        }
    }

    private fun stopTicker() {
        ticker?.cancel()
        ticker = null
    }

    fun submitNickname(name: String) {
        busy = "connect"
        client.connect { client.auth(name, sessionId) }
    }

    // Play buttons auth with the typed name, then fire the queued action —
    // no separate ENTER step, no second page (mirrors the web client).
    private var pendingAction: (() -> Unit)? = null

    private fun ensureAuth(name: String, action: () -> Unit) {
        val n = name.trim()
        if (nickname.isNotEmpty() && nickname == n) {
            action()
            return
        }
        pendingAction = action
        if (nickname.isNotEmpty()) {
            // Name changed: the server ignores re-auth on an authed socket,
            // so leave + reconnect as the new name.
            client.leave()
            client.disconnect()
        }
        submitNickname(n)
    }

    fun quickPlay(name: String) {
        ensureAuth(name) {
            busy = "quick"
            resetRound()
            client.quickPlay()
        }
    }

    fun createRoom(name: String) {
        ensureAuth(name) {
            busy = "create"
            resetRound()
            client.createRoom()
        }
    }

    fun joinRoom(code: String, name: String) {
        ensureAuth(name) {
            busy = "join"
            resetRound()
            client.joinRoom(code)
        }
    }

    fun startRoom() {
        val code = snapshot?.roomCode ?: return
        client.startRoom(code)
    }

    fun leave() {
        client.leave()
    }

    fun updateGuess(g: Guess) {
        guess = g
    }

    private var mapController: MTMapViewController? = null

    fun setMapController(c: MTMapViewController?) {
        mapController = c
    }

    /** Reads the map center under the crosshair and submits it as the guess. */
    fun placeGuessAtCenter() {
        if (!canPick) return
        viewModelScope.launch {
            val center = mapController?.getCenter() ?: return@launch
            updateGuess(Guess(center.lng, center.lat))
            submit()
        }
    }

    fun submit() {
        val g = guess ?: return
        val s = snapshot ?: return
        if (s.phase != "playing") return
        client.submitGuess(round, g.lat, g.lng)
        submitted = true
    }

    private fun resetRound() {
        panorama = null
        reveal = null
        guess = null
        submitted = false
        roundEndsAt = null
    }

    val canPick: Boolean
        get() {
            val s = snapshot ?: return false
            val endsAt = roundEndsAt ?: return false
            return s.phase == "playing" && endsAt > now && !submitted && panorama != null
        }

    val remainingMs: Long
        get() = (roundEndsAt ?: 0L) - now

    override fun onCleared() {
        stopTicker()
        removeListener()
        client.disconnect()
        super.onCleared()
    }
}
