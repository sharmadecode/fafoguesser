import express from "express";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { ENV } from "./config.js";
import { initLocationPool } from "./locations.js";
import { getPanorama, resolveKey } from "./panoProxy.js";
import { rateLimit } from "./rateLimit.js";
import { isTrustedProxy, registerSocketHandlers } from "./events.js";
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
  initLocationPool(); // pre-warm panoramas so the first round starts instantly

  const app = express();
  // No body parser: every REST route is GET (health/pano), and XFF is only
  // honored for proxies allowlisted in PROXY_TRUST — otherwise the socket
  // peer address is the client.
  app.set("trust proxy", (ip: string) => isTrustedProxy(ip, ENV.PROXY_TRUST));

  // Security headers for a JSON + image-only surface; HSTS only makes sense
  // once prod serves over TLS.
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

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  app.use("/api/pano", (req, res, next) => {
    const origin = req.headers.origin;
    const isAllowed =
      !origin ||
      !ENV.IS_PRODUCTION ||
      ENV.CORS_ORIGINS.includes("*") ||
      (typeof origin === "string" && ENV.CORS_ORIGINS.includes(origin));
    if (isAllowed && origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else if (!ENV.IS_PRODUCTION) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get("/api/pano/:key", async (req, res) => {
    const rawKey = String(req.params.key ?? "");
    if (!UUID_RE.test(rawKey)) {
      res.status(400).json({ error: "invalid_key" });
      return;
    }
    if (!rateLimit(req.ip ?? "", "pano", 30, 60_000)) {
      console.warn(`[PANO_REQUEST] rate limited IP=${req.ip}`);
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    const imageId = resolveKey(rawKey);
    if (!imageId) {
      res.status(404).json({ error: "pano_not_found" });
      return;
    }
    // Backstop: a hung upstream must not tie up the request forever. The
    // fetch keeps running and caches its result if it eventually lands.
    const variant = req.query.size === "2048" ? "2048" : "original";
    let backstopTimer: NodeJS.Timeout | undefined;
    try {
      const img = await Promise.race([
        getPanorama(imageId, variant),
        new Promise<null>((resolve) => {
          backstopTimer = setTimeout(() => resolve(null), 55_000);
        }),
      ]);
      if (!img) {
        res.status(502).json({ error: "upstream_unavailable" });
        return;
      }
      res.setHeader("Content-Type", img.contentType);
      res.setHeader("Cache-Control", "private, max-age=60");
      res.send(img.buf);
    } finally {
      if (backstopTimer) clearTimeout(backstopTimer);
    }
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin(origin, cb) {
        if (
          !origin ||
          ENV.NODE_ENV === "development" ||
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

  server.listen(port, "0.0.0.0");
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
