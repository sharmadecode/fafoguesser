import { randomUUID } from "node:crypto";
import { Match, ServerIO } from "./matchEngine.js";
import { GAME } from "./config.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class MatchRegistry {
  private matches = new Map<string, Match>();
  private roomCodeToMatch = new Map<string, string>();

  constructor(private readonly io: ServerIO) {}

  create(
    mode: "quick" | "room",
    roomCode: string | null,
    hostNickname: string | null,
  ): Match {
    // Collisions on an 8-char id would silently overwrite a live match.
    let id = randomUUID().slice(0, 8);
    while (this.matches.has(id)) id = randomUUID().slice(0, 8);
    const match = new Match({ id, mode, roomCode, hostNickname, io: this.io });
    this.matches.set(id, match);
    if (roomCode) this.roomCodeToMatch.set(roomCode, id);
    return match;
  }

  get(id: string): Match | undefined {
    return this.matches.get(id);
  }

  getByRoomCode(code: string): Match | undefined {
    const id = this.roomCodeToMatch.get(code);
    if (!id) return undefined;
    const match = this.matches.get(id);
    // A destroyed room must not be resolvable by code again.
    if (!match || match.destroyed) {
      this.roomCodeToMatch.delete(code);
      return undefined;
    }
    return match;
  }

  private remove(id: string): void {
    const match = this.matches.get(id);
    if (match?.roomCode) this.roomCodeToMatch.delete(match.roomCode);
    this.matches.delete(id);
  }

  all(): Match[] {
    return [...this.matches.values()];
  }

  findRejoinable(nickname: string): Match | undefined {
    for (const m of this.matches.values()) {
      const p = m.players.get(nickname);
      if (p && !p.connected && !m.destroyed) return m;
    }
    return undefined;
  }

  /** Called on a timer: remove dead matches and players who gave up reconnecting. */
  sweep(): void {
    const now = Date.now();
    for (const [id, m] of this.matches) {
      if (m.destroyed) {
        this.remove(id);
        continue;
      }
      // Destroy lobbies that never started (waiting rooms / stalled quick).
      if (m.phase === "waiting") {
        const idleMs =
          m.mode === "room" ? GAME.ROOM_IDLE_DESTROY_MS : GAME.QUICK_MATCH_IDLE_DESTROY_MS;
        if (now - m.createdAt > idleMs) {
          m.destroy();
          this.remove(id);
          continue;
        }
      }
      // Collect then remove: removePlayer mutates the map (deletes the entry,
      // may destroy the match), so iterate directly and drop after to stay
      // mutation-safe without an unnecessary array copy.
      const drop: string[] = [];
      for (const [nickname, p] of m.players) {
        if (
          !p.connected &&
          p.disconnectedAt &&
          now - p.disconnectedAt > GAME.DISCONNECT_RETAIN_MS
        ) {
          drop.push(nickname);
        }
      }
      for (const nickname of drop) m.removePlayer(nickname);
      if (m.players.size === 0) {
        m.destroy();
        this.remove(id);
      }
    }
  }

  generateRoomCode(): string {
    for (;;) {
      let code = "";
      for (let i = 0; i < 4; i++) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.getByRoomCode(code)) return code;
    }
  }
}
