package com.fafoguesser.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import kotlinx.coroutines.delay
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fafoguesser.app.ui.GameViewModel
import com.fafoguesser.app.ui.map.GuessMap
import com.fafoguesser.app.ui.panorama.PanoramaWebView
import com.fafoguesser.app.ui.parseHexColor
import com.fafoguesser.app.ui.theme.Amber
import com.fafoguesser.app.ui.theme.Border
import com.fafoguesser.app.ui.theme.Cream
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.Ink
import com.fafoguesser.app.ui.theme.Panel
import com.fafoguesser.app.ui.theme.Red
import com.fafoguesser.app.ui.theme.TextMuted
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToLong

@Composable
fun GameScreen(vm: GameViewModel) {
    val reveal = vm.reveal
    val inLobby = vm.snapshot?.mode == "room" && vm.intermission == null &&
        vm.reveal == null && vm.round == 0 && vm.panorama == null
    Box(modifier = Modifier.fillMaxSize().background(com.fafoguesser.app.ui.theme.Bg)) {
        Column(modifier = Modifier.fillMaxSize().padding(10.dp)) {
            TopBar(vm, inLobby)
            Spacer(Modifier.height(8.dp))

            if (inLobby) {
                LobbyBlock(vm, Modifier.weight(1f))
                Spacer(Modifier.height(8.dp))
            } else {
                PanoramaWebView(
                    panoKey = vm.panorama ?: "",
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                )
                Footer(vm)
                Spacer(Modifier.height(8.dp))

                GuessMap(
                    picking = vm.canPick,
                    guess = vm.guess,
                    reveal = reveal,
                    round = vm.round,
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    onController = vm::setMapController,
                )
                Spacer(Modifier.height(8.dp))
            }

            ScorePanel(vm)
        }

        if (vm.intermission != null) {
            IntermissionOverlay(vm)
        }
    }
}

@Composable
private fun LobbyBlock(vm: GameViewModel, modifier: Modifier = Modifier) {
    val isHost = vm.host == vm.nickname
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Surface(
            color = Panel,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, Border),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp),
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("LOBBY", color = Cream, fontSize = 20.sp, fontWeight = FontWeight.Black)
                Spacer(Modifier.height(10.dp))
                Text(
                    "Share code ${vm.snapshot?.roomCode.orEmpty()}",
                    color = TextMuted,
                    fontSize = 13.sp,
                    fontFamily = FontFamily.Monospace,
                )
                Spacer(Modifier.height(14.dp))
                vm.players.forEach { p ->
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                            .background(if (p.nickname == vm.nickname) Green.copy(alpha = 0.12f) else Panel, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            Modifier.size(10.dp).background(parseHexColor(p.color), CircleShape),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(p.nickname, color = Cream, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.weight(1f))
                        Text(
                            when {
                                p.nickname == vm.host -> "HOST"
                                p.nickname == vm.nickname -> "YOU"
                                else -> ""
                            },
                            color = Amber,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                        )
                    }
                }
                Spacer(Modifier.height(16.dp))
                if (isHost) {
                    Button(
                        onClick = vm::startRoom,
                        colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Ink),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) { Text("START MATCH", fontWeight = FontWeight.Black, fontSize = 15.sp) }
                } else {
                    Text("Waiting for the host to start…", color = TextMuted, fontSize = 12.sp)
                }
            }
        }
    }
}

@Composable
private fun TopBar(vm: GameViewModel, inLobby: Boolean) {
    val remaining = max(0, vm.remainingMs)
    val seconds = ceil(remaining / 1000.0).roundToLong()
    val urgent = remaining > 0 && remaining <= 5000
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            if (inLobby) "LOBBY" else "ROUND ${vm.round + 1}/${vm.snapshot?.roundCount ?: 5}",
            color = TextMuted,
            fontSize = 12.sp,
            fontFamily = FontFamily.Monospace,
        )
        vm.snapshot?.roomCode?.let {
            Text(
                "ROOM $it",
                color = Ink,
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.background(Amber, RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp),
            )
        }
        Spacer(Modifier.weight(1f))
        Surface(
            color = if (urgent) Red.copy(alpha = 0.25f) else Panel,
            shape = RoundedCornerShape(999.dp),
        ) {
            Text(
                "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}",
                color = if (urgent) Red else Cream,
                fontFamily = FontFamily.Monospace,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp),
            )
        }
        Button(
            onClick = vm::leave,
            colors = ButtonDefaults.buttonColors(containerColor = Panel, contentColor = TextMuted),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.height(34.dp),
        ) { Text("LEAVE", fontSize = 11.sp) }
    }
}

