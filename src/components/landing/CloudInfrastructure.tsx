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
    id: 'cloud-scan',
    title: 'Cloud Scan',
    tier: 'Enterprise',
    items: [
      'AWS, Azure, and GCP coverage',
      'Prowler — 43 compliance frameworks',
      'ScoutSuite — multi-cloud audit',
      'kube-bench — Kubernetes CIS benchmarks',
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance',
    tier: null,
    items: [
      'CIS, PCI-DSS, NIST 800-53, SOC2',
      'HIPAA, ISO 27001, GDPR, FedRAMP',
      'Auto-mapping from scan findings',
      'Audit-ready report generation',
    ],
  },
  {
    id: 'iac-scan',
    title: 'IaC Scan',
    tier: 'Pro',
    items: [
      'Terraform, Kubernetes, CloudFormation',
      'Helm chart misconfiguration detection',
      'Misconfig detection before deploy',
      'Custom Rego policy support',
    ],
  },
];

function tierColor(tier: string | null): string {
  switch (tier) {
    case 'Enterprise':
      return landingTokens.accentCritical;
    case 'Pro':
      return landingTokens.accentHigh;
    case 'Free':
      return landingTokens.accentLow;
    default:
      return landingTokens.inkMuted;
  }
}

// ─── Component ───────────────────────────────────────────────────
export default function CloudInfrastructure() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

  return (
    <section
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
        Secure your cloud footprint
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
        Cloud, compliance, and infrastructure
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
                {panel.tier && (
                  <span style={sectionStyles.badge(color)}>
                    {panel.tier}
                  </span>
                )}
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