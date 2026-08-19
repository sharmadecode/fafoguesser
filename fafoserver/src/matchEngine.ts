import { GAME, ENV } from "./config.js";
import { pickRandomLocation, PickedLocation } from "./locations.js";
import { mintKey, warmPanorama, warmPanoramaVerified, evictPano } from "./panoProxy.js";
import { haversineM, pointsForDistance } from "./scoring.js";
import type {
  FinalRank,
  IntermissionPayload,
  MatchSnapshot,
  PlayerPublic,
  RoundRevealPayload,
  RoundStartPayload,
} from "./types.js";

export interface ServerIO {
  emitToSocket(socketId: string, event: string, payload: unknown): void;
  emitToMatch(matchId: string, event: string, payload: unknown): void;
}

interface EnginePlayer {
  nickname: string;
  socketId: string;
  score: number;
  guessed: boolean;
  guess: { lat: number; lng: number } | null;
  connected: boolean;
  disconnectedAt: number | null;
  color: string;
  /** Device credential recorded on first join; a rejoin only succeeds if the
   *  incoming auth carries the same sessionId. */
  sessionId: string | null;
}

type Phase = "waiting" | "playing" | "intermission";

interface MatchOptions {
  id: string;
  mode: "quick" | "room";
  roomCode: string | null;
  hostNickname: string | null;
  io: ServerIO;
}

export class Match {
  readonly id: string;
  readonly mode: "quick" | "room";
  readonly roomCode: string | null;
  readonly createdAt = Date.now();
  hostNickname: string | null;
  readonly players = new Map<string, EnginePlayer>();
  matchNumber = 1;
  round = 0;
  phase: Phase = "waiting";
  roundEndsAt: number | null = null;
  intermissionEndsAt: number | null = null;
  started = false;
  destroyed = false;

  private location: PickedLocation | null = null;
  private panoKey: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private warmNext: Promise<PickedLocation> | null = null;
  /** Consecutive auto-restarts with an unchanged roster — the same tiny group
   *  restarting forever would burn panos and match slots, so dissolve it. */
  private restartCount = 0;
  private restartRoster = "";
  private readonly io: ServerIO;

  constructor(opts: MatchOptions) {
    this.id = opts.id;
    this.mode = opts.mode;
    this.roomCode = opts.roomCode;
    this.hostNickname = opts.hostNickname;
    this.io = opts.io;
  }

  private ensureWarm(): Promise<PickedLocation> {
    // Pre-fetch the next round's panorama while the current round plays so
    // round starts are instant instead of waiting on the Mapillary API.
    if (!this.warmNext) this.warmNext = pickRandomLocation();
    return this.warmNext;
  }

  private emitToMatch(event: string, payload: unknown): void {
    this.io.emitToMatch(this.id, event, payload);
  }

  get isFull(): boolean {
    return this.players.size >= GAME.MAX_PLAYERS;
  }

  /** True when at least one player holds a live socket (any live body). */
  private anyConnected(): boolean {
    return [...this.players.values()].some((p) => p.connected);
  }