@Composable
private fun Footer(vm: GameViewModel) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            vm.submitted -> Text("Guess locked in — wait for reveal", color = Green, fontSize = 12.sp)
            vm.canPick && vm.guess != null -> Text(
                "Pin at ${"%.4f".format(vm.guess!!.lat)}, ${"%.4f".format(vm.guess!!.lng)}",
                color = TextMuted,
                fontSize = 12.sp,
            )
            else -> Text("Pan the map, then place your guess", color = TextMuted, fontSize = 12.sp)
        }
        Spacer(Modifier.weight(1f))
        if (vm.canPick) {
            Button(
                onClick = vm::placeGuessAtCenter,
                enabled = true,
                colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Ink),
                shape = RoundedCornerShape(999.dp),
            ) { Text(if (vm.guess == null) "PLACE GUESS" else "MOVE & SUBMIT", fontWeight = FontWeight.Black, fontSize = 13.sp) }
        }
    }
}

private fun formatDistance(m: Double?): String {
    if (m == null || !m.isFinite()) return "–"
    if (m < 1000) return "${m.roundToLong()}m"
    val km = m / 1000.0
    return if (km >= 100) "${km.roundToLong()}km" else "%.1fkm".format(km)
}

@Composable
private fun ScorePanel(vm: GameViewModel) {
    val reveal = vm.reveal
    Column(modifier = Modifier.fillMaxWidth()) {
        if (reveal != null) {
            Text(
                "ROUND ${reveal.round + 1} · RESULTS",
                color = Amber,
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(4.dp))
            LazyColumn(modifier = Modifier.height(140.dp)) {
                itemsIndexed(reveal.results, key = { _, it -> it.nickname + it.total }) { i, r ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp)
                            .background(
                                if (r.nickname == vm.nickname) Green.copy(alpha = 0.15f) else Panel,
                                RoundedCornerShape(8.dp),
                            )
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${i + 1}",
                            color = TextMuted,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(18.dp),
                        )
                        Box(
                            Modifier.size(10.dp).background(parseHexColor(r.color), CircleShape),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            r.nickname + if (r.nickname == vm.nickname) " (you)" else "",
                            color = if (r.nickname == vm.nickname) Green else Cream,
                            fontWeight = if (r.nickname == vm.nickname) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            formatDistance(r.distanceM),
                            color = TextMuted,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            modifier = Modifier.padding(end = 12.dp),
                        )
                        Text(
                            "${r.total}",
                            color = Cream,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        } else {
            Text("SCORES", color = TextMuted, fontSize = 10.sp, fontFamily = FontFamily.Monospace)
            Spacer(Modifier.height(4.dp))
            LazyColumn(modifier = Modifier.height(140.dp)) {
                itemsIndexed(vm.players.sortedByDescending { it.score }, key = { _, it -> it.nickname }) { i, p ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp)
                            .background(
                                if (p.nickname == vm.nickname) Green.copy(alpha = 0.12f) else Panel,
                                RoundedCornerShape(8.dp),
                            )
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${i + 1}",
                            color = TextMuted,
                            fontSize = 12.sp,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.width(18.dp),
                        )
                        Box(
                            Modifier.size(10.dp).background(parseHexColor(p.color), CircleShape),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(
                            p.nickname + if (p.nickname == vm.nickname) " (you)" else "",
                            color = if (p.nickname == vm.nickname) Green else Cream,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                        )
                        if (p.guessed) {
                            Text(" ●", color = Amber, fontSize = 10.sp)
                        }
                        if (!p.connected) {
                            Text(" (offline)", color = TextMuted, fontSize = 11.sp)
                        }
                        Spacer(Modifier.weight(1f))
                        Text(
                            "${p.score}",
                            color = Cream,
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun IntermissionOverlay(vm: GameViewModel) {
    val intermission = vm.intermission ?: return
    Box(
        modifier = Modifier.fillMaxSize().background(com.fafoguesser.app.ui.theme.Bg.copy(alpha = 0.9f)),
        contentAlignment = Alignment.Center,
    ) {
        Surface(
            color = Cream,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.padding(24.dp).fillMaxWidth(),
        ) {
            Column(modifier = Modifier.padding(24.dp)) {
                Text(
                    "MATCH ${intermission.matchNumber} OVER",
                    color = Ink,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                )
                Spacer(Modifier.height(14.dp))
                intermission.finalRanks.forEachIndexed { i, (name, score) ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                            .background(if (i == 0) Amber else Cream, RoundedCornerShape(8.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("${i + 1}", color = Ink, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
                        Text("  $name", color = Ink, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text("$score", color = Ink, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(Modifier.height(12.dp))
                val left = max(0, intermission.nextMatchAt - vm.now)
                Text(
                    "next match in ${ceil(left / 1000.0).roundToLong()}s",
                    color = Ink.copy(alpha = 0.7f),
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}
