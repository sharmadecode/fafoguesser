# FafoGuesser

A GeoGuessr-style real-time game: you're dropped into a random street view and
have to figure out where in the world you are. Drop a pin, score points, beat
your friends.

Built for the web (any browser, desktop or phone) with a Node + Socket.IO
backend, and an Android app in the works.

## How it plays

- **5 rounds per match**, 30 seconds each.
- You get a 360° street view from Mapillary — drag to look around, zoom.
- Drop a pin on the map where you think the spot is. Your last pin before the
  buzzer is your final guess (auto-submitted, so you never lose it by forgetting).
- After the timer ends everyone sees the reveal: each player's pin, a line to
  the real location, and the points earned.
- **Scoring** is by distance — 1000 points for an exact hit, falling off as the
  guess gets farther. Not guessing at all earns 0.
- Two modes: **Quick Play** (jump into a match) or **Make a Room** (shareable
  code, host starts, friends join mid-round).

## Project layout

```
fafoguesser/   Android app (Compose + MapTiler SDK)  — in progress
fafoserver/    Game server (Node, Express, Socket.IO, better-sqlite3)
web/           Web client (React + Vite, Leaflet, Pannellum)
render.yaml    Deploy blueprint (Render)
```

### Server (`fafoserver`)

Holds all game logic: match lifecycle, per-round scoring, rooms and quick play,
session-based rejoin, the leaderboard, and a secure panorama proxy. The
Mapillary token and image ids stay on the server — clients only receive opaque,
expiring keys and fetch image bytes through `/api/pano/:key`, so the real
location can never be reverse-engineered from what the browser receives.

### Web (`web`)

React + Vite. Street views render with Pannellum (WebGL) from the proxied
images; the guess map is Leaflet with MapTiler tiles; all game events stream
over a single Socket.IO connection with clock-synced timers.

## Run it locally

You need Node 20+. Copy the example env files and fill in your own keys
(Mapillary client token for the server; MapTiler key for the web tiles).

```powershell
# Terminal 1 — game server
cd fafoserver
npm install
Copy-Item .env.example .env   # fill in MAPILLARY_TOKEN
npm start                     # node dist/index.js → http://localhost:8787

# Terminal 2 — web client
cd web
npm install
Copy-Item .env.example .env   # fill in VITE_MAPTILER_KEY
npm run dev                   # → http://localhost:5173
```

Run the test suites with:

```powershell
cd fafoserver
npm run test:engine && npm run test:gameplay && npm run test:e2e
```

## Security notes

- No secrets are committed: `.env` files, build output, logs and local
  properties are gitignored. Tokens/keys live only in your local `.env` (or in
  the deploy platform's env vars — see `render.yaml`, which sets secrets with
  `sync: false`).
- Panorama bytes are proxied behind opaque, expiring keys; Mapillary image ids
  and the API token never reach the browser.
- A device session id (`sessionId`) guards reconnects so nobody can take over
  a nickname mid-match.
- Inputs are validated with zod on the server, SQL is parameterized, REST
  responses carry security headers, and rate limits protect the socket events
  and the pano endpoint.

## Roadmap

- Roam navigation (walk along the street via server-proxied neighbor data)
- Android app: same game, native UI, and the secure panorama flow
- Deploy the web + server (Render blueprint included)
