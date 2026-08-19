// Mirrors the server protocol (fafoserver/src/types.ts + events).

export interface PlayerPublic {
  nickname: string;
  score: number;
  guessed: boolean;
  connected: boolean;
  color: string;
}

export interface RoundResult {
  nickname: string;
  lat: number | null;
  lng: number | null;
  distanceM: number | null;
  points: number;
  total: number;
  color: string;
}

export interface MatchSnapshot {
  matchId: string;
  mode: "quick" | "room";
  roomCode: string | null;
  host: string | null;
  matchNumber: number;
  round: number;
  roundCount: number;
  phase: "playing" | "intermission" | "waiting";
  roundEndsAt: number | null;
  intermissionEndsAt: number | null;
  durationMs: number;
  panorama: { key: string } | null;
  you: { nickname: string; score: number };
  players: PlayerPublic[];
}

export interface RoundStartPayload {
  round: number;
  roundEndsAt: number;
  durationMs: number;
  panorama: { key: string };
}

export interface RoundRevealPayload {
  round: number;
  location: { lat: number; lng: number };
  results: RoundResult[];
}

export interface IntermissionPayload {
  matchNumber: number;
  finalRanks: { nickname: string; score: number }[];
  nextMatchAt: number;
  durationMs: number;
}

export interface GameError {
  code: string;
}
