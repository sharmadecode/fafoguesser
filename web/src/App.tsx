import { useCallback, useEffect, useRef, useState } from "react";
import { GameClient } from "./net";
import type { IntermissionPayload, MatchSnapshot, NextPanoramaPayload, PlayerPublic, RoundRevealPayload } from "./types";
import { LandingScreen } from "./screens/LandingScreen";
import { GameScreen } from "./screens/GameScreen";
import "./index.css";

const SERVER_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:8787";
const NICK_KEY = "fafo.nickname";
const SESS_KEY = "fafo.session";

/** Stable per-device credential, minted once and persisted. Sent with every
 *  auth so the server can verify a rejoin belongs to the same browser. */
function deviceSessionId(): string {
  let id = localStorage.getItem(SESS_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESS_KEY, id);
  }
  return id;
}

const ERROR_TEXT: Record<string, string> = {
  not_authed: "Sign in first",
  rate_limited: "Too many attempts — slow down",
  in_match: "You're already in a match",
  room_not_found: "Room not found — check the code",
  room_started: "Room already started",
  room_full: "Room is full",
  already_in_room: "You're already in that room",
  already_online: "That nickname is already online",
  session_mismatch: "That account is mid-reconnect — try again in a moment",
  invalid_nickname: "Letters, numbers and underscores · 2–16 chars",
  invalid_code: "Invalid room code",
  invalid_guess: "Invalid guess coordinates",
  not_in_match: "You're not in a match",
  round_closed: "Round is closed",
  wrong_round: "Round mismatch — reconnect",
  time_expired: "Time expired",
  not_host: "Only the host can start",
  already_started: "Match already started",
  room_join_failed: "Couldn't join room",
  room_start_failed: "Couldn't start room",
  guess_failed: "Couldn't submit guess",
};

type Screen = "landing" | "game";

