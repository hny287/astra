'use client';

import { useState, useEffect } from 'react';
import { useVisible, useCountUp } from './landingAnimations';
import { kpiStats, pricingTiers } from './landingData';
import { SeverityDonutChart, CategoryBarChart } from './landingCharts';

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
export default function OutcomesKpis() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

  // Count-up for each KPI stat
  const count0 = useCountUp(kpiStats[0].value, 2000, visible);
  const count1 = useCountUp(kpiStats[1].value, 2000, visible);
  const count2 = useCountUp(kpiStats[2].value, 1500, visible);
  const count3 = useCountUp(kpiStats[3].value, 1200, visible);
  const counts = [count0, count1, count2, count3];

  return (
    <section
      id="pricing"
      className="lp-section"
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      {/* ─── KPI Stats Row ──────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
          gap: isMobile ? '24px' : '32px',
          marginBottom: '64px',
        }}
      >
        {kpiStats.map((stat, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: isMobile ? '36px' : '48px',
                fontWeight: 600,
                color: 'var(--ibm-ink)',
                lineHeight: 1.1,
              }}
            >
              {counts[i].toLocaleString()}
              <span
                style={{
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: 600,
                  color: '#0f62fe',
                }}
              >
                {stat.suffix}
              </span>
            </div>
            <div
              className="ibm-body-lg"
              style={{
                color: 'var(--ibm-ink-muted)',
                marginTop: '8px',
                maxWidth: '200px',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Charts row ─────────────────────────────────────────── */}
      <div
        style={{
          display: isMobile ? 'flex' : 'grid',
          gridTemplateColumns: '1fr 1fr',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '32px',
          marginBottom: '64px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <SeverityDonutChart />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <CategoryBarChart />
        </div>
      </div>

      {/* ─── Section Header ─────────────────────────────────────── */}
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        Pricing
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
          marginBottom: '16px',
        }}
      >
        One platform, predictable pricing
      </h2>

      {/* ─── Pricing Tiers ───────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: isMobile ? '20px' : '24px',
          marginTop: '48px',
        }}
      >
        {pricingTiers.map((tier) => {
          const isHighlighted = 'highlighted' in tier && tier.highlighted;
          return (
            <div
              key={tier.name}
              style={{
                background: isHighlighted
                  ? 'var(--ibm-surface-2)'
                  : 'var(--ibm-surface-1)',
                borderRadius: '0',
                padding: isMobile ? '24px' : '32px',
                border: `1px solid ${
                  isHighlighted
                    ? '#0f62fe'
                    : 'var(--ibm-hairline)'
                }`,
                position: 'relative',
                transform: isHighlighted && !isMobile ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHighlighted
                  ? '0 4px 24px rgba(15, 98, 254, 0.12)'
                  : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isHighlighted) {
                  e.currentTarget.style.borderColor = 'var(--ibm-hairline-strong)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isHighlighted) {
                  e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
                }
              }}
            >
              {/* "Most popular" badge */}
              {isHighlighted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    padding: '4px 12px',
                    borderRadius: '0',
                    background: '#0f62fe',
                    color: '#ffffff',
                  }}
                >
                  Most popular
                </div>
              )}

              {/* Tier name */}
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'var(--ibm-ink)',
                  marginBottom: '16px',
                }}
              >
                {tier.name}
              </h3>

              {/* Price */}
              <div
                style={{
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 600,
                    color: 'var(--ibm-ink)',
                    lineHeight: 1,
                  }}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--ibm-ink-subtle)',
                      marginLeft: '4px',
                    }}
                  >
                    {tier.period}
                  </span>
                )}
              </div>

              {/* Feature list */}
              <ul
                style={{
                  listStyle: 'none',
                  margin: '0',
                  padding: '0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '24px',
                  minHeight: '140px',
                }}
              >
                {tier.features.map((feat) => (
                  <li
                    key={feat}
                    style={{
                      fontSize: '14px',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: 'var(--ibm-ink-muted)',
                      paddingLeft: '20px',
                      position: 'relative' as const,
                    }}
                  >
                    {/* Check mark */}
                    <span
                      style={{
                        position: 'absolute' as const,
                        left: 0,
                        top: '3px',
                        color: isHighlighted ? '#0f62fe' : '#24a148',
                        fontSize: '14px',
                        fontWeight: 600,
                      }}
                    >
                      ✓
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA button */}
              <a
                href="/api/auth/signin"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '0',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  ...(isHighlighted
                    ? {
                        background: '#0f62fe',
                        color: '#ffffff',
                        border: 'none',
                      }
                    : {
                        background: 'transparent',
                        color: 'var(--ibm-ink)',
                        border: '1px solid var(--ibm-hairline-strong)',
                      }),
                }}
                onMouseEnter={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.background = '#0552d6';
                  } else {
                    e.currentTarget.style.borderColor = 'var(--ibm-ink)';
                    e.currentTarget.style.background = 'rgba(15, 98, 254, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.background = '#0f62fe';
                  } else {
                    e.currentTarget.style.borderColor = 'var(--ibm-hairline-strong)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                {tier.cta}
              </a>
            </div>
          );
        })}
      </div>

      {/* Pricing disclaimer */}
      <p
        className="ibm-body-lg"
        style={{
          textAlign: 'center',
          color: 'var(--ibm-ink-subtle)',
          marginTop: '24px',
        }}
      >
        Pricing is approximate. Actual pricing may vary.
      </p>
    </section>
  );
}