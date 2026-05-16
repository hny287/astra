'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { platformModules } from './landingData';

// ─── Responsive hooks ───────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 672);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

function useIsTablet(): boolean {
  const [tablet, setTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setTablet(w >= 672 && w < 1056);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return tablet;
}

// ─── Badge helper ─────────────────────────────────────────────────
function badgeStyle(color: string): React.CSSProperties {
  return {
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    padding: '3px 8px',
    borderRadius: '0',
    background: color + '20',
    color,
    border: '1px solid ' + color + '40',
    display: 'inline-block',
  };
}

// ─── Tier badge color mapping ─────────────────────────────────────
function tierColor(tier: string): string {
  switch (tier) {
    case 'Enterprise': return '#da1e28';
    case 'Pro': return '#f57c00';
    case 'Free': return '#24a148';
    default: return '#6f6f6f';
  }
}

// ─── Component ───────────────────────────────────────────────────
export default function PlatformCoverage() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const gridColumns = isMobile
    ? '1fr'
    : isTablet
      ? 'repeat(2, 1fr)'
      : 'repeat(4, 1fr)';

  return (
    <section
      className="lp-section"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Section header */}
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        One platform, every attack surface
      </p>
      <h2
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '680px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '24px',
        }}
      >
        Full coverage across 8 modules
      </h2>

      {/* Module cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '20px',
          marginTop: '40px',
        }}
      >
        {platformModules.map((mod, i) => {
          const color = tierColor(mod.tier);
          return (
            <div
              key={mod.id}
              style={{
                background: 'var(--ibm-surface-1)',
                borderRadius: '0',
                border: '1px solid var(--ibm-hairline)',
                borderLeft: `4px solid ${mod.color}`,
                padding: '24px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms, border-color 0.2s ease`,
              }}
            >
              {/* Title row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--ibm-ink)',
                    margin: 0,
                  }}
                >
                  {mod.title}
                </h3>
                <span style={badgeStyle(color)}>
                  {mod.tier}
                </span>
              </div>

              {/* Description */}
              <p
                className="ibm-body-lg"
                style={{
                  color: 'var(--ibm-ink-muted)',
                  margin: 0,
                }}
              >
                {mod.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}