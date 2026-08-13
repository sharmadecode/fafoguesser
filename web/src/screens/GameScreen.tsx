import { useState } from "react";
import type { IntermissionPayload, NextPanoramaPayload, PlayerPublic, RoundRevealPayload } from "../types";
import { GuessMap } from "../components/GuessMap";
import { PanoramaViewer } from "../components/PanoramaViewer";
import { PanoPreloader } from "../components/PanoPreloader";
import { useNow } from "../hooks/useNow";

interface GameScreenProps {
  nickname: string;
  round: number;
  roundCount: number;
  roomCode: string | null;
  host: string | null;
  mode: "quick" | "room";
  panorama: string | null;
  roundEndsAt: number | null;
  serverNow: () => number;
  guess: { lat: number; lng: number } | null;
  submitted: boolean;
  reveal: RoundRevealPayload | null;
  players: PlayerPublic[];
  intermission: IntermissionPayload | null;
  nextPanorama: NextPanoramaPayload | null;
  canPick: boolean;
  onPick: (pick: { lat: number; lng: number }) => void;
  onSubmitGuess: () => void;
  onStartRoom: () => void;
  onLeave: () => void;
}

function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatDistance(m: number | null): string {
  if (m == null) return "—";
  if (m < 1000) return `${Math.round(m)} m`;
  const km = m / 1000;
  return `${km >= 100 ? Math.round(km) : km.toFixed(1)} km`;
}

export function GameScreen(props: GameScreenProps) {
  const inLobby = props.mode === "room" && !props.intermission && !props.reveal && props.round === 0 && !props.panorama;

  return (
    <div className="game">
      <header className="game-top">
        <div className="game-top-left">
          <div className="game-title">
            <b>FAFO<span>GUESSER</span></b>
            {props.roomCode && <span className="room-badge">ROOM {props.roomCode}</span>}
          </div>
          <div className={`round-pill ${inLobby ? "round-lobby" : ""}`}>
            {inLobby ? "LOBBY" : `ROUND ${props.round}/${props.roundCount}`}
          </div>
        </div>
        <div className="game-top-right">
          <TimerPill roundEndsAt={props.roundEndsAt} serverNow={props.serverNow} />
          <button className="leave-btn" onClick={props.onLeave}>
            LEAVE
          </button>
        </div>
      </header>

      {inLobby ? (
        <LobbyBlock {...props} />
      ) : (
        <div className="game-body">
          {props.panorama ? (
            <PanoramaBlock panoKey={props.panorama} />
          ) : (
            <div className="pano-placeholder">
              <div className="pano-placeholder-title">LOADING PANORAMA…</div>
              <div className="pano-placeholder-sub">Finding a street view for you</div>
            </div>
          )}

          <aside className="score-side">
            <div className="score-title">SCORES</div>
            {[...props.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <div key={p.nickname} className={`score-row ${p.nickname === props.nickname ? "me" : ""}`}>
                  <span className="score-name">
                    <span className="player-color-dot" style={{ background: p.color }} />
                    {p.nickname}
                    {p.nickname === props.nickname && <em>(you)</em>}
                    {!p.connected && <span className="offline">offline</span>}
                  </span>
                  <span className="score-val">
                    {p.guessed && !props.reveal ? <span className="guessed-dot" /> : null}
                    {p.score}
                  </span>
                </div>
              ))}
          </aside>

          <MapBlock {...props} />

          {props.reveal && (
            <RevealPanel
              reveal={props.reveal}
              nickname={props.nickname}
              roundCount={props.roundCount}
              nextPanorama={props.nextPanorama}
            />
          )}
        </div>
      )}

      {props.intermission && <IntermissionOverlay payload={props.intermission} serverNow={props.serverNow} />}
      <PanoPreloader panoKey={props.nextPanorama?.key ?? null} />
    </div>
  );
}

