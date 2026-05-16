'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { demoFindings, rawOutputExample, enrichedOutputExample } from './demoData';
import { APP_NAME } from '@/lib/branding';

// ─── Severity color mapping ────────────────────────────────────────
const severityColor: Record<string, string> = {
  CRITICAL: landingTokens.accentCritical,
  HIGH: landingTokens.accentHigh,
  MEDIUM: landingTokens.accentMedium,
  LOW: landingTokens.accentLow,
};

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
          background: landingTokens.bgCanvas,
          borderRadius: '8px',
          border: `1px solid ${landingTokens.borderSubtle}`,
          overflow: 'auto',
          fontFamily: landingTokens.fontMono,
          fontSize: '12px',
          lineHeight: 1.7,
          color: landingTokens.inkSecondary,
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
                  color: landingTokens.inkMuted,
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
        fontFamily: landingTokens.fontSans,
      }}
    >
      {/* Title */}
      <div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: landingTokens.inkPrimary,
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
            color: landingTokens.inkSecondary,
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
            color: landingTokens.accentLow,
            marginBottom: '8px',
          }}
        >
          Suggested Fix
        </div>
        <pre
          style={{
            margin: 0,
            padding: '16px',
            background: landingTokens.bgCanvas,
            borderRadius: '8px',
            border: `1px solid ${landingTokens.borderSubtle}`,
            fontFamily: landingTokens.fontMono,
            fontSize: '12px',
            lineHeight: 1.7,
            overflow: 'auto',
            color: landingTokens.inkSecondary,
          }}
        >
          <code>
            {fixLines.map((line, i) => {
              let lineColor: string = landingTokens.inkSecondary;
              if (line.startsWith('+') || line.startsWith('```+')) {
                lineColor = landingTokens.accentLow;
              } else if (line.startsWith('-') || line.startsWith('```-')) {
                lineColor = landingTokens.accentCritical;
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
            color: landingTokens.inkSecondary,
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
              background: landingTokens.bgSurface3,
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(enrichedOutputExample.exploitScore / 10) * 100}%`,
                height: '100%',
                background: enrichedOutputExample.exploitScore >= 7
                  ? landingTokens.accentCritical
                  : enrichedOutputExample.exploitScore >= 4
                    ? landingTokens.accentHigh
                    : landingTokens.accentMedium,
                borderRadius: '4px',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: landingTokens.fontMono,
              color: landingTokens.inkPrimary,
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
              ...sectionStyles.badge(landingTokens.accentPrimary),
              fontSize: '12px',
              padding: '4px 10px',
            }}
          >
            {c}
          </span>
        ))}
        {enrichedOutputExample.owasp.map((o) => (
          <span
            key={o}
            style={{
              ...sectionStyles.badge(landingTokens.accentHigh),
              fontSize: '12px',
              padding: '4px 10px',
            }}
          >
            {o}
          </span>
        ))}
      </div>

      {/* Business context callout */}
      <div
        style={{
          background: `${landingTokens.accentPrimary}10`,
          border: `1px solid ${landingTokens.accentPrimary}30`,
          borderRadius: '8px',
          padding: '16px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
            color: landingTokens.accentPrimary,
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
            color: landingTokens.inkSecondary,
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
            background: landingTokens.bgSurface2,
            borderRadius: '6px',
            border: `1px solid ${landingTokens.borderSubtle}`,
            transition: 'border-color 0.15s ease',
            cursor: 'default',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = landingTokens.borderMedium;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = landingTokens.borderSubtle;
          }}
        >
          <span
            style={{
              ...sectionStyles.badge(severityColor[f.severity] || landingTokens.inkMuted),
              flexShrink: 0,
            }}
          >
            {f.severity}
          </span>
          <span
            style={{
              color: landingTokens.inkPrimary,
              fontSize: '13px',
              fontFamily: landingTokens.fontSans,
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
              fontFamily: landingTokens.fontMono,
              color: landingTokens.inkMuted,
              flexShrink: 0,
            }}
          >
            {f.file}:{f.line}
          </span>
          {!isMobile && (
          <span
            style={{
              ...sectionStyles.badge(f.scanner === `${APP_NAME} AI` ? landingTokens.accentPrimary : landingTokens.inkMuted),
              fontSize: '10px',
              flexShrink: 0,
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
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        See it in action
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
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
            background: landingTokens.bgSurface2,
            borderRadius: '8px',
            border: `1px solid ${landingTokens.borderSubtle}`,
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
              fontFamily: landingTokens.fontSans,
              color: mode === 'raw' ? landingTokens.inkPrimary : landingTokens.inkSecondary,
              background: mode === 'raw' ? landingTokens.accentPrimary : 'transparent',
              border: 'none',
              borderRadius: '6px',
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
              fontFamily: landingTokens.fontSans,
              color: mode === 'enriched' ? landingTokens.inkPrimary : landingTokens.inkSecondary,
              background: mode === 'enriched' ? landingTokens.accentPrimary : 'transparent',
              border: 'none',
              borderRadius: '6px',
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
          background: landingTokens.bgSurface1,
          borderRadius: '12px',
          border: `1px solid ${landingTokens.borderSubtle}`,
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
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentCritical }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentMedium }} />
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: landingTokens.accentLow }} />
          <span
            style={{
              marginLeft: '12px',
              fontSize: '12px',
              fontFamily: landingTokens.fontMono,
              color: landingTokens.inkMuted,
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
            color: landingTokens.inkMuted,
            marginTop: '32px',
            marginBottom: '4px',
          }}
        >
          Scan Findings
        </div>
        {renderFindingsList()}
      </div>
    </section>
  );
}