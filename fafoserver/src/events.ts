import { Server, Socket } from "socket.io";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { validateNickname } from "./auth.js";
import { rateLimit } from "./rateLimit.js";
import { ENV } from "./config.js";
import { MatchRegistry } from "./registry.js";
import { MatchmakingService } from "./matchmaking.js";
import { RoomService } from "./rooms.js";
import type { Match } from "./matchEngine.js";

const authSchema = z.object({
  nickname: z.string(),
  sessionId: z.string().max(64).optional(),
  /** Server-issued session token. Clients present it on later auths; a wrong
   *  token for a known sessionId is rejected. */
  token: z.string().min(16).max(64).optional(),
});
const guessSchema = z.object({
  round: z.number().int().min(0),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const roomJoinSchema = z.object({ code: z.string().min(3).max(6) });
const syncSchema = z.object({ t0: z.number() });

/** Server-issued session tokens, keyed by sessionId (in-memory: a process
 *  restart just mints fresh tokens for re-authenticating clients). */
const issuedTokens = new Map<string, string>();

/** Mint (or return the existing) token for a sessionId. */
function issueToken(sessionId: string): string {
  while (issuedTokens.size >= 1000) {
    const oldest = issuedTokens.keys().next().value;
    if (oldest === undefined) break;
    issuedTokens.delete(oldest);
  }
  let t = issuedTokens.get(sessionId);
  if (!t) {
    t = randomUUID();
    issuedTokens.set(sessionId, t);
  }
  return t;
}

export interface GameServices {
  registry: MatchRegistry;
  matchmaking: MatchmakingService;
  rooms: RoomService;
}

interface SocketData {
  nickname: string | null;
  authed: boolean;
  matchId: string | null;
  sessionId: string | null;
  /** Guards the async quick.play path so a double-tap can't double-join. */
  joiningQuick?: boolean;
}

function isIpv4(s: string): boolean {
  const parts = s.split(".");
  return (
    parts.length === 4 &&
    parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)
  );
}

function ipMatches(ip: string, entry: string): boolean {
  const [base, bitsRaw] = entry.split("/");
  const bits = bitsRaw ? Number(bitsRaw) : 32;
  if (
    !isIpv4(ip) ||
    !isIpv4(base) ||
    !Number.isInteger(bits) ||
    bits < 0 ||
    bits > 32
  ) {
    return false;
  }
  const toInt = (s: string) =>
    s.split(".").reduce((acc, o) => ((acc << 8) | Number(o)) >>> 0, 0);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(base) & mask);
}

/** True when the peer is a reverse proxy on the PROXY_TRUST allowlist, so its
 *  X-Forwarded-For appendings may be trusted. Unset = never trust XFF. */
export function isTrustedProxy(peer: string, proxyTrust: string): boolean {
  if (!proxyTrust || !isIpv4(peer)) return false;
  return proxyTrust
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((entry) => ipMatches(peer, entry));
}

/** Client IP for rate limiting: the rightmost XFF entry only when the peer is
 *  a trusted proxy; otherwise the peer address IS the client (spoofed XFF
 *  never wins). */
function clientIp(socket: Socket): string {
  const peer = socket.handshake.address;
  if (!isTrustedProxy(peer, ENV.PROXY_TRUST)) return peer;
  const xff = socket.handshake.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : typeof xff === "string" ? xff : "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return peer;
  // Scan from right to left to find the first untrusted client IP in the proxy chain
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!isTrustedProxy(parts[i], ENV.PROXY_TRUST)) {
      return parts[i];
    }
  }
  return parts[0];
}

/** Record the device credential on the match player record (first join only). */
function claimSession(match: Match, data: SocketData): void {
  if (data.nickname && data.sessionId) match.claimSession(data.nickname, data.sessionId);
}

/** Resolve the match the socket is attached to, clearing it if the match no
 *  longer exists (e.g. a waiting lobby destroyed while the player was in it). */
function attachedMatch(registry: MatchRegistry, data: SocketData): Match | null {
  if (!data.matchId) return null;
  const match = registry.get(data.matchId);
  if (!match || match.destroyed) {
    data.matchId = null;
    return null;
  }
  return match;
}

/** Attach the socket to a match so it joins the room and receives broadcasts. */
function attachToMatch(socket: Socket, match: Match): void {
  const data = socket.data as SocketData;
  data.matchId = match.id;
  socket.join(match.id);
}

function sendSnapshot(io: Server, socket: Socket, match: Match): void {
  const data = socket.data as SocketData;
  if (!data.nickname) return;
  socket.emit("match.snapshot", match.snapshotFor(data.nickname));
}

function findOnlineSocket(io: Server, nickname: string): Socket | undefined {
  for (const s of io.sockets.sockets.values()) {
    const d = s.data as SocketData;
    if (d.authed && d.nickname === nickname && s.connected) return s;
  }
  return undefined;
}