  get publicPlayers(): PlayerPublic[] {
    return [...this.players.values()]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({
        nickname: p.nickname,
        score: p.score,
        guessed: p.guessed,
        connected: p.connected,
        color: p.color,
      }));
  }

  private nextColorIndex = 0;

  private assignColor(): string {
    const colors = GAME.PLAYER_COLORS;
    // Pick the first color not currently in use, falling back to round-robin.
    const used = new Set([...this.players.values()].map((p) => p.color));
    const free = colors.find((c) => !used.has(c));
    if (free) return free;
    const c = colors[this.nextColorIndex % colors.length];
    this.nextColorIndex++;
    return c;
  }

  addPlayer(nickname: string, socketId: string): void {
    const existing = this.players.get(nickname);
    if (existing) {
      existing.socketId = socketId;
      existing.connected = true;
      existing.disconnectedAt = null;
      return;
    }
    this.players.set(nickname, {
      nickname,
      socketId,
      score: 0,
      guessed: false,
      guess: null,
      connected: true,
      disconnectedAt: null,
      color: this.assignColor(),
      sessionId: null,
    });
    if (!this.hostNickname && this.mode === "room") this.hostNickname = nickname;
    this.emitToMatch("player.joined", {
      nickname,
      host: this.hostNickname,
      players: this.publicPlayers,
    });
  }

  removePlayer(nickname: string): void {
    const p = this.players.get(nickname);
    if (!p) return;
    if (this.mode === "room" && this.hostNickname === nickname) {
      // Hand the host role to the first still-connected player; only fall
      // back to a disconnected one (or nobody) if every other player is gone.
      const others = [...this.players.values()].filter((q) => q.nickname !== nickname);
      const next = others.find((q) => q.connected) ?? others[0];
      this.hostNickname = next?.nickname ?? null;
    }
    this.players.delete(nickname);
    this.emitToMatch("player.left", {
      nickname,
      host: this.hostNickname,
      players: this.publicPlayers,
    });
    if (this.players.size === 0) this.destroy();
  }

  markDisconnected(nickname: string): void {
    const p = this.players.get(nickname);
    if (!p) return;
    p.connected = false;
    p.disconnectedAt = Date.now();
    // A host vanishing stalls the game — in the lobby guests can't start, in
    // a running match the room start is not needed but later rounds/restart
    // still route through the host. Hand the room over to a connected player
    // immediately in ANY phase; only fall back to a disconnected one if every
    // other player is gone.
    if (this.mode === "room" && this.hostNickname === nickname) {
      const others = [...this.players.values()].filter((q) => q.nickname !== nickname);
      const next = others.find((q) => q.connected) ?? others[0];
      if (next) this.hostNickname = next.nickname;
    }
    this.emitToMatch("player.updated", {
      nickname,
      score: p.score,
      guessed: p.guessed,
      host: this.hostNickname,
      players: this.publicPlayers,
    });
  }

  rejoinPlayer(nickname: string, socketId: string, sessionId: string | null): boolean {
    const p = this.players.get(nickname);
    if (!p || p.connected) return false;
    if (
      p.disconnectedAt &&
      Date.now() - p.disconnectedAt > GAME.RECONNECT_WINDOW_MS
    ) {
      return false;
    }
    // A device that recorded a credential can only be resumed by that same
    // credential; otherwise an attacker could seize a nickname mid-match.
    if (p.sessionId && p.sessionId !== sessionId) return false;
    if (!p.sessionId && sessionId) p.sessionId = sessionId;
    p.socketId = socketId;
    p.connected = true;
    p.disconnectedAt = null;
    this.emitToMatch("player.updated", {
      nickname,
      score: p.score,
      guessed: p.guessed,
      host: this.hostNickname,
      players: this.publicPlayers,
    });
    return true;
  }

  /** True when the record holds the given credential but its reconnect window
   *  has already closed — the legitimate owner may start fresh instead of
   *  being locked out of their nickname forever by a zombie record. */
  windowExpiredFor(nickname: string, sessionId: string | null): boolean {
    const p = this.players.get(nickname);
    if (!p || p.connected || !sessionId || !p.disconnectedAt) return false;
    if (p.sessionId && p.sessionId !== sessionId) return false;
    return Date.now() - p.disconnectedAt > GAME.RECONNECT_WINDOW_MS;
  }

  /** Record the device credential on the player record (first join only). */
  claimSession(nickname: string, sessionId: string): void {
    const p = this.players.get(nickname);
    if (p && !p.sessionId && sessionId) p.sessionId = sessionId;
  }

  snapshotFor(nickname: string): MatchSnapshot {
    const you = this.players.get(nickname);
    return {
      matchId: this.id,
      mode: this.mode,
      roomCode: this.roomCode,
      host: this.hostNickname,
      matchNumber: this.matchNumber,
      round: this.round,
      roundCount: GAME.ROUNDS_PER_MATCH,
      phase: this.phase,
      roundEndsAt: this.roundEndsAt,
      intermissionEndsAt: this.intermissionEndsAt,
      durationMs: GAME.ROUND_DURATION_MS,
      panorama:
        this.location && this.panoKey
          ? { key: this.panoKey }
          : null,
      you: { nickname, score: you?.score ?? 0 },
      players: this.publicPlayers,
    };
  }

  /**
   * Push a fresh, per-player snapshot to every player in the match. Called
   * after a round starts so ALL clients (host + guests, incl. late joiners)
   * flip to phase=playing and become pickable — previously only the host
   * received the playing snapshot on room start.
   */
  broadcastSnapshots(): void {
    for (const [nickname, p] of this.players) {
      this.io.emitToSocket(p.socketId, "match.snapshot", this.snapshotFor(nickname));
    }
  }

  async beginMatch(): Promise<void> {
    if (this.started || this.destroyed) return;
    this.started = true;
    await this.beginRound(0);
  }

  private async beginRound(round: number): Promise<void> {
    if (this.destroyed) return;
    this.phase = "playing";
    this.round = round;
    this.roundEndsAt = null;
    const locationPromise = this.ensureWarm();
    this.warmNext = null;
    let location: PickedLocation;
    try {
      location = await locationPromise;
    } catch {
      // The picker is built to never throw, but a round must never die on it.
      location = { imageId: "test-loc-1", lat: 0, lng: 0 };
    }
    if (this.destroyed) return;
    // Never begin a round on an image the proxy can't serve: verify the bytes
    // are fetchable (bounded — ~3.5s per attempt, 2 attempts) and re-pick on
    // failure. If every attempt fails the round still starts with the last
    // pick (graceful degradation) rather than dying on the picker. Skipped
    // without MAPILLARY_TOKEN: dev/test placeholder images are knowingly
    // unservable and there is nothing real to verify.
    if (ENV.MAPILLARY_TOKEN) {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (await warmPanoramaVerified(location.imageId, 3_500)) break;
        console.warn(`[match] pano unfetchable, re-picking (attempt ${attempt + 1})`);
        try {
          location = await pickRandomLocation();
        } catch {
          break;
        }
      }
    }
    if (this.destroyed) return;
    // Evict previous round's cached panorama bytes now that the new round is starting.
    if (this.location?.imageId && this.location.imageId !== location.imageId) {
      evictPano(this.location.imageId);
    }
    this.location = location;
    this.panoKey = mintKey(location.imageId);
    // Start fetching the bytes now (single-flight; the verify above likely
    // already warmed them) so the first client request is instant.
    warmPanorama(location.imageId);
    for (const p of this.players.values()) {
      p.guessed = false;
      p.guess = null;
    }
    const endAt = Date.now() + GAME.ROUND_DURATION_MS;
    this.roundEndsAt = endAt;
    const startPayload: RoundStartPayload = {
      round,
      roundEndsAt: endAt,
      durationMs: GAME.ROUND_DURATION_MS,
      panorama: { key: this.panoKey },
    };
    this.emitToMatch("round.start", startPayload);
    this.schedule(endAt, () => this.finishRound());
  }

  // Pre-pick + warm the NEXT round's panorama during the pause, so the next
  // beginRound is instant and the bytes are cached server-side. The pano KEY
  // (and thus the location) is only ever handed out at round.start — clients
  // can never fetch the next location before its round begins (the old
  // next.panorama preload let them, which leaked the next location's key
  // during the reveal pause; the server-side warm makes the client preload
  // redundant anyway).
  private prepareNextRound(): void {
    this.warmNext = pickRandomLocation();
    void this.warmNext
      .then((loc) => warmPanorama(loc.imageId))
      .catch(() => {});
  }

  submitGuess(
    nickname: string,
    round: number,
    lat: number,
    lng: number,
  ): { ok: boolean; error?: string } {
    const p = this.players.get(nickname);
    if (!p) return { ok: false, error: "not_in_match" };
    if (this.phase !== "playing") return { ok: false, error: "round_closed" };
    if (round !== this.round) return { ok: false, error: "wrong_round" };
    if (Date.now() >= (this.roundEndsAt ?? 0)) {
      return { ok: false, error: "time_expired" };
    }
    // The LAST pin wins: clients auto-submit on every pin move, so repeated
    // guesses during the round simply overwrite the previous one.
    p.guessed = true;
    p.guess = { lat, lng };
    this.emitToMatch("player.updated", {
      nickname,
      score: p.score,
      guessed: true,
      host: this.hostNickname,
      players: this.publicPlayers,
    });
    // Every round runs its FULL duration: the reveal (and the next map) fires
    // on the shared deadline so all players transition together, whether they
    // locked in a guess after 5s or 29s.
    return { ok: true };
  }

  private finishRound(): void {
    if (this.destroyed || this.phase !== "playing") return;
    this.clearTimer();
    // Every player dropped mid-round — the match is a zombie. Skip reveal and
    // next-round work; the registry sweep removes the destroyed match shortly.
    if (!this.anyConnected()) {
      this.destroy();
      return;
    }
    const location = this.location!;
    const roster = [...this.players.values()];
    const distances = roster.map((p) =>
      p.guess
        ? haversineM(p.guess.lat, p.guess.lng, location.lat, location.lng)
        : null,
    );
    // Distance-percentage: every guess scores independently
    // (1000 at 0 m → POINTS_MIN at the max ~20,037 km away); abstaining earns 0.
    const results = roster
      .map((p, i) => {
        const distanceM = distances[i];
        const pts = p.guess ? pointsForDistance(distanceM) : 0;
        p.score += pts;
        return {
          nickname: p.nickname,
          lat: p.guess?.lat ?? null,
          lng: p.guess?.lng ?? null,
          distanceM,
          points: pts,
          total: p.score,
          color: p.color,
        };
      })
      .sort((a, b) => b.total - a.total || b.points - a.points);
    const payload: RoundRevealPayload = {
      round: this.round,
      location: { lat: location.lat, lng: location.lng },
      results,
    };
    this.emitToMatch("round.reveal", payload);
    for (const r of results) {
      const p = this.players.get(r.nickname);
      if (p) {
        this.io.emitToSocket(p.socketId, "player.updated", {
          nickname: r.nickname,
          score: r.total,
          guessed: p.guessed,
          host: this.hostNickname,
          players: this.publicPlayers,
        });
      }
    }
    if (this.round + 1 < GAME.ROUNDS_PER_MATCH) {
      // Pre-pick + warm the next panorama at reveal time (never mid-round,
      // so the next location can't be studied early).
      this.prepareNextRound();
      this.schedule(Date.now() + GAME.ROUND_PAUSE_MS, () => void this.beginRound(this.round + 1));
    } else {
      // Final round: still show the actual-location reveal for the full pause
      // before dropping to the leaderboard (otherwise the intermission overlay
      // instantly covered the final reveal).
      this.schedule(Date.now() + GAME.ROUND_PAUSE_MS, () => void this.startIntermission());
    }
  }

  private async startIntermission(): Promise<void> {
    if (this.destroyed) return;
    // All players dropped before the final reveal — no one is left to see the
    // leaderboard, so destroy instead of scheduling a zombie restart.
    if (!this.anyConnected()) {
      this.destroy();
      return;
    }
    // Evict the final round's cached panorama bytes before intermission.
    if (this.location?.imageId) {
      evictPano(this.location.imageId);
    }
    this.phase = "intermission";
    const ranks: FinalRank[] = [...this.players.values()]
      .map((p) => ({ nickname: p.nickname, score: p.score }))
      .sort((a, b) => b.score - a.score);
    const endAt = Date.now() + GAME.INTERMISSION_MS;
    this.intermissionEndsAt = endAt;
    const payload: IntermissionPayload = {
      matchNumber: this.matchNumber,
      finalRanks: ranks,
      nextMatchAt: endAt,
      durationMs: GAME.INTERMISSION_MS,
    };
    this.emitToMatch("intermission.start", payload);
    // Warm the first round of the next match during the 20s intermission.
    this.prepareNextRound();
    this.schedule(endAt, () => void this.restartMatch().catch(() => {}));
  }

  private async restartMatch(): Promise<void> {
    if (this.destroyed) return;
    // Nobody reconnected during the intermission — destroy instead of
    // auto-restarting a zombie match.
    if (!this.anyConnected()) {
      this.destroy();
      return;
    }
    // The same tiny roster auto-restarting forever burns panos and match
    // slots (queue poisoning for fresh quick players). After 3 consecutive
    // restarts without roster growth, dissolve the match so the players
    // re-enter matchmaking fresh.
    const roster = [...this.players.keys()].sort().join(",");
    if (roster === this.restartRoster) {
      this.restartCount++;
    } else {
      this.restartRoster = roster;
      this.restartCount = 0;
    }
    if (this.restartCount > 3 && this.players.size <= 2) {
      this.destroy();
      return;
    }
    this.matchNumber += 1;
    this.round = 0;
    this.intermissionEndsAt = null;
    for (const p of this.players.values()) {
      p.score = 0;
      p.guessed = false;
      p.guess = null;
    }
    await this.beginRound(0);
    // Re-sync every player's snapshot so clients that joined mid-intermission
    // flip phase back to "playing" (their pre-restart snapshot said
    // "intermission" and would otherwise keep them un-pickable forever).
    this.broadcastSnapshots();
  }

  private schedule(at: number, fn: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(fn, Math.max(0, at - Date.now()));
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearTimer();
    if (this.location?.imageId) {
      evictPano(this.location.imageId);
    }
    // Tell anyone still attached (e.g. an expired waiting lobby) to bail out.
    this.emitToMatch("match.left", {});
  }
}
