import { Match } from "./matchEngine.js";
import { MatchRegistry } from "./registry.js";

export interface JoinResult {
  ok: boolean;
  error?: string;
  match?: Match;
}

export class RoomService {
  constructor(private readonly registry: MatchRegistry) {}

  create(hostNickname: string, socketId: string): Match {
    const code = this.registry.generateRoomCode();
    const match = this.registry.create("room", code, hostNickname);
    match.addPlayer(hostNickname, socketId);
    return match;
  }

  join(code: string, nickname: string, socketId: string): JoinResult {
    const match = this.registry.getByRoomCode(code.toUpperCase().trim());
    if (!match) return { ok: false, error: "room_not_found" };
    if (match.isFull) return { ok: false, error: "room_full" };
    if (match.players.has(nickname)) return { ok: false, error: "already_in_room" };
    // Started matches are joinable mid-round (like quick play): the joiner
    // lands with a snapshot of the live round and plays the rest of the
    // match. The room code stays valid while the match runs.
    match.addPlayer(nickname, socketId);
    return { ok: true, match };
  }

  start(code: string, hostNickname: string): JoinResult {
    const match = this.registry.getByRoomCode(code.toUpperCase().trim());
    if (!match) return { ok: false, error: "room_not_found" };
    if (match.hostNickname !== hostNickname) return { ok: false, error: "not_host" };
    if (match.started) return { ok: false, error: "already_started" };
    // The caller (socket handler) starts beginMatch() so it can send an
    // immediate snapshot and re-sync once round 0 is live.
    return { ok: true, match };
  }
}