export function registerSocketHandlers(io: Server, services: GameServices): void {
  const { registry, matchmaking, rooms } = services;

  io.on("connection", (socket) => {
    // Cap new sockets per IP: 45/min still comfortably serves any legit
    // client (incl. reconnect flaps) while cutting off connection floods.
    if (!rateLimit(clientIp(socket), "connect", 45, 60_000)) {
      socket.disconnect(true);
      return;
    }
    socket.data = { nickname: null, authed: false, matchId: null, sessionId: null } satisfies SocketData;

    // A socket that never authenticates must not linger forever (abandoned
    // connections, dead clients): disconnect it after a short grace period.
    let unauthedReap = setTimeout(() => {
      const d = socket.data as SocketData;
      if (!d.authed) socket.disconnect(true);
    }, 10_000);
    unauthedReap.unref();

    socket.on("sync", (raw: unknown) => {
      if (!rateLimit(clientIp(socket), "sync", 120, 60_000)) return;
      const parsed = syncSchema.safeParse(raw);
      if (!parsed.success) return;
      socket.emit("sync.ack", { t0: parsed.data.t0, t1: Date.now() });
    });

    socket.on("auth", (raw: unknown) => {
      const data = socket.data as SocketData;
      if (data.authed) return;
      if (!rateLimit(clientIp(socket), "auth", 30, 60_000)) {
        socket.emit("auth.error", { message: "rate_limited" });
        return;
      }
      const parsed = authSchema.safeParse(raw);
      const nickname = parsed.success ? validateNickname(parsed.data.nickname) : null;
      if (!nickname) {
        socket.emit("auth.error", { message: "invalid_nickname" });
        return;
      }
      // Session id = device credential. Below 16 chars it carries no
      // credential weight: short ids are trivially guessable, so they behave
      // exactly like no credential at all instead of squatting another
      // device's nickname.
      const rawSession = parsed.success ? (parsed.data.sessionId ?? "") : "";
      const sessionId = rawSession.length >= 16 ? rawSession : "";
      data.sessionId = sessionId;
      const token = parsed.success ? (parsed.data.token ?? "") : "";
      // If a token was previously issued and a mismatched token is presented, reject.
      const issued = sessionId ? issuedTokens.get(sessionId) : undefined;
      if (sessionId && token && issued && token !== issued) {
        socket.emit("auth.error", { message: "session_mismatch" });
        return;
      }

      // Rejoin: this nickname is in a match with a dead connection.
      const rejoinMatch = registry.findRejoinable(nickname);
      if (rejoinMatch) {
        if (rejoinMatch.rejoinPlayer(nickname, socket.id, sessionId || null)) {
          clearTimeout(unauthedReap);
          data.authed = true;
          data.nickname = nickname;
          attachToMatch(socket, rejoinMatch);
          socket.emit("auth.ok", { nickname, ...(sessionId ? { token: issueToken(sessionId) } : {}) });
          sendSnapshot(io, socket, rejoinMatch);
          return;
        }
        // Only the original device may resume the match — reject without
        // destroying the record, so an attacker can't boot the real owner
        // out of their reconnect window. A credential-less auth is subject
        // to the same rule once the player has a recorded sessionId.
        if (sessionId && rejoinMatch.windowExpiredFor(nickname, sessionId)) {
          // The CORRECT credential arrived but the reconnect window already
          // closed — the zombie record must not lock the legitimate owner
          // out of their nickname. Drop it and continue as a fresh player
          // (any other credential still hits session_mismatch above).
          rejoinMatch.removePlayer(nickname);
        } else if (sessionId) {
          socket.emit("auth.error", { message: "session_mismatch" });
          return;
        } else {
          const stale = rejoinMatch.players.get(nickname);
          if (stale && !stale.connected) {
            if (stale.sessionId) {
              socket.emit("auth.error", { message: "session_mismatch" });
              return;
            }
            // Reconnect window expired and the player never recorded a
            // credential: drop the zombie record so they can start fresh.
            rejoinMatch.removePlayer(nickname);
          }
        }
      }

      // One active session per nickname.
      const online = findOnlineSocket(io, nickname);
      if (online) {
        // Same device reconnecting after its socket dropped (tab crash,
        // network flap): the old socket is a zombie squatting the nickname.
        // Kick it so the same credential takes over; any other client is
        // squatting and stays rejected.
        if (sessionId && online.data.sessionId === sessionId) {
          online.disconnect(true);
        } else {
          socket.emit("auth.error", { message: "already_online" });
          return;
        }
      }

      clearTimeout(unauthedReap);
      data.authed = true;
      data.nickname = nickname;
      socket.emit("auth.ok", { nickname, ...(sessionId ? { token: issueToken(sessionId) } : {}) });
    });

    socket.on("quick.play", async () => {
      const data = socket.data as SocketData;
      if (!data.authed || !data.nickname) {
        socket.emit("error", { code: "not_authed" });
        return;
      }
      if (!rateLimit(clientIp(socket), "play", 10, 60_000)) {
        socket.emit("error", { code: "rate_limited" });
        return;
      }
      const current = attachedMatch(registry, data);
      if (current) {
        sendSnapshot(io, socket, current);
        return;
      }
      if (data.joiningQuick) return; // an identical emit is already in flight
      data.joiningQuick = true;
      const match = await matchmaking.joinQuick(data.nickname, socket.id);
      data.joiningQuick = false;
      if (match.destroyed) {
        socket.emit("error", { code: "match_gone" });
        return;
      }
      // Attach the socket to the match BEFORE starting it, so round.start
      // broadcasts reach this player.
      attachToMatch(socket, match);
      claimSession(match, data);
      // Send the snapshot immediately so the client transitions off the
      // "Finding match…" screen right away — round.start fires when the
      // panorama is ready (beginMatch awaits the Mapillary API).
      sendSnapshot(io, socket, match);
      if (!match.started) {
        void match.beginMatch().then(() => {
          // Re-sync every player's snapshot once the match is running so all
          // clients get the full payload (phase=playing, panorama, roundEndsAt).
          match.broadcastSnapshots();
        }).catch(() => {});
      }
    });

    socket.on("room.create", () => {
      const data = socket.data as SocketData;
      if (!data.authed || !data.nickname) {
        socket.emit("error", { code: "not_authed" });
        return;
      }
      if (!rateLimit(clientIp(socket), "room.create", 10, 60_000)) {
        socket.emit("error", { code: "rate_limited" });
        return;
      }
      if (attachedMatch(registry, data)) {
        socket.emit("error", { code: "in_match" });
        return;
      }
      const match = rooms.create(data.nickname, socket.id);
      attachToMatch(socket, match);
      claimSession(match, data);
      sendSnapshot(io, socket, match);
    });

    socket.on("room.join", (raw: unknown) => {
      const data = socket.data as SocketData;
      if (!data.authed || !data.nickname) {
        socket.emit("error", { code: "not_authed" });
        return;
      }
      if (attachedMatch(registry, data)) {
        socket.emit("error", { code: "in_match" });
        return;
      }
      if (!rateLimit(clientIp(socket), "room.join", 20, 60_000)) {
        socket.emit("error", { code: "rate_limited" });
        return;
      }
      const parsed = roomJoinSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit("error", { code: "invalid_code" });
        return;
      }
      const result = rooms.join(parsed.data.code, data.nickname, socket.id);
      if (!result.ok || !result.match) {
        socket.emit("error", { code: result.error ?? "room_join_failed" });
        return;
      }
      attachToMatch(socket, result.match);
      claimSession(result.match, data);
      sendSnapshot(io, socket, result.match);
    });

    socket.on("room.start", (raw: unknown) => {
      const data = socket.data as SocketData;
      if (!data.authed || !data.nickname) {
        socket.emit("error", { code: "not_authed" });
        return;
      }
      if (!rateLimit(clientIp(socket), "room.start", 10, 60_000)) {
        socket.emit("error", { code: "rate_limited" });
        return;
      }
      const parsed = roomJoinSchema.safeParse(raw ?? { code: "" });
      const code = parsed.success ? parsed.data.code : "";
      const result = rooms.start(code, data.nickname);
      if (!result.ok || !result.match) {
        socket.emit("error", { code: result.error ?? "room_start_failed" });
        return;
      }
      const match = result.match;
      // Confirm the lobby state immediately, then kick off the match. Once
      // round 0 is live, every player (host + guests) gets a fresh phase=playing
      // snapshot so nobody is stuck with a "waiting" canPick state.
      sendSnapshot(io, socket, match);
      if (!match.started) {
        void match.beginMatch().then(() => {
          match.broadcastSnapshots();
        }).catch(() => {});
      }
    });

    socket.on("guess", (raw: unknown) => {
      const data = socket.data as SocketData;
      if (!data.authed || !data.nickname) {
        socket.emit("error", { code: "not_authed" });
        return;
      }
      const parsed = guessSchema.safeParse(raw);
      if (!parsed.success) {
        socket.emit("error", { code: "invalid_guess" });
        return;
      }
      const match = attachedMatch(registry, data);
      if (!match) {
        socket.emit("error", { code: "not_in_match" });
        return;
      }
      if (!rateLimit(clientIp(socket), "guess", 60, 60_000)) {
        socket.emit("error", { code: "rate_limited" });
        return;
      }
      const result = match.submitGuess(
        data.nickname,
        parsed.data.round,
        parsed.data.lat,
        parsed.data.lng,
      );
      if (!result.ok) {
        socket.emit("error", { code: result.error ?? "guess_failed" });
      }
    });

    socket.on("leave", () => {
      if (!rateLimit(clientIp(socket), "leave", 20, 60_000)) return;
      const data = socket.data as SocketData;
      const match = data.matchId ? registry.get(data.matchId) : undefined;
      socket.leave(data.matchId ?? "");
      data.matchId = null;
      if (match && !match.destroyed && data.nickname) {
        match.removePlayer(data.nickname);
      }
      socket.emit("match.left", {});
    });

    socket.on("disconnect", () => {
      clearTimeout(unauthedReap);
      const data = socket.data as SocketData;
      if (data.matchId && data.nickname) {
        const match = registry.get(data.matchId);
        if (match && !match.destroyed) {
          match.markDisconnected(data.nickname);
        }
      }
    });
  });
}


