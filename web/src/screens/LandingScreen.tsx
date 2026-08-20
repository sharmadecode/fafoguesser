import { useEffect, useState } from "react";
import { useLandingInteractions } from "../hooks/useLandingInteractions";

interface LandingScreenProps {
  nickname: string;
  initialCode?: string;
  busy: string | null;
  error: string | null;
  onQuickPlay: (name: string) => void;
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
}

const NICKNAME_RE = /^[A-Za-z0-9_]{2,16}$/;

const SHAPES = [
  { cls: "shape sq", top: "12%", left: "6%", s: 46, d: "0s", depth: 0.8 },
  { cls: "shape cr", top: "24%", left: "88%", s: 60, d: "-6s", depth: 1.2 },
  { cls: "shape tri", top: "62%", left: "4%", s: 52, d: "-12s", depth: 0.6 },
  { cls: "shape cr", top: "78%", left: "90%", s: 40, d: "-18s", depth: 1.0 },
  { cls: "shape sq", top: "8%", left: "55%", s: 30, d: "-9s", depth: 0.5 },
  { cls: "shape x", top: "48%", left: "94%", s: 44, d: "-15s", depth: 1.4 },
  { cls: "shape x", top: "85%", left: "30%", s: 36, d: "-4s", depth: 0.7 },
  { cls: "shape tri", top: "36%", left: "14%", s: 34, d: "-21s", depth: 0.9 },
];

const STEPS = [
  { n: "01", t: "SCOUT CLUES", d: "Pan the 360° view. Look for signs, road lines, landscape, and language." },
  { n: "02", t: "DROP A PIN", d: "Tap the map where you think you are. Move your pin anytime before the buzzer." },
  { n: "03", t: "BEAT THE CLOCK", d: "When time expires, your latest pin locks in automatically. No extra click required." },
  { n: "04", t: "CLIMB THE RANKS", d: "Closer guess = higher score (up to 1,000 pts). Most points after 5 rounds takes the win." },
];

const FAQS = [
  { q: "Is FafoGuesser free to play?", a: "Yes! FafoGuesser is 100% free with unlimited rounds, zero paywalls, and no account signup required." },
  { q: "How do multiplayer rooms work?", a: "Click 'MAKE A ROOM' to generate a 4-letter code or invite link. Share the link with friends on Discord or WhatsApp to play live in real-time." },
  { q: "Where do the 360° panoramas come from?", a: "Locations are sourced from authentic open 360° street view photography spanning 800+ countries, territories, and cities worldwide." },
];

export function LandingScreen({ nickname, initialCode = "", busy, error, onQuickPlay, onCreateRoom, onJoinRoom }: LandingScreenProps) {
  const [name, setName] = useState(nickname);
  const [code, setCode] = useState(initialCode);
  const nameValid = NICKNAME_RE.test(name.trim());
  const nameTouched = name.length > 0;

  const { containerRef, cardRef, quickBtnRef, shapesRef } = useLandingInteractions();

  useEffect(() => {
    if (nickname) setName(nickname);
  }, [nickname]);

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

  const join = () => {
    const c = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (c.length === 4 && nameValid) onJoinRoom(c, name.trim());
  };

  const handleQuickPlay = () => {
    if (nameValid && !busy) {
      onQuickPlay(name.trim());
    }
  };

  return (
    <div ref={containerRef} className="landing">
      <div ref={shapesRef} className="shapes" aria-hidden="true">
        {SHAPES.map((s, i) => (
          <div
            key={i}
            className="shape-wrap"
            style={{
              top: s.top,
              left: s.left,
              transform: `translate3d(calc(var(--px, 0px) * ${s.depth}), calc(var(--py, 0px) * ${s.depth}), 0)`,
            }}
          >
            <div className={s.cls} style={{ width: s.s, height: s.s, animationDelay: s.d }} />
          </div>
        ))}
      </div>

      <main className="landing-main">
        <header className="hero">
          <div className="hero-badge-wrap">
            <img src="/favicon.svg" alt="FafoGuesser Logo" className="hero-logo-icon" width="64" height="64" />
          </div>
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

        <section ref={cardRef} className="landing-card">
          <div className="nick-field">
            <input
              className={`nick-input${nameTouched && !nameValid ? " input-invalid" : ""}`}
              placeholder="YOUR NICKNAME"
              maxLength={16}
              value={name}
              disabled={busy !== null}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleQuickPlay();
              }}
              autoComplete="username"
              spellCheck={false}
            />
            {nameTouched && !nameValid && (
              <div className="nick-hint">Letters, numbers, underscores · 2–16 chars</div>
            )}
          </div>

          <div className="landing-actions">
            <button
              ref={quickBtnRef}
              className="btn-brutal btn-big btn-quick"
              disabled={busy !== null || !nameValid}
              onClick={handleQuickPlay}
            >
              {busy === "quick" ? "Finding match…" : "⚡ QUICK PLAY"}
            </button>
            <div className="divider"><span>or</span></div>
            <button
              className="btn-brutal btn-room"
              disabled={busy !== null || !nameValid}
              onClick={() => nameValid && onCreateRoom(name.trim())}
            >
              {busy === "create" ? "Creating…" : "MAKE A ROOM"}
            </button>
            <div className="join-row">
              <input
                className="code-input"
                placeholder="ROOM CODE"
                maxLength={4}
                value={code}
                disabled={busy !== null}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                onKeyDown={(e) => e.key === "Enter" && join()}
                spellCheck={false}
              />
              <button
                className="btn-brutal btn-join"
                disabled={busy !== null || !nameValid || code.length !== 4}
                onClick={join}
              >
                {busy === "join" ? "Joining…" : "JOIN"}
              </button>
            </div>
          </div>

          {error && <div className="error-box" role="alert">{error}</div>}
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

        {/* SEO & Discoverability FAQ Content for Search Engines */}
        <section className="seo-section" aria-label="Game FAQ & Highlights">
          <h2 className="seo-title">FREQUENTLY ASKED QUESTIONS</h2>
          <div className="seo-faq-grid">
            {FAQS.map((f, i) => (
              <article key={i} className="seo-faq-card">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
