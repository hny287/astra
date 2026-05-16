'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { demoFindings, rawOutputExample, enrichedOutputExample } from './demoData';
import { APP_NAME } from '@/lib/branding';
import { SeverityDonutChart } from './landingCharts';

// ─── Severity color mapping (Carbon semantic tokens) ─────────────
const severityColor: Record<string, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-semantic-warning)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
};

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

// ─── Toggle mode ────────────────────────────────────────────────
type DemoMode = 'raw' | 'enriched';

// ─── Component ──────────────────────────────────────────────────
export default function InteractiveDemo() {
  const [mode, setMode] = useState<DemoMode>('raw');
  const { ref, visible } = useVisible(0.15);
  const isMobile = useIsMobile();

  // ─── Parse diff lines from fix ───────────────────────────────
  const fixLines = enrichedOutputExample.fix.split('\n');

  // ─── Render: raw output panel ────────────────────────────────
  const renderRawPanel = () => {
    const lines = rawOutputExample.split('\n');
    return (
      <pre
        style={{
          margin: 0,
          padding: '20px',
          background: 'var(--ibm-canvas)',
          borderRadius: '0',
          border: '1px solid var(--ibm-hairline)',
          overflow: 'auto',
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: '12px',
          lineHeight: 1.7,
          color: 'var(--ibm-ink-muted)',
          maxHeight: '420px',
        }}
      >
        <code>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '36px',
                  textAlign: 'right',
                  paddingRight: '16px',
                  color: 'var(--ibm-ink-subtle)',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1 }}>{line}</span>
            </div>
          ))}
        </code>
      </pre>
    );
  };

  // ─── Render: enriched output panel ────────────────────────────
  const renderEnrichedPanel = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      {/* Title */}
      <div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--ibm-ink)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {enrichedOutputExample.title}
        </h3>
      </div>

      {/* Explanation */}
      <div>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 300,
            lineHeight: 1.6,
            color: 'var(--ibm-ink-muted)',
            margin: 0,
          }}
        >
          {enrichedOutputExample.explanation}
        </p>
      </div>

      {/* Fix suggestion with diff formatting */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: 'var(--ibm-semantic-success)',
            marginBottom: '8px',
          }}
        >
          Suggested Fix
        </div>
        <pre
          style={{
            margin: 0,
            padding: '16px',
            background: 'var(--ibm-canvas)',
            borderRadius: '0',
            border: '1px solid var(--ibm-hairline)',
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
            fontSize: '12px',
            lineHeight: 1.7,
            overflow: 'auto',
            color: 'var(--ibm-ink-muted)',
          }}
        >
          <code>
            {fixLines.map((line, i) => {
              let lineColor: string = 'var(--ibm-ink-muted)';
              if (line.startsWith('+') || line.startsWith('```+')) {
                lineColor = 'var(--ibm-semantic-success)';
              } else if (line.startsWith('-') || line.startsWith('```-')) {
                lineColor = 'var(--ibm-semantic-error)';
              }
              // Strip ```diff and ``` markers
              const cleaned = line.replace(/^```diff?$/, '').replace(/^```$/, '');
              if (!cleaned) return null;
              return (
                <div key={i} style={{ color: lineColor }}>
                  {cleaned}
                </div>
              );
            })}
          </code>
        </pre>
      </div>

      {/* Exploit score */}
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: 'var(--ibm-ink-muted)',
            marginBottom: '8px',
          }}
        >
          Exploit Score
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              height: '8px',
              background: 'var(--ibm-surface-2)',
              borderRadius: '0',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(enrichedOutputExample.exploitScore / 10) * 100}%`,
                height: '100%',
                background: enrichedOutputExample.exploitScore >= 7
                  ? 'var(--ibm-semantic-error)'
                  : enrichedOutputExample.exploitScore >= 4
                    ? 'var(--ibm-semantic-warning)'
                    : 'var(--ibm-semantic-warning)',
                borderRadius: '0',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              color: 'var(--ibm-ink)',
            }}
          >
            {enrichedOutputExample.exploitScore}/10
          </span>
        </div>
      </div>

      {/* CWE and OWASP badges */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {enrichedOutputExample.cwe.map((c) => (
          <span
            key={c}
            style={{
              ...badgeStyle('var(--ibm-primary)'),
              fontSize: '12px',
              padding: '4px 10px',
              // Resolve CSS var for inline style — use raw hex fallback
              background: '#0f62fe20',
              color: '#0f62fe',
              border: '1px solid #0f62fe40',
            }}
          >
            {c}
          </span>
        ))}
        {enrichedOutputExample.owasp.map((o) => (
          <span
            key={o}
            style={{
              ...badgeStyle('var(--ibm-semantic-warning)'),
              fontSize: '12px',
              padding: '4px 10px',
              background: '#f57c0020',
              color: '#f57c00',
              border: '1px solid #f57c0040',
            }}
          >
            {o}
          </span>
        ))}
      </div>

      {/* Business context callout */}
      <div
        style={{
          background: '#0f62fe10',
          border: '1px solid #0f62fe30',
          borderRadius: '0',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: '#0f62fe',
            marginBottom: '6px',
          }}
        >
          Business Context
        </div>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 300,
            lineHeight: 1.5,
            color: 'var(--ibm-ink-muted)',
            margin: 0,
          }}
        >
          {enrichedOutputExample.businessContext}
        </p>
      </div>
    </div>
  );

  // ─── Render: findings list ────────────────────────────────────
  const renderFindingsList = () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        marginTop: '20px',
      }}
    >
      {demoFindings.map((f) => (
        <div
          key={f.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'var(--ibm-surface-2)',
            borderRadius: '0',
            border: '1px solid var(--ibm-hairline)',
            transition: 'border-color 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--ibm-hairline-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--ibm-hairline)';
          }}
        >
          <span
            style={{
              ...badgeStyle(severityColor[f.severity] || 'var(--ibm-ink-subtle)'),
              flexShrink: 0,
              // Use hex colors for badge backgrounds since CSS vars can't be concatenated
              ...(f.severity === 'CRITICAL' ? { background: '#da1e2820', color: '#da1e28', border: '1px solid #da1e2840' } : {}),
              ...(f.severity === 'HIGH' ? { background: '#f57c0020', color: '#f57c00', border: '1px solid #f57c0040' } : {}),
              ...(f.severity === 'MEDIUM' ? { background: '#f1c21b20', color: '#f1c21b', border: '1px solid #f1c21b40' } : {}),
              ...(f.severity === 'LOW' ? { background: '#24a14820', color: '#24a148', border: '1px solid #24a14840' } : {}),
            }}
          >
            {f.severity}
          </span>
          <span
            style={{
              color: 'var(--ibm-ink)',
              fontSize: '13px',
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              fontWeight: 400,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {f.title}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              color: 'var(--ibm-ink-subtle)',
              flexShrink: 0,
            }}
          >
            {f.file}:{f.line}
          </span>
          {!isMobile && (
          <span
            style={{
              ...badgeStyle(f.scanner === `${APP_NAME} AI` ? '#0f62fe' : '#6f6f6f'),
              fontSize: '10px',
              flexShrink: 0,
              ...(f.scanner === `${APP_NAME} AI`
                ? { background: '#0f62fe20', color: '#0f62fe', border: '1px solid #0f62fe40' }
                : { background: '#6f6f6f20', color: '#6f6f6f', border: '1px solid #6f6f6f40' }),
            }}
          >
            {f.scanner}
          </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section
      id="demo"
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
        See it in action
      </p>
      <h2
        className="ibm-display-md"
        style={{
          color: 'var(--ibm-ink)',
          marginBottom: '24px',
          textAlign: 'center',
          fontSize: isMobile ? '32px' : '48px',
        }}
      >
        Real findings. Real explanations.
      </h2>

      {/* Toggle switch */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--ibm-surface-2)',
            borderRadius: '0',
            border: '1px solid var(--ibm-hairline)',
            padding: '4px',
            gap: '4px',
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            justifyContent: 'center',
          }}
        >
          <button
            onClick={() => setMode('raw')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: mode === 'raw' ? 600 : 400,
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              color: mode === 'raw' ? 'var(--ibm-ink)' : 'var(--ibm-ink-muted)',
              background: mode === 'raw' ? 'var(--ibm-primary)' : 'transparent',
              border: 'none',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Raw scanner output
          </button>
          <button
            onClick={() => setMode('enriched')}
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: mode === 'enriched' ? 600 : 400,
              fontFamily: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
              color: mode === 'enriched' ? 'var(--ibm-ink)' : 'var(--ibm-ink-muted)',
              background: mode === 'enriched' ? 'var(--ibm-primary)' : 'transparent',
              border: 'none',
              borderRadius: '0',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {APP_NAME} AI-enriched
          </button>
        </div>
      </div>

      {/* Demo panel */}
      <div
        style={{
          background: 'var(--ibm-surface-1)',
          borderRadius: '0',
          border: '1px solid var(--ibm-hairline)',
          padding: isMobile ? '20px' : '28px',
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {/* Terminal dots */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '20px',
          }}
        >
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#da1e28' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f57c00' }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#24a148' }} />
          <span
            style={{
              marginLeft: '12px',
              fontSize: '12px',
              fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
              color: 'var(--ibm-ink-subtle)',
            }}
          >
            {mode === 'raw' ? 'trivy fs --format json' : 'astra deep-scan — enriched'}
          </span>
        </div>

        {/* Content area */}
        {mode === 'raw' ? renderRawPanel() : renderEnrichedPanel()}
      </div>

      {/* Findings list */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: 'var(--ibm-ink-subtle)',
            marginTop: '32px',
            marginBottom: '4px',
          }}
        >
          Scan Findings
        </div>
        {renderFindingsList()}
      </div>

      {/* Severity donut chart */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
        <SeverityDonutChart />
      </div>
    </section>
  );
}