export default function App() {
  const clientRef = useRef<GameClient | null>(null);
  if (!clientRef.current) clientRef.current = new GameClient();
  const client = clientRef.current;

  const [screen, setScreen] = useState<Screen>("landing");
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICK_KEY) ?? "");
  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [panorama, setPanorama] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [roundCount, setRoundCount] = useState(5);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  const [guess, setGuess] = useState<{ lat: number; lng: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [reveal, setReveal] = useState<RoundRevealPayload | null>(null);
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [intermission, setIntermission] = useState<IntermissionPayload | null>(null);
  const [nextPanorama, setNextPanorama] = useState<NextPanoramaPayload | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [host, setHost] = useState<string | null>(null);
  const [mode, setMode] = useState<"quick" | "room">("quick");
  // No app-wide ticking clock (it re-rendered the whole tree 10x/sec): the
  // countdowns tick inside the components that need them, and the buzzer and
  // auto-submit are one-shot timers scheduled at the round deadline.
  const [timeUp, setTimeUp] = useState(false);
  const serverNow = useCallback(() => client.serverNow(), [client]);

  useEffect(() => {
    const c = client;
    const unsubs = [
      c.on("auth.ok", (p) => {
        localStorage.setItem(NICK_KEY, p.nickname);
        setNickname(p.nickname);
        setError(null);
        setBusy(null);
        setScreen("landing");
        const act = pendingActionRef.current;
        pendingActionRef.current = null;
        if (act) act();
      }),
      c.on("auth.error", (p) => {
        pendingActionRef.current = null;
        setBusy(null);
        setError(p.message);
      }),
      c.on("match.snapshot", (s) => {
        setSnapshot(s);
        setMode(s.mode);
        setRoomCode(s.roomCode);
        setRound(s.round);
        setRoundCount(s.roundCount);
        setRoundEndsAt(s.roundEndsAt);
        setHost(s.host);
        setPanorama(s.panorama?.key ?? null);
        setPlayers(s.players);
        setIntermission(null);
        setReveal(null);
        setGuess(null);
        setSubmitted(false);
        setScreen("game");
        setBusy(null);
        setError(null);
      }),
      c.on("round.start", (p) => {
        setPanorama(p.panorama.key);
        setRound(p.round);
        setRoundEndsAt(p.roundEndsAt);
        setReveal(null);
        setGuess(null);
        setSubmitted(false);
        setNextPanorama(null);
        // Flip the snapshot to playing so canPick works immediately, even
        // before the post-round snapshot broadcast reaches a room guest.
        setSnapshot((s) =>
          s ? { ...s, phase: "playing", round: p.round, roundEndsAt: p.roundEndsAt, panorama: p.panorama } : s,
        );
        // The next match auto-starts right after intermission; the overlay
        // must not linger over the new match.
        setIntermission(null);
      }),
      c.on("round.reveal", (p) => setReveal(p)),
      c.on("next.panorama", (p) => setNextPanorama(p)),
      c.on("intermission.start", (p) => {
        setIntermission(p);
        setRoundEndsAt(null);
      }),
      c.on("player.joined", (p) => {
        setPlayers(p.players);
        setHost(p.host);
      }),
      c.on("player.left", (p) => {
        setPlayers(p.players);
        setHost(p.host);
      }),
      c.on("player.updated", (p) => setPlayers(p.players)),
      c.on("match.left", () => {
        setScreen("landing");
        setSnapshot(null);
        setIntermission(null);
        setReveal(null);
      }),
      c.on("error", (p) => {
        setError(ERROR_TEXT[p.code] ?? p.code);
        setBusy(null);
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [client]);

  useEffect(() => {
    // Reloading with a saved nickname lands on Home, but the socket only
    // opens on submitNickname — auto-connect so Quick Play / rooms work
    // immediately after a reload (also restores an in-flight match via
    // the rejoin path on auth).
    const saved = localStorage.getItem(NICK_KEY);
    if (!saved) return;
    client.connect(
      SERVER_URL,
      () => {
        const n = nicknameRef.current;
        if (n) client.emit("auth", { nickname: n, sessionId: deviceSessionId() });
      },
      (msg) => setError(msg),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitNickname = (name: string) => {
    setBusy("connect");
    setNickname(name);
    // The auth callback may fire synchronously (already-connected socket), so
    // the ref must hold the new name before connect() is called.
    nicknameRef.current = name;
    client.connect(
      SERVER_URL,
      () => {
        const n = nicknameRef.current;
        if (n) client.emit("auth", { nickname: n, sessionId: deviceSessionId() });
      },
      (msg) => {
        setBusy(null);
        setError(msg);
      },
    );
  };

  // The play buttons auth with the typed name and then fire the queued
  // action — no separate ENTER step, no second page.
  const pendingActionRef = useRef<(() => void) | null>(null);
  const ensureAuth = (name: string, action: () => void) => {
    const n = name.trim();
    if (nickname && nickname === n) {
      action();
      return;
    }
    pendingActionRef.current = action;
    if (nickname) {
      // Name changed: the server ignores re-auth on an authed socket, so
      // leave + reconnect as the new name.
      client.emit("leave");
      client.disconnect();
    }
    submitNickname(n);
  };

  const resetRoundState = () => {
    setPanorama(null);
    setReveal(null);
    setGuess(null);
    setSubmitted(false);
    setRoundEndsAt(null);
  };

  const quickPlay = (name: string) => {
    ensureAuth(name, () => {
      setBusy("quick");
      resetRoundState();
      client.emit("quick.play", {});
    });
  };
  const createRoom = (name: string) => {
    ensureAuth(name, () => {
      setBusy("create");
      resetRoundState();
      client.emit("room.create", {});
    });
  };
  const joinRoom = (code: string, name: string) => {
    ensureAuth(name, () => {
      setBusy("join");
      resetRoundState();
      client.emit("room.join", { code });
    });
  };
  const leave = () => client.emit("leave", {});
  const startRoom = () => client.emit("room.start", { code: roomCode });
  // Dropping a pin only sets a DRAFT — the guess is sent when the user
  // presses SUBMIT GUESS. The draft can be moved anywhere until then. If the
  // round ends without submitting, the LAST pin drop auto-submits ~1.5s
  // before the buzzer, so a forgotten pin never silently scores 0.
  const pick = (p: { lat: number; lng: number }) => {
    if (!canPick) return;
    setGuess(p);
  };
  const submitGuess = () => {
    if (!guess || !canPick || submitted) return;
    client.emit("guess", { round, lat: guess.lat, lng: guess.lng });
    setSubmitted(true);
  };
  const canPick =
    !!snapshot &&
    snapshot.phase === "playing" &&
    !!roundEndsAt &&
    !timeUp &&
    !!panorama &&
    !submitted;
  // Buzzer: flip timeUp exactly at the server deadline so canPick disables the
  // map at the right moment without a 10×/sec App re-render. roundEndsAt is
  // server epoch ms; convert to a local delay via the clock offset.
  useEffect(() => {
    setTimeUp(false);
    if (!roundEndsAt) return;
    const delay = roundEndsAt - client.serverNow();
    if (delay <= 0) {
      setTimeUp(true);
      return;
    }
    const id = window.setTimeout(() => setTimeUp(true), delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundEndsAt, client]);
  // Forgotten-pin auto-submit: if the user pinned but never pressed SUBMIT,
  // lock their last pin in ~1.5s before the buzzer so it isn't lost. Scheduled
  // once per round instead of polled every 100ms.
  useEffect(() => {
    if (!roundEndsAt || submitted || !guess || reveal || !canPick) return;
    const fireAt = roundEndsAt - 1500; // server epoch
    const delay = fireAt - client.serverNow();
    const fire = () => {
      client.emit("guess", { round, lat: guess.lat, lng: guess.lng });
      setSubmitted(true);
    };
    if (delay <= 0) {
      fire();
      return;
    }
    const id = window.setTimeout(fire, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundEndsAt, submitted, guess, reveal, canPick, client, round]);

  if (screen === "landing") {
    return (
      <LandingScreen
        nickname={nickname}
        busy={busy}
        error={error}
        onQuickPlay={quickPlay}
        onCreateRoom={createRoom}
        onJoinRoom={joinRoom}
      />
    );
  }
  return (
    <GameScreen
      nickname={nickname}
      round={round}
      roundCount={roundCount}
      roomCode={roomCode}
      host={host}
      mode={mode}
      panorama={panorama}
      roundEndsAt={roundEndsAt}
      serverNow={serverNow}
      guess={guess}
      submitted={submitted}
      reveal={reveal}
      players={players}
      intermission={intermission}
      nextPanorama={nextPanorama}
      canPick={canPick}
      onPick={pick}
      onSubmitGuess={submitGuess}
      onStartRoom={startRoom}
      onLeave={leave}
    />
  );
}
