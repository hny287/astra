'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible, useStagger } from './landingAnimations';
import { APP_NAME } from '@/lib/branding';
import { differentiators } from './landingData';

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

// ─── Component ──────────────────────────────────────────────────────
export default function Competition() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();
  const getDelay = useStagger(differentiators.length, 80);

  return (
    <section
      id="competition"
      className="lp-section lp-section-dark"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Section header */}
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        Why {APP_NAME}
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
        Not just another scanner
      </h2>
      <p
        style={{
          ...sectionStyles.subhead,
          textAlign: 'center',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '48px',
        }}
      >
        Built for the vulnerabilities that pattern-matching tools miss. Hybrid
        deterministic+LLM analysis, unified platform, transparent pricing.
      </p>

      {/* Differentiator cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxWidth: isMobile ? '100%' : '800px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {differentiators.map((d, i) => (
          <div
            key={d.id}
            style={{
              ...sectionStyles.card,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.4s ease ${getDelay(i)}ms, transform 0.4s ease ${getDelay(i)}ms, border-color 0.2s ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = landingTokens.borderMedium;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = landingTokens.borderSubtle;
            }}
          >
            {/* Title */}
            <h3
              style={{
                fontSize: '20px',
                fontWeight: 600,
                color: landingTokens.inkPrimary,
                margin: '0 0 12px 0',
                fontFamily: landingTokens.fontSans,
              }}
            >
              {d.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: '15px',
                fontWeight: 300,
                lineHeight: 1.6,
                color: landingTokens.inkSecondary,
                margin: '0 0 16px 0',
                fontFamily: landingTokens.fontSans,
              }}
            >
              {d.description}
            </p>

            {/* Comparison note */}
            <div
              style={{
                borderTop: `1px solid ${landingTokens.borderSubtle}`,
                paddingTop: '12px',
                marginTop: '4px',
              }}
            >
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: 400,
                  lineHeight: 1.5,
                  color: landingTokens.inkMuted,
                  margin: 0,
                  fontFamily: landingTokens.fontSans,
                }}
              >
                {d.comparison}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}