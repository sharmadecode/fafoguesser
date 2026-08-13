package com.fafoguesser.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fafoguesser.app.ui.theme.Amber
import com.fafoguesser.app.ui.theme.Cream
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.Ink
import com.fafoguesser.app.ui.theme.Red
import com.fafoguesser.app.ui.theme.TextMuted

private data class Step(val n: String, val t: String, val d: String)

private val STEPS = listOf(
    Step("01", "LOOK AROUND", "Drag the 360° street view. Every direction is real — figure out where you are."),
    Step("02", "DROP YOUR PIN", "Tap the mini map where you think the spot is. Your pin is a draft — move it anywhere until you lock it."),
    Step("03", "SUBMIT GUESS", "Hit SUBMIT GUESS to lock it in. No time left? Your last pin auto-locks at the buzzer."),
    Step("04", "SCORE & WIN", "Exact hit = 1000 pts, 4,000 km of error = 0. Highest total after 5 rounds wins."),
)

@Composable
fun LandingScreen(
    nickname: String,
    busy: String?,
    error: String?,
    onQuickPlay: (String) -> Unit,
    onCreateRoom: (String) -> Unit,
    onJoinRoom: (String, String) -> Unit,
) {
    var name by remember { mutableStateOf(nickname) }
    var code by remember { mutableStateOf("") }
    val nameValid = name.trim().length >= 2
    Box(Modifier.fillMaxSize().background(Cream)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(8.dp))
            Text(
                text = "FAFOGUESSER",
                color = Ink,
                fontSize = 36.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = (-1).sp,
            )
            Text("figure it out or find out", color = Ink.copy(alpha = 0.7f), fontSize = 13.sp)

            Spacer(Modifier.height(24.dp))

            // Single card: nickname on top, play actions at the bottom.
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.White)
                    .border(3.dp, Ink)
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    enabled = busy == null,
                    singleLine = true,
                    placeholder = { Text("YOUR NICKNAME", color = TextMuted) },
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(14.dp))
                Button(
                    onClick = { onQuickPlay(name) },
                    enabled = busy == null && nameValid,
                    colors = ButtonDefaults.buttonColors(containerColor = Green, contentColor = Ink),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                ) {
                    Text(
                        if (busy == "quick") "Finding match…" else "⚡ QUICK PLAY",
                        fontWeight = FontWeight.Black,
                        fontSize = 16.sp,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Spacer(Modifier.weight(1f))
                    Text("or", color = Ink.copy(alpha = 0.6f), fontWeight = FontWeight.Bold)
                    Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(4.dp))
                Button(
                    onClick = { onCreateRoom(name) },
                    enabled = busy == null && nameValid,
                    colors = ButtonDefaults.buttonColors(containerColor = Amber, contentColor = Ink),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text(
                        if (busy == "create") "Creating…" else "MAKE A ROOM",
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                    )
                }
                Spacer(Modifier.height(12.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    OutlinedTextField(
                        value = code,
                        onValueChange = { c -> code = c.filter { it.isLetterOrDigit() }.uppercase().take(4) },
                        enabled = busy == null,
                        singleLine = true,
                        placeholder = { Text("ROOM CODE", color = TextMuted) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(10.dp))
                    Button(
                        onClick = { onJoinRoom(code, name) },
                        enabled = busy == null && nameValid && code.length == 4,
                        colors = ButtonDefaults.buttonColors(containerColor = Cream, contentColor = Ink),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.height(56.dp).border(2.dp, Ink),
                    ) {
                        Text(if (busy == "join") "…" else "JOIN", fontWeight = FontWeight.Black)
                    }
                }

                if (error != null) {
                    Spacer(Modifier.height(10.dp))
                    Text(
                        error,
                        color = Ink,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Red.copy(alpha = 0.35f))
                            .border(2.dp, Red)
                            .padding(10.dp),
                    )
                }
            }

            Spacer(Modifier.height(26.dp))

            Text("HOW TO PLAY", color = Ink, fontSize = 13.sp, fontWeight = FontWeight.Black, letterSpacing = 4.sp)
            Spacer(Modifier.height(4.dp))
            Box(Modifier.width(44.dp).height(5.dp).background(Green).border(1.5.dp, Ink))
            Spacer(Modifier.height(14.dp))

            STEPS.forEach { s ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                        .background(Color.White)
                        .border(3.dp, Ink)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .width(28.dp)
                            .height(28.dp)
                            .background(if (s.n.toInt() % 2 == 1) Amber else Green)
                            .border(2.dp, Ink)
                            .padding(4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(s.n, color = Ink, fontWeight = FontWeight.Black, fontSize = 10.sp)
                    }
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(s.t, color = Ink, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 1.sp)
                        Text(s.d, color = Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.5.sp, lineHeight = 19.sp)
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Ink)
                    .border(3.dp, Ink)
                    .padding(vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "FAFO GUESSER · figure it out or find out",
                    color = Cream,
                    fontWeight = FontWeight.Black,
                    fontSize = 12.sp,
                    letterSpacing = 2.sp,
                    textAlign = TextAlign.Center,
                )
                Text(
                    "works on any browser — phone, tablet, desktop",
                    color = Green,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    letterSpacing = 1.sp,
                    textAlign = TextAlign.Center,
                )
            }
            Spacer(Modifier.height(12.dp))
        }
    }
}
