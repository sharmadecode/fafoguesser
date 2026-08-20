import { useEffect, useRef, useState } from "react";
import type { IntermissionPayload, PlayerPublic, RoundRevealPayload } from "../types";
import { GuessMap } from "../components/GuessMap";
import { PanoramaViewer } from "../components/PanoramaViewer";
import { useNow } from "../hooks/useNow";
import { useRotatingTip } from "../hooks/useRotatingTip";

interface GameScreenProps {
  nickname: string;
  phase: "playing" | "intermission" | "waiting";
  round: number;
  roundCount: number;
  roomCode: string | null;
  host: string | null;
  mode: "quick" | "room";
  panorama: string | null;
  roundEndsAt: number | null;
  intermissionEndsAt: number | null;
  serverNow: () => number;
  submitted: boolean;
  reveal: RoundRevealPayload | null;
  players: PlayerPublic[];
  intermission: IntermissionPayload | null;
  canPick: boolean;
  connected: boolean;
  error: string | null;
  onPinPlace: (pick: { lat: number; lng: number }) => void;
  onStartRoom: () => void;
  onLeave: () => void;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatDistance(m: number | null): string {
  if (m === null || !Number.isFinite(m)) return "–";
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return km >= 100 ? `${Math.round(km).toLocaleString()} km` : `${km.toFixed(1)} km`;
}

export function GameScreen(props: GameScreenProps) {
  const inLobby =
    props.mode === "room" && !props.intermission && !props.reveal && props.round === 0 && !props.panorama && props.phase !== "playing";
  const waiting = !inLobby && props.round === 0 && !props.panorama && !props.reveal && !props.intermission;
  // Intermission can also arrive via snapshot phase alone (a rejoin mid-
  // intermission never gets the broadcast intermission.start event) — the
  // overlay must render then too, and the old round's pano must stay hidden.
  const intermissionActive = !!props.intermission || props.phase === "intermission";

  const [splitFocus, setSplitFocus] = useState<"pano" | "map">("pano");
  const tip = useRotatingTip(undefined, 3200, waiting || !props.panorama);

  // Auto-dismiss game error after 5s
  const [displayError, setDisplayError] = useState<string | null>(props.error);
  useEffect(() => {
    setDisplayError(props.error);
    if (!props.error) return;
    const id = window.setTimeout(() => setDisplayError(null), 5000);
    return () => window.clearTimeout(id);
  }, [props.error]);

  // Desktop (mouse, wide viewport): hover-enlarge docked map; touch/small
  // gets the adaptive split. Listens to resize/orientation changes.
  const [isFine, setIsFine] = useState(() =>
    typeof window !== "undefined" && window.matchMedia?.("(pointer: fine) and (min-width: 900px)").matches,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(pointer: fine) and (min-width: 900px)");
    const handler = (e: MediaQueryListEvent) => setIsFine(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setSplitFocus("pano");
  }, [props.round, props.panorama]);

  return (
    <div className={`game${isFine ? " desktop" : ""}`}>
      {(!props.connected || displayError) && (
        <div className="banner-stack" role="alert" aria-live="polite">
          {!props.connected && (
            <div className="reconnect-banner">CONNECTION LOST — RECONNECTING…</div>
          )}
          {displayError && <div className="game-error-banner">{displayError}</div>}
        </div>
      )}
      <header className="game-top">
        <div className="game-top-left">
          <div className={`round-pill ${inLobby ? "round-lobby" : ""}`}>
            {inLobby ? "LOBBY" : `ROUND ${props.round + 1}/${props.roundCount}`}
          </div>
          {props.roomCode && <span className="room-badge">ROOM {props.roomCode}</span>}
        </div>
        <div className="game-top-right">
          <TimerPill roundEndsAt={props.roundEndsAt} serverNow={props.serverNow} />
          <button className="leave-btn" onClick={props.onLeave}>
            LEAVE
          </button>
        </div>
      </header>

      {props.reveal && (
        <RevealStrip
          reveal={props.reveal}
          nickname={props.nickname}
        />
      )}

      {inLobby ? (
        <LobbyBlock {...props} />
      ) : intermissionActive ? (
        <IntermissionOverlay
          payload={props.intermission}
          intermissionEndsAt={props.intermissionEndsAt}
          serverNow={props.serverNow}
          nickname={props.nickname}
          onLeave={props.onLeave}
        />
      ) : waiting ? (
        <WaitingBlock isRoom={props.mode === "room"} />
      ) : (
        <div className={`game-body${splitFocus === "map" ? " map-focused" : ""}`}>
          {!props.reveal && (
            <>
              <div
                className="pano-slot"
                onPointerDownCapture={isFine ? undefined : () => setSplitFocus("pano")}
              >
                {props.panorama ? (
                  <PanoramaViewer panoKey={props.panorama} />
                ) : (
                  <div className="pano-placeholder">
                    <div className="pano-placeholder-title">LOADING PANORAMA…</div>
                    <div className="pano-placeholder-sub">{tip}</div>
                  </div>
                )}
              </div>
            </>
          )}
          <div
            className={`map-slot${props.reveal ? " reveal-mode" : ""}`}
            onPointerDownCapture={isFine ? undefined : () => setSplitFocus("map")}
          >
            <GuessMap
              enabled={props.canPick}
              reveal={props.reveal}
              onPinPlace={props.onPinPlace}
              round={props.round}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function LobbyBlock(props: GameScreenProps) {
  const isHost = props.host === props.nickname;
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const copy = async () => {
    if (!props.roomCode) return;
    const inviteLink = `${window.location.origin}/?join=${props.roomCode}`;
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      copyTimerRef.current = window.setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1500);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <h2>LOBBY</h2>
        <div className="lobby-share">
          <span>
            Code <b>{props.roomCode}</b> · {props.players.length}/5 Players
          </span>
          <button className="copy-btn" onClick={copy}>
            {copied ? "LINK COPIED ✓" : "🔗 COPY INVITE LINK"}
          </button>
        </div>
        <div className="lobby-players">
          {props.players.map((p) => (
            <div key={p.nickname} className={`lobby-row ${p.nickname === props.nickname ? "me" : ""}`}>
              <span>{p.nickname}</span>
              <span className="lobby-tag">
                {p.nickname === props.host ? "HOST" : p.nickname === props.nickname ? "YOU" : ""}
              </span>
            </div>
          ))}
        </div>
        {isHost ? (
          <button className="btn-brutal btn-big" onClick={props.onStartRoom} disabled={props.players.length < 1}>
            START MATCH
          </button>
        ) : (
          <p className="lobby-wait">Waiting for the host to start…</p>
        )}
      </div>
    </div>
  );
}

function WaitingBlock({ isRoom }: { isRoom: boolean }) {
  const tip = useRotatingTip();
  return (
    <div className="waiting">
      <div className="waiting-card">
        <div className="waiting-spinner" aria-hidden="true" />
        <h2>{isRoom ? "STARTING MATCH…" : "FINDING MATCH…"}</h2>
        <p className="waiting-sub">Finding a street view for you</p>
        <div className="waiting-tip">{tip}</div>
      </div>
    </div>
  );
}

function IntermissionOverlay({
  payload,
  intermissionEndsAt,
  serverNow,
  nickname,
  onLeave,
}: {
  payload: IntermissionPayload | null;
  intermissionEndsAt: number | null;
  serverNow: () => number;
  nickname: string;
  onLeave: () => void;
}) {
  const [shared, setShared] = useState(false);
  const now = useNow(serverNow, 500);
  // A rejoin mid-intermission has no intermission.start payload — count down
  // from the snapshot's intermissionEndsAt instead.
  const deadline = payload ? payload.nextMatchAt : intermissionEndsAt;
  const remaining = deadline ? Math.max(0, deadline - now) : 0;

  const share = async () => {
    if (!payload) return;
    const me = payload.finalRanks.find((r) => r.nickname === nickname);
    const myRank = payload.finalRanks.findIndex((r) => r.nickname === nickname) + 1;
    const url = window.location.origin;
    const text = `🌍 FafoGuesser Match #${payload.matchNumber}\n🏆 Score: ${me?.score ?? 0} pts (Rank #${myRank || 1})\nPlay free: ${url}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: "FafoGuesser", text, url });
      } else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch {
      /* ignore cancel */
    }
  };

  return (
    <div className="intermission">
      <div className="intermission-card">
        <h2>{payload ? `MATCH ${payload.matchNumber} OVER` : "MATCH OVER"}</h2>
        {payload && (
          <div className="podium">
            {payload.finalRanks.map((r, i) => (
              <div key={r.nickname} className={`podium-row ${i === 0 ? "first" : ""}`}>
                <span className="podium-rank">{i === 0 ? "★" : i + 1}</span>
                <span className="podium-name">{r.nickname}</span>
                <span className="podium-score">{r.score}</span>
              </div>
            ))}
          </div>
        )}
        <div className="intermission-actions">
          {payload && (
            <button className="btn-brutal btn-share" onClick={share}>
              {shared ? "COPIED TO CLIPBOARD ✓" : "📤 SHARE RESULT"}
            </button>
          )}
          <div className="next-in">next match in {Math.ceil(remaining / 1000)}s</div>
          <button className="btn-brutal intermission-leave" onClick={onLeave}>
            LEAVE
          </button>
        </div>
      </div>
    </div>
  );
}

function TimerPill({ roundEndsAt, serverNow }: { roundEndsAt: number | null; serverNow: () => number }) {
  const now = useNow(serverNow, 250);
  const remaining = roundEndsAt ? Math.max(0, roundEndsAt - now) : 0;
  const liveRound = roundEndsAt != null && remaining > 0;
  const urgent = liveRound && remaining <= 5000;
  return (
    <div className={`timer-pill ${urgent ? "timer-urgent" : ""}`} aria-live="off">
      {liveRound ? formatTime(remaining) : "–:–"}
    </div>
  );
}

function RevealStrip({
  reveal,
  nickname,
}: {
  reveal: RoundRevealPayload;
  nickname: string;
}) {
  return (
    <div className="reveal-strip">
      <div className="reveal-strip-title">ROUND {reveal.round + 1} · RESULTS</div>
      <div className="reveal-table">
        <div className="reveal-table-head">
          <span className="reveal-col-rank">#</span>
          <span className="reveal-col-name">PLAYER</span>
          <span className="reveal-col-dist">DIST</span>
          <span className="reveal-col-score">SCORE</span>
        </div>
        {reveal.results.map((r, i) => (
          <div key={r.nickname} className={`reveal-row${r.nickname === nickname ? " me" : ""}`}>
            <span className="reveal-col-rank">{i + 1}</span>
            <span className="player-color-dot" style={{ background: r.color }} />
            <span className="reveal-col-name">
              {r.nickname}
              {r.nickname === nickname && <em>(you)</em>}
            </span>
            <span className="reveal-col-dist">{formatDistance(r.distanceM)}</span>
            <span className="reveal-col-score">{r.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}