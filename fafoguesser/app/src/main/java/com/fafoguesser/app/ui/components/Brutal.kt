package com.fafoguesser.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.Ink

@Composable
fun BrutalButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    fill: Color = Green,
    contentColor: Color = Ink,
    borderColor: Color = Ink,
    borderWidth: Dp = 2.5.dp,
    shape: Shape = RoundedCornerShape(10.dp),
    enabled: Boolean = true,
    big: Boolean = false,
    height: Dp? = null,
    fontSize: Int = if (big) 18 else 14,
    fontFamily: androidx.compose.ui.text.font.FontFamily = androidx.compose.ui.text.font.FontFamily.Monospace,
) {
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val nudge = if (pressed && enabled) 2.dp else 0.dp
    val actualFill = if (enabled) fill else fill.copy(alpha = 0.55f)
    val actualContent = if (enabled) contentColor else contentColor.copy(alpha = 0.6f)

    Box(
        modifier = modifier
            .then(if (height != null) Modifier.height(height) else Modifier)
            .offset(x = nudge, y = nudge)
            .background(actualFill, shape)
            .border(borderWidth, borderColor, shape)
            .clickable(
                interactionSource = interaction,
                indication = null,
                enabled = enabled,
                onClick = onClick,
            )
            .padding(
                horizontal = 14.dp,
                vertical = if (height != null) 0.dp else if (big) 16.dp else 10.dp,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text,
            color = actualContent,
            fontWeight = FontWeight.Black,
            fontFamily = fontFamily,
            fontSize = fontSize.sp,
            letterSpacing = 0.5.sp,
            maxLines = 1,
        )
    }
}

@Composable
fun BrutalCard(
    modifier: Modifier = Modifier,
    fill: Color = Color.White,
    borderColor: Color = Ink,
    borderWidth: Dp = 2.5.dp,
    shape: Shape = RoundedCornerShape(14.dp),
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier
            .background(fill, shape)
            .border(borderWidth, borderColor, shape),
    ) {
        content()
    }
}