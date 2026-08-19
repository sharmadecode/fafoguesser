package com.fafoguesser.app.ui.panorama

import android.os.Handler
import android.webkit.JavascriptInterface
import java.util.concurrent.atomic.AtomicBoolean

/** JavaScript bridge injected as "PanoBridge" into the bundled pano.html.
 *  Named (not anonymous) so R8 keep rules can pin it. */
class PanoBridge(
    private val mainHandler: Handler,
    private val disposed: AtomicBoolean,
    private val onReadyCallback: () -> Unit,
    private val onErrorCallback: (String?) -> Unit,
) {
    @JavascriptInterface
    fun onReady() {
        mainHandler.post { if (!disposed.get()) onReadyCallback() }
    }

    @JavascriptInterface
    fun onError(msg: String? = null) {
        mainHandler.post { if (!disposed.get()) onErrorCallback(msg) }
    }
}