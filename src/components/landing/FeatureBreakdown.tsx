'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { features } from './landingData';
import { FalsePositiveBarChart } from './landingCharts';

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

// ─── Feature accent colors (Carbon palette) ─────────────────────
const accentColors = [
  '#0f62fe', // blue-60
  '#da1e28', // red-50
  '#24a148', // green-50
  '#f57c00', // orange-40
  '#f1c21b', // yellow-30
  '#0093b7', // cyan-50
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
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        Built for security teams
      </p>
      <h2
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '720px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '24px',
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
          const color = accentColors[i % accentColors.length];
          return (
            <div
              key={feature.id}
              style={{
                background: 'var(--ibm-surface-1)',
                borderRadius: '0',
                border: '1px solid var(--ibm-hairline)',
                padding: '24px',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms, border-color 0.2s ease`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
              }}
            >
              {/* Icon placeholder */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '0',
                  background: color + '20',
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
                    borderRadius: '2px',
                    background: color,
                  }}
                />
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--ibm-ink)',
                  margin: '0 0 8px 0',
                }}
              >
                {feature.title}
              </h3>

              {/* Description */}
              <p
                className="ibm-body-lg"
                style={{
                  color: 'var(--ibm-ink-muted)',
                  margin: 0,
                }}
              >
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>

      {/* False positive rate chart */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
        <FalsePositiveBarChart />
      </div>
    </section>
  );
}