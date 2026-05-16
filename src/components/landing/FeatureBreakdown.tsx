'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { features } from './landingData';

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

// ─── Feature icon colors (cycle through accent palette) ────────────
const iconColors = [
  landingTokens.accentPrimary,
  landingTokens.accentCritical,
  landingTokens.accentLow,
  landingTokens.accentHigh,
  landingTokens.accentMedium,
  landingTokens.accentInfo,
];

// ─── Component ────────────────────────────────────────────────────
export default function FeatureBreakdown() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  const gridColumns = isMobile
    ? '1fr'
    : isTablet
      ? 'repeat(2, 1fr)'
      : 'repeat(3, 1fr)';

  return (
    <section
      id="features"
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
        Built for security teams
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '720px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Every tool you need in one platform
      </h2>

      {/* Feature cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '20px',
          marginTop: '40px',
        }}
      >
        {features.map((feature, i) => {
          const color = iconColors[i % iconColors.length];
          return (
            <div
              key={feature.id}
              style={{
                ...sectionStyles.card,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms, border-color 0.2s ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = landingTokens.borderSubtle;
              }}
            >
              {/* Icon placeholder */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: `${color}20`,
                  border: `1px solid ${color}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    background: color,
                  }}
                />
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: landingTokens.inkPrimary,
                  margin: '0 0 8px 0',
                }}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 300,
                  lineHeight: 1.5,
                  color: landingTokens.inkSecondary,
                  margin: 0,
                }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}