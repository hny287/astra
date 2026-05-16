'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { findingCategories } from './landingData';
import { CategoryBarChart, SeverityDonutChart } from './landingCharts';

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

// ─── Component ──────────────────────────────────────────────────────
export default function WhatItFinds() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

  return (
    <section
      id="what-it-finds"
      className="lp-section lp-section-dark"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* Section header */}
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        What it finds
      </p>
      <h2
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          marginBottom: '24px',
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
          maxWidth: '640px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Vulnerabilities that matter
      </h2>

      {/* Category cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
          gap: '20px',
          marginTop: '32px',
        }}
      >
        {findingCategories.map((cat, i) => (
          <div
            key={cat.id}
            style={{
              background: 'var(--ibm-surface-1)',
              borderRadius: '0',
              padding: '24px',
              border: '1px solid var(--ibm-hairline)',
              borderLeft: `4px solid ${cat.color}`,
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms, border-color 0.2s ease`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = cat.color;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
            }}
          >
            {/* Title + tag */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--ibm-ink)',
                  margin: 0,
                }}
              >
                {cat.title}
              </h3>
              <span style={badgeStyle(cat.color)}>
                {cat.tag}
              </span>
            </div>

            {/* Example findings */}
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {cat.examples.map((example) => {
                // Split example into finding text and file path
                const colonIdx = example.lastIndexOf(':');
                const hasFilePath = colonIdx > 0 && /\.\w{1,4}$/.test(example.slice(colonIdx + 1)) === false;

                return (
                  <li
                    key={example}
                    style={{
                      fontSize: '13px',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: 'var(--ibm-ink-muted)',
                      paddingLeft: '14px',
                      position: 'relative',
                    }}
                  >
                    {/* Bullet dot */}
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: cat.color,
                      }}
                    />
                    {hasFilePath ? (
                      <>
                        {example.slice(0, colonIdx + 1)}
                        <span style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '12px' }}>
                          {example.slice(colonIdx + 1)}
                        </span>
                      </>
                    ) : (
                      example
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Charts — two-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '32px',
          marginTop: '48px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CategoryBarChart />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SeverityDonutChart />
        </div>
      </div>
    </section>
  );
}