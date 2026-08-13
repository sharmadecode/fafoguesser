import { GAME } from "./config.js";

const EARTH_RADIUS_M = 6_371_000;

export function haversineM(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Distance-percentage round scoring: every player's guess maps to
 *  `round(1000 · (1 − d / FULL_SCORE_DISTANCE_M))` — 0 m → 1000, at the max
 *  possible great-circle distance (~20,037 km) → POINTS_MIN. Linear,
 *  independent of the other guesses (no ranking), clamped to
 *  [POINTS_MIN, 1000] so even a far guess scores — only abstains (null /
 *  non-finite, handled by the caller as a hard 0) earn nothing. */
export function pointsForDistance(distanceM: number | null): number {
  if (distanceM === null || !Number.isFinite(distanceM)) return 0;
  const score = 1000 * (1 - distanceM / GAME.FULL_SCORE_DISTANCE_M);
  return Math.max(GAME.POINTS_MIN, Math.min(1000, Math.round(score)));
}
