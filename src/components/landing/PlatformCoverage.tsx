'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { platformModules } from './landingData';

// ─── Responsive hooks ───────────────────────────────────────────
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

function useIsTablet(): boolean {
  const [tablet, setTablet] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setTablet(w >= landingTokens.md && w < landingTokens.lg);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return tablet;
}

// ─── Tier badge color mapping ────────────────────────────────────
function tierColor(tier: string): string {
  switch (tier) {
    case 'Enterprise':
      return landingTokens.accentCritical;
    case 'Pro':
      return landingTokens.accentHigh;
    case 'Free':
      return landingTokens.accentLow;
    default:
      return landingTokens.inkMuted;
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
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        One platform, every attack surface
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '680px',
          marginLeft: 'auto',
          marginRight: 'auto',
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
                ...sectionStyles.card,
                borderLeft: `4px solid ${mod.color}`,
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
                    color: landingTokens.inkPrimary,
                    margin: 0,
                  }}
                >
                  {mod.title}
                </h3>
                <span style={sectionStyles.badge(color)}>
                  {mod.tier}
                </span>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 300,
                  lineHeight: 1.5,
                  color: landingTokens.inkSecondary,
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