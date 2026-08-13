package com.fafoguesser.app.ui

import androidx.compose.ui.graphics.Color

/** Parse a "#rrggbb" (or "#rgb") hex color string into a Compose [Color]. */
fun parseHexColor(hex: String): Color {
    val cleaned = hex.removePrefix("#")
    return when (cleaned.length) {
        3 -> {
            val r = cleaned[0].toString().repeat(2).toInt(16) / 255f
            val g = cleaned[1].toString().repeat(2).toInt(16) / 255f
            val b = cleaned[2].toString().repeat(2).toInt(16) / 255f
            Color(r, g, b)
        }
        6 -> Color(
            cleaned.substring(0, 2).toInt(16) / 255f,
            cleaned.substring(2, 4).toInt(16) / 255f,
            cleaned.substring(4, 6).toInt(16) / 255f,
        )
        else -> Color(0xFFFBBF24) // amber fallback
    }
}
