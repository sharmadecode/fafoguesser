import { useCallback, useEffect, useRef, useState } from "react";
import { GameClient } from "./net";
import type { IntermissionPayload, MatchSnapshot, PlayerPublic, RoundRevealPayload } from "./types";
import { LandingScreen } from "./screens/LandingScreen";
import { GameScreen } from "./screens/GameScreen";
import { SERVER_URL } from "./shared";

const NICK_KEY = "fafo.nickname";
const SESS_KEY = "fafo.session";
const TOKEN_KEY = "fafo.token";

/** Stable per-device credential, minted once and persisted. Sent with every
 *  auth so the server can verify a rejoin belongs to the same browser. */
function deviceSessionId(): string {
  let id = localStorage.getItem(SESS_KEY);
  if (!id) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      id = crypto.randomUUID();
    } else {
      id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
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
  match_gone: "That match ended — try again.",
};

type Screen = "landing" | "game";

export default function App() {
  const clientRef = useRef<GameClient | null>(null);
  if (!clientRef.current) clientRef.current = new GameClient();
  const client = clientRef.current;

  const [screen, setScreen] = useState<Screen>("landing");
  const [initialJoinCode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const j = params.get("join");
      if (j && /^[A-Za-z0-9]{4}$/.test(j)) {
        return j.toUpperCase();
      }
    }
    return "";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("join=")) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [nickname, setNickname] = useState(() => localStorage.getItem(NICK_KEY) ?? "");
  const nicknameRef = useRef(nickname);
  nicknameRef.current = nickname;
  // Whether the server confirmed this nickname on the current socket session.
  // Auth is async — never emit play before auth.ok, or the server rejects.
  const authedRef = useRef(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Raw socket state, for the mid-game reconnect banner (set by the
  // net.ts status callback, which also fires on the initial state).
  const [connected, setConnected] = useState(true);

  const [snapshot, setSnapshot] = useState<MatchSnapshot | null>(null);
  const [panorama, setPanorama] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [roundCount, setRoundCount] = useState(5);
  const [roundEndsAt, setRoundEndsAt] = useState<number | null>(null);
  // No guess draft: the dropped pin IS the guess. These track whether the
  // player actually placed a pin this round (the async world-view reset must
  // never count as a deliberate guess).
  const [mapTouchedThisRound, setMapTouchedThisRound] = useState(false);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const pinRef = useRef(pin);
  // Live-ref mirrors of state the socket handlers need without stale
  // closures (the listener effect only mounts once).
  const roundRef = useRef(0);
  const snapshotRef = useRef<MatchSnapshot | null>(null);
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);
  const [submitted, setSubmitted] = useState(false);
  const [reveal, setReveal] = useState<RoundRevealPayload | null>(null);
  const [players, setPlayers] = useState<PlayerPublic[]>([]);
  const [intermission, setIntermission] = useState<IntermissionPayload | null>(null);
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
        authedRef.current = true;
        localStorage.setItem(NICK_KEY, p.nickname);
        if (p.token) localStorage.setItem(TOKEN_KEY, p.token);
        setNickname(p.nickname);
        setError(null);
        setBusy(null);
        // Mid-game reconnects re-auth on the same socket — never bounce a
        // live round back to the landing screen; the rejoin snapshot owns
        // the transition. A fresh login has no snapshot and lands on Home.
        if (!snapshotRef.current) setScreen("landing");
        const act = pendingActionRef.current;
        pendingActionRef.current = null;
        if (act) act();
      }),
      c.on("auth.error", (p) => {
        authedRef.current = false;
        pendingActionRef.current = null;
        setBusy(null);
        setError(p.message);
      }),
      c.on("match.snapshot", (s) => {
        setSnapshot(s);
        setMode(s.mode);
        setRoomCode(s.roomCode);
        // Round-identity snapshot: mid-round snapshots (rejoin after a
        // reconnect, player join/leave broadcasts) must NOT wipe a placed
        // pin, the touched flag, or the submitted lock — only an actual
        // round transition resets the guess state.
        const sameRound = s.round === roundRef.current;
        setRound(s.round);
        roundRef.current = s.round;
        setRoundCount(s.roundCount);
        setRoundEndsAt(s.roundEndsAt);
        setHost(s.host);
        setPanorama(s.panorama?.key ?? null);
        setPlayers(s.players);
        setIntermission(null);
        setReveal(null);
        if (!sameRound) {
          setPin(null);
          pinRef.current = null;
          setMapTouchedThisRound(false);
          setSubmitted(false);
        }
        setScreen("game");
        setBusy(null);
        setError(null);
      }),
      c.on("round.start", (p) => {
        setPanorama(p.panorama.key);
        setRound(p.round);
        roundRef.current = p.round;
        setRoundEndsAt(p.roundEndsAt);
        setReveal(null);
        setPin(null);
        pinRef.current = null;
        setMapTouchedThisRound(false);
        setSubmitted(false);
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
      c.on("player.updated", (p) => {
        setPlayers(p.players);
        setHost(p.host);
        // No ack-lock here: the server keeps the LAST pin per round and acks
        // every move with guessed=true, so locking on this ack would freeze
        // the pin after the first placement. The pin stays movable until the
        // buzzer safety fire locks it in.
      }),
      c.on("match.left", () => {
        setScreen("landing");
        setSnapshot(null);
        setIntermission(null);
        setReveal(null);
      }),
      c.on("error", (p) => {
        if (p.code === "not_authed") authedRef.current = false;
        // A rejected guess must not leave the footer lying "locked in".
        // Transient rejections (fixable by re-placing/re-emitting) unlock;
        // terminal ones (the round is over, or the round id mismatches)
        // keep the lock — unlocking would re-arm the auto-submit into an
        // instant rejected re-fire loop until the reveal lands.
        if (
          p.code === "not_in_match" ||
          p.code === "invalid_guess" ||
          p.code === "guess_failed" ||
          p.code === "not_authed"
        ) {
          setSubmitted(false);
        }
        setError(ERROR_TEXT[p.code] ?? p.code);
        setBusy(null);
      }),
      client.onStatusChange(setConnected),
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
        const token = localStorage.getItem(TOKEN_KEY) || undefined;
        if (n) client.emit("auth", { nickname: n, sessionId: deviceSessionId(), token });
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
        const token = localStorage.getItem(TOKEN_KEY) || undefined;
        if (n) client.emit("auth", { nickname: n, sessionId: deviceSessionId(), token });
      },
      (msg) => {
        setBusy(null);
        setError(msg);
      },
    );
  };

  // The play buttons auth with the typed name and then fire the queued
  // action — no separate ENTER step, no second page. The fast path only
  // fires immediately when the server already confirmed THIS nickname on
  // the current socket; otherwise the action queues behind the auth round
  // trip — never emit play before auth.
  const pendingActionRef = useRef<(() => void) | null>(null);
  const ensureAuth = (name: string, action: () => void) => {
    const n = name.trim();
    if (nickname && nickname === n && authedRef.current) {
      action();
      return;
    }
    pendingActionRef.current = action;
    if (nickname && nickname !== n) {
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
    setPin(null);
    pinRef.current = null;
    setMapTouchedThisRound(false);
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
  // Tap/click-to-guess: a placed pin IS the guess on every device — no draft,
  // no submit button (Android parity). The pin is sent immediately (the
  // server keeps the LAST pin per round), and the buzzer safety fire below
  // guarantees the final placement is never silently dropped.
  const onPinPlace = (c: { lat: number; lng: number }) => {
    pinRef.current = c;
    setPin(c);
    if (!canPick) return;
    setMapTouchedThisRound(true);
    client.emit("guess", { round, lat: c.lat, lng: c.lng });
  };
  const canPick =
    !!snapshot &&
    snapshot.phase === "playing" &&
    !!roundEndsAt &&
    !timeUp &&
    !!panorama &&
    !submitted &&
    connected;
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
  // Reconnect flush: if a pin was placed while offline/reconnecting, flush it
  // as soon as connection is restored and the round is still actively accepting picks.
  useEffect(() => {
    if (connected && canPick && pinRef.current && !submitted && mapTouchedThisRound) {
      client.emit("guess", { round, lat: pinRef.current.lat, lng: pinRef.current.lng });
    }
  }, [connected, canPick, round, submitted, mapTouchedThisRound, client]);

  // Pin auto-submit safety: each placement already emits immediately, but if
  // the buzzer is about to fire and the player's LAST pin was never acked
  // (offline flush, race), lock in whatever pin is current ~1.5s before the
  // deadline so a placed guess never silently scores 0. Keyed on `pin` so a
  // move reschedules it; `fire()` always reads pinRef.current — never a
  // stale capture.
  useEffect(() => {
    if (!roundEndsAt || submitted || !mapTouchedThisRound || reveal || !canPick) return;
    if (!pinRef.current) return;
    const fireAt = roundEndsAt - 1500; // server epoch
    const delay = fireAt - client.serverNow();
    const fire = () => {
      const latest = pinRef.current;
      if (!latest) return;
      client.emit("guess", { round, lat: latest.lat, lng: latest.lng });
      setSubmitted(true);
    };
    if (delay <= 0) {
      fire();
      return;
    }
    const id = window.setTimeout(fire, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundEndsAt, submitted, mapTouchedThisRound, reveal, canPick, client, round, pin]);

  if (screen === "landing") {
    return (
      <LandingScreen
        nickname={nickname}
        initialCode={initialJoinCode}
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
      phase={snapshot?.phase ?? "waiting"}
      round={round}
      roundCount={roundCount}
      roomCode={roomCode}
      host={host}
      mode={mode}
      panorama={panorama}
      roundEndsAt={roundEndsAt}
      intermissionEndsAt={snapshot?.intermissionEndsAt ?? null}
      serverNow={serverNow}
      submitted={submitted}
      reveal={reveal}
      players={players}
      intermission={intermission}
      canPick={canPick}
      connected={connected}
      error={error}
      onPinPlace={onPinPlace}
      onStartRoom={startRoom}
      onLeave={leave}
    />
  );
}
