// Full gameplay simulation: 5-player quick match (late joins, disconnect/rejoin,
// exact scoring math), intermission + auto-restart, then a room match with host
// transfer. Runs against a fresh in-process server with shrunk timings.
import assert from "node:assert";
import { io as ioc, Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { ENV, GAME } from "../config.js";

ENV.DB_PATH = ":memory:";
GAME.ROUNDS_PER_MATCH = 3;
GAME.ROUND_DURATION_MS = 3000;
GAME.INTERMISSION_MS = 300;
GAME.ROUND_PAUSE_MS = 60;

const { startServer } = await import("../index.js");
const { __overridePicker } = await import("../locations.js");
__overridePicker(async () => ({ imageId: "img-sim", lat: 10, lng: 10 }));

const running = startServer(0);
const port = (running.server.address() as AddressInfo).port;
const url = `http://localhost:${port}`;

function connectClient(): Promise<{ socket: Socket; events: Map<string, unknown[]> }> {
  return new Promise((resolve, reject) => {
    const socket = ioc(url, { transports: ["websocket"], forceNew: true });
    const events = new Map<string, unknown[]>();
    for (const e of ["auth.ok", "auth.error", "match.snapshot", "round.start", "round.reveal",
      "intermission.start", "player.joined", "player.left", "player.updated", "match.left", "error"]) {
      socket.on(e, (p: unknown) => events.set(e, [...(events.get(e) ?? []), p]));
    }
    socket.on("connect", () => resolve({ socket, events }));
    socket.on("connect_error", reject);
  });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitForCount(events: Map<string, unknown[]>, event: string, minCount: number, timeoutMs = 10000): Promise<any> {
  const start = Date.now();
  while ((events.get(event) ?? []).length < minCount) {
    if (Date.now() - start > timeoutMs) throw new Error(`timeout ${event} (${(events.get(event) ?? []).length}/${minCount})`);
    await sleep(20);
  }
  return (events.get(event) ?? [])[minCount - 1];
}
async function waitFor(events: Map<string, unknown[]>, event: string, pred: (p: any) => boolean, timeoutMs = 10000): Promise<any> {
  const start = Date.now();
  for (;;) {
    const hit = (events.get(event) ?? []).find(pred);
    if (hit !== undefined) return hit;
    if (Date.now() - start > timeoutMs) throw new Error(`timeout ${event} predicate`);
    await sleep(20);
  }
}
async function auth(name: string) {
  const { socket, events } = await connectClient();
  socket.emit("auth", { nickname: name });
  await waitForCount(events, "auth.ok", 1);
  return { socket, events };
}

let passed = 0;
const ok = (label: string) => { passed++; console.log("  ok:", label); };

async function main() {
  console.log("SIM A: 5-player quick match");
  const a = await auth("p1");
  const b = await auth("p2");
  const c = await auth("p3");
  const d = await auth("p4");
  const e = await auth("p5");

  a.socket.emit("quick.play");
  // The snapshot arrives immediately (before the panorama is fetched), so
  // wait for round.start to confirm the match actually began.
  const rs0 = await waitForCount(a.events, "round.start", 1);
  const snapA = await waitForCount(a.events, "match.snapshot", 1);
  ok("p1 solo starts round 0 immediately");

  b.socket.emit("quick.play");
  const snapB = await waitForCount(b.events, "match.snapshot", 1);
  assert.strictEqual(snapB.matchId, snapA.matchId);
  assert.strictEqual(snapB.roundEndsAt, rs0.roundEndsAt);
  ok("p2 joins the same match with identical deadline");

  await sleep(500); // round 0 ticking
  c.socket.emit("quick.play");
  d.socket.emit("quick.play");
  const snapC = await waitForCount(c.events, "match.snapshot", 1);
  const snapD = await waitForCount(d.events, "match.snapshot", 1);
  assert.strictEqual(snapC.round, rs0.round);
  assert.strictEqual(snapD.roundEndsAt, rs0.roundEndsAt);
  ok("late joiners land mid-round with same timer + round number");

  // r0 runs full (nobody guessed) → reveal with null results
  const reveal1 = await waitForCount(a.events, "round.reveal", 1);
  const r0 = Object.fromEntries(reveal1.results.map((r: any) => [r.nickname, r]));
  assert.strictEqual(r0.p1.total, 0, "no guesses in round 0");
  assert.strictEqual(r0.p2.distanceM, null);
  ok("round 0 reveal: everyone 0 pts (no guesses)");

  // p5 joins at round 1
  const rs1 = await waitForCount(a.events, "round.start", 2);
  e.socket.emit("quick.play");
  const snapE = await waitForCount(e.events, "match.snapshot", 1);
  assert.strictEqual(snapE.round, rs1.round);
  assert.strictEqual(snapE.roundEndsAt, rs1.roundEndsAt);
  ok("p5 joins at start of round 1");

  // p2 disconnects mid-round 1 → offline, then rejoins
  b.socket.disconnect();
  await sleep(150);
  const offUpd = await waitFor(a.events, "player.updated", (p) => p.nickname === "p2" && !p.connected);
  assert.strictEqual(offUpd.players.find((p: any) => p.nickname === "p2").connected, false);
  ok("p2 disconnect broadcast as offline");
  const b2 = await auth("p2");
  assert.strictEqual((b2.events.get("match.snapshot")![0] as any).matchId, snapA.matchId, "rejoined same match");
  assert.strictEqual((b2.events.get("match.snapshot")![0] as any).round, rs1.round);
  ok("p2 rejoin lands back in same match, same round");

  // round 1 guesses: p5 exact, p2 (rejoined) offset, others abstain
  e.socket.emit("guess", { round: rs1.round, lat: 10, lng: 10 });
  b2.socket.emit("guess", { round: rs1.round, lat: 10.2, lng: 10.1 });
  const reveal2 = await waitForCount(a.events, "round.reveal", 2);
  const r1 = Object.fromEntries(reveal2.results.map((r: any) => [r.nickname, r]));
  const { haversineM } = await import("../scoring.js");
  const p2d = haversineM(10.2, 10.1, 10, 10);
  const p2expected = Math.round(1000 * (1 - p2d / GAME.FULL_SCORE_DISTANCE_M));
  assert.strictEqual(r1.p5.points, 1000, "exact hit scores 1000");
  assert.strictEqual(r1.p2.points, p2expected, `distance-percentage math (${Math.round(p2d / 1000)} km → ${p2expected})`);
  assert.strictEqual(r1.p2.total, p2expected, "rejoined player keeps score");
  assert.strictEqual(r1.p3.points, 0, "abstaining earns a hard 0");
  ok("round 1 distance-percentage scoring verified (exact=1000, offset≈994, abstains=0)");

  // round 2: all five connected players guess exact; the reveal still waits
  // for the full 3s deadline so everyone transitions together
  const rs2 = await waitForCount(a.events, "round.start", 3);
  a.socket.emit("guess", { round: rs2.round, lat: 10, lng: 10 });
  b2.socket.emit("guess", { round: rs2.round, lat: 10, lng: 10 });
  c.socket.emit("guess", { round: rs2.round, lat: 10, lng: 10 });
  d.socket.emit("guess", { round: rs2.round, lat: 10, lng: 10 });
  e.socket.emit("guess", { round: rs2.round, lat: 10, lng: 10 });
  const t0 = Date.now();
  await waitForCount(a.events, "round.reveal", 3);
  assert.ok(Date.now() - t0 >= 2500, "reveal only fires at the shared deadline, no early finish");
  ok("round runs its full duration even when everyone guessed (sync)");

  // intermission + ranks
  const inter = await waitForCount(a.events, "intermission.start", 1, 6000);
  const ranks = inter.finalRanks;
  const scores = ranks.map((r: any) => r.score);
  assert.deepStrictEqual(scores, [...scores].sort((x: number, y: number) => y - x), "sorted desc");
  assert.strictEqual(ranks[0].nickname, "p5", "p5: 1000+1000 (exact twice) → winner");
  assert.strictEqual(ranks[0].score, 2000);
  assert.strictEqual(ranks[1].nickname, "p2", "p2: percentage score + exact hit");
  assert.strictEqual(ranks[1].score, p2expected + 1000);
  assert.strictEqual(ranks[2].nickname, "p1", "p1: abstain + exact hit (tied group)");
  assert.strictEqual(ranks[2].score, 1000);
  ok("intermission ranks sorted with correct totals");

  const restart = await waitForCount(a.events, "round.start", 4, 6000);
  assert.strictEqual(restart.round, 0);
  assert.ok(restart.roundEndsAt > inter.nextMatchAt);
  ok("auto-restart into the next match after intermission");

  for (const cl of [a, b, c, d, e]) cl.socket.disconnect();
  b2.socket.disconnect();

  console.log("SIM B: room match + host transfer");
  const h = await auth("host");
  h.socket.emit("room.create");
  const roomSnap = await waitForCount(h.events, "match.snapshot", 1);
  assert.strictEqual(roomSnap.host, "host");
  const g1 = await auth("guest1");
  const g2 = await auth("guest2");
  g1.socket.emit("room.join", { code: roomSnap.roomCode });
  g2.socket.emit("room.join", { code: roomSnap.roomCode });
  await waitForCount(h.events, "player.joined", 2);
  assert.strictEqual((h.events.get("player.joined") as any[])[1].host, "host");
  ok("host visible to everyone in the lobby");

  h.socket.emit("leave");
  const left = await waitForCount(g1.events, "player.left", 1);
  assert.strictEqual(left.host, "guest1", "host transferred to remaining player");
  ok("host left — guest1 is now host");

  g1.socket.emit("room.start", { code: roomSnap.roomCode });
  await waitForCount(g1.events, "round.start", 1);
  await waitForCount(g2.events, "round.start", 1);
  ok("new host starts the match; both guests get round.start");

  h.socket.disconnect(); g1.socket.disconnect(); g2.socket.disconnect();

  console.log("SIM C: session guards");
  const keeper = await auth("keeper");
  const dup = await connectClient();
  dup.socket.emit("auth", { nickname: "keeper" });
  const dupErr = await waitForCount(dup.events, "auth.error", 1);
  assert.strictEqual(dupErr.message, "already_online", "dup auth rejected while keeper live");
  ok("already_online: one live session per nickname");
  keeper.socket.disconnect();
  dup.socket.disconnect();

  const reborn = await auth("keeper");
  await waitForCount(reborn.events, "auth.ok", 1);
  ok("keeper can re-auth after its socket closed (rejoin window)");
  reborn.socket.disconnect();

  console.log(`\nGAMEPLAY SIMULATION PASS (${passed} checks)`);
  running.io.close();
  running.server.close();
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });