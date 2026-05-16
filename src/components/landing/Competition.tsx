'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { APP_NAME } from '@/lib/branding';

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

// ─── Feature comparison data ─────────────────────────────────────
const comparisonRows = [
  { feature: 'Business logic detection', astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'Cross-file reasoning', astra: true, snyk: false, semgrep: false, coderabbit: true },
  { feature: 'AI-aware SAST', astra: true, snyk: false, semgrep: false, coderabbit: false },
  { feature: 'Transparent pricing', astra: true, snyk: false, semgrep: true, coderabbit: true },
  { feature: 'All-in-one platform', astra: true, snyk: false, semgrep: false, coderabbit: false },
];

const columns = [
  { key: 'astra', label: APP_NAME },
  { key: 'snyk', label: 'Snyk' },
  { key: 'semgrep', label: 'Semgrep' },
  { key: 'coderabbit', label: 'CodeRabbit' },
] as const;

// ─── Component ──────────────────────────────────────────────────────
export default function Competition() {
  const { ref, visible } = useVisible(0.1);
  const isMobile = useIsMobile();

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
      <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: '12px', textAlign: 'center' }}>
        Why {APP_NAME}
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
        Not just another scanner
      </h2>
      <p
        className="ibm-body-lg"
        style={{
          color: 'var(--ibm-ink-muted)',
          textAlign: 'center',
          maxWidth: '640px',
          marginLeft: 'auto',
          marginRight: 'auto',
          marginBottom: '48px',
        }}
      >
        Built for the vulnerabilities that pattern-matching tools miss. Hybrid
        deterministic+LLM analysis, unified platform, transparent pricing.
      </p>

      {/* Feature comparison table */}
      <div
        style={{
          overflowX: 'auto',
          marginTop: '8px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '14px',
            minWidth: isMobile ? '540px' : 'auto',
          }}
        >
          {/* Header row */}
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '14px 16px',
                  borderBottom: '2px solid var(--ibm-hairline-strong)',
                  fontSize: '13px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: 'var(--ibm-ink-subtle)',
                }}
              >
                Feature
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    textAlign: 'center',
                    padding: '14px 16px',
                    borderBottom: '2px solid var(--ibm-hairline-strong)',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: col.key === 'astra' ? '#0f62fe' : 'var(--ibm-ink)',
                    minWidth: isMobile ? '80px' : '120px',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature}>
                <td
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--ibm-hairline)',
                    fontWeight: 400,
                    color: 'var(--ibm-ink)',
                  }}
                >
                  {row.feature}
                </td>
                {columns.map((col) => {
                  const value = row[col.key as keyof typeof row];
                  const isAstra = col.key === 'astra';
                  return (
                    <td
                      key={col.key}
                      style={{
                        textAlign: 'center',
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--ibm-hairline)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '18px',
                          fontWeight: 600,
                          color: value
                            ? (isAstra ? '#0f62fe' : '#24a148')
                            : '#6f6f6f',
                        }}
                      >
                        {value ? '✓' : '✗'}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}