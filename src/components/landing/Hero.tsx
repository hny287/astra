'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/branding';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible, useCountUp } from './landingAnimations';
import { heroData } from './landingData';
import { demoFindings } from './demoData';

// ─── Mobile breakpoint hook ────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < landingTokens.md);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Severity color mapping ────────────────────────────────────────
const severityColor: Record<string, string> = {
  CRITICAL: landingTokens.accentCritical,
  HIGH: landingTokens.accentHigh,
  MEDIUM: landingTokens.accentMedium,
  LOW: landingTokens.accentLow,
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
        background: landingTokens.bgCanvas,
        borderBottom: `1px solid ${landingTokens.borderSubtle}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        maxWidth: landingTokens.maxWidth,
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
          color: landingTokens.inkPrimary,
          textDecoration: 'none',
          fontFamily: landingTokens.fontSans,
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
                color: landingTokens.inkSecondary,
                textDecoration: 'none',
                transition: 'color 0.15s ease',
                fontFamily: landingTokens.fontSans,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.color = landingTokens.inkPrimary);
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.color = landingTokens.inkSecondary);
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
              color: landingTokens.accentPrimary,
              textDecoration: 'none',
              fontFamily: landingTokens.fontSans,
              transition: 'color 0.15s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = landingTokens.accentPrimaryHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = landingTokens.accentPrimary;
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
              background: landingTokens.inkPrimary,
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
              background: landingTokens.inkPrimary,
              borderRadius: '1px',
              transform: menuOpen ? 'rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: '20px',
              height: '2px',
              background: landingTokens.inkPrimary,
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
          background: landingTokens.bgCanvas,
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
              color: landingTokens.inkSecondary,
              textDecoration: 'none',
              fontFamily: landingTokens.fontSans,
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
            color: landingTokens.accentPrimary,
            textDecoration: 'none',
            fontFamily: landingTokens.fontSans,
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
          background: landingTokens.bgSurface1,
          border: `1px solid ${landingTokens.borderSubtle}`,
          borderRadius: '12px',
          padding: isMobile ? '20px' : '28px',
          fontFamily: landingTokens.fontMono,
          fontSize: '13px',
          lineHeight: 1.6,
          color: landingTokens.inkSecondary,
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
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentCritical }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentMedium }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentLow }} />
        </div>

        {/* Command line */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: landingTokens.accentPrimary }}>$</span>{' '}
          <span style={{ color: landingTokens.inkPrimary }}>
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
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontFamily: landingTokens.fontMono,
                    letterSpacing: '0.04em',
                    transition: 'all 0.3s ease',
                    background: isActive ? `${landingTokens.accentPrimary}20` : landingTokens.bgSurface2,
                    color: isActive ? landingTokens.accentPrimary : landingTokens.inkMuted,
                    border: `1px solid ${isActive ? landingTokens.accentPrimary : landingTokens.borderSubtle}`,
                  }}
                >
                  {node.label}
                </div>
                {i < pipelineNodes.length - 1 && (
                  <span
                    style={{
                      color: isActive && i < activeNodes - 1 ? landingTokens.accentPrimary : landingTokens.borderMedium,
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
                background: landingTokens.bgSurface2,
                borderRadius: '6px',
                border: `1px solid ${landingTokens.borderSubtle}`,
                animation: 'lpSlideIn 0.35s ease both',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <span
                style={{
                  ...sectionStyles.badge(severityColor[f.severity] || landingTokens.inkMuted),
                  flexShrink: 0,
                }}
              >
                {f.severity}
              </span>
              <span
                style={{
                  color: landingTokens.inkPrimary,
                  fontSize: '12px',
                  fontFamily: landingTokens.fontSans,
                  fontWeight: 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.title}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  color: landingTokens.inkMuted,
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
            borderTop: `1px solid ${landingTokens.borderSubtle}`,
            fontSize: '12px',
            color: scanPhase === 'findings' ? landingTokens.accentLow : landingTokens.inkSecondary,
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
        maxWidth: landingTokens.maxWidth,
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
            style={{
              fontSize: isMobile ? '36px' : '48px',
              fontWeight: 600,
              color: landingTokens.inkPrimary,
              fontFamily: landingTokens.fontSans,
              lineHeight: 1.1,
            }}
          >
            {statValues[i].toLocaleString()}
            {stat.suffix}
          </div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 300,
              color: landingTokens.inkSecondary,
              marginTop: '8px',
              fontFamily: landingTokens.fontSans,
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
        style={{
          ...sectionStyles.headline,
          fontSize: isMobile ? '36px' : '56px',
          marginBottom: '20px',
          maxWidth: '640px',
        }}
      >
        {parts[0]}
        <span style={{ color: landingTokens.accentPrimary }}>{headlineAccent}</span>
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
          maxWidth: landingTokens.maxWidth,
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
          <p style={{ ...sectionStyles.eyebrow, marginBottom: '16px' }}>
            {heroData.eyebrow}
          </p>

          {/* Headline */}
          {renderHeadline()}

          {/* Subhead */}
          <p
            style={{
              ...sectionStyles.subhead,
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
                fontFamily: landingTokens.fontSans,
                background: landingTokens.accentPrimary,
                color: '#ffffff',
                borderRadius: '4px',
                textDecoration: 'none',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = landingTokens.accentPrimaryHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = landingTokens.accentPrimary;
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
                fontFamily: landingTokens.fontSans,
                background: 'transparent',
                color: landingTokens.inkPrimary,
                borderRadius: '4px',
                textDecoration: 'none',
                border: `1px solid ${landingTokens.borderMedium}`,
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = landingTokens.inkPrimary;
                e.currentTarget.style.background = `${landingTokens.inkPrimary}08`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = landingTokens.borderMedium;
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
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: landingTokens.fontSans,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  background: `${landingTokens.accentPrimary}15`,
                  color: landingTokens.accentPrimary,
                  border: `1px solid ${landingTokens.accentPrimary}30`,
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