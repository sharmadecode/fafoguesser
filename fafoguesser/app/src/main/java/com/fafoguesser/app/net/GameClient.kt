package com.fafoguesser.app.net

import io.socket.client.IO
import io.socket.client.Socket
import io.socket.emitter.Emitter
import org.json.JSONObject
import java.net.URI
import java.util.concurrent.CopyOnWriteArrayList

/** Mirrors web/src/net.ts: one socket + NTP-style clock offset so all timers
 *  use server time identically across platforms. */
class GameClient(private val url: String) {

    interface Listener {
        fun onAuthOk(nickname: String) {}
        fun onAuthError(message: String) {}
        fun onSnapshot(s: MatchSnapshot) {}
        fun onRoundStart(r: RoundStart) {}
        fun onRoundReveal(r: RoundReveal) {}
        fun onIntermission(i: Intermission) {}
        fun onPlayers(players: List<PlayerPublic>) {}
        fun onHost(host: String?) {}
        fun onReconnected() {}
        fun onMatchLeft() {}
        fun onError(code: String) {}
        fun onConnectError(message: String) {}
    }

    private var socket: Socket? = null
    @Volatile private var offset = 0L
    private val listeners = CopyOnWriteArrayList<Listener>()
    private var pendingOnConnected: (() -> Unit)? = null

    fun addListener(l: Listener): () -> Unit {
        listeners.add(l)
        return { listeners.remove(l) }
    }

    /** Opens the socket (or reuses the existing one) and calls onConnected
     *  once the socket is actually connected — emits sent before that would
     *  be dropped by socket.io-java. */
    fun connect(onConnected: () -> Unit = {}) {
        val existing = socket
        if (existing?.connected() == true) {
            onConnected()
            return
        }
        pendingOnConnected = onConnected
        if (existing != null) return // still connecting; fires on EVENT_CONNECT
        val s = IO.socket(
            URI.create(url),
            IO.Options().apply {
                transports = arrayOf("websocket")
                reconnection = true
                // Default is unlimited retries with backoff; a transient
                // server outage must not leave the app dead (EVENT_CONNECT
                // fires again once the server is reachable).
                reconnectionAttempts = Int.MAX_VALUE
            },
        )
        socket = s
        s.on(Socket.EVENT_CONNECT, Emitter.Listener {
            val pending = pendingOnConnected
            pendingOnConnected = null
            if (pending != null) {
                pending()
            } else {
                listeners.forEach { it.onReconnected() }
            }
            startClockSync()
        })
        s.on(Socket.EVENT_CONNECT_ERROR, Emitter.Listener {
            listeners.forEach { l -> l.onConnectError("Cannot reach game server") }
        })
        s.on("sync.ack", Emitter.Listener { args ->
            val ack = args.getOrNull(0) as? JSONObject ?: return@Listener
            val t0 = ack.optLong("t0")
            val t1 = ack.optLong("t1")
            if (t0 > 0 && t1 > 0) {
                val now = System.currentTimeMillis()
                val rtt = now - t0
                synchronized(samples) {
                    samples.add(t1 - (t0 + rtt / 2))
                    // Apply the median of whatever arrived so far (>= 1);
                    // re-connecting clears and re-samples.
                    samples.sort()
                    offset = samples[samples.size / 2]
                }
            }
        })
        s.on("auth.ok", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onAuthOk(o.optString("nickname")) }
        })
        s.on("auth.error", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onAuthError(o.optString("message", "invalid nickname")) }
        })
        s.on("match.snapshot", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onSnapshot(MatchSnapshot.fromJson(o)) }
        })
        s.on("round.start", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onRoundStart(RoundStart.fromJson(o)) }
        })
        s.on("round.reveal", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onRoundReveal(RoundReveal.fromJson(o)) }
        })
        s.on("intermission.start", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onIntermission(Intermission.fromJson(o)) }
        })
        s.on("player.joined", Emitter.Listener { args -> emitPlayers(args) })
        s.on("player.left", Emitter.Listener { args -> emitPlayers(args) })
        s.on("player.updated", Emitter.Listener { args -> emitPlayers(args) })
        s.on("match.left", Emitter.Listener { listeners.forEach { it.onMatchLeft() } })
        s.on("error", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            listeners.forEach { it.onError(o.optString("code", "unknown_error")) }
        })
        s.connect()
    }

    private val samples = ArrayList<Long>()

    // Runs off the socket event thread so the sleeps don't block event delivery.
    private fun startClockSync() {
        val s = socket ?: return
        Thread {
            synchronized(samples) { samples.clear() }
            for (i in 0 until 3) {
                s.emit("sync", JSONObject().put("t0", System.currentTimeMillis()))
                try {
                    Thread.sleep(50)
                } catch (_: InterruptedException) {
                    return@Thread
                }
            }
        }.start()
    }

    /** Estimated current server time (ms epoch). */
    fun serverNow(): Long = System.currentTimeMillis() + offset

    fun auth(nickname: String, sessionId: String) =
        emit("auth", JSONObject().put("nickname", nickname).put("sessionId", sessionId))
    fun quickPlay() = emit("quick.play", JSONObject())
    fun createRoom() = emit("room.create", JSONObject())
    fun joinRoom(code: String) = emit("room.join", JSONObject().put("code", code))
    fun startRoom(code: String) = emit("room.start", JSONObject().put("code", code))
    fun leave() = emit("leave", JSONObject())
    fun submitGuess(round: Int, lat: Double, lng: Double) =
        emit("guess", JSONObject().put("round", round).put("lat", lat).put("lng", lng))

    private fun emit(event: String, payload: JSONObject) {
        socket?.emit(event, payload)
    }

    private fun emitPlayers(args: Array<Any?>) {
        val o = args.getOrNull(0) as? JSONObject ?: return
        val arr = o.optJSONArray("players") ?: return
        val players = (0 until arr.length()).map { PlayerPublic.fromJson(arr.getJSONObject(it)) }
        listeners.forEach { it.onPlayers(players) }
        if (o.has("host")) {
            val host = if (o.isNull("host")) null else o.getString("host")
            listeners.forEach { it.onHost(host) }
        }
    }

    fun disconnect() {
        pendingOnConnected = null
        socket?.disconnect()
        socket = null
        samples.clear()
    }
}
