'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';

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

// ─── Panel data ──────────────────────────────────────────────────
const panels = [
  {
    id: 'network-scan',
    title: 'Network Scan',
    tier: 'Enterprise',
    items: [
      'Nmap — port scanning and service detection',
      'OpenVAS — vulnerability scanning',
      'Network target management',
      'Service fingerprinting and correlation',
    ],
  },
  {
    id: 'sbom',
    title: 'SBOM',
    tier: 'Pro/Enterprise',
    items: [
      'Syft — software bill of materials generation',
      'Grype — vulnerability matching',
      'License conflict detection',
      'Reachability analysis',
    ],
  },
  {
    id: 'runtime',
    title: 'Runtime Security',
    tier: 'Enterprise',
    items: [
      'Falco agent — real-time event collection',
      'Anomaly correlation and detection',
      'Alert dispatch and integration',
      'Continuous event-driven monitoring',
    ],
  },
];

function tierColor(tier: string): string {
  switch (tier) {
    case 'Enterprise':
      return landingTokens.accentCritical;
    case 'Pro':
      return landingTokens.accentHigh;
    case 'Pro/Enterprise':
      return landingTokens.accentHigh;
    case 'Free':
      return landingTokens.accentLow;
    default:
      return landingTokens.inkMuted;
  }
}

// ─── Component ───────────────────────────────────────────────────
export default function NetworkRuntime() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

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
        Beyond code
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
        Network, SBOM, and runtime security
      </h2>

      {/* Three panels */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '24px',
          marginTop: '40px',
        }}
      >
        {panels.map((panel, i) => {
          const color = tierColor(panel.tier);
          return (
            <div
              key={panel.id}
              style={{
                ...sectionStyles.card,
                flex: 1,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
                transition: `opacity 0.4s ease ${i * 100}ms, transform 0.4s ease ${i * 100}ms, border-color 0.2s ease`,
              }}
            >
              {/* Title + badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: landingTokens.inkPrimary,
                    margin: 0,
                  }}
                >
                  {panel.title}
                </h3>
                <span style={sectionStyles.badge(color)}>
                  {panel.tier}
                </span>
              </div>

              {/* Feature list */}
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {panel.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: '14px',
                      fontWeight: 300,
                      lineHeight: 1.5,
                      color: landingTokens.inkSecondary,
                      paddingLeft: '18px',
                      position: 'relative',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: landingTokens.accentPrimary,
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