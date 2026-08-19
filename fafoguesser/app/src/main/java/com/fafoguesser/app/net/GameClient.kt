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
        fun onDisconnected() {}
        fun onReconnected() {}
        fun onMatchLeft() {}
        fun onError(code: String) {}
        fun onConnectError(message: String) {}
    }

    private var socket: Socket? = null
    @Volatile private var offset = 0L
    private val listeners = CopyOnWriteArrayList<Listener>()
    private var pendingOnConnected: (() -> Unit)? = null
    // Bump on every disconnect / new sync run so stale threads abort — an old
    // sync loop must never clobber a fresh clock sample set.
    private val syncGen = java.util.concurrent.atomic.AtomicInteger(0)
    // Backoff retries keep the app alive, but the error should surface once
    // per outage — not once per failed attempt.
    @Volatile private var connectErrorReported = false

    fun addListener(l: Listener): () -> Unit {
        listeners.add(l)
        return { listeners.remove(l) }
    }

    companion object {
        fun resolveUrl(configured: String): String {
            val isEmulator = android.os.Build.FINGERPRINT.startsWith("generic") ||
                    android.os.Build.FINGERPRINT.startsWith("unknown") ||
                    android.os.Build.MODEL.contains("google_sdk") ||
                    android.os.Build.MODEL.contains("Emulator") ||
                    android.os.Build.MODEL.contains("Android SDK built for x86") ||
                    android.os.Build.HARDWARE.contains("goldfish") ||
                    android.os.Build.HARDWARE.contains("ranchu") ||
                    android.os.Build.PRODUCT.contains("sdk_gphone") ||
                    android.os.Build.PRODUCT.contains("emulator")

            if (isEmulator && (configured.contains("192.168.") || configured.contains("localhost") || configured.contains("127.0.0.1"))) {
                return "http://10.0.2.2:8787"
            }
            return configured
        }
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
        val effectiveUrl = resolveUrl(url)
        val s = IO.socket(
            URI.create(effectiveUrl),
            IO.Options().apply {
                transports = arrayOf("polling", "websocket")
                reconnection = true
                // Default is unlimited retries with backoff; a transient
                // server outage must not leave the app dead (EVENT_CONNECT
                // fires again once the server is reachable).
                reconnectionAttempts = Int.MAX_VALUE
            },
        )
        socket = s
        s.on(Socket.EVENT_CONNECT, Emitter.Listener {
            connectErrorReported = false
            val pending = pendingOnConnected
            pendingOnConnected = null
            if (pending != null) {
                pending()
            } else {
                listeners.forEach { it.onReconnected() }
            }
            startClockSync()
        })
        s.on(Socket.EVENT_DISCONNECT, Emitter.Listener {
            // Also fires on an intentional disconnect(); listeners guard with
            // their own screen state. A mid-match drop surfaces a banner so
            // the reconnect (and re-auth) is visible, not silent.
            listeners.forEach { it.onDisconnected() }
        })
        s.on(Socket.EVENT_CONNECT_ERROR, Emitter.Listener {
            if (connectErrorReported) return@Listener
            connectErrorReported = true
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
            safeParse({ MatchSnapshot.fromJson(o) }) { listeners.forEach { l -> l.onSnapshot(it) } }
        })
        s.on("round.start", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            safeParse({ RoundStart.fromJson(o) }) { listeners.forEach { l -> l.onRoundStart(it) } }
        })
        s.on("round.reveal", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            safeParse({ RoundReveal.fromJson(o) }) { listeners.forEach { l -> l.onRoundReveal(it) } }
        })
        s.on("intermission.start", Emitter.Listener { args ->
            val o = args.getOrNull(0) as? JSONObject ?: return@Listener
            safeParse({ Intermission.fromJson(o) }) { listeners.forEach { l -> l.onIntermission(it) } }
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
        val gen = syncGen.incrementAndGet()
        Thread {
            synchronized(samples) { samples.clear() }
            for (i in 0 until 3) {
                if (gen != syncGen.get()) return@Thread
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

    /** Parse boundary: a malformed/version-skewed packet must never crash the
     *  app on the socket thread — drop the event and surface a soft error. */
    private inline fun <T> safeParse(block: () -> T, emit: (T) -> Unit) {
        try {
            emit(block())
        } catch (_: Exception) {
            listeners.forEach { it.onError("bad_event") }
        }
    }

    private fun emitPlayers(args: Array<Any?>) {
        val o = args.getOrNull(0) as? JSONObject ?: return
        try {
            val arr = o.optJSONArray("players") ?: return
            val players = (0 until arr.length()).map { PlayerPublic.fromJson(arr.getJSONObject(it)) }
            listeners.forEach { it.onPlayers(players) }
            if (o.has("host")) {
                val host = if (o.isNull("host")) null else o.getString("host")
                listeners.forEach { it.onHost(host) }
            }
        } catch (_: Exception) {
            listeners.forEach { it.onError("bad_event") }
        }
    }

    fun disconnect() {
        pendingOnConnected = null
        syncGen.incrementAndGet()
        connectErrorReported = false
        socket?.disconnect()
        socket = null
        samples.clear()
    }
}
