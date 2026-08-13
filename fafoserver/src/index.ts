import express from "express";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { ENV } from "./config.js";
import { initLocationPool } from "./locations.js";
import { getPanorama, resolveKey } from "./panoProxy.js";
import { initDb, topScores } from "./db.js";
import { rateLimit } from "./rateLimit.js";
import { registerSocketHandlers } from "./events.js";
import { MatchRegistry } from "./registry.js";
import { MatchmakingService } from "./matchmaking.js";
import { RoomService } from "./rooms.js";
import type { ServerIO } from "./matchEngine.js";

export interface RunningServer {
  io: Server;
  server: http.Server;
  app: express.Express;
  services: ReturnType<typeof buildServices>;
}

export function buildServices(io: Server) {
  // Every socket lives in a room named by its own id, and joins a room named
  // by its match id on attach — so emits go straight to the target instead of
  // scanning all connected sockets.
  const ioImpl: ServerIO = {
    emitToSocket: (socketId, event, payload) => {
      io.to(socketId).emit(event, payload);
    },
    emitToMatch: (matchId, event, payload) => {
      io.to(matchId).emit(event, payload);
    },
  };
  const registry = new MatchRegistry(ioImpl);
  return {
    registry,
    matchmaking: new MatchmakingService(registry),
    rooms: new RoomService(registry),
  };
}

export function startServer(port: number): RunningServer {
  initDb();
  initLocationPool(); // pre-warm panoramas so the first round starts instantly

  const app = express();
  // No body parser: every REST route is GET (health/leaderboard/pano), so
  // express.json() would only parse bodies that never arrive (waste + a small
  // large-body DoS surface). trust proxy lets Express resolve req.ip correctly
  // behind Render's LB (rightmost X-Forwarded-For) for the pano rate limit.
  app.set("trust proxy", ENV.NODE_ENV === "production" ? 1 : false);

  // Minimal security headers for the small REST surface (health/leaderboard/
  // pano proxy). The API serves only JSON + images, so a lock-tight CSP is
  // safe; HSTS only makes sense once the server is served over TLS (prod).
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    if (ENV.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true, uptime: process.uptime() });
  });

  app.get("/api/leaderboard", (_req, res) => {
    // Allow the web frontend (separate origin) to read the board.
    const origin = _req.headers.origin;
    if (origin && ENV.CORS_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ scores: topScores(20) });
  });

  // Panorama bytes behind an opaque per-round key. The image id never leaves
  // the server, so clients can't derive coordinates. CORS is open because the
  // bytes are only reachable with a key handed to match players.
  app.get("/api/pano/:key", async (req, res) => {
    // Per-IP cap so a key holder can't burn Mapillary quota via cold misses.
    if (!rateLimit(req.ip ?? "", "pano", 30, 60_000)) {
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    const imageId = resolveKey(req.params.key ?? "");
    if (!imageId) {
      res.status(404).json({ error: "pano_not_found" });
      return;
    }
    const img = await getPanorama(imageId);
    if (!img) {
      res.status(502).json({ error: "upstream_unavailable" });
      return;
    }
    res.setHeader("Content-Type", img.contentType);
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(img.buf);
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin(origin, cb) {
        if (
          !origin ||
          ENV.CORS_ORIGINS.includes("*") ||
          ENV.CORS_ORIGINS.includes(origin)
        ) {
          cb(null, true);
        } else {
          cb(new Error("origin not allowed"));
        }
      },
    },
    maxHttpBufferSize: 8_192,
  });

  const services = buildServices(io);
  registerSocketHandlers(io, services);

  const sweepTimer = setInterval(() => services.registry.sweep(), 5_000);
  sweepTimer.unref();

  server.listen(port);
  return { io, server, app, services };
}

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  startServer(ENV.PORT);
  console.log(
    `[fafoserver] listening on :${ENV.PORT} (${ENV.NODE_ENV})` +
      (ENV.MAPILLARY_TOKEN ? "" : " — no MAPILLARY_TOKEN, using test locations"),
  );
}
