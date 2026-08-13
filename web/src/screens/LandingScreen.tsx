import { useEffect, useState } from "react";

interface LandingScreenProps {
  nickname: string;
  busy: string | null;
  error: string | null;
  onQuickPlay: (name: string) => void;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
}

const SHAPES = [
  { cls: "shape sq", top: "12%", left: "6%", s: 46, d: "0s" },
  { cls: "shape cr", top: "24%", left: "88%", s: 60, d: "-6s" },
  { cls: "shape tri", top: "62%", left: "4%", s: 52, d: "-12s" },
  { cls: "shape cr", top: "78%", left: "90%", s: 40, d: "-18s" },
  { cls: "shape sq", top: "8%", left: "55%", s: 30, d: "-9s" },
  { cls: "shape x", top: "48%", left: "94%", s: 44, d: "-15s" },
  { cls: "shape x", top: "85%", left: "30%", s: 36, d: "-4s" },
  { cls: "shape tri", top: "36%", left: "14%", s: 34, d: "-21s" },
];

const STEPS = [
  { n: "01", t: "LOOK AROUND", d: "Drag the 360° street view. Every direction is real — figure out where you are." },
  { n: "02", t: "DROP YOUR PIN", d: "Tap the mini map where you think the spot is. Your pin is a draft — move it anywhere until you lock it." },
  { n: "03", t: "SUBMIT GUESS", d: "Hit SUBMIT GUESS to lock it in. No time left? Your last pin auto-locks at the buzzer." },
  { n: "04", t: "SCORE & WIN", d: "Exact hit = 1000 pts, 4,000 km of error = 0. Highest total after 5 rounds wins." },
];

export function LandingScreen({ nickname, busy, error, onQuickPlay, onCreateRoom, onJoinRoom }: LandingScreenProps) {
  const [name, setName] = useState(nickname);
  const [code, setCode] = useState("");
  const nameValid = name.trim().length >= 2;

  useEffect(() => {
    if (nickname) setName(nickname);
  }, [nickname]);

  const join = () => {
    const c = code.trim().toUpperCase();
    if (c.length === 4) onJoinRoom(c, name);
  };

  return (
    <div className="landing">
      <div className="ticker"><div className="ticker-inner">
        <span>FAFO GUESSER</span><span>•</span><span>5 ROUNDS</span><span>•</span>
        <span>30 SECONDS EACH</span><span>•</span><span>360° STREET VIEW</span><span>•</span>
        <span>CLOSEST GUESS WINS</span><span>•</span>
        <span>FAFO GUESSER</span><span>•</span><span>5 ROUNDS</span><span>•</span>
        <span>30 SECONDS EACH</span><span>•</span><span>360° STREET VIEW</span><span>•</span>
        <span>CLOSEST GUESS WINS</span><span>•</span>
      </div></div>

      <div className="shapes" aria-hidden="true">
        {SHAPES.map((s, i) => (
          <div key={i} className={s.cls} style={{ top: s.top, left: s.left, width: s.s, height: s.s, animationDelay: s.d }} />
        ))}
      </div>

      <main className="landing-main">
        <header className="hero">
          <h1 className="logo landing-logo" aria-label="FAFO GUESSER">
            {"FAFO".split("").map((c, i) => (
              <span key={`f${i}`} className="logo-chunk logo-fafo" style={{ animationDelay: `${i * 0.07}s` }}>{c}</span>
            ))}
            <span className="logo-chunk logo-spacer" style={{ animationDelay: "0.28s" }}>&nbsp;</span>
            {"GUESSER".split("").map((c, i) => (
              <span key={`g${i}`} className="logo-chunk logo-guess" style={{ animationDelay: `${0.28 + i * 0.07}s` }}>{c}</span>
            ))}
          </h1>
          <span className="tagline hero-tagline">figure it out or find out</span>
        </header>

        <section className="landing-card">
          <input
            className="nick-input"
            placeholder="YOUR NICKNAME"
            maxLength={16}
            value={name}
            disabled={busy !== null}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="landing-actions">
            <button className="btn-brutal btn-big" disabled={busy !== null || !nameValid} onClick={() => onQuickPlay(name)}>
              {busy === "quick" ? "Finding match…" : "⚡ QUICK PLAY"}
            </button>
            <div className="divider"><span>or</span></div>
            <button className="btn-brutal" disabled={busy !== null || !nameValid} onClick={() => onCreateRoom(name)}>
              {busy === "create" ? "Creating…" : "MAKE A ROOM"}
            </button>
            <div className="join-row">
              <input
                className="code-input"
                placeholder="ROOM CODE"
                maxLength={4}
                value={code}
                disabled={busy !== null}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && join()}
              />
              <button className="btn-brutal btn-join" disabled={busy !== null || !nameValid || code.length !== 4} onClick={join}>
                {busy === "join" ? "Joining…" : "JOIN"}
              </button>
            </div>
          </div>

          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="howto">
          <h2 className="howto-title">HOW TO PLAY</h2>
          <div className="howto-grid">
            {STEPS.map((s) => (
              <div key={s.n} className="howto-tile">
                <div className="howto-num">{s.n}</div>
                <div className="howto-body">
                  <h3>{s.t}</h3>
                  <p>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="landing-footer">
          <p>FAFO GUESSER <span>·</span> figure it out or find out</p>
          <p className="muted">works on any browser — phone, tablet, desktop</p>
        </footer>
      </main>
    </div>
  );
}
