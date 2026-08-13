package com.fafoguesser.app.net

import org.json.JSONObject

data class PlayerPublic(
    val nickname: String,
    val score: Int,
    val guessed: Boolean,
    val connected: Boolean,
    val color: String,
) {
    companion object {
        fun fromJson(o: JSONObject) = PlayerPublic(
            nickname = o.getString("nickname"),
            score = o.getInt("score"),
            guessed = o.optBoolean("guessed"),
            connected = o.optBoolean("connected", true),
            color = o.optString("color", "#fbbf24"),
        )
    }
}

data class RoundResult(
    val nickname: String,
    val lat: Double?,
    val lng: Double?,
    val distanceM: Double?,
    val points: Int,
    val total: Int,
    val color: String,
) {
    companion object {
        fun fromJson(o: JSONObject) = RoundResult(
            nickname = o.getString("nickname"),
            lat = if (o.isNull("lat")) null else o.optDouble("lat"),
            lng = if (o.isNull("lng")) null else o.optDouble("lng"),
            distanceM = if (o.isNull("distanceM")) null else o.optDouble("distanceM"),
            points = o.getInt("points"),
            total = o.getInt("total"),
            color = o.optString("color", "#fbbf24"),
        )
    }
}

data class MatchSnapshot(
    val matchId: String,
    val mode: String,
    val roomCode: String?,
    val host: String?,
    val matchNumber: Int,
    val round: Int,
    val roundCount: Int,
    val phase: String,
    val roundEndsAt: Long?,
    val intermissionEndsAt: Long?,
    val panorama: String?,
    val players: List<PlayerPublic>,
) {
    companion object {
        fun fromJson(o: JSONObject): MatchSnapshot {
            val pano = o.optJSONObject("panorama")
            val players = o.getJSONArray("players").let { arr ->
                (0 until arr.length()).map { PlayerPublic.fromJson(arr.getJSONObject(it)) }
            }
            return MatchSnapshot(
                matchId = o.getString("matchId"),
                mode = o.getString("mode"),
                roomCode = if (o.isNull("roomCode")) null else o.getString("roomCode"),
                host = if (o.isNull("host")) null else o.getString("host"),
                matchNumber = o.getInt("matchNumber"),
                round = o.getInt("round"),
                roundCount = o.getInt("roundCount"),
                phase = o.getString("phase"),
                roundEndsAt = if (o.isNull("roundEndsAt")) null else o.getLong("roundEndsAt"),
                intermissionEndsAt = if (o.isNull("intermissionEndsAt")) null else o.getLong("intermissionEndsAt"),
                panorama = pano?.getString("key"),
                players = players,
            )
        }
    }
}

data class RoundStart(
    val round: Int,
    val roundEndsAt: Long,
    val durationMs: Long,
    val key: String,
) {
    companion object {
        fun fromJson(o: JSONObject) = RoundStart(
            round = o.getInt("round"),
            roundEndsAt = o.getLong("roundEndsAt"),
            durationMs = o.getLong("durationMs"),
            key = o.getJSONObject("panorama").getString("key"),
        )
    }
}

data class RoundReveal(
    val round: Int,
    val lat: Double,
    val lng: Double,
    val results: List<RoundResult>,
) {
    companion object {
        fun fromJson(o: JSONObject): RoundReveal {
            val loc = o.getJSONObject("location")
            val results = o.getJSONArray("results").let { arr ->
                (0 until arr.length()).map { RoundResult.fromJson(arr.getJSONObject(it)) }
            }
            return RoundReveal(
                round = o.getInt("round"),
                lat = loc.getDouble("lat"),
                lng = loc.getDouble("lng"),
                results = results,
            )
        }
    }
}

data class Intermission(
    val matchNumber: Int,
    val finalRanks: List<Pair<String, Int>>,
    val nextMatchAt: Long,
    val durationMs: Long,
) {
    companion object {
        fun fromJson(o: JSONObject): Intermission {
            val ranks = o.getJSONArray("finalRanks").let { arr ->
                (0 until arr.length()).map { i ->
                    val r = arr.getJSONObject(i)
                    r.getString("nickname") to r.getInt("score")
                }
            }
            return Intermission(
                matchNumber = o.getInt("matchNumber"),
                finalRanks = ranks,
                nextMatchAt = o.getLong("nextMatchAt"),
                durationMs = o.getLong("durationMs"),
            )
        }
    }
}
