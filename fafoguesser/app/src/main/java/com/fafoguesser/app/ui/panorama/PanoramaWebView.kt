package com.fafoguesser.app.ui.panorama

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import com.fafoguesser.app.BuildConfig
import kotlinx.coroutines.delay

/** Equirect street-view inside a WebView (bundled pano.html, imagery pulled
 *  from the server's /api/pano/:key proxy — the Mapillary image id never
 *  reaches the device). */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun PanoramaWebView(panoKey: String, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    val disposed = remember { java.util.concurrent.atomic.AtomicBoolean(false) }
    val webView = remember {
        WebView(context).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            // The page is a bundled static asset; nothing in it should reach
            // into the app's filesystem or other origins (asset:// files are
            // still loadable regardless of allowFileAccess).
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.allowFileAccessFromFileURLs = false
            settings.allowUniversalAccessFromFileURLs = false
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            loadUrl("file:///android_asset/pano.html")
        }
    }

    LaunchedEffect(panoKey) {
        val panoUrl = "${BuildConfig.SERVER_URL}/api/pano/${panoKey}"
        val js = "showImage(${JSONQuote(panoUrl)});"
        // Wait until pano.html has loaded before driving it.
        // evaluateJavascript reports back asynchronously, so each attempt must
        // actually WAIT for that callback before deciding what to do next.
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
                webView.evaluateJavascript(js, null)
                didInit = true
                return@repeat
            }
            delay(175)
        }
        if (!didInit && !disposed.get()) {
            webView.evaluateJavascript("showPlaceholder();", null)
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            disposed.set(true)
            webView.stopLoading()
            webView.destroy()
        }
    }

    AndroidView(factory = { webView }, modifier = modifier.fillMaxSize())
}

private fun JSONQuote(s: String): String {
    val sb = StringBuilder(s.length + 2)
    sb.append('"')
    s.forEach { c ->
        when (c) {
            '"' -> sb.append("\\\"")
            '\\' -> sb.append("\\\\")
            '\n' -> sb.append("\\n")
            '\r' -> sb.append("\\r")
            else -> sb.append(c)
        }
    }
    sb.append('"')
    return sb.toString()
}
