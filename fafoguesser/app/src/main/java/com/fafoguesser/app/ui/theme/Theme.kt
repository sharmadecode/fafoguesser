package com.fafoguesser.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val Ink = Color(0xFF131313)
val Cream = Color(0xFFF4ECE1)

val Green = Color(0xFF4ADE80)
val Amber = Color(0xFFFBBF24)
val Red = Color(0xFFEF4444)
val Blue = Color(0xFF60A5FA)

val Bg = Color(0xFF0E1116)
val Panel = Color(0xFF161B22)
val Panel2 = Color(0xFF1C222B)
val Border = Color(0xFF262D38)
val TextPrimary = Color(0xFFE6E9EE)
val TextMuted = Color(0xFF8B93A1)

private val DarkColors = darkColorScheme(
    primary = Green,
    onPrimary = Ink,
    secondary = Amber,
    onSecondary = Ink,
    error = Red,
    background = Bg,
    onBackground = TextPrimary,
    surface = Panel,
    onSurface = TextPrimary,
    surfaceVariant = Panel2,
    onSurfaceVariant = TextMuted,
    outline = Border,
)

@Composable
fun FafoTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = DarkColors, content = content)
}
