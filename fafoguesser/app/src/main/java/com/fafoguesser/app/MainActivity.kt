package com.fafoguesser.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.fafoguesser.app.ui.GameViewModel
import com.fafoguesser.app.ui.Screen
import com.fafoguesser.app.ui.screens.GameScreen
import com.fafoguesser.app.ui.screens.LandingScreen
import com.fafoguesser.app.ui.theme.Bg
import com.fafoguesser.app.ui.theme.FafoTheme
import com.maptiler.maptilersdk.MTConfig

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
    Box(modifier = androidx.compose.ui.Modifier.fillMaxSize().background(Bg)) {
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
