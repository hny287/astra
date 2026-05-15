'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, Fragment } from 'react';
import Link from 'next/link';

/* ─── Hooks ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, trigger: boolean = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, target, duration]);
  return value;
}

function useVisible(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Stat counter ────────────────────────────────────── */
function StatCount({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, visible } = useVisible(0.3);
  const count = useCountUp(value, 1600, visible);
  return (
    <div ref={ref} className="v2-stat-cell" style={{ flex: '1 1 180px', padding: '32px 24px', textAlign: 'center' as const }}>
      <div className="v2-stat-number" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 42, fontWeight: 300, color: 'var(--ibm-ink)', lineHeight: 1, marginBottom: 8, letterSpacing: '-0.5px' }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>{label}</div>
    </div>
  );
}

/* ─── Reveal wrapper ──────────────────────────────────── */
function Reveal({ children, delay = 0, style = {} }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Hero geometric illustration ─────────────────────── */
function HeroIllustration() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 320 }}>
      <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id="v2grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d0e2ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#edf5ff" stopOpacity="0.1" />
          </linearGradient>
          <pattern id="v2grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#0f62fe" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#v2grad)" />
        <rect width="400" height="400" fill="url(#v2grid)" />
        {/* Nodes */}
        {[
          [40, 40], [120, 80], [200, 40], [280, 100], [360, 60],
          [60, 140], [160, 160], [240, 140], [340, 180],
          [40, 240], [140, 220], [220, 260], [320, 240],
          [80, 320], [180, 340], [280, 320], [360, 360],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="#0f62fe" fillOpacity="0.35" />
        ))}
        {/* Connections */}
        <path d="M40 40 L120 80 M120 80 L200 40 M200 40 L280 100 M280 100 L360 60 M60 140 L160 160 M160 160 L240 140 M240 140 L340 180 M40 240 L140 220 M140 220 L220 260 M220 260 L320 240 M80 320 L180 340 M180 340 L280 320 M280 320 L360 360 M120 80 L60 140 M160 160 L140 220 M240 140 L220 260 M320 240 L280 320" fill="none" stroke="#0f62fe" strokeOpacity="0.15" strokeWidth="1" />
      </svg>
      {/* Floating card mockups */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', right: '15%', background: '#fff', border: '1px solid var(--ibm-hairline)', padding: 16, boxShadow: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, background: '#da1e28' }} />
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>Critical finding detected</span>
        </div>
        <div style={{ height: 6, background: 'var(--ibm-surface-1)', marginBottom: 6, width: '80%' }} />
        <div style={{ height: 6, background: 'var(--ibm-surface-1)', marginBottom: 6, width: '60%' }} />
        <div style={{ height: 6, background: 'var(--ibm-surface-1)', width: '40%' }} />
      </div>
      <div style={{ position: 'absolute', bottom: '18%', right: '8%', left: '20%', background: '#fff', border: '1px solid var(--ibm-hairline)', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 8, height: 8, background: '#198038' }} />
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>Scan complete — 247 files</span>
        </div>
        <div style={{ height: 6, background: 'var(--ibm-surface-1)', marginBottom: 6, width: '70%' }} />
        <div style={{ height: 6, background: 'var(--ibm-surface-1)', width: '50%' }} />
      </div>
    </div>
  );
}

/* ─── Pipeline node ─────────────────────────────────────── */
const NODE_COLORS: Record<string, string> = {
  Clone: '#4589ff',
  Discover: '#8a3ffc',
  'Deep Scan': '#da1e28',
  'Cross-File': '#b28600',
  Aggregate: '#198038',
  Persist: '#0f62fe',
};

