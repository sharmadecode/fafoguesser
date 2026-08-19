package com.fafoguesser.app.ui.panorama

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.fafoguesser.app.BuildConfig
import com.fafoguesser.app.ui.components.BrutalButton
import com.fafoguesser.app.ui.theme.Bg
import com.fafoguesser.app.ui.theme.Border
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.TextMuted
import kotlinx.coroutines.delay
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

enum class PanoStatus { LOADING, READY, ERROR }

/** Server-minted panorama keys are 64-char base64url; anything longer or
 *  containing other characters is not a key we minted. */
private val PANO_KEY_REGEX = Regex("^[A-Za-z0-9_-]{1,64}$")

/** Native download of one panorama (2048px variant) on Dispatchers.IO.
 *  Returns the HTTP status and the bytes on 2xx; never throws — failures are
 *  logged with the real cause so logcat always shows why a pano failed. */
private suspend fun fetchPanoBytes(
    serverUrl: String,
    key: String,
    nonce: Int,
): Pair<Int, ByteArray?> =
    kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
        val query = if (nonce > 0) "?size=2048&r=$nonce" else "?size=2048"
        val panoUrl = "$serverUrl/api/pano/$key$query"
        var conn: HttpURLConnection? = null
        try {
            val c = URL(panoUrl).openConnection() as HttpURLConnection
            conn = c
            c.connectTimeout = 10_000
            c.readTimeout = 30_000
            c.instanceFollowRedirects = true
            c.requestMethod = "GET"
            val code = c.responseCode
            if (code in 200..299) {
                val data = c.inputStream.use { it.readBytes() }
                android.util.Log.d("PanoWebView", "pano fetch ok: ${data.size} bytes (nonce=$nonce)")
                code to data
            } else {
                android.util.Log.e("PanoWebView", "pano fetch HTTP $code url=$panoUrl")
                code to null
            }
        } catch (e: Exception) {
            android.util.Log.e("PanoWebView", "pano fetch ${e.javaClass.simpleName}: ${e.message} url=$panoUrl")
            -1 to null
        } finally {
            conn?.disconnect()
        }
    }

