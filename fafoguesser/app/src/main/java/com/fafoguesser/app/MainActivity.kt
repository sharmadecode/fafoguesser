package com.fafoguesser.app

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fafoguesser.app.ui.GameViewModel
import com.fafoguesser.app.ui.Screen
import com.fafoguesser.app.ui.screens.GameScreen
import com.fafoguesser.app.ui.screens.LandingScreen
import com.fafoguesser.app.ui.theme.Bg
import com.fafoguesser.app.ui.theme.Cream
import com.fafoguesser.app.ui.theme.FafoTheme
import com.maptiler.maptilersdk.MTConfig

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Full-bleed edge-to-edge; every screen applies its own inset padding
        // (safeDrawingPadding) so nothing hides under bars/notch/gesture pill.
        enableEdgeToEdge()
        MTConfig.apiKey = BuildConfig.MAPTILER_API_KEY
        setContent {
            FafoTheme {
                Root()
            }
        }
    }
}

@Composable
private fun Root(vm: GameViewModel = viewModel()) {
    // Back must not pop a live match off the stack: a single tap shouldn't
    // cost a player their round — "leave" is the explicit, guarded button.
    androidx.activity.compose.BackHandler(enabled = vm.screen == Screen.GAME) {
        // intentionally swallowed — use the LEAVE button
    }
    // The reveal + intermission show the answers; keep them out of
    // screenshots / recents thumbnails for that window only.
    val context = LocalContext.current
    LaunchedEffect(vm.reveal, vm.intermission) {
        val window = (context as? ComponentActivity)?.window ?: return@LaunchedEffect
        val secure = vm.reveal != null || vm.intermission != null
        if (secure) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
    Box(modifier = androidx.compose.ui.Modifier.fillMaxSize().background(if (vm.screen == Screen.LANDING) Cream else Bg)) {
        when (vm.screen) {
            Screen.LANDING -> LandingScreen(
                nickname = vm.nickname,
                busy = vm.busy,
                error = vm.error,
                onQuickPlay = vm::quickPlay,
                onCreateRoom = vm::createRoom,
                onJoinRoom = vm::joinRoom,
            )

            Screen.GAME -> GameScreen(vm)
        }
    }
}
