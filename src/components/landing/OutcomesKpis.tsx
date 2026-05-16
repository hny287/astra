'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible, useCountUp } from './landingAnimations';
import { kpiStats, pricingTiers } from './landingData';

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
                color: landingTokens.inkPrimary,
                lineHeight: 1.1,
                fontFamily: landingTokens.fontSans,
              }}
            >
              {counts[i].toLocaleString()}
              <span
                style={{
                  fontSize: isMobile ? '24px' : '32px',
                  fontWeight: 600,
                  color: landingTokens.accentPrimary,
                }}
              >
                {stat.suffix}
              </span>
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: 1.5,
                color: landingTokens.inkSecondary,
                marginTop: '8px',
                fontFamily: landingTokens.fontSans,
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

      {/* ─── Section Header ─────────────────────────────────────── */}
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        Pricing
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
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
                  ? landingTokens.bgSurface2
                  : landingTokens.bgSurface1,
                borderRadius: '8px',
                padding: isMobile ? '24px' : '32px',
                border: `1px solid ${
                  isHighlighted
                    ? landingTokens.accentPrimary
                    : landingTokens.borderSubtle
                }`,
                position: 'relative',
                transform: isHighlighted && !isMobile ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHighlighted
                  ? `0 4px 24px ${landingTokens.accentPrimary}20`
                  : 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isHighlighted) {
                  e.currentTarget.style.borderColor = landingTokens.borderMedium;
                }
              }}
              onMouseLeave={(e) => {
                if (!isHighlighted) {
                  e.currentTarget.style.borderColor = landingTokens.borderSubtle;
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
                    borderRadius: '4px',
                    background: landingTokens.accentPrimary,
                    color: '#ffffff',
                    fontFamily: landingTokens.fontSans,
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
                  color: landingTokens.inkPrimary,
                  marginBottom: '16px',
                  fontFamily: landingTokens.fontSans,
                }}
              >
                {tier.name}
              </h3>

              {/* Price */}
              <div
                style={{
                  marginBottom: '8px',
                  fontFamily: landingTokens.fontSans,
                }}
              >
                <span
                  style={{
                    fontSize: '36px',
                    fontWeight: 600,
                    color: landingTokens.inkPrimary,
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
                      color: landingTokens.inkMuted,
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
                      color: landingTokens.inkSecondary,
                      paddingLeft: '20px',
                      position: 'relative',
                      fontFamily: landingTokens.fontSans,
                    }}
                  >
                    {/* Check mark */}
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '3px',
                        color: isHighlighted
                          ? landingTokens.accentPrimary
                          : landingTokens.accentLow,
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
                  fontFamily: landingTokens.fontSans,
                  borderRadius: '4px',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease, border-color 0.15s ease',
                  ...(isHighlighted
                    ? {
                        background: landingTokens.accentPrimary,
                        color: '#ffffff',
                        border: 'none',
                      }
                    : {
                        background: 'transparent',
                        color: landingTokens.inkPrimary,
                        border: `1px solid ${landingTokens.borderMedium}`,
                      }),
                }}
                onMouseEnter={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.background =
                      landingTokens.accentPrimaryHover;
                  } else {
                    e.currentTarget.style.borderColor = landingTokens.inkPrimary;
                    e.currentTarget.style.background = `${landingTokens.inkPrimary}08`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isHighlighted) {
                    e.currentTarget.style.background =
                      landingTokens.accentPrimary;
                  } else {
                    e.currentTarget.style.borderColor =
                      landingTokens.borderMedium;
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
        style={{
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 300,
          color: landingTokens.inkMuted,
          marginTop: '24px',
          fontFamily: landingTokens.fontSans,
        }}
      >
        Pricing is approximate. Actual pricing may vary.
      </p>
    </section>
  );
}