function LobbyBlock(props: GameScreenProps) {
  const isHost = props.host === props.nickname;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!props.roomCode) return;
    try {
      await navigator.clipboard.writeText(props.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = props.roomCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div className="lobby">
      <div className="lobby-card">
        <h2>LOBBY</h2>
        <div className="lobby-share">
          <span>Share code <b>{props.roomCode}</b> with up to {5 - props.players.length} more player{5 - props.players.length === 1 ? "" : "s"}</span>
          <button className="copy-btn" onClick={copy}>
            {copied ? "COPIED ✓" : "COPY"}
          </button>
        </div>
        <div className="lobby-players">
          {props.players.map((p) => (
            <div key={p.nickname} className={`lobby-row ${p.nickname === props.nickname ? "me" : ""}`}>
              <span>{p.nickname}</span>
              <span className="lobby-tag">{p.nickname === props.host ? "HOST" : p.nickname === props.nickname ? "YOU" : ""}</span>
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

function PanoramaBlock({ panoKey }: { panoKey: string }) {
  // The viewer is recreated per round (fetches the proxied bytes as a blob);
  // the PanoPreloader warms the cache so this fetch is near-instant.
  return <PanoramaViewer panoKey={panoKey} />;
}

function MapBlock(props: GameScreenProps) {
  return (
    <GuessMap
      enabled={props.canPick}
      guess={props.guess}
      reveal={props.reveal}
      onPick={props.onPick}
      nickname={props.nickname}
      players={props.players}
      submitted={props.submitted}
      round={props.round}
      onSubmitGuess={props.onSubmitGuess}
    />
  );
}

function IntermissionOverlay({ payload, serverNow }: { payload: IntermissionPayload; serverNow: () => number }) {
  const now = useNow(serverNow, 500);
  const remaining = Math.max(0, payload.nextMatchAt - now);
  return (
    <div className="intermission">
      <div className="intermission-card">
        <h2>MATCH {payload.matchNumber} OVER</h2>
        <div className="podium">
          {payload.finalRanks.map((r, i) => (
            <div key={r.nickname} className={`podium-row ${i === 0 ? "first" : ""}`}>
              <span className="podium-rank">{i + 1}</span>
              <span className="podium-name">{r.nickname}</span>
              <span className="podium-score">{r.score}</span>
            </div>
          ))}
        </div>
        <div className="next-in">next match in {Math.ceil(remaining / 1000)}s</div>
      </div>
    </div>
  );
}

// The round countdown. Ticks internally via useNow (250ms) so ONLY this pill
// re-renders during a round — not the whole game tree incl. the Leaflet map.
// The previous design lifted `now` to <App> and updated it every 100ms.
function TimerPill({ roundEndsAt, serverNow }: { roundEndsAt: number | null; serverNow: () => number }) {
  const now = useNow(serverNow, 250);
  const remaining = roundEndsAt ? Math.max(0, roundEndsAt - now) : 0;
  const urgent = remaining > 0 && remaining <= 5000;
  return (
    <div className={`timer-pill ${urgent ? "timer-urgent" : ""}`}>
      {roundEndsAt ? formatTime(remaining) : "—"}
    </div>
  );
}

// Floating results panel over the full-screen reveal map: every player, their
// color, distance from the target and round points. The footer shows whether
// the NEXT round's panorama is already warm (preloaded while we played).
function RevealPanel({
  reveal,
  nickname,
  roundCount,
  nextPanorama,
}: {
  reveal: RoundRevealPayload;
  nickname: string;
  roundCount: number;
  nextPanorama: NextPanoramaPayload | null;
}) {
  const isLastRound = reveal.round >= roundCount;
  return (
    <div className="reveal-panel">
      <div className="reveal-panel-title">ROUND {reveal.round} · REVEAL</div>
      <div className="reveal-panel-rows">
        {reveal.results.map((r, i) => (
          <div key={r.nickname} className={`reveal-panel-row ${r.nickname === nickname ? "me" : ""}`}>
            <span className="reveal-rank">{i + 1}</span>
            <span className="player-color-dot" style={{ background: r.color }} />
            <span className="reveal-name">
              {r.nickname}
              {r.nickname === nickname && <em>(you)</em>}
            </span>
            <span className="reveal-dist">{formatDistance(r.distanceM)}</span>
            <span className="reveal-points">+{r.points}</span>
          </div>
        ))}
      </div>
      <div className={`reveal-next ${isLastRound ? "done" : nextPanorama ? "ready" : "loading"}`}>
        {isLastRound
          ? "MATCH COMPLETE — FINAL SCORES"
          : nextPanorama
            ? "NEXT LOCATION READY — STARTING SOON"
            : "LOADING NEXT LOCATION…"}
      </div>
    </div>
  );
}