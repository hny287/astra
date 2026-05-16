'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { enterpriseFeatures } from './landingData';

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

// ─── Category accent colors (Carbon palette) ──────────────────────
const categoryConfig: Record<string, { color: string }> = {
  access: { color: '#0f62fe' },
  security: { color: '#da1e28' },
  deployment: { color: '#24a148' },
  audit: { color: '#f1c21b' },
};

const categoryKeys = ['access', 'security', 'deployment', 'audit'] as const;

// ─── Component ────────────────────────────────────────────────────
export default function RbacEnterprise() {
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
      id="security"
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
        Enterprise-grade from day one
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
        Security, access, and compliance
      </h2>

      {/* Enterprise feature cards grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: gridColumns,
          gap: '20px',
          marginTop: '40px',
        }}
      >
        {categoryKeys.map((key, i) => {
          const category = enterpriseFeatures[key];
          const config = categoryConfig[key];
          return (
            <div
              key={key}
              style={{
                background: 'var(--ibm-surface-2)',
                borderRadius: '0',
                padding: '24px',
                border: '1px solid var(--ibm-hairline)',
                transition: `opacity 0.4s ease ${i * 100}ms, transform 0.4s ease ${i * 100}ms, border-color 0.2s ease`,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = config.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
              }}
            >
              {/* Icon + title */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                {/* Colored square icon placeholder */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '0',
                    background: config.color + '20',
                    border: `1px solid ${config.color}40`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '2px',
                      background: config.color,
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--ibm-ink)',
                    margin: 0,
                  }}
                >
                  {category.title}
                </h3>
              </div>

              {/* Bullet items */}
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                {category.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: '13px',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: 'var(--ibm-ink-muted)',
                      paddingLeft: '16px',
                      position: 'relative' as const,
                    }}
                  >
                    {/* Bullet dot */}
                    <span
                      style={{
                        position: 'absolute' as const,
                        left: 0,
                        top: '7px',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: config.color,
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}