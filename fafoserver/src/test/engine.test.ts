import assert from "node:assert";
import { ENV, GAME } from "../config.js";

ENV.DB_PATH = ":memory:";

// Shrink game timing so the test runs in ~1s.
GAME.ROUNDS_PER_MATCH = 2;
GAME.ROUND_DURATION_MS = 300;
GAME.INTERMISSION_MS = 200;
GAME.ROUND_PAUSE_MS = 50;

const { Match } = await import("../matchEngine.js");
const { __overridePicker } = await import("../locations.js");

const LOCATION = { imageId: "img-test", lat: 10, lng: 10 };
__overridePicker(async () => LOCATION);

interface RecordedEvent {
  target: string | null;
  event: string;
  payload: unknown;
}

const events: RecordedEvent[] = [];
const fakeIO = {
  emitToSocket: (socketId: string, event: string, payload: unknown) => {
    events.push({ target: socketId, event, payload });
  },
  emitToMatch: (matchId: string, event: string, payload: unknown) => {
    events.push({ target: matchId, event, payload });
  },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const findBy = (event: string, target: string | null = null) =>
  events.find((e) => e.event === event && (target === null || e.target === target));

async function main() {
  const match = new Match({
    id: "m1",
    mode: "quick",
    roomCode: null,
    hostNickname: null,
    io: fakeIO as any,
  });

  match.addPlayer("alice", "sock-a");
  match.addPlayer("bob", "sock-b");
  assert.strictEqual(match.publicPlayers.length, 2);
  assert.strictEqual(match.isFull, false);

  await match.beginMatch();

  // Round 0: alice guesses exactly right (1000), bob far away (~low score).
  let start = findBy("round.start", "m1");
  assert.ok(start, "round.start emitted");
  const startPayload = start.payload as any;
  assert.strictEqual(startPayload.panorama.key.length, 36, "opaque key, not the image id");
  assert.ok(startPayload.roundEndsAt > Date.now());

  assert.deepStrictEqual(
    match.submitGuess("alice", 0, 10, 10),
    { ok: true },
  );
  // Last pin wins — moving the pin re-submits and overwrites (no "already_guessed").
  assert.deepStrictEqual(
    match.submitGuess("alice", 0, 10, 10),
    { ok: true },
  );
  // Wrong round rejected.
  assert.strictEqual(match.submitGuess("alice", 1, 10, 10).ok, false);
  // bob guesses 0.5 degrees north (~55.6 km away).
  assert.deepStrictEqual(
    match.submitGuess("bob", 0, 10.5, 10),
    { ok: true },
  );

  // Every round runs its FULL duration — both players guessed instantly, but
  // the reveal only fires on the shared deadline so everyone stays in sync.
  await sleep(330);
  const reveal = findBy("round.reveal", "m1");
  assert.ok(reveal, "round.reveal emitted at the shared deadline");
  const revealPayload = reveal.payload as any;
  assert.strictEqual(revealPayload.location.lat, 10);
  const byName = Object.fromEntries(
    revealPayload.results.map((r: any) => [r.nickname, r]),
  );
  assert.strictEqual(byName.alice.points, 1000);
  assert.strictEqual(byName.alice.total, 1000);
  assert.ok(byName.bob.points < 1000);
  assert.strictEqual(byName.bob.total, byName.bob.points);
  assert.ok(byName.bob.distanceM > 50_000 && byName.bob.distanceM < 60_000);

  // Round 1 starts automatically right after the reveal + short pause.
  await sleep(40);
  const round2 = events.filter((e) => e.event === "round.start").length;
  assert.strictEqual(round2, 2, "second round started");
  match.submitGuess("alice", 1, 10, 10);
  match.submitGuess("bob", 1, 10, 10);

  // The final round now waits out the reveal pause (ROUND_PAUSE_MS=50 in tests)
  // before emitting intermission, so give it time to land.
  await sleep(430);
  // Intermission after the final round's deadline.
  const inter = findBy("intermission.start", "m1");
  assert.ok(inter, "intermission.start emitted");
  const interPayload = inter.payload as any;
  assert.strictEqual(interPayload.matchNumber, 1);
  assert.strictEqual(interPayload.finalRanks[0].nickname, "alice");
  assert.ok(interPayload.nextMatchAt > Date.now());

  // After intermission the next match auto-starts.
  await sleep(300);
  const starts = events.filter((e) => e.event === "round.start");
  assert.strictEqual(starts.length, 3, "match auto-restarted");
  assert.strictEqual(match.matchNumber, 2);
  assert.strictEqual(match.players.get("alice")!.score, 0, "scores reset");

  // Guessing past the deadline is rejected even if the reveal timer has not
  // fired yet (deterministic: backdate the deadline directly).
  const originalEndsAt = match.roundEndsAt;
  match.roundEndsAt = Date.now() - 1;
  assert.deepStrictEqual(
    match.submitGuess("bob", 0, 10, 10),
    { ok: false, error: "time_expired" },
  );
  match.roundEndsAt = originalEndsAt;

  // Missing a round gives 0 points.
  match.submitGuess("alice", 0, 10, 10);
  await sleep(320); // let round 0 of match 2 end by deadline (bob never guesses)
  const reveal2 = events.filter((e) => e.event === "round.reveal").pop();
  const byName2 = Object.fromEntries(
    (reveal2!.payload as any).results.map((r: any) => [r.nickname, r]),
  );
  assert.strictEqual(byName2.alice.points, 1000);
  assert.strictEqual(byName2.bob.points, 0);
  assert.strictEqual(byName2.bob.distanceM, null);

  // Leave/empty destroys the match.
  match.removePlayer("alice");
  match.removePlayer("bob");
  assert.strictEqual(match.destroyed, true);

  console.log("engine test: PASS");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
