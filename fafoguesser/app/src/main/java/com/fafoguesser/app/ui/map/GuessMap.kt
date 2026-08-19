package com.fafoguesser.app.ui.map

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fafoguesser.app.net.RoundReveal
import com.fafoguesser.app.ui.Guess
import com.fafoguesser.app.ui.parseHexColor
import com.fafoguesser.app.ui.theme.Amber
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.TextMuted
import com.maptiler.maptilersdk.annotations.MTCustomAnnotationView
import com.maptiler.maptilersdk.helpers.MTPolylineLayerHelper
import com.maptiler.maptilersdk.helpers.MTPolylineLayerOptions
import com.maptiler.maptilersdk.map.LngLat
import com.maptiler.maptilersdk.map.MTMapOptions
import com.maptiler.maptilersdk.map.MTMapView
import com.maptiler.maptilersdk.map.MTMapViewController
import com.maptiler.maptilersdk.map.options.MTCameraOptions
import com.maptiler.maptilersdk.map.options.MTFlyToOptions
import com.maptiler.maptilersdk.map.style.MTMapReferenceStyle
import com.maptiler.maptilersdk.map.style.MTMapStyleVariant

/** Dark MapTiler map with a centered pick crosshair while a round is live,
 *  and every player's guess pin + colored guess→truth line after the reveal. */
@Composable
fun GuessMap(
    picking: Boolean,
    guess: Guess?,
    reveal: RoundReveal?,
    round: Int,
    modifier: Modifier = Modifier,
    onController: (MTMapViewController?) -> Unit = {},
) {
    val context = LocalContext.current
    val controller = remember {
        MTMapViewController(context).also { onController(it) }
    }
    val revealed = reveal != null

    DisposableEffect(Unit) {
        onDispose {
            onController(null)
            controller.destroy()
        }
    }

    // Each round starts from the world view so nobody benefits from the
    // previous round's reveal position (web parity).
    LaunchedEffect(round) {
        if (controller.style == null) return@LaunchedEffect
        controller.jumpTo(MTCameraOptions(center = LngLat(0.0, 20.0), zoom = 2.5))
    }

    // Draw each player's guess→truth connector as a dashed vector layer in
    // their assigned color. Layers are removed whenever the reveal changes
    // (next round / next match) so they never pile up.
    val lineIds = remember { mutableListOf<String>() }
    val sourceIds = remember { mutableListOf<String>() }
    LaunchedEffect(reveal) {
        val style = controller.style ?: return@LaunchedEffect
        lineIds.forEach { style.removeLayerById(it) }
        sourceIds.forEach { style.removeSourceById(it) }
        lineIds.clear()
        sourceIds.clear()
        val r = reveal ?: return@LaunchedEffect
        // Fly to the truth location so it's clearly visible even when every
        // guess was dropped far away (web parity: reveal zooms to the answer).
        controller.flyTo(
            MTCameraOptions(center = LngLat(r.lng, r.lat), zoom = 14.0),
            MTFlyToOptions(null, null, null, null, 2000.0),
        )
        val helper = MTPolylineLayerHelper(style)
        r.results.forEachIndexed { i, res ->
            val gLat = res.lat ?: return@forEachIndexed
            val gLng = res.lng ?: return@forEachIndexed
            val layerId = "guess-line-$i"
            val sourceId = "guess-src-$i"
            lineIds += layerId
            sourceIds += sourceId
            val geojson =
                """{"type":"Feature","properties":{},"geometry":{"type":"LineString","coordinates":[[$gLng,$gLat],[${r.lng},${r.lat}]]}}"""
            helper.addPolyline(
                MTPolylineLayerOptions(
                    data = geojson,
                    layerId = layerId,
                    sourceId = sourceId,
                    lineColor = res.color,
                    lineWidth = 5.0,
                    lineOpacity = 1.0,
                    lineCap = "round",
                    lineJoin = "round",
                ),
            )
        }
    }

    Box(modifier) {
        MTMapView(
            referenceStyle = MTMapReferenceStyle.SATELLITE,
            options = MTMapOptions(center = LngLat(0.0, 20.0), zoom = 2.5),
            controller = controller,
            modifier = Modifier.fillMaxSize(),
        )

        if (picking) {
            Crosshair(modifier = Modifier.align(Alignment.Center))
        }

        // During play: only the local player's pin (amber).
        if (guess != null && !revealed) {
            MTCustomAnnotationView(
                controller = controller,
                coordinates = LngLat(guess.lng, guess.lat),
                anchor = Alignment.BottomCenter,
            ) { Pin(Amber) }
        }

        // At reveal: every player's guess pin in their color + the truth pin.
        if (revealed) {
            reveal.results.forEach { res ->
                val gLat = res.lat
                val gLng = res.lng
                if (gLat != null && gLng != null) {
                    MTCustomAnnotationView(
                        controller = controller,
                        coordinates = LngLat(gLng, gLat),
                        anchor = Alignment.BottomCenter,
                    ) { Pin(parseHexColor(res.color)) }
                }
            }
            MTCustomAnnotationView(
                controller = controller,
                coordinates = LngLat(reveal.lng, reveal.lat),
                anchor = Alignment.BottomCenter,
            ) { Pin(Green) }
        }

        if (!picking && !revealed) {
            Surface(
                color = Color(0xE60E1116),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.align(Alignment.TopCenter).padding(top = 10.dp),
            ) {
                Text("Waiting for reveal…", color = TextMuted, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp))
            }
        }
    }
}

@Composable
private fun Crosshair(modifier: Modifier = Modifier) {
    Canvas(
        modifier = modifier.size(26.dp),
    ) {
        val r = this.size.minDimension / 2
        drawCircle(Amber, radius = r, center = center, style = Stroke(width = 3.dp.toPx()))
    }
}

/** Classic location-pin silhouette: rounded head + pointed tail + dark hole. */
@Composable
private fun Pin(color: Color, size: Dp = 30.dp) {
    Canvas(modifier = Modifier.size(size)) {
        val w = this.size.width
        val h = this.size.height
        val headR = w * 0.32f
        val headY = h * 0.34f
        val outline = Stroke(width = w * 0.07f, join = StrokeJoin.Round)
        val tail = Path().apply {
            moveTo(w * 0.5f - headR * 0.72f, headY + headR * 0.45f)
            lineTo(w * 0.5f + headR * 0.72f, headY + headR * 0.45f)
            lineTo(w * 0.5f, h * 0.98f)
            close()
        }
        drawPath(tail, color)
        drawPath(tail, Color.Black.copy(alpha = 0.5f), style = outline)
        drawCircle(color, radius = headR, center = Offset(w * 0.5f, headY))
        drawCircle(Color.Black.copy(alpha = 0.5f), radius = headR, center = Offset(w * 0.5f, headY), style = outline)
        drawCircle(Color.Black.copy(alpha = 0.9f), radius = headR * 0.42f, center = Offset(w * 0.5f, headY))
    }
}
