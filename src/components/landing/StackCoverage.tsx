'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { stackData } from './landingData';

// ─── Mobile breakpoint hook ────────────────────────────────────────
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
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        Works with your stack
      </p>
      <h2
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '640px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '24px',
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
                color: 'var(--ibm-ink-subtle)',
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
                    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                    fontSize: '13px',
                    fontWeight: 400,
                    padding: '6px 14px',
                    borderRadius: '0',
                    border: '1px solid var(--ibm-hairline)',
                    color: 'var(--ibm-ink-muted)',
                    background: 'var(--ibm-surface-2)',
                    transition: 'border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease',
                    cursor: 'default',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0f62fe';
                    e.currentTarget.style.color = 'var(--ibm-ink)';
                    e.currentTarget.style.boxShadow = '0 0 12px 2px rgba(15, 98, 254, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
                    e.currentTarget.style.color = 'var(--ibm-ink-muted)';
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