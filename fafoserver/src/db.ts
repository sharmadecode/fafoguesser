import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { ENV } from "./config.js";

export interface LeaderboardRow {
  nickname: string;
  score: number;
  mode: string;
  created_at: number;
}

let db: Database.Database | null = null;

// Keep the leaderboard bounded: no auth and auto-restarting quick matches would
// otherwise grow it forever. Keep the best few scores per nickname plus a global
// row ceiling. A unique (nickname, match_number) key is intentionally avoided
// because match_number resets for every match (separate matches would collide).
const MAX_PER_NICKNAME = 5;
const MAX_TOTAL = 1000;

export function initDb(): Database.Database {
  if (db) return db;
  if (ENV.DB_PATH !== ":memory:") {
    fs.mkdirSync(path.dirname(ENV.DB_PATH), { recursive: true });
  }
  db = new Database(ENV.DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nickname TEXT NOT NULL,
      score INTEGER NOT NULL,
      mode TEXT NOT NULL,
      match_number INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_nick ON leaderboard(nickname);
  `);
  return db;
}

export function saveMatchResult(
  nickname: string,
  score: number,
  mode: string,
  matchNumber: number,
): void {
  const database = db ?? initDb();
  // One transaction: insert, then prune per-nickname overflow, then trim the
  // global ceiling. better-sqlite3 caches prepared statements by SQL text, so
  // re-preparing here is cheap and safe.
  const insert = database.prepare(
    `INSERT INTO leaderboard (nickname, score, mode, match_number, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const pruneNick = database.prepare(
    `DELETE FROM leaderboard WHERE nickname = ? AND id NOT IN (
       SELECT id FROM leaderboard WHERE nickname = ?
       ORDER BY score DESC, created_at DESC LIMIT ?
     )`,
  );
  const countAll = database.prepare(`SELECT COUNT(*) AS c FROM leaderboard`);
  const trimGlobal = database.prepare(
    `DELETE FROM leaderboard WHERE id NOT IN (
       SELECT id FROM leaderboard ORDER BY score DESC, created_at ASC LIMIT ?
     )`,
  );
  const tx = database.transaction(() => {
    insert.run(nickname, score, mode, matchNumber, Date.now());
    pruneNick.run(nickname, nickname, MAX_PER_NICKNAME);
    const total = (countAll.get() as { c: number }).c;
    if (total > MAX_TOTAL) {
      trimGlobal.run(MAX_TOTAL);
    }
  });
  tx();
}

export function topScores(limit = 20): LeaderboardRow[] {
  const database = db ?? initDb();
  return database
    .prepare(
      `SELECT nickname, score, mode, created_at
       FROM leaderboard ORDER BY score DESC, created_at ASC LIMIT ?`,
    )
    .all(limit) as unknown as LeaderboardRow[];
}
