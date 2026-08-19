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
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fafoguesser.app.ui.components.BrutalButton
import com.fafoguesser.app.ui.components.BrutalCard
import com.fafoguesser.app.ui.theme.Amber
import com.fafoguesser.app.ui.theme.Cream
import com.fafoguesser.app.ui.theme.Green
import com.fafoguesser.app.ui.theme.Ink
import com.fafoguesser.app.ui.theme.Red

private data class Step(val n: String, val t: String, val d: String)

private val STEPS = listOf(
    Step("01", "LOOK AROUND", "Rotate the 360° street view. Every single clue and direction is real — explore to identify the region."),
    Step("02", "DROP YOUR PIN", "Tap anywhere on the world map to place your pin. Move it freely until you are ready."),
    Step("03", "LOCK IN GUESS", "Tap SUBMIT GUESS to lock in. When time runs out, your last pin automatically submits."),
    Step("04", "SCORE & WIN", "Score up to 1000 pts per round based on proximity. Top scorer after 5 rounds wins."),
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
                .safeDrawingPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.Top,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(8.dp))

            // Brand Wordmark
            Row(verticalAlignment = Alignment.Bottom) {
                Text(
                    text = "FAFO",
                    color = Ink,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = (-1).sp,
                )
                Text(
                    text = "GUESSER",
                    color = Green,
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = (-1).sp,
                )
            }

            Spacer(Modifier.height(6.dp))

            // Subtitle Tag
            BrutalCard(
                fill = Color.White,
                borderWidth = 2.dp,
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(
                    text = "FIGURE IT OUT OR FIND OUT",
                    color = Ink,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    fontSize = 11.sp,
                    letterSpacing = 1.2.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 5.dp),
                )
            }

            Spacer(Modifier.height(18.dp))

            // Main Interactive Action Card
            BrutalCard(
                modifier = Modifier.fillMaxWidth(),
                fill = Color.White,
                borderWidth = 2.5.dp,
                shape = RoundedCornerShape(16.dp),
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Nickname Input
                    Text(
                        text = "YOUR NICKNAME",
                        color = Ink.copy(alpha = 0.65f),
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp,
                        modifier = Modifier.fillMaxWidth().padding(bottom = 6.dp),
                    )

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it.filter { c -> c.isLetterOrDigit() || c == '_' }.take(16) },
                        enabled = busy == null,
                        singleLine = true,
                        textStyle = TextStyle(
                            color = Ink,
                            fontWeight = FontWeight.Black,
                            fontSize = 15.sp,
                            letterSpacing = 0.5.sp,
                        ),
                        placeholder = {
                            Text(
                                "Enter your nickname…",
                                color = Ink.copy(alpha = 0.4f),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                            )
                        },
                        keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Ink,
                            unfocusedTextColor = Ink,
                            disabledTextColor = Ink,
                            errorTextColor = Ink,
                            focusedPlaceholderColor = Ink.copy(alpha = 0.4f),
                            unfocusedPlaceholderColor = Ink.copy(alpha = 0.4f),
                            focusedBorderColor = Ink,
                            unfocusedBorderColor = Ink.copy(alpha = 0.65f),
                            disabledBorderColor = Ink.copy(alpha = 0.3f),
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White,
                            disabledContainerColor = Color(0xFFF7F5F0),
                            cursorColor = Ink,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Spacer(Modifier.height(14.dp))

                    // Quick Play
                    BrutalButton(
                        text = if (busy == "quick") "FINDING MATCH…" else "⚡ QUICK PLAY",
                        onClick = { onQuickPlay(name) },
                        enabled = busy == null && nameValid,
                        fill = Green,
                        big = true,
                        height = 54.dp,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                    )

                    Spacer(Modifier.height(14.dp))

                    // Divider
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Ink.copy(alpha = 0.2f), thickness = 1.dp)
                        Text(
                            "OR PLAY WITH FRIENDS",
                            color = Ink.copy(alpha = 0.5f),
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Black,
                            fontSize = 10.sp,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(horizontal = 10.dp),
                        )
                        HorizontalDivider(modifier = Modifier.weight(1f), color = Ink.copy(alpha = 0.2f), thickness = 1.dp)
                    }

                    Spacer(Modifier.height(14.dp))

                    // Create Room
                    BrutalButton(
                        text = if (busy == "create") "CREATING…" else "CREATE ROOM",
                        onClick = { onCreateRoom(name) },
                        enabled = busy == null && nameValid,
                        fill = Amber,
                        height = 48.dp,
                        fontSize = 14,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                    )

                    Spacer(Modifier.height(10.dp))

                    // Join Room (Side-by-Side Row)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        OutlinedTextField(
                            value = code,
                            onValueChange = { c -> code = c.filter { it.isLetterOrDigit() }.uppercase().take(4) },
                            enabled = busy == null,
                            singleLine = true,
                            textStyle = TextStyle(
                                color = Ink,
                                fontWeight = FontWeight.Black,
                                fontSize = 15.sp,
                                letterSpacing = 3.sp,
                                textAlign = TextAlign.Center,
                            ),
                            placeholder = {
                                Text(
                                    "CODE",
                                    color = Ink.copy(alpha = 0.4f),
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    letterSpacing = 1.sp,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.fillMaxWidth(),
                                )
                            },
                            shape = RoundedCornerShape(10.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Ink,
                                unfocusedTextColor = Ink,
                                disabledTextColor = Ink,
                                errorTextColor = Ink,
                                focusedPlaceholderColor = Ink.copy(alpha = 0.4f),
                                unfocusedPlaceholderColor = Ink.copy(alpha = 0.4f),
                                focusedBorderColor = Ink,
                                unfocusedBorderColor = Ink.copy(alpha = 0.65f),
                                disabledBorderColor = Ink.copy(alpha = 0.3f),
                                focusedContainerColor = Color.White,
                                unfocusedContainerColor = Color.White,
                                disabledContainerColor = Color(0xFFF7F5F0),
                                cursorColor = Ink,
                            ),
                            modifier = Modifier.weight(1f),
                        )

                        BrutalButton(
                            text = if (busy == "join") "…" else "JOIN",
                            onClick = { onJoinRoom(code, name) },
                            enabled = busy == null && nameValid && code.length == 4,
                            fill = Green,
                            height = 54.dp,
                            modifier = Modifier.width(96.dp),
                            shape = RoundedCornerShape(10.dp),
                        )
                    }

                    // Error Message
                    if (error != null) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = error,
                            color = Ink,
                            fontSize = 12.5.sp,
                            fontWeight = FontWeight.Bold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Red.copy(alpha = 0.25f), RoundedCornerShape(8.dp))
                                .border(1.5.dp, Red, RoundedCornerShape(8.dp))
                                .padding(10.dp),
                        )
                    }
                }
            }

            Spacer(Modifier.height(22.dp))

            // How To Play Header
            BrutalCard(
                fill = Color.White,
                borderWidth = 2.dp,
                shape = RoundedCornerShape(999.dp),
            ) {
                Text(
                    text = "HOW TO PLAY",
                    color = Ink,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Black,
                    fontSize = 11.sp,
                    letterSpacing = 2.sp,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                )
            }

            Spacer(Modifier.height(12.dp))

            // Steps
            STEPS.forEach { s ->
                BrutalCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp),
                    fill = Color.White,
                    borderWidth = 2.dp,
                    shape = RoundedCornerShape(12.dp),
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(if (s.n.toInt() % 2 == 1) Amber else Green, RoundedCornerShape(8.dp))
                                .border(1.5.dp, Ink, RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = s.n,
                                color = Ink,
                                fontFamily = FontFamily.Monospace,
                                fontWeight = FontWeight.Black,
                                fontSize = 11.sp,
                            )
                        }

                        Spacer(Modifier.width(12.dp))

                        Column(Modifier.weight(1f)) {
                            Text(
                                text = s.t,
                                color = Ink,
                                fontWeight = FontWeight.Black,
                                fontSize = 13.sp,
                                letterSpacing = 0.5.sp,
                            )
                            Text(
                                text = s.d,
                                color = Ink.copy(alpha = 0.8f),
                                fontWeight = FontWeight.Medium,
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(10.dp))

            // Footer
            BrutalCard(
                modifier = Modifier.fillMaxWidth(),
                fill = Ink,
                borderWidth = 2.dp,
                shape = RoundedCornerShape(12.dp),
            ) {
                Column(
                    modifier = Modifier.padding(vertical = 12.dp, horizontal = 16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = "FAFO GUESSER · figure it out or find out",
                        color = Cream,
                        fontWeight = FontWeight.Black,
                        fontSize = 11.sp,
                        letterSpacing = 1.5.sp,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(2.dp))
                    Text(
                        text = "tap QUICK PLAY to jump into a match",
                        color = Green,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.5.sp,
                        letterSpacing = 0.5.sp,
                        textAlign = TextAlign.Center,
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}