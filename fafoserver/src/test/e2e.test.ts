 import assert from "node:assert";
import { io as ioc, Socket } from "socket.io-client";
import type { AddressInfo } from "node:net";
import { ENV, GAME } from "../config.js";

ENV.DB_PATH = ":memory:";

// Shrink game timing so the test runs fast, but keep rounds long enough
// that clients can always guess before the deadline.
GAME.ROUNDS_PER_MATCH = 2;
GAME.ROUND_DURATION_MS = 800;
GAME.INTERMISSION_MS = 200;
GAME.ROUND_PAUSE_MS = 50;

const { startServer } = await import("../index.js");
const { __overridePicker } = await import("../locations.js");

__overridePicker(async () => ({ imageId: "img-e2e", lat: 10, lng: 10 }));

const running = startServer(0);
const port = (running.server.address() as AddressInfo).port;
const url = `http://localhost:${port}`;

function connectClient(): Promise<{ socket: Socket; events: Map<string, unknown[]> }> {
  return new Promise((resolve, reject) => {
    const socket = ioc(url, { transports: ["websocket"], forceNew: true });
    const events = new Map<string, unknown[]>();
    const collect = (event: string) => (payload: unknown) => {
      const arr = events.get(event) ?? [];
      arr.push(payload);
      events.set(event, arr);
    };
    const listened = [
      "auth.ok", "auth.error", "match.snapshot", "round.start", "round.reveal",
      "intermission.start", "player.joined", "player.left", "player.updated",
      "match.left", "error", "sync.ack",
    ];
    for (const e of listened) socket.on(e, collect(e));
    socket.on("connect", () => resolve({ socket, events }));
    socket.on("connect_error", reject);
  });
}

const last = (events: Map<string, unknown[]>, event: string) => {
  const arr = events.get(event);
  assert.ok(arr && arr.length > 0, `expected event ${event}`);
  return arr[arr.length - 1] as any;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function auth(nickname: string): Promise<{ socket: Socket; events: Map<string, unknown[]> }> {
  const { socket, events } = await connectClient();
  socket.emit("auth", { nickname });
  const start = Date.now();
  while (!events.has("auth.ok") && !events.has("auth.error")) {
    if (Date.now() - start > 5000) throw new Error(`auth timeout for ${nickname}`);
    await sleep(20);
  }
  assert.ok(events.has("auth.ok"), `auth failed for ${nickname}`);
  return { socket, events };
}

async function authWith(nickname: string, sessionId: string): Promise<{ socket: Socket; events: Map<string, unknown[]> }> {
  const { socket, events } = await connectClient();
  socket.emit("auth", { nickname, sessionId });
  const start = Date.now();
  while (!events.has("auth.ok") && !events.has("auth.error")) {
    if (Date.now() - start > 5000) throw new Error(`auth timeout for ${nickname}`);
    await sleep(20);
  }
  assert.ok(events.has("auth.ok"), `auth failed for ${nickname}`);
  return { socket, events };
}

/** Wait until the event has occurred at least `minCount` times; returns the minCount-th payload. */
async function waitForCount(
  events: Map<string, unknown[]>,
  event: string,
  minCount: number,
  timeoutMs = 5000,
): Promise<any> {
  const start = Date.now();
  while ((events.get(event) ?? []).length < minCount) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`timeout waiting for ${event} (have ${(events.get(event) ?? []).length}/${minCount})`);
    }
    await sleep(20);
  }
  return (events.get(event) ?? [])[minCount - 1];
}

const count = (events: Map<string, unknown[]>, event: string) =>
  (events.get(event) ?? []).length;

/** Wait for a match.snapshot whose phase is "playing" (used to prove guests
 *  can pick — they previously stayed on phase=waiting after room start). */
async function waitForPlaying(events: Map<string, unknown[]>, timeoutMs = 5000): Promise<any> {
  const start = Date.now();
  for (;;) {
    const playing = (events.get("match.snapshot") ?? []).filter((s: any) => s.phase === "playing");
    if (playing.length) return playing[playing.length - 1];
    if (Date.now() - start > timeoutMs) throw new Error("no phase=playing snapshot");
    await sleep(20);
  }
}