function PipelineNode({ label, index, desc, isVisible }: { label: string; index: number; desc: string; isVisible: boolean }) {
  const color = NODE_COLORS[label];
  return (
    <div style={{
      borderTop: `4px solid ${color}`,
      borderRight: '1px solid var(--ibm-hairline)',
      borderBottom: '1px solid var(--ibm-hairline)',
      borderLeft: '1px solid var(--ibm-hairline)',
      padding: '24px 20px',
      background: 'var(--ibm-canvas)',
      height: '100%',
      boxSizing: 'border-box',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.4s ease ${index * 120}ms, transform 0.4s ease ${index * 120}ms`,
    }}>
      <div className="ibm-label" style={{ color, marginBottom: 12 }}>{String(index + 1).padStart(2, '0')} — {label}</div>
      <div style={{ width: 8, height: 8, background: color, marginBottom: 16, animation: isVisible ? `v2Pulse 2s ease-in-out ${index * 0.3}s infinite` : 'none' }} />
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

/* ─── Scanner card ────────────────────────────────────── */
function ScannerCard({ name, category, desc, delay }: { name: string; category: string; desc: string; delay: number }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
      padding: 32,
      background: 'var(--ibm-canvas)',
      border: '1px solid var(--ibm-hairline)',
      borderLeft: '3px solid var(--ibm-primary)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{name}</span>
        <span className="ibm-caption" style={{ fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase' as const, padding: '2px 6px', background: 'var(--ibm-blue-10)', color: 'var(--ibm-primary)', border: '1px solid var(--ibm-blue-20)' }}>{category}</span>
      </div>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

/* ─── Capability card ─────────────────────────────────── */
function CapabilityCard({ tag, title, description, index }: { tag: string; title: string; description: string; index: number }) {
  const { ref, visible } = useVisible(0.1);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      padding: 32,
      background: 'var(--ibm-canvas)',
      border: '1px solid var(--ibm-hairline)',
      cursor: 'default',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, background: 'var(--ibm-blue-10)', border: '1px solid var(--ibm-blue-20)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--ibm-primary)', flexShrink: 0 }}>{tag}</div>
        <h3 className="ibm-card-title" style={{ color: 'var(--ibm-ink)', margin: 0 }}>{title}</h3>
      </div>
      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.6, margin: 0 }}>{description}</p>
    </div>
  );
}

/* ─── Hamburger ─────────────────────────────────────────── */
function Hamburger({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Menu" style={{ width: 48, height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
      <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--ibm-ink)', transition: 'transform 0.2s', transform: open ? 'translateY(3.25px) rotate(45deg)' : 'none' }} />
      <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--ibm-ink)', transition: 'opacity 0.2s', opacity: open ? 0 : 1 }} />
      <span style={{ display: 'block', width: 20, height: 1.5, background: 'var(--ibm-ink)', transition: 'transform 0.2s', transform: open ? 'translateY(-3.25px) rotate(-45deg)' : 'none' }} />
    </button>
  );
}

/* ─── Page ──────────────────────────────────────────────── */
export default function LandingPageV2() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [pipelineVisible, setPipelineVisible] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') router.replace('/scans');
  }, [status, router]);

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80);
    setTimeout(() => setPipelineVisible(true), 400);
  }, []);

  if (status === 'loading') return null;
  if (status === 'authenticated') return null;

  return (
    <>
      <style>{`
        @keyframes v2Pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        @keyframes v2FadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes v2Connector {
          from { background-position: 0 0; }
          to   { background-position: 48px 0; }
        }
        .v2-link:hover { text-decoration: underline; }
        .v2-cap-card { transition: background 0.15s; }
        .v2-cap-card:hover { background: var(--ibm-surface-1) !important; }
        .v2-nav-link { transition: color 0.15s; }
        .v2-nav-link:hover { color: var(--ibm-ink) !important; }

        /* ── Responsive (Carbon breakpoints) ── */
        .v2-hero-grid { display: grid; grid-template-columns: 1fr; gap: 48px; }
        .v2-hero-title { font-size: 32px; }
        .v2-hero-visual { display: none; }
        .v2-pipeline-row { display: flex; flex-direction: column; gap: 0; }
        .v2-pipeline-connector { display: none; }
        .v2-stats-row { display: flex; flex-direction: column; }
        .v2-stat-cell { border-right: none; border-bottom: 1px solid var(--ibm-hairline); }
        .v2-stat-cell:last-child { border-bottom: none; }
        .v2-stat-number { font-size: 32px; }
        .v2-scanner-grid { display: grid; grid-template-columns: 1fr; gap: 0; }
        .v2-cap-grid { display: grid; grid-template-columns: 1fr; gap: 0; }
        .v2-ai-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
        .v2-security-grid { display: grid; grid-template-columns: 1fr; gap: 48px; }
        .v2-footer-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
        .v2-section { padding: 48px 16px; }
        .v2-nav-links { display: none; }
        .v2-nav-hamburger { display: flex; }
        .v2-mobile-menu { display: ${menuOpen ? 'flex' : 'none'}; }
        .v2-cta-wrap { flex-direction: column; }

        @media (min-width: 672px) {
          .v2-hero-grid { grid-template-columns: 1fr 1fr; gap: 48px; }
          .v2-hero-title { font-size: 42px; }
          .v2-hero-visual { display: block; }
          .v2-stats-row { flex-direction: row; flex-wrap: wrap; }
          .v2-stat-cell { border-right: 1px solid var(--ibm-hairline); border-bottom: none; }
          .v2-stat-cell:last-child { border-right: none; }
          .v2-stat-number { font-size: 36px; }
          .v2-scanner-grid { grid-template-columns: repeat(2, 1fr); }
          .v2-cap-grid { grid-template-columns: repeat(2, 1fr); }
          .v2-ai-grid { grid-template-columns: repeat(3, 1fr); }
          .v2-security-grid { grid-template-columns: 1fr 1fr; gap: 48px; }
          .v2-footer-grid { grid-template-columns: 2fr 1fr 1fr; gap: 40px; }
          .v2-section { padding: 64px 32px; }
          .v2-cta-wrap { flex-direction: row; }
        }

        @media (min-width: 1056px) {
          .v2-hero-grid { grid-template-columns: 7fr 5fr; gap: 64px; }
          .v2-hero-title { font-size: 52px; }
          .v2-pipeline-row { flex-direction: row; }
          .v2-pipeline-connector { display: flex; }
          .v2-stat-number { font-size: 42px; }
          .v2-scanner-grid { grid-template-columns: repeat(3, 1fr); }
          .v2-cap-grid { grid-template-columns: repeat(4, 1fr); }
          .v2-ai-grid { grid-template-columns: repeat(4, 1fr); }
          .v2-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; }
          .v2-nav-links { display: flex; }
          .v2-nav-hamburger { display: none; }
          .v2-section { padding: 80px 32px; }
        }

        @media (min-width: 1312px) {
          .v2-hero-title { font-size: 60px; }
          .v2-scanner-grid { grid-template-columns: repeat(3, 1fr); }
        }

        @media (min-width: 1584px) {
          .v2-hero-title { font-size: 76px; }
          .v2-scanner-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>

      <div style={{ background: 'var(--ibm-canvas)', minHeight: '100vh' }}>

        {/* ── Utility bar ── */}
        <div className="v2-nav-links" style={{ background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', height: 32, alignItems: 'center', padding: '0 32px' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 0, overflow: 'hidden' }}>
            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', whiteSpace: 'nowrap' }}>Astra Security Platform</span>
            <span style={{ margin: '0 12px', color: 'var(--ibm-hairline-strong)', opacity: 0.3, flexShrink: 0 }}>|</span>
            <span className="ibm-caption" style={{ color: 'var(--ibm-primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>v1.0 — Initial Release</span>
            <span style={{ margin: '0 12px', color: 'var(--ibm-hairline-strong)', opacity: 0.3, flexShrink: 0 }}>|</span>
            <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', whiteSpace: 'nowrap' }}>AI-native application security</span>
          </div>
        </div>

        {/* ── Nav ── */}
        <nav style={{ background: 'var(--ibm-canvas)', borderBottom: '1px solid var(--ibm-hairline)', height: 48, display: 'flex', alignItems: 'center', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 1584, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 300, fontSize: 22, letterSpacing: '-0.01em', color: 'var(--ibm-ink)' }}>Astra</span>
              <div className="v2-nav-links" style={{ gap: 0 }}>
                {['Features', 'Pipeline', 'Security', 'Changelog'].map(label => (
                  <a key={label} href={`#${label.toLowerCase()}`} className="ibm-body-sm v2-nav-link" style={{ color: 'var(--ibm-ink-muted)', textDecoration: 'none', padding: '12px 16px', minHeight: 48, display: 'flex', alignItems: 'center' }}>{label}</a>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="v2-nav-hamburger">
                <Hamburger open={menuOpen} onClick={() => setMenuOpen(v => !v)} />
              </div>
              <Link href="/auth/signin" className="v2-nav-links" style={{ background: 'var(--ibm-primary)', color: '#fff', padding: '8px 20px', fontSize: 14, fontWeight: 400, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', textDecoration: 'none', whiteSpace: 'nowrap', minHeight: 40, alignItems: 'center' }}>
                Sign in →
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Mobile menu ── */}
        <div className="v2-mobile-menu" style={{ position: 'fixed', top: 48, left: 0, right: 0, bottom: 0, background: 'var(--ibm-canvas)', zIndex: 99, flexDirection: 'column', padding: '16px 24px', gap: 0, borderBottom: '1px solid var(--ibm-hairline)' }}>
          {['Features', 'Pipeline', 'Security', 'Changelog'].map(label => (
            <a key={label} href={`#${label.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="ibm-body" style={{ color: 'var(--ibm-ink)', textDecoration: 'none', padding: '16px 0', borderBottom: '1px solid var(--ibm-hairline)', minHeight: 48, display: 'flex', alignItems: 'center' }}>{label}</a>
          ))}
          <Link href="/auth/signin" style={{ background: 'var(--ibm-primary)', color: '#fff', padding: '14px 20px', fontSize: 14, fontWeight: 400, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', textDecoration: 'none', textAlign: 'center', marginTop: 16, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Sign in →
          </Link>
        </div>

        {/* ── Hero ── */}
        <section className="v2-section" style={{ background: 'var(--ibm-canvas)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <div className="v2-hero-grid">
              <div>
                <p className="ibm-eyebrow" style={{
                  color: 'var(--ibm-primary)', marginBottom: 24,
                  opacity: heroVisible ? 1 : 0,
                  animation: heroVisible ? 'v2FadeUp 0.5s ease both' : 'none',
                }}>
                  Initial release · May 2026
                </p>
                <h1 className="v2-hero-title" style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300, lineHeight: 1.17,
                  letterSpacing: '-0.5px', color: 'var(--ibm-ink)',
                  marginBottom: 24,
                  opacity: heroVisible ? 1 : 0,
                  animation: heroVisible ? 'v2FadeUp 0.55s ease 80ms both' : 'none',
                }}>
                  Security analysis<br />that understands<br /><span style={{ color: 'var(--ibm-primary)' }}>your code</span>
                </h1>
                <p className="ibm-body-lg" style={{
                  color: 'var(--ibm-ink-muted)', maxWidth: 520, marginBottom: 40, lineHeight: 1.6,
                  opacity: heroVisible ? 1 : 0,
                  animation: heroVisible ? 'v2FadeUp 0.55s ease 160ms both' : 'none',
                }}>
                  Astra combines traditional scanner engines with multi-stage AI analysis to surface vulnerabilities, business logic flaws, and misconfigurations that pattern-matching alone will never find.
                </p>
                <div className="v2-cta-wrap" style={{
                  display: 'flex', gap: 12, marginBottom: 48,
                  opacity: heroVisible ? 1 : 0,
                  animation: heroVisible ? 'v2FadeUp 0.55s ease 240ms both' : 'none',
                }}>
                  <Link href="/auth/signin" style={{ background: 'var(--ibm-primary)', color: '#fff', padding: '12px 24px', fontSize: 14, fontWeight: 400, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 48, justifyContent: 'center' }}>
                    Start scanning →
                  </Link>
                  <a href="#features" style={{ background: 'var(--ibm-canvas)', color: 'var(--ibm-primary)', padding: '12px 24px', fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', border: '1px solid var(--ibm-primary)', textDecoration: 'none', minHeight: 48, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    See features
                  </a>
                </div>
                <div style={{
                  display: 'flex', gap: 24, flexWrap: 'wrap',
                  opacity: heroVisible ? 1 : 0,
                  animation: heroVisible ? 'v2FadeUp 0.55s ease 300ms both' : 'none',
                }}>
                  {[['SAST', 'Code analysis'], ['SCA', 'Dependencies'], ['Secrets', 'Credentials'], ['IaC', 'Infrastructure'], ['AI', 'Logic flaws']].map(([tag, label]) => (
                    <div key={tag} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, background: 'var(--ibm-primary)', flexShrink: 0 }} />
                      <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}><strong style={{ color: 'var(--ibm-ink)' }}>{tag}</strong> · {label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="v2-hero-visual" style={{
                opacity: heroVisible ? 1 : 0,
                animation: heroVisible ? 'v2FadeUp 0.6s ease 200ms both' : 'none',
              }}>
                <HeroIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section style={{ background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', padding: '0 16px' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }} className="v2-stats-row">
            <StatCount value={45000} suffix="+" label="Vulnerabilities detected" />
            <StatCount value={6} suffix="" label="Pipeline stages" />
            <StatCount value={7} suffix="" label="AI provider backends" />
            <StatCount value={4} suffix="" label="Scanner integrations" />
            <div style={{ flex: '1 1 180px', padding: '32px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div className="v2-stat-number" style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 300, color: 'var(--ibm-primary)', lineHeight: 1, marginBottom: 8, letterSpacing: '-0.5px' }}>100%</div>
              <div className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>Code stays in your environment</div>
            </div>
          </div>
        </section>

        {/* ── Pipeline ── */}
        <section id="pipeline" className="v2-section" style={{ background: 'var(--ibm-canvas)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>Pipeline</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
              <h2 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Six-stage AI analysis</h2>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', maxWidth: 360, textAlign: 'right', lineHeight: 1.5 }}>Each stage runs independently with its own AI model, concurrency, and timeout configuration.</p>
            </div>
            <div className="v2-pipeline-row" style={{ gap: 0, alignItems: 'stretch' }}>
              {PIPELINE_NODES.map((node, i) => (
                <Fragment key={node.label}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PipelineNode label={node.label} index={i} desc={node.desc} isVisible={pipelineVisible} />
                  </div>
                  {i < PIPELINE_NODES.length - 1 && (
                    <div className="v2-pipeline-connector" style={{
                      width: 24, flexShrink: 0, display: 'flex', alignItems: 'center',
                      opacity: pipelineVisible ? 1 : 0, transition: `opacity 0.4s ease ${(i + 1) * 120}ms`,
                    }}>
                      <div style={{
                        width: '100%', height: 2,
                        background: 'repeating-linear-gradient(90deg, var(--ibm-hairline-strong) 0, var(--ibm-hairline-strong) 5px, transparent 5px, transparent 10px)',
                        animation: pipelineVisible ? 'v2Connector 1s linear infinite' : 'none',
                      }} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ── Scanners ── */}
        <section className="v2-section" style={{ background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>Coverage</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 48, flexWrap: 'wrap', gap: 16 }}>
              <h2 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Every attack surface. One pipeline.</h2>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', maxWidth: 380, textAlign: 'right', lineHeight: 1.5 }}>Integrates with industry-standard scanner binaries where installed, with AI analysis always built in.</p>
            </div>
            <div className="v2-scanner-grid">
              {SCANNERS.map((s, i) => (
                <ScannerCard key={s.name} name={s.name} category={s.category} desc={s.desc} delay={i * 80} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Capabilities ── */}
        <section id="features" className="v2-section" style={{ background: 'var(--ibm-canvas)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>Features</p>
            <h2 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 48 }}>Built for security teams</h2>
            <div className="v2-cap-grid">
              {CAPABILITIES.map((cap, i) => (
                <CapabilityCard key={cap.title} tag={cap.tag} title={cap.title} description={cap.description} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── AI Providers ── */}
        <section className="v2-section" style={{ background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>AI Backends</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
              <h2 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', margin: 0 }}>7 AI backends. Configure per stage.</h2>
              <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', maxWidth: 420, textAlign: 'right', lineHeight: 1.5 }}>Each pipeline stage — discover, deep scan, cross-file — can run on a different provider and model.</p>
            </div>
            <div className="v2-ai-grid">
              {AI_PROVIDERS.map((p, i) => (
                <Reveal key={p.name} delay={i * 50} style={{ padding: '20px 24px', background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{p.name}</span>
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{p.note}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ── */}
        <section id="security" className="v2-section" style={{ background: 'var(--ibm-canvas)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 12 }}>Security</p>
            <div className="v2-security-grid">
              <div>
                <h2 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 24 }}>Enterprise-grade from day one</h2>
                <p className="ibm-body-lg" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.6, marginBottom: 32 }}>
                  Raw source code never leaves your environment. Astra's data plane runs where your code runs — only normalized finding JSON crosses the boundary.
                </p>
                <Link href="/auth/signin" style={{ background: 'var(--ibm-primary)', color: '#fff', padding: '12px 24px', fontSize: 14, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', textDecoration: 'none', display: 'inline-block', minHeight: 48 }}>
                  Get started →
                </Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0 }}>
                {SECURITY_FEATURES.map((f, i) => (
                  <Reveal key={f.title} delay={i * 70} style={{ padding: 24, border: '1px solid var(--ibm-hairline)', background: 'var(--ibm-canvas)' }}>
                    <div className="ibm-label" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 10 }}>{f.tag}</div>
                    <div className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)', marginBottom: 6 }}>{f.title}</div>
                    <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', lineHeight: 1.5 }}>{f.desc}</div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="v2-section" style={{ background: 'var(--ibm-primary)' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
            <div>
              <p className="ibm-eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>Get started today</p>
              <h2 className="ibm-display-md" style={{ color: '#fff', marginBottom: 12, fontWeight: 300 }}>Start your first scan</h2>
              <p className="ibm-body-lg" style={{ color: 'rgba(255,255,255,0.75)', maxWidth: 520, lineHeight: 1.6 }}>
                Connect a repository and let Astra's AI pipeline find what your current tooling misses.
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
              <Link href="/auth/signin" style={{ background: '#fff', color: 'var(--ibm-primary)', padding: '12px 28px', fontSize: 14, fontWeight: 600, fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', textDecoration: 'none', minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>
                Sign in to begin →
              </Link>
              <span className="ibm-caption" style={{ color: 'rgba(255,255,255,0.55)' }}>No credit card · No agent to install</span>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background: 'var(--ibm-inverse-canvas)', padding: '64px 32px 32px' }}>
          <div style={{ maxWidth: 1584, margin: '0 auto' }}>
            <div className="v2-footer-grid" style={{ marginBottom: 48, borderBottom: '1px solid #393939', paddingBottom: 48 }}>
              <div>
                <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 300, fontSize: 28, color: '#f4f4f4', marginBottom: 16 }}>Astra</div>
                <p className="ibm-body-sm" style={{ color: '#8d8d8d', lineHeight: 1.6, maxWidth: 280 }}>AI-native application security scanning platform. SAST, SCA, secrets, IaC, and business logic analysis — unified.</p>
              </div>
              {FOOTER_COLS.map(col => (
                <div key={col.title}>
                  <div className="ibm-label" style={{ color: '#c6c6c6', marginBottom: 16 }}>{col.title}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {col.links.map(link => (
                      <a key={link.label} href={link.href} className="ibm-body-sm v2-link" style={{ color: '#8d8d8d', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#c6c6c6')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#8d8d8d')}
                      >{link.label}</a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <span className="ibm-caption" style={{ color: '#525252' }}>© 2026 Astra Security Platform · v1.0 Initial Release</span>
              <div style={{ display: 'flex', gap: 24 }}>
                {['Privacy', 'Terms', 'Security'].map(l => (
                  <a key={l} href="#" className="ibm-caption" style={{ color: '#525252', textDecoration: 'none' }}>{l}</a>
                ))}
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

/* ─── Data ────────────────────────────────────────────── */
const PIPELINE_NODES = [
  { label: 'Clone', desc: 'Git clone to secure temp dir. Maps repo structure, languages, and entry points.' },
  { label: 'Discover', desc: 'AI-guided file prioritization. Ranks files by security relevance before scanning.' },
  { label: 'Git Ingest', desc: 'Extracts commit history, contributor data, hotspot files, languages, and dependencies for AI context.' },
  { label: 'Git Diagram', desc: 'Generates a Mermaid architecture diagram from repo structure for cross-file analysis.' },
  { label: 'Tool Scan', desc: 'Runs Trivy and Gitleaks for SCA, IaC, and secret detection. Results enrich deep scan context.' },
  { label: 'Deep Scan', desc: 'Per-file AI analysis. Parallel batched vulnerability detection with exploit scoring.' },
  { label: 'Cross-File', desc: 'Business logic inference. Traces data flows across files to find systemic issues.' },
  { label: 'Aggregate', desc: 'SHA-256 deduplication. Merges and fingerprints findings across all scanner sources.' },
  { label: 'Persist', desc: 'Saves findings, creates triage tasks, and stores AI conversation context to DB.' },
];

const SCANNERS = [
  { name: 'AI Deep Scan', category: 'Built-in · SAST · Logic', desc: 'Per-file AI analysis runs in every scan. Finds auth bypasses, privilege escalation, injection flaws, and logic vulnerabilities that rules cannot express.' },
  { name: 'AI Cross-File', category: 'Built-in · Business Logic', desc: 'Cross-file semantic analysis after deep scan completes. Infers security invariants and flags violations across module and service boundaries.' },
  { name: 'Trivy', category: 'Integration · SCA · IaC · Secrets', desc: 'When installed, scans dependencies for CVEs, Dockerfile misconfigurations, and exposed secrets across all major language ecosystems.' },
  { name: 'Gitleaks', category: 'Integration · Secrets', desc: 'When installed, detects hardcoded credentials, API keys, tokens, and private keys — including across full git history.' },
  { name: 'Bearer', category: 'Integration · Data Flow', desc: 'When installed, traces PII, PHI, and payment data through your application to catch leaks into logs, responses, or third-party services.' },
  { name: 'Semgrep', category: 'Integration · SAST', desc: 'When installed, adds 3,000+ community rules for OWASP Top 10, framework-specific flaws, and language-level antipatterns.' },
];

const CAPABILITIES = [
  { tag: 'AI', title: 'AI-powered analysis', description: 'No static pattern matching. Multi-stage AI reads your code semantically, traces data flows, and identifies architectural risks that rule-based scanners cannot express.' },
  { tag: 'TR', title: 'Alert triage workflow', description: 'Built-in status tracking (OPEN → IN_PROGRESS → COMPLETED), assignment, comments, and a full history timeline. Every change is audited.' },
  { tag: 'TK', title: 'Task management', description: 'Auto-generated remediation tasks from HIGH/CRITICAL findings. Full task lifecycle: priority, assignee, due date, bidirectional finding links, and AI assistance.' },
  { tag: 'CH', title: 'AI chat assistant', description: 'Context-aware chat at global, scan, and finding level. Multi-turn memory, DB-backed system prompts, and switchable model mid-conversation.' },
  { tag: 'OB', title: 'AI observability', description: 'Every AI call logged with provider, model, tokens, latency, and full prompt/response. Filterable table with per-call retry from the UI.' },
  { tag: 'GH', title: 'GitHub integration', description: 'Connect via Personal Access Token. Browse repos and branches directly. Tokens encrypted at rest with AES-256-GCM.' },
  { tag: 'EX', title: 'Multi-format export', description: 'JSON, CSV, SARIF, HTML, and Markdown exports. Executive summary report page. Integrates with existing security tooling and compliance workflows.' },
  { tag: 'CF', title: 'Visual pipeline editor', description: 'Configure each pipeline stage independently — provider, model, temperature, concurrency, timeout, and scan depth — through a visual UI.' },
];

const AI_PROVIDERS = [
  { name: 'Cloud Ollama', note: 'api.ohmyllama.com' },
  { name: 'Hosted Ollama', note: 'Self-hosted instance' },
  { name: 'OpenAI', note: 'GPT-4o, o3, o4-mini' },
  { name: 'Anthropic', note: 'Claude 4 Opus / Sonnet' },
  { name: 'AWS Bedrock', note: 'Configured · stub' },
  { name: 'Azure AI Foundry', note: 'Configured · stub' },
  { name: 'LangGraph', note: 'Graph-based workflows' },
];

const SECURITY_FEATURES = [
  { tag: 'Auth', title: 'RBAC with JWT', desc: 'ADMIN / ANALYST / VIEWER roles enforced on every route.' },
  { tag: 'Crypto', title: 'AES-256-GCM', desc: 'GitHub tokens and sensitive data encrypted at rest.' },
  { tag: 'Access', title: 'Scan ownership', desc: 'Non-admin users see only their own scans and findings.' },
  { tag: 'Audit', title: 'Full audit trail', desc: 'Every status change, comment, and assignment is logged.' },
  { tag: 'Limits', title: 'Rate limiting', desc: '10/min login · 5/min signup · IP-based sliding window.' },
  { tag: 'Data', title: 'Data sovereignty', desc: 'Raw source code never leaves your environment.' },
];

const FOOTER_COLS = [
  {
    title: 'Product',
    links: [
      { label: 'Scans', href: '/scans' },
      { label: 'Tasks', href: '/tasks' },
      { label: 'Pipeline', href: '/pipeline' },
      { label: 'Observability', href: '/observability' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
  {
    title: 'Features',
    links: [
      { label: 'AI analysis', href: '#features' },
      { label: 'Alert triage', href: '#features' },
      { label: 'Task management', href: '#features' },
      { label: 'AI chat', href: '#features' },
      { label: 'Export', href: '#features' },
    ],
  },
  {
    title: 'Providers',
    links: [
      { label: 'Anthropic', href: '#' },
      { label: 'OpenAI', href: '#' },
      { label: 'Ollama', href: '#' },
      { label: 'AWS Bedrock', href: '#' },
      { label: 'Azure AI', href: '#' },
    ],
  },
  {
    title: 'Security',
    links: [
      { label: 'RBAC model', href: '#security' },
      { label: 'Data sovereignty', href: '#security' },
      { label: 'Encryption', href: '#security' },
      { label: 'Audit trail', href: '#security' },
      { label: 'Rate limiting', href: '#security' },
    ],
  },
];
