'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { stackData } from './landingData';

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

// ─── Row definition ────────────────────────────────────────────────
const stackRows = [
  { key: 'languages', label: 'Languages', items: stackData.languages },
  { key: 'frameworks', label: 'Frameworks', items: stackData.frameworks },
  { key: 'clouds', label: 'Cloud providers', items: stackData.clouds },
  { key: 'iac', label: 'IaC tools', items: stackData.iac },
  { key: 'packages', label: 'Package managers', items: stackData.packages },
] as const;

// ─── Component ──────────────────────────────────────────────────────
export default function StackCoverage() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

  return (
    <section
      id="stack-coverage"
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
        Works with your stack
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '640px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Scans everything you use
      </h2>

      {/* Stack rows */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
          marginTop: '40px',
        }}
      >
        {stackRows.map((row) => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '20px',
              alignItems: isMobile ? 'flex-start' : 'baseline',
            }}
          >
            {/* Label */}
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                color: landingTokens.inkMuted,
                minWidth: isMobile ? undefined : '160px',
                flexShrink: 0,
              }}
            >
              {row.label}
            </div>

            {/* Tags */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {row.items.map((item) => (
                <span
                  key={item}
                  style={{
                    fontFamily: landingTokens.fontMono,
                    fontSize: '13px',
                    fontWeight: 400,
                    padding: '6px 14px',
                    borderRadius: '4px',
                    border: `1px solid ${landingTokens.borderSubtle}`,
                    color: landingTokens.inkSecondary,
                    background: landingTokens.bgSurface2,
                    transition: 'border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = landingTokens.accentPrimary;
                    e.currentTarget.style.color = landingTokens.inkPrimary;
                    e.currentTarget.style.boxShadow = `0 0 12px 2px ${landingTokens.accentPrimary}25`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = landingTokens.borderSubtle;
                    e.currentTarget.style.color = landingTokens.inkSecondary;
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}