import { io, Socket } from "socket.io-client";
import type {
  GameError,
  IntermissionPayload,
  MatchSnapshot,
  NextPanoramaPayload,
  PlayerPublic,
  RoundRevealPayload,
  RoundStartPayload,
} from "./types";

export interface GameEventMap {
  "auth.ok": { nickname: string };
  "auth.error": { message: string };
  "match.snapshot": MatchSnapshot;
  "round.start": RoundStartPayload;
  "round.reveal": RoundRevealPayload;
  "intermission.start": IntermissionPayload;
  "next.panorama": NextPanoramaPayload;
  "player.joined": { nickname: string; host: string | null; players: PlayerPublic[] };
  "player.left": { nickname: string; host: string | null; players: PlayerPublic[] };
  "player.updated": { nickname: string; score: number; guessed: boolean; host: string | null; players: PlayerPublic[] };
  "match.left": Record<string, never>;
  error: GameError;
  "sync.ack": { t0: number; t1: number };
}

export type GameEvent = keyof GameEventMap;

/** Single socket connection + NTP-style clock offset against the server.
 *  All server timestamps are server epoch ms; use serverNow() to render
 *  timers identically across web and Android.
 *
 *  Event dispatch goes through one socket.onAny handler, so (re)connecting
 *  never duplicates listeners. onConnect persists and fires on every
 *  connect (initial + auto-reconnects) so callers can re-auth. */
export class GameClient {
  private socket: Socket | null = null;
  private offset = 0;
  private syncInFlight = false;
  private onConnect: (() => void) | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<GameEvent, Set<(p: unknown) => void>>();

  connect(url: string, onConnect: () => void, onError: (message: string) => void): void {
    this.onConnect = onConnect;
    if (this.socket?.connected) {
      onConnect();
      return;
    }
    // One connect cycle at a time: clear any timer left by an aborted call
    // (StrictMode/dev double-mount arms a second connect() before the first
    // socket ever connects) and kill the stale socket.
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.socket?.disconnect();
    const socket = io(url, {
      transports: ["websocket"],
      timeout: 8000,
      // Retry forever with backoff: a transient outage (server restart)
      // must not leave the tab dead — the next successful connect clears
      // the error via the auth.ok path.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    this.socket = socket;
    socket.onAny((event: string, payload: unknown) => {
      const fns = this.listeners.get(event as GameEvent);
      if (!fns) return;
      fns.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error("net.dispatch-exc", event, e);
        }
      });
    });
    socket.on("connect", () => {
      void this.clockSync();
      this.onConnect?.();
    });
    // Surface ONE user-facing error per connect cycle if the connection
    // hasn't established within 10s. Retries keep running in the
    // background and auto-recover when the server is reachable again.
    this.connectTimer = setTimeout(() => {
      this.connectTimer = null;
      if (!socket.connected) {
        onError("Connection timed out — check the server URL");
      }
    }, 10_000);
  }

  on<K extends GameEvent>(event: K, fn: (payload: GameEventMap[K]) => void): () => void {
    const set = this.listeners.get(event) ?? new Set();
    set.add(fn as (p: unknown) => void);
    this.listeners.set(event, set);
    return () => {
      set.delete(fn as (p: unknown) => void);
    };
  }

  emit(event: string, payload?: unknown): void {
    this.socket?.emit(event, payload);
  }

  /** Estimated current server time (ms epoch). */
  serverNow(): number {
    return Date.now() + this.offset;
  }

  private async clockSync(): Promise<void> {
    if (this.syncInFlight || !this.socket) return;
    this.syncInFlight = true;
    const samples: number[] = [];
    for (let i = 0; i < 3 && this.socket?.connected; i++) {
      const t0 = Date.now();
      const t1 = await new Promise<number>((resolve) => {
        const timer = setTimeout(() => resolve(0), 1000);
        this.socket!.once("sync.ack", (ack: { t0: number; t1: number }) => {
          clearTimeout(timer);
          resolve(ack.t1);
        });
        this.socket!.emit("sync", { t0 });
      });
      if (t1 > 0) {
        const rtt = Date.now() - t0;
        samples.push(t1 - (t0 + rtt / 2));
      }
      await new Promise((r) => setTimeout(r, 40));
    }
    if (samples.length > 0) {
      samples.sort((a, b) => a - b);
      this.offset = samples[Math.floor(samples.length / 2)];
    }
    this.syncInFlight = false;
  }

  disconnect(): void {
    this.onConnect = null;
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
  }
}