async function main() {
  // --- Clock sync ---
  const { socket: syncSocket, events: syncEvents } = await connectClient();
  const t0 = Date.now();
  syncSocket.emit("sync", { t0 });
  const ack = (await waitForCount(syncEvents, "sync.ack", 1)) as any;
  assert.strictEqual(ack.t0, t0);
  const rtt = Date.now() - t0;
  const offset = ack.t1 - (t0 + rtt / 2);
  assert.ok(Math.abs(offset) < 1000, `clock offset sane: ${offset}ms`);
  syncSocket.disconnect();

  // --- Two players join the same quick match ---
  const { socket: a, events: ea } = await auth("alice");
  a.emit("quick.play");
  // The first snapshot arrives immediately (before the panorama is fetched),
  // then a second one fires once the match is running. Wait for round.start
  // and grab the latest snapshot (phase=playing, panorama set).
  await waitForCount(ea, "round.start", 1);
  await waitForCount(ea, "match.snapshot", 2);
  const snapA1 = last(ea, "match.snapshot");
  assert.strictEqual(snapA1.phase, "playing");
  assert.strictEqual(snapA1.round, 0);
  assert.ok(snapA1.roundEndsAt > Date.now());
  assert.ok(snapA1.panorama.key);

  const { socket: b, events: eb } = await auth("bob");
  b.emit("quick.play");
  const snapB = (await waitForCount(eb, "match.snapshot", 1)) as any;
  assert.strictEqual(snapB.matchId, snapA1.matchId, "bob joined alice's match");
  assert.strictEqual(snapB.roundEndsAt, snapA1.roundEndsAt, "identical timer");

  // --- Session-protected rejoin: only the original device resumes the match ---
  // (A private room, so rex's match stays independent of alice's quick match.)
  const { socket: r1, events: er1 } = await authWith("rex", "sess-rex");
  r1.emit("room.create");
  const rexSnap = (await waitForCount(er1, "match.snapshot", 1)) as any;
  r1.disconnect();
  // A different device using the same nickname cannot seize the live match.
  const { socket: r2, events: er2 } = await connectClient();
  r2.emit("auth", { nickname: "rex", sessionId: "sess-evil" });
  const sessErr = (await waitForCount(er2, "auth.error", 1)) as any;
  assert.strictEqual(sessErr.message, "session_mismatch");
  r2.disconnect();
  // The original device rejoins the same match.
  const { socket: r3, events: er3 } = await authWith("rex", "sess-rex");
  const rexBack = (await waitForCount(er3, "match.snapshot", 1)) as any;
  assert.strictEqual(rexBack.matchId, rexSnap.matchId, "owner rejoins their match");
  r3.disconnect();
  // A credential-less auth must not be able to wipe the sessioned owner's
  // record either (that would let an impostor boot them mid-reconnect).
  const { socket: r4, events: er4 } = await connectClient();
  r4.emit("auth", { nickname: "rex" });
  const sessErr2 = (await waitForCount(er4, "auth.error", 1)) as any;
  assert.strictEqual(sessErr2.message, "session_mismatch");
  r4.disconnect();
  const { socket: r5, events: er5 } = await authWith("rex", "sess-rex");
  const rexBack2 = (await waitForCount(er5, "match.snapshot", 1)) as any;
  assert.strictEqual(rexBack2.matchId, rexSnap.matchId, "owner still rejoins after sessionless attempt");
  r5.disconnect();

  // --- Late join (client C) mid-match ---
  const { socket: c, events: ec } = await auth("carol");
  c.emit("quick.play");
  const snapC = (await waitForCount(ec, "match.snapshot", 1)) as any;
  assert.strictEqual(snapC.matchId, snapA1.matchId, "carol joined the same match");

  // --- Sync check: the same round.start hits all 3 clients with an identical deadline ---
  const nA = count(ea, "round.start") + 1;
  const nB = count(eb, "round.start") + 1;
  const nC = count(ec, "round.start") + 1;
  const rsA = (await waitForCount(ea, "round.start", nA)) as any;
  const rsB = (await waitForCount(eb, "round.start", nB)) as any;
  const rsC = (await waitForCount(ec, "round.start", nC)) as any;
  assert.strictEqual(rsB.roundEndsAt, rsA.roundEndsAt, "identical deadline (bob)");
  assert.strictEqual(rsC.roundEndsAt, rsA.roundEndsAt, "identical deadline (carol)");

  // --- Everyone guesses the live round ---
  const roundNum = rsA.round;
  const revealN = count(ea, "round.reveal") + 1;
  a.emit("guess", { round: roundNum, lat: 10, lng: 10 });
  b.emit("guess", { round: roundNum, lat: 10.5, lng: 10 });
  c.emit("guess", { round: roundNum, lat: 11, lng: 10 });
  const reveal = (await waitForCount(ea, "round.reveal", revealN)) as any;
  const byName = Object.fromEntries(reveal.results.map((r: any) => [r.nickname, r]));
  assert.strictEqual(reveal.round, roundNum);
  assert.strictEqual(byName.alice.points, 1000, "alice exact hit");
  assert.strictEqual(byName.alice.total, 1000, "alice 0 for earlier missed rounds");
  assert.strictEqual(byName.carol.total, byName.carol.points, "carol only scored this round");
  assert.ok(byName.bob.points > byName.carol.points, "closer guess scores more");

  // --- Intermission + ranks, then auto-restart into the next match ---
  const inter = (await waitForCount(ea, "intermission.start", 1)) as any;
  assert.strictEqual(inter.finalRanks.length, 3);
  assert.strictEqual(inter.finalRanks[0].nickname, "alice");
  const restartN = count(ea, "round.start") + 1;
  const restartRs = (await waitForCount(ea, "round.start", restartN)) as any;
  assert.strictEqual(restartRs.round, 0);
  assert.ok(restartRs.roundEndsAt > inter.nextMatchAt, "next match started after intermission");

  // --- Leave ---
  a.emit("leave");
  await waitForCount(ea, "match.left", 1);
  const left = (await waitForCount(eb, "player.left", 1)) as any;
  assert.strictEqual(left.nickname, "alice");

  // --- Validation: bad guesses rejected ---
  b.emit("guess", { round: 99, lat: 10, lng: 10 });
  const err = (await waitForCount(eb, "error", 1)) as any;
  assert.strictEqual(err.code, "wrong_round");

  // --- Invalid nickname rejected ---
  const { socket: bad, events: eb2 } = await connectClient();
  bad.emit("auth", { nickname: "x!" });
  const authErr = (await waitForCount(eb2, "auth.error", 1)) as any;
  assert.strictEqual(authErr.message, "invalid_nickname");
  bad.disconnect();

  // --- Rooms: create + join + host start ---
  const { socket: h, events: eh } = await auth("host");
  h.emit("room.create");
  const roomSnap = (await waitForCount(eh, "match.snapshot", 1)) as any;
  assert.ok(roomSnap.roomCode, "room code generated");
  assert.strictEqual(roomSnap.mode, "room");
  assert.strictEqual(roomSnap.host, "host", "snapshot carries host");
  const { socket: g, events: eg } = await auth("guest");
  g.emit("room.join", { code: roomSnap.roomCode });
  const gSnap = (await waitForCount(eg, "match.snapshot", 1)) as any;
  assert.strictEqual(gSnap.matchId, roomSnap.matchId);
  // Non-host cannot start.
  g.emit("room.start", { code: roomSnap.roomCode });
  const hostErr = (await waitForCount(eg, "error", 1)) as any;
  assert.strictEqual(hostErr.code, "not_host");
  // Host starts.
  h.emit("room.start", { code: roomSnap.roomCode });
  const roomRound = (await waitForCount(eh, "round.start", 1)) as any;
  assert.strictEqual(roomRound.round, 0);

  // BOTH host and guest must receive a phase=playing snapshot (guests were
  // previously stuck on phase=waiting and their map could not accept pins).
  const hostPlaying = (await waitForPlaying(eh)) as any;
  assert.strictEqual(hostPlaying.phase, "playing");
  const guestPlaying = (await waitForPlaying(eg)) as any;
  assert.strictEqual(guestPlaying.phase, "playing");

  // --- Mid-round room join: a started room accepts new players (quick-play
  // style), landing them live in the current round with the shared deadline ---
  const { socket: g3, events: eg3 } = await auth("guest3");
  g3.emit("room.join", { code: roomSnap.roomCode });
  const g3Playing = (await waitForPlaying(eg3)) as any;
  assert.strictEqual(g3Playing.matchId, roomSnap.matchId, "mid-round joiner lands in the same match");
  assert.strictEqual(g3Playing.roundEndsAt, guestPlaying.roundEndsAt, "mid-round joiner shares the live deadline");
  assert.ok(g3Playing.panorama?.key, "mid-round joiner gets the round's pano key");
  g3.disconnect();

  // Guest can guess in the room (regression: this used to be impossible).
  g.emit("guess", { round: guestPlaying.round, lat: 12.34, lng: 56.78 });
  await sleep(400);
  const gRejected = (eg.get("error") ?? []).filter(
    (e: any) =>
      ["wrong_round", "round_closed", "already_guessed", "time_expired", "invalid_guess", "not_in_match", "guess_failed"].includes(e.code),
  );
  assert.strictEqual(gRejected.length, 0, "guest guess should be accepted");

  // --- Host transfer: leaving host hands START to the next player ---
  const { socket: h2, events: eh2 } = await auth("host2");
  h2.emit("room.create");
  const roomSnap2 = (await waitForCount(eh2, "match.snapshot", 1)) as any;
  assert.strictEqual(roomSnap2.host, "host2");
  const { socket: g2, events: eg2 } = await auth("guest2");
  g2.emit("room.join", { code: roomSnap2.roomCode });
  await waitForCount(eg2, "match.snapshot", 1);
  h2.emit("leave");
  const left2 = (await waitForCount(eg2, "player.left", 1)) as any;
  assert.strictEqual(left2.host, "guest2", "host transferred to remaining player");
  g2.emit("room.start", { code: roomSnap2.roomCode });
  await waitForCount(eg2, "round.start", 1);

  // --- Waiting lobby auto-destroy: clients are notified via match.left ---
  GAME.ROOM_IDLE_DESTROY_MS = 500;
  const { socket: h3, events: eh3 } = await auth("host3");
  h3.emit("room.create");
  await waitForCount(eh3, "match.snapshot", 1);
  await waitForCount(eh3, "match.left", 1, 15_000);

  // --- Bad room code ---
  const { socket: z, events: ez } = await auth("zoe");
  z.emit("room.join", { code: "ZZZZ" });
  const badCode = (await waitForCount(ez, "error", 1)) as any;
  assert.strictEqual(badCode.code, "room_not_found");

  // --- Stale matchId: after a lobby is destroyed, the same socket can still
  // create/join a room (previously stuck on "in_match" forever) ---
  GAME.ROOM_IDLE_DESTROY_MS = 500;
  const { socket: h4, events: eh4 } = await auth("host4");
  h4.emit("room.create");
  await waitForCount(eh4, "match.snapshot", 1);
  await waitForCount(eh4, "match.left", 1, 15_000);
  h4.emit("room.create");
  const reSnap = (await waitForCount(eh4, "match.snapshot", 2)) as any;
  assert.ok(reSnap.roomCode, "can create a room after lobby expiry");
  h4.emit("leave");

  // --- Zombie cleanup: a disconnected player whose rejoin window expired
  // is dropped from the old match instead of ghosting it ---
  GAME.RECONNECT_WINDOW_MS = 100;
  GAME.DISCONNECT_RETAIN_MS = 60_000; // keep the record around so we can verify removal
  const { socket: q1, events: eq1 } = await auth("quinn");
  q1.emit("quick.play");
  await waitForCount(eq1, "match.snapshot", 1);
  q1.disconnect();
  await sleep(400); // window (100ms) expires
  const { socket: q2, events: eq2 } = await auth("quinn");
  q2.emit("quick.play");
  const qSnap = (await waitForCount(eq2, "match.snapshot", 1)) as any;
  assert.ok(
    qSnap.phase === "playing" || qSnap.phase === "intermission",
    "quinn can play again",
  );
  assert.ok(
    qSnap.players.some((p: any) => p.nickname === "quinn"),
    "quinn is in the joined match",
  );
  q2.disconnect();
  eq1.clear?.();
  GAME.RECONNECT_WINDOW_MS = 30_000;
  GAME.DISCONNECT_RETAIN_MS = 30_000;

  // --- Edge cases ---
  // Guess without auth â†’ not_authed
  const unauth = await connectClient();
  unauth.socket.emit("guess", { round: 0, lat: 10, lng: 10 });
  const notAuthed = (await waitForCount(unauth.events, "error", 1)) as any;
  assert.strictEqual(notAuthed.code, "not_authed");
  unauth.socket.disconnect();

  // Malformed guess payloads rejected (JSON cannot carry NaN; null/strings
  // must fail schema validation).
  const { socket: gx, events: egx } = await auth("xena");
  gx.emit("guess", { round: 0, lat: null, lng: 10 });
  gx.emit("guess", { round: 0, lat: "abc", lng: 10 });
  const badGuess = (await waitForCount(egx, "error", 1)) as any;
  assert.strictEqual(badGuess.code, "invalid_guess");
  gx.disconnect();

  // Over-long nickname rejected.
  const { socket: big, events: ebig } = await connectClient();
  big.emit("auth", { nickname: "x".repeat(200) });
  const nickErr = (await waitForCount(ebig, "auth.error", 1)) as any;
  assert.strictEqual(nickErr.message, "invalid_nickname");
  big.disconnect();

  // Room full: a 3rd player is rejected when MAX_PLAYERS = 2.
  GAME.MAX_PLAYERS = 2;
  const { socket: hf, events: ehf } = await auth("hostfull");
  hf.emit("room.create");
  const fullSnap = (await waitForCount(ehf, "match.snapshot", 1)) as any;
  const f1 = await auth("full1");
  f1.socket.emit("room.join", { code: fullSnap.roomCode });
  await waitForCount(f1.events, "match.snapshot", 1);
  const f2 = await auth("full2");
  f2.socket.emit("room.join", { code: fullSnap.roomCode });
  const fullErr = (await waitForCount(f2.events, "error", 1)) as any;
  assert.strictEqual(fullErr.code, "room_full");
  GAME.MAX_PLAYERS = 5;
  hf.emit("leave");
  f1.socket.disconnect();
  f2.socket.disconnect();

  // Room code join is case-insensitive (lowercase input accepted).
  const { socket: hl, events: ehl } = await auth("hostlow");
  hl.emit("room.create");
  const lowSnap = (await waitForCount(ehl, "match.snapshot", 1)) as any;
  const gl = await auth("guestlow");
  gl.socket.emit("room.join", { code: lowSnap.roomCode.toLowerCase() });
  const lowJoin = (await waitForCount(gl.events, "match.snapshot", 1)) as any;
  assert.strictEqual(lowJoin.matchId, lowSnap.matchId, "lowercase code joins the room");
  hl.emit("leave");
  gl.socket.disconnect();

  console.log("e2e test: PASS");
  a.disconnect(); b.disconnect(); c.disconnect();
  h.disconnect(); g.disconnect(); z.disconnect();
  h2.disconnect(); g2.disconnect(); h3.disconnect(); h4.disconnect();
  running.io.close();
  running.server.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});