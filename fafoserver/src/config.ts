import "dotenv/config";

export const ENV = {
  PORT: Number(process.env.PORT ?? 8787),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  MAPILLARY_TOKEN: process.env.MAPILLARY_TOKEN ?? "",
  // Comma-separated exact IPv4s and/or CIDRs of reverse proxies whose
  // X-Forwarded-For appendings may be trusted (e.g. Render's LB). Empty =
  // never trust XFF: rate limits key on the socket peer address.
  PROXY_TRUST: process.env.PROXY_TRUST ?? "",
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};

export const GAME = {
  ROUNDS_PER_MATCH: 5,
  ROUND_DURATION_MS: 30_000,
  INTERMISSION_MS: 20_000,
  ROUND_PAUSE_MS: 10_000,
  MAX_PLAYERS: 5,
  // Distance-percentage scoring: a guess scores 1000 − (d/20,037,000)·1000
  // (linear: 0 km → 1000, at the max possible ~20,037 km away → POINTS_MIN),
  // computed for EVERY player independently — no ranking. A pinned guess
  // always earns at least POINTS_MIN (only abstaining is a hard 0).
  FULL_SCORE_DISTANCE_M: 20_037_000, // max great-circle distance ≈ Earth's half-circumference
  POINTS_MIN: 25,
  PLAYER_COLORS: ["#84cc16", "#60a5fa", "#f472b6", "#a78bfa", "#fbbf24"],
  NICKNAME_MIN: 2,
  NICKNAME_MAX: 16,
  NICKNAME_RE: /^[A-Za-z0-9_]+$/,
  DISCONNECT_RETAIN_MS: 30_000,
  RECONNECT_WINDOW_MS: 30_000,
  QUICK_MATCH_IDLE_DESTROY_MS: 60_000,
  ROOM_IDLE_DESTROY_MS: 10 * 60_000,
  GUESS_LAT_RANGE: [-90, 90] as const,
  GUESS_LNG_RANGE: [-180, 180] as const,
};
