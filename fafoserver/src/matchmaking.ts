import { Match } from "./matchEngine.js";
import { MatchRegistry } from "./registry.js";

const PHASE_PREF = { playing: 0, intermission: 1, waiting: 2 } as const;

export class MatchmakingService {
  constructor(private readonly registry: MatchRegistry) {}

  /** Join the best available quick match, or create a fresh one. */
  async joinQuick(nickname: string, socketId: string): Promise<Match> {
    const candidates = this.registry
      .all()
      .filter(
        (m) =>
          m.mode === "quick" &&
          !m.isFull &&
          !m.destroyed &&
          !m.players.has(nickname),
      );
    const connectedOf = (m: Match) =>
      [...m.players.values()].filter((p) => p.connected).length;
    // Prefer the fullest live match (never feed a fresh player into a zombie
    // room), then the round with the most time left, then intermission/waiting.
    candidates.sort(
      (a, b) =>
        PHASE_PREF[a.phase] - PHASE_PREF[b.phase] ||
        connectedOf(b) - connectedOf(a) ||
        a.round - b.round ||
        b.players.size - a.players.size,
    );

    let match = candidates[0];
    if (!match) {
      match = this.registry.create("quick", null, null);
    }
    match.addPlayer(nickname, socketId);
    return match;
  }
}
