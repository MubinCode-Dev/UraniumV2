import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "loading" | "welcome" | "main";

function Particles() {
  const dots = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="particles" aria-hidden="true">
      {dots.map((i) => (
        <div key={i} className="particle" style={{
          left: `${(i * 37 + 11) % 100}%`,
          top: `${(i * 53 + 7) % 100}%`,
          animationDelay: `${(i * 0.7) % 6}s`,
          animationDuration: `${5 + (i % 4)}s`,
          width: i % 3 === 0 ? "2px" : "1px",
          height: i % 3 === 0 ? "2px" : "1px",
        }} />
      ))}
    </div>
  );
}

function SweepLine() {
  return <div className="sweep-line" aria-hidden="true" />;
}

function CornerBrackets() {
  return (
    <div className="corner-brackets" aria-hidden="true">
      <span className="cb cb-tl" />
      <span className="cb cb-tr" />
      <span className="cb cb-bl" />
      <span className="cb cb-br" />
    </div>
  );
}

function HudOrbs() {
  return (
    <div className="hud-orbs" aria-hidden="true">
      <div className="hud-orb hud-orb-1" />
      <div className="hud-orb hud-orb-2" />
      <div className="hud-orb hud-orb-3" />
    </div>
  );
}

function LoadingScreen({ progress }: { progress: number }) {
  const status =
    progress < 20 ? "BOOTING KERNEL" :
    progress < 45 ? "LOADING MODULES" :
    progress < 70 ? "ESTABLISHING TUNNEL" :
    progress < 90 ? "ENCRYPTING CHANNEL" : "SYSTEM READY";

  return (
    <div className="screen loading-screen">
      <HudOrbs />
      <Particles />
      <SweepLine />
      <CornerBrackets />
      <div className="loading-content">
        <div className="ring-stack">
          <div className="ring ring-outer" />
          <div className="ring ring-mid" />
          <div className="ring ring-inner" />
          <div className="ring-center-dot" />
        </div>
        <div className="logo-block">
          <h1 className="logo-text">URANIUM</h1>
          <p className="logo-sub">PROXY SYSTEM&nbsp;&nbsp;V2.0</p>
        </div>
        <div className="progress-area">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }}>
              <div className="progress-shimmer" />
            </div>
            <div className="progress-head" style={{ left: `${progress}%` }} />
          </div>
          <div className="progress-row">
            <span className="status-label">
              <span className="blink-cursor">_</span>
              {status}
            </span>
            <span className="pct-label">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeScreen() {
  const [done, setDone] = useState(false);
  const msg = "WELCOME TO URANIUM";

  useEffect(() => {
    const t = setTimeout(() => setDone(true), msg.length * 55 + 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen welcome-screen">
      <HudOrbs />
      <Particles />
      <SweepLine />
      <div className="welcome-rings" aria-hidden="true">
        <motion.div className="w-ring w-ring-1"
          initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 1, ease: "easeOut" }} />
        <motion.div className="w-ring w-ring-2"
          initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 0.2 }}
          transition={{ duration: 1.2, delay: 0.15, ease: "easeOut" }} />
        <motion.div className="w-ring w-ring-3"
          initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.4, delay: 0.3, ease: "easeOut" }} />
      </div>
      <div className="welcome-content">
        <motion.div className="welcome-badge"
          initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: "backOut" }}>
          ACCESS GRANTED
        </motion.div>
        <h1 className="welcome-title">
          {msg.split("").map((ch, i) => (
            <motion.span key={i}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.055, duration: 0.18, ease: "easeOut" }}>
              {ch === " " ? "\u00a0" : ch}
            </motion.span>
          ))}
        </h1>
        <AnimatePresence>
          {done && (
            <motion.p className="welcome-sub"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              Secure.&nbsp;&nbsp;Anonymous.&nbsp;&nbsp;Unrestricted.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function buildTargetUrl(input: string): string {
  const t = input.trim();
  if (t.startsWith("http://") || t.startsWith("https://")) return t;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(t)) return `https://${t}`;
  return `https://duckduckgo.com/?q=${encodeURIComponent(t)}&kae=d&k7=000000&k8=cccccc&k9=00ff88&k21=111111&k18=00ff88&kj=111111`;
}

const QUICK = [
  { label: "DUCKDUCKGO", url: "https://duckduckgo.com/?kae=d&k7=000000&k8=cccccc&k9=00ff88&k21=111111&k18=00ff88" },
  { label: "WIKIPEDIA",  url: "https://en.wikipedia.org" },
  { label: "GITHUB",     url: "https://github.com" },
];

function MainScreen() {
  const [inputVal, setInputVal] = useState("");
  const [iframeSrc, setIframeSrc] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const navigate = useCallback((raw: string) => {
    if (!raw.trim()) return;
    const target  = buildTargetUrl(raw);
    const proxied = `/api/proxy?url=${encodeURIComponent(target)}`;
    setCurrentUrl(target);
    setIframeSrc(proxied);
    setInputVal(raw.trim());
    setLoading(true);
  }, []);

  const handleSubmit  = (e: React.FormEvent) => { e.preventDefault(); navigate(inputVal); };
  const handleRefresh = () => {
    if (!iframeSrc) return;
    setLoading(true);
    setIframeSrc(`/api/proxy?url=${encodeURIComponent(currentUrl)}&_t=${Date.now()}`);
  };
  const handleFullscreen = () =>
    isFullscreen ? document.exitFullscreen?.() : containerRef.current?.requestFullscreen?.();

  const hasProxy = !!iframeSrc;

  return (
    <div ref={containerRef} className="screen main-screen">
      <HudOrbs />
      <Particles />
      <SweepLine />
      <div className="watermark">Developed by Mubin</div>

      <header className="top-bar">
        <div className="top-bar-brand">
          <div className="brand-dot" />
          <span className="brand-logo">URANIUM</span>
        </div>
        <form className="url-form" onSubmit={handleSubmit}>
          <div className="url-input-wrap">
            <input
              ref={inputRef}
              className="url-input"
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search or enter a URL..."
              spellCheck={false}
              autoComplete="off"
            />
            <button type="submit" className="go-btn">GO</button>
          </div>
        </form>
        <div className="top-bar-actions">
          <button className="action-btn" onClick={handleRefresh} disabled={!hasProxy} title="Refresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>REFRESH</span>
          </button>
          <button className="action-btn" onClick={handleFullscreen}
            title={isFullscreen ? "Exit" : "Fullscreen"}>
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="8 3 3 3 3 8" /><polyline points="21 8 21 3 16 3" />
                <polyline points="3 16 3 21 8 21" /><polyline points="16 21 21 21 21 16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
            <span>{isFullscreen ? "EXIT" : "FULLSCREEN"}</span>
          </button>
        </div>
      </header>

      <div className="proxy-body">
        <AnimatePresence mode="wait">
          {!hasProxy ? (
            <motion.div key="home" className="home-state"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}>
              <motion.div className="home-logo"
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "backOut" }}>
                <div className="home-ring home-ring-1" />
                <div className="home-ring home-ring-2" />
                <span className="home-logo-text">U</span>
              </motion.div>
              <motion.h2 className="home-title"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.25, duration: 0.4 }}>
                URANIUM PROXY
              </motion.h2>
              <motion.p className="home-desc"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}>
                Browse securely through an encrypted tunnel.
              </motion.p>
              <motion.form className="home-search-form" onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.4 }}>
                <label className="home-search-label">SEARCH URL</label>
                <div className="home-search-box">
                  <div className="hsb-corner hsb-tl" /><div className="hsb-corner hsb-tr" />
                  <div className="hsb-corner hsb-bl" /><div className="hsb-corner hsb-br" />
                  <input
                    ref={inputRef}
                    className="home-search-input"
                    type="text"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    placeholder="Enter a URL or search term..."
                    spellCheck={false}
                    autoComplete="off"
                    autoFocus
                  />
                  <button type="submit" className="home-search-btn">SEARCH</button>
                </div>
              </motion.form>
              <motion.div className="quick-links"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}>
                <span className="ql-label">QUICK ACCESS</span>
                <div className="ql-buttons">
                  {QUICK.map((item, i) => (
                    <motion.button key={item.label} type="button" className="ql-btn"
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 + i * 0.08, duration: 0.3 }}
                      onClick={() => { setInputVal(item.url); navigate(item.url); }}>
                      {item.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="proxy" className="iframe-wrap"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}>
              <AnimatePresence>
                {loading && (
                  <motion.div className="iframe-loading"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}>
                    <div className="tunnel-loader">
                      <div className="tl-ring tl-r1" />
                      <div className="tl-ring tl-r2" />
                      <div className="tl-ring tl-r3" />
                    </div>
                    <span className="tl-text">LOADING TUNNEL</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                className="proxy-iframe"
                title="Proxy"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase !== "loading") return;
    const duration = 5000;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const pct = Math.min(((now - start) / duration) * 100, 100);
      setProgress(pct);
      if (pct < 100) { raf = requestAnimationFrame(tick); }
      else { setPhase("welcome"); setTimeout(() => setPhase("main"), 2200); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  return (
    <AnimatePresence mode="wait">
      {phase === "loading" && (
        <motion.div key="loading" exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5 }} style={{ position: "fixed", inset: 0 }}>
          <LoadingScreen progress={progress} />
        </motion.div>
      )}
      {phase === "welcome" && (
        <motion.div key="welcome"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4 }} style={{ position: "fixed", inset: 0 }}>
          <WelcomeScreen />
        </motion.div>
      )}
      {phase === "main" && (
        <motion.div key="main"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }} style={{ position: "fixed", inset: 0 }}>
          <MainScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
