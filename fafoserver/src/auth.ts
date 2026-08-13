import { GAME } from "./config.js";

export function validateNickname(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length < GAME.NICKNAME_MIN || value.length > GAME.NICKNAME_MAX) return null;
  if (!GAME.NICKNAME_RE.test(value)) return null;
  return value;
}
