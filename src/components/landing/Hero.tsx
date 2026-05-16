'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/branding';
import { useVisible, useCountUp } from './landingAnimations';
import { heroData } from './landingData';
import { demoFindings } from './demoData';

// ─── Mobile breakpoint hook ────────────────────────────────────────
const MOBILE_BREAKPOINT = 672;

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Severity color mapping (Carbon semantic tokens) ────────────────
const severityColor: Record<string, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-semantic-warning)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
};

// ─── Scan animation phases ────────────────────────────────────────
type ScanPhase = 'idle' | 'cloning' | 'scanning' | 'findings';

// ─── Pipeline node config ─────────────────────────────────────────
const pipelineNodes = [
  { key: 'clone', label: 'clone' },
  { key: 'discover', label: 'discover' },
  { key: 'scan', label: 'scan' },
  { key: 'deep', label: 'deep' },
  { key: 'cross', label: 'cross' },
  { key: 'persist', label: 'persist' },
];

// ─── Nav links ────────────────────────────────────────────────────
const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Modules', href: '#platform-coverage' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
];

// ─── Hero Component ────────────────────────────────────────────────
export default function Hero() {
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [activeNodes, setActiveNodes] = useState(0);
  const [visibleFindings, setVisibleFindings] = useState(0);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stat bar animation
  const { ref: statRef, visible: statVisible } = useVisible(0.25);
  const stat0 = useCountUp(heroData.stats[0].value, 2000, statVisible);
  const stat1 = useCountUp(heroData.stats[1].value, 1500, statVisible);
  const stat2 = useCountUp(heroData.stats[2].value, 1800, statVisible);
  const statValues = [stat0, stat1, stat2];

  // Reset scan animation loop
  const startScanAnimation = () => {
    setScanPhase('idle');
    setActiveNodes(0);
    setVisibleFindings(0);

    // Phase: cloning (after 600ms)
    animRef.current = setTimeout(() => {
      setScanPhase('cloning');
      setActiveNodes(1);

      // Phase: scanning (after 2s)
      animRef.current = setTimeout(() => {
        setScanPhase('scanning');
        setActiveNodes(3);

        // Phase: findings (after 2.5s)
        animRef.current = setTimeout(() => {
          setScanPhase('findings');
          setActiveNodes(6);

          // Stagger findings appearance
          let count = 0;
          const stagger = () => {
            if (count < demoFindings.length) {
              count++;
              setVisibleFindings(count);
              animRef.current = setTimeout(stagger, 400);
            } else {
              // Restart after a pause
              animRef.current = setTimeout(startScanAnimation, 4000);
            }
          };
          stagger();
        }, 2500);
      }, 2000);
    }, 600);
  };

  useEffect(() => {
    startScanAnimation();
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  // ─── Render: Nav ──────────────────────────────────────────────
  const renderNav = () => (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '48px',
        background: 'var(--ibm-canvas)',
        borderBottom: '1px solid var(--ibm-hairline)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--ibm-ink)',
          textDecoration: 'none',
          letterSpacing: '-0.02em',
        }}
      >
        {APP_NAME}
      </Link>

      {/* Desktop nav links */}
      {!isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--ibm-ink-muted)',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.color = 'var(--ibm-ink)');
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.color = 'var(--ibm-ink-muted)');
              }}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/api/auth/signin"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--ibm-primary)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--ibm-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ibm-primary)';
            }}
          >
            Sign in →
          </Link>
        </div>
      )}

      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '2px',
              background: 'var(--ibm-ink)',
              borderRadius: '1px',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transform: menuOpen ? 'rotate(45deg) translate(3px, 3px)' : 'none',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '2px',
              background: 'var(--ibm-ink)',
              borderRadius: '1px',
              transform: menuOpen ? 'rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '2px',
              background: 'var(--ibm-ink)',
              borderRadius: '1px',
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              transform: menuOpen ? 'rotate(-45deg) translate(3px, -3px)' : 'none',
              opacity: menuOpen ? 0 : 1,
            }}
          />
        </button>
      )}
    </nav>
  );

  // ─── Render: Mobile overlay ───────────────────────────────────
  const renderMobileOverlay = () => {
    if (!menuOpen) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: 'var(--ibm-canvas)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
        }}
        onClick={() => setMenuOpen(false)}
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            style={{
              fontSize: '24px',
              fontWeight: 400,
              color: 'var(--ibm-ink-muted)',
              textDecoration: 'none',
              transition: 'color 0.15s ease',
            }}
          >
            {link.label}
          </a>
        ))}
        <Link
          href="/api/auth/signin"
          onClick={() => setMenuOpen(false)}
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--ibm-primary)',
            textDecoration: 'none',
          }}
        >
          Sign in →
        </Link>
      </div>
    );
  };

  // ─── Render: Scan walkthrough panel ────────────────────────────
  const renderScanPanel = () => {
    const statusText: Record<ScanPhase, string> = {
      idle: 'Waiting…',
      cloning: 'Cloning repository…',
      scanning: 'Scanning files…',
      findings: `✓ Scan complete — ${demoFindings.length} findings`,
    };

    return (
      <div
        style={{
          background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)',
          borderRadius: '0',
          padding: isMobile ? '20px' : '28px',
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--ibm-ink-muted)',
          overflow: 'hidden',
          animation: 'lpFadeUp 0.6s ease both',
        }}
      >
        {/* Terminal header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
          }}
        >
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--ibm-semantic-error)' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--ibm-semantic-warning)' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--ibm-semantic-success)' }} />
        </div>

        {/* Command line */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: 'var(--ibm-primary)' }}>$</span>{' '}
          <span style={{ color: 'var(--ibm-ink)' }}>
            {APP_NAME.toLowerCase()} scan https://github.com/acme/api
          </span>
        </div>

        {/* Pipeline nodes */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '4px' : '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          {pipelineNodes.map((node, i) => {
            const isActive = i < activeNodes;
            return (
              <div key={node.key} style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px' }}>
                <div
                  style={{
                    padding: '3px 10px',
                    borderRadius: '0',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                    letterSpacing: '0.04em',
                    transition: 'all 0.3s ease',
                    background: isActive ? 'var(--ibm-blue-10)' : 'var(--ibm-surface-2)',
                    color: isActive ? 'var(--ibm-primary)' : 'var(--ibm-ink-subtle)',
                    border: `1px solid ${isActive ? 'var(--ibm-primary)' : 'var(--ibm-hairline)'}`,
                  }}
                >
                  {node.label}
                </div>
                {i < pipelineNodes.length - 1 && (
                  <span
                    style={{
                      color: isActive && i < activeNodes - 1 ? 'var(--ibm-primary)' : 'var(--ibm-hairline-strong)',
                      fontSize: '10px',
                      transition: 'color 0.3s ease',
                    }}
                  >
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '180px' }}>
          {demoFindings.slice(0, visibleFindings).map((f, i) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                background: 'var(--ibm-surface-2)',
                borderRadius: '0',
                border: '1px solid var(--ibm-hairline)',
                animation: 'lpSlideIn 0.35s ease both',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: '0',
                  flexShrink: 0,
                  background: severityColor[f.severity]
                    ? `color-mix(in srgb, ${severityColor[f.severity]} 15%, transparent)`
                    : 'var(--ibm-surface-2)',
                  color: severityColor[f.severity] || 'var(--ibm-ink-subtle)',
                  border: `1px solid ${severityColor[f.severity] ? `color-mix(in srgb, ${severityColor[f.severity]} 40%, transparent)` : 'var(--ibm-hairline)'}`,
                }}
              >
                {f.severity}
              </span>
              <span
                style={{
                  color: 'var(--ibm-ink)',
                  fontSize: '12px',
                  fontWeight: 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                {f.title}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: 'var(--ibm-ink-subtle)',
                  flexShrink: 0,
                }}
              >
                {f.file}:{f.line}
              </span>
            </div>
          ))}
        </div>

        {/* Status line */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--ibm-hairline)',
            fontSize: '12px',
            color: scanPhase === 'findings' ? 'var(--ibm-semantic-success)' : 'var(--ibm-ink-muted)',
            transition: 'color 0.3s ease',
          }}
        >
          {statusText[scanPhase]}
        </div>
      </div>
    );
  };

  // ─── Render: Stat bar ─────────────────────────────────────────
  const renderStatBar = () => (
    <div
      ref={statRef}
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: isMobile ? '40px 24px' : '48px 24px',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '24px' : '0',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {heroData.stats.map((stat, i) => (
        <div
          key={i}
          style={{
            textAlign: 'center',
            flex: 1,
          }}
        >
          <div
            className="ibm-display-md"
            style={{
              fontSize: isMobile ? '36px' : '48px',
              fontWeight: 600,
              color: 'var(--ibm-ink)',
              lineHeight: 1.1,
            }}
          >
            {statValues[i].toLocaleString()}
            {stat.suffix}
          </div>
          <div
            className="ibm-body-sm"
            style={{
              color: 'var(--ibm-ink-muted)',
              marginTop: '8px',
            }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Render: Hero headline with accent ─────────────────────────
  const renderHeadline = () => {
    const { headline, headlineAccent } = heroData;
    const parts = headline.split(headlineAccent);
    return (
      <h1
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          fontSize: isMobile ? '36px' : '56px',
          marginBottom: '20px',
          maxWidth: '640px',
        }}
      >
        {parts[0]}
        <span style={{ color: 'var(--ibm-primary)' }}>{headlineAccent}</span>
        {parts[1]}
      </h1>
    );
  };

  // ─── Main render ──────────────────────────────────────────────
  return (
    <>
      {renderNav()}
      {renderMobileOverlay()}

      {/* Hero section */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '48px 24px 0' : '80px 24px 0',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '40px' : '48px',
          alignItems: 'flex-start',
        }}
      >
        {/* Left column */}
        <div
          style={{
            flex: isMobile ? undefined : '1 1 60%',
            maxWidth: isMobile ? undefined : '600px',
          }}
        >
          {/* Eyebrow */}
          <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '16px' }}>
            {heroData.eyebrow}
          </p>

          {/* Headline */}
          {renderHeadline()}

          {/* Subhead */}
          <p
            className="ibm-body-lg"
            style={{
              color: 'var(--ibm-ink-muted)',
              marginBottom: '32px',
            }}
          >
            {heroData.subhead}
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="#demo"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'var(--ibm-primary)',
                color: 'var(--ibm-on-primary)',
                borderRadius: '0',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--ibm-primary-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--ibm-primary)';
              }}
            >
              {heroData.ctaPrimary}
            </a>
            <a
              href="#ai-advantage"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'transparent',
                color: 'var(--ibm-ink)',
                borderRadius: '0',
                textDecoration: 'none',
                border: '1px solid var(--ibm-hairline-strong)',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--ibm-ink)';
                e.currentTarget.style.background = 'color-mix(in srgb, var(--ibm-ink) 4%, transparent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ibm-hairline-strong)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {heroData.ctaSecondary}
            </a>
          </div>

          {/* Tag pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {heroData.tags.map((tag) => (
              <span
                key={tag}
                className="ibm-label"
                style={{
                  color: 'var(--ibm-primary)',
                  padding: '4px 10px',
                  borderRadius: '0',
                  background: 'var(--ibm-blue-10)',
                  border: '1px solid var(--ibm-blue-20)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Right column — animated scan walkthrough */}
        <div
          style={{
            flex: isMobile ? undefined : '1 1 40%',
            maxWidth: isMobile ? undefined : '480px',
            width: isMobile ? '100%' : undefined,
          }}
        >
          {renderScanPanel()}
        </div>
      </section>

      {/* Stat bar */}
      {renderStatBar()}
    </>
  );
}