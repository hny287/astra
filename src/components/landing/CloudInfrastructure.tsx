'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';

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
    case 'Enterprise': return '#da1e28';
    case 'Pro': return '#f57c00';
    case 'Free': return '#24a148';
    default: return '#6f6f6f';
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
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        Secure your cloud footprint
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
                background: 'var(--ibm-surface-1)',
                borderRadius: '0',
                border: '1px solid var(--ibm-hairline)',
                padding: '24px',
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
                    color: 'var(--ibm-ink)',
                    margin: 0,
                  }}
                >
                  {panel.title}
                </h3>
                {panel.tier && (
                  <span style={badgeStyle(color)}>
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
                      color: 'var(--ibm-ink-muted)',
                      paddingLeft: '18px',
                      position: 'relative' as const,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute' as const,
                        left: 0,
                        top: '8px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        background: '#0f62fe',
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