/** Equirect street-view inside a WebView (served from fake origin https://fafolocal
 *  via shouldInterceptRequest, streaming the 2048px variant natively). */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PanoramaWebView(panoKey: String, modifier: Modifier = Modifier) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val disposed = remember { AtomicBoolean(false) }
    var status by remember { mutableStateOf(PanoStatus.LOADING) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var retryNonce by remember { mutableStateOf(0) }
    val mainHandler = remember { Handler(Looper.getMainLooper()) }
    // Prefetched panorama bytes for the current round ("key#nonce"). Written by
    // the IO download below, read by shouldInterceptRequest on the WebView thread.
    val panoBytes = remember { java.util.concurrent.ConcurrentHashMap<String, ByteArray>() }
    val safeKey = if (PANO_KEY_REGEX.matches(panoKey)) panoKey else ""
    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            addJavascriptInterface(
                PanoBridge(
                    mainHandler = mainHandler,
                    disposed = disposed,
                    onReadyCallback = {
                        status = PanoStatus.READY
                        errorMessage = null
                    },
                    onErrorCallback = { msg ->
                        status = PanoStatus.ERROR
                        errorMessage = msg ?: "Panorama load error"
                    },
                ),
                "PanoBridge",
            )
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): WebResourceResponse? {
                    val url = request?.url ?: return null
                    val path = url.path ?: ""
                    if (path == "/pano.html" || path.endsWith("/pano.html")) {
                        return try {
                            WebResourceResponse("text/html", "utf-8", context.assets.open("pano.html"))
                        } catch (e: Exception) {
                            WebResourceResponse("text/plain", "utf-8", 500, "Internal Error", emptyMap(), ByteArrayInputStream(ByteArray(0)))
                        }
                    }
                    if (path.startsWith("/pano/")) {
                        val key = path.removePrefix("/pano/").substringBefore("?").substringBefore("/")
                        if (!PANO_KEY_REGEX.matches(key)) {
                            return WebResourceResponse("text/plain", "utf-8", 400, "Bad Key", emptyMap(), ByteArrayInputStream(ByteArray(0)))
                        }
                        val nonce = url.getQueryParameter("r")?.toIntOrNull() ?: 0
                        // Fast path: bytes were prefetched natively before the JS
                        // ran — serving them needs no network on this thread.
                        panoBytes["$key#$nonce"]?.let { bytes ->
                            return WebResourceResponse("image/jpeg", null, ByteArrayInputStream(bytes))
                        }
                        // Slow path (page re-fetch/race): fetch here and relay the
                        // REAL status code — never swallow the cause into a flat 502.
                        val serverUrl = com.fafoguesser.app.net.GameClient.resolveUrl(BuildConfig.SERVER_URL)
                        val (code, bytes) = kotlinx.coroutines.runBlocking { fetchPanoBytes(serverUrl, key, nonce) }
                        if (bytes != null) {
                            return WebResourceResponse("image/jpeg", null, ByteArrayInputStream(bytes))
                        }
                        val status = if (code > 0) code else 502
                        return WebResourceResponse("text/plain", "utf-8", status, "Pano Fetch Failed", emptyMap(), ByteArrayInputStream(ByteArray(0)))
                    }
                    return null
                }
            }
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                    android.util.Log.d("PanoWebView", "${consoleMessage?.message()} [line ${consoleMessage?.lineNumber()}]")
                    return true
                }
            }
            loadUrl("https://fafolocal/pano.html")
        }
    }

    LaunchedEffect(safeKey, retryNonce) {
        status = PanoStatus.LOADING
        errorMessage = null
        if (safeKey.isEmpty()) {
            webView.evaluateJavascript("showPlaceholder();", null)
            status = PanoStatus.ERROR
            errorMessage = "No panorama key provided"
            return@LaunchedEffect
        }

        // 1) Download the 2048px panorama natively BEFORE driving the page (the
        //    native download path is the proven one; only the WebView hand-off
        //    was ever broken). shouldInterceptRequest then serves these bytes
        //    from memory — no Base64, no giant JS strings, no network on the
        //    WebView thread.
        val serverUrl = com.fafoguesser.app.net.GameClient.resolveUrl(BuildConfig.SERVER_URL)
        val (code, bytes) = fetchPanoBytes(serverUrl, safeKey, retryNonce)
        if (disposed.get()) return@LaunchedEffect
        if (bytes == null) {
            status = PanoStatus.ERROR
            errorMessage = if (code > 0) "Server returned HTTP $code" else "Could not reach the game server"
            return@LaunchedEffect
        }
        panoBytes.clear()
        panoBytes["${safeKey}#$retryNonce"] = bytes

        // 2) Wait until pano.html has loaded before driving it.
        var didInit = false
        repeat(25) { attempt ->
            if (disposed.get()) return@LaunchedEffect
            var ready: Boolean? = null
            webView.evaluateJavascript("typeof showImage !== 'undefined'") { res ->
                ready = res?.trim() == "true"
            }
            var waited = 0
            while (ready == null && !disposed.get() && waited < 5000) {
                delay(25)
                waited += 25
            }
            if (disposed.get()) return@LaunchedEffect
            if (ready == true) {
                webView.evaluateJavascript("showImage('$safeKey', $retryNonce);", null)
                didInit = true
                return@repeat
            }
            delay(175)
        }
        if (!didInit && !disposed.get()) {
            webView.evaluateJavascript("showPlaceholder();", null)
            status = PanoStatus.ERROR
            errorMessage = "Failed to initialize panorama viewer"
        }

        // Watchdog: If still loading after 15s, surface retry overlay with timeout error
        delay(15000)
        if (status == PanoStatus.LOADING && !disposed.get()) {
            status = PanoStatus.ERROR
            errorMessage = "Loading timed out (15s)"
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            disposed.set(true)
            webView.stopLoading()
            webView.destroy()
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        AndroidView(factory = { webView }, modifier = Modifier.fillMaxSize())
        if (status == PanoStatus.LOADING) {
            LoadingTips(Modifier.align(Alignment.BottomCenter))
        }
        if (status == PanoStatus.ERROR) {
            ErrorOverlay(
                errorMessage = errorMessage ?: "The street view failed to load",
                onRetry = { retryNonce++ },
            )
        }
    }
}

@Composable
private fun LoadingTips(modifier: Modifier = Modifier) {
    val tips = listOf(
        "Drag the street view to look around",
        "Pinch or double-tap to zoom",
        "Tap the map to drop your pin",
        "Your last pin auto-submits at the buzzer",
    )
    var tipIndex by remember { mutableStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(3200)
            tipIndex = (tipIndex + 1) % tips.size
        }
    }
    Surface(
        color = Bg.copy(alpha = 0.78f),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Border),
        modifier = modifier.padding(10.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(14.dp),
                strokeWidth = 2.dp,
                color = Green,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                tips[tipIndex],
                color = TextMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun ErrorOverlay(errorMessage: String, onRetry: () -> Unit) {
    Surface(
        color = Bg.copy(alpha = 0.88f),
        modifier = Modifier.fillMaxSize(),
    ) {
        Box(Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier.align(Alignment.Center).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "PANORAMA UNAVAILABLE",
                    color = Color(0xFFE6E9EE),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 2.sp,
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    errorMessage,
                    color = TextMuted,
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
                Spacer(Modifier.size(14.dp))
                BrutalButton(
                    text = "RETRY",
                    onClick = onRetry,
                    fill = Green,
                    height = 48.dp,
                    fontSize = 14,
                    modifier = Modifier.width(160.dp),
                )
            }
        }
    }
}