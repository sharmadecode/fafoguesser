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
  // Clamp the haversine argument to [0, 1]: floating-point rounding can push
  // it a hair above 1 at exact antipodes, making sqrt(>1) NaN which would
  // silently score the guess as 0. NaN safety guard for callers.
  const s = Math.min(
    1,
    Math.max(0, Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2),
  );
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

/** Distance-percentage scoring: `round(1000 · (1 − d / FULL_SCORE_DISTANCE_M))`
 *  — 0 m → 1000, at the max great-circle distance → POINTS_MIN. Linear, no
 *  ranking; every attempt scores at least POINTS_MIN (only abstains earn 0). */
export function pointsForDistance(distanceM: number | null): number {
  if (distanceM === null || !Number.isFinite(distanceM)) return 0;
  const score = 1000 * (1 - distanceM / GAME.FULL_SCORE_DISTANCE_M);
  return Math.max(GAME.POINTS_MIN, Math.min(1000, Math.round(score)));
}
