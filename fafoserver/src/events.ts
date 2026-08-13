import { Server, Socket } from "socket.io";
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
});
const guessSchema = z.object({
  round: z.number().int().min(0),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
const roomJoinSchema = z.object({ code: z.string().min(3).max(6) });
const syncSchema = z.object({ t0: z.number() });

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
}

/** Client IP for rate limiting. In production a reverse proxy gives every
 *  socket the proxy's IP, so we take the real client from the rightmost
 *  X-Forwarded-For entry (the one the proxy appends). In dev, the peer is
 *  the client. */
function clientIp(socket: Socket): string {
  if (ENV.NODE_ENV !== "production") return socket.handshake.address;
  // trust proxy is 1, so the rightmost XFF entry is the real client; anything
  // to the left is client-controlled and ignored.
  const xff = socket.handshake.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : typeof xff === "string" ? xff : "";
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length > 0) return parts[parts.length - 1];
  return socket.handshake.address;
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
    
    if (!rateLimit(clientIp(socket), "connect", 30, 60_000)) {
      socket.disconnect(true);
      return;
    }
    socket.data = { nickname: null, authed: false, matchId: null, sessionId: null } satisfies SocketData;

    socket.on("sync", (raw: unknown) => {
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
      const sessionId = parsed.success ? (parsed.data.sessionId ?? "") : "";
      data.sessionId = sessionId;

      // Rejoin: this nickname is in a match with a dead connection.
      const rejoinMatch = registry.findRejoinable(nickname);
      if (rejoinMatch) {
        if (rejoinMatch.rejoinPlayer(nickname, socket.id, sessionId || null)) {
          data.authed = true;
          data.nickname = nickname;
          attachToMatch(socket, rejoinMatch);
          socket.emit("auth.ok", { nickname });
          sendSnapshot(io, socket, rejoinMatch);
          return;
        }
        // Rejoin rejected: connected, window expired, or wrong credential.
        // Only the original device may resume the match â€” reject without
        // destroying the record, so an attacker can't boot the real owner
        // out of their reconnect window. A credential-less auth is subject
        // to the same rule once the player has a recorded sessionId.
        if (sessionId) {
          socket.emit("auth.error", { message: "session_mismatch" });
          return;
        }
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

      // One active session per nickname.
      const online = findOnlineSocket(io, nickname);
      if (online) {
        socket.emit("auth.error", { message: "already_online" });
        return;
      }

      data.authed = true;
      data.nickname = nickname;
      socket.emit("auth.ok", { nickname });
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
      const match = await matchmaking.joinQuick(data.nickname, socket.id);
      // Attach the socket to the match BEFORE starting it, so round.start
      // broadcasts reach this player.
      attachToMatch(socket, match);
      claimSession(match, data);
      // Send the snapshot immediately so the client transitions off the
      // "Finding matchâ€¦" screen right away â€” round.start fires when the
      // panorama is ready (beginMatch awaits the Mapillary API).
      sendSnapshot(io, socket, match);
      if (!match.started) {
        void match.beginMatch().then(() => {
          // Re-sync every player's snapshot once the match is running so all
          // clients get the full payload (phase=playing, panorama, roundEndsAt).
          match.broadcastSnapshots();
        });
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
        });
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


