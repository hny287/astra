'use client';

import { useState, useEffect } from 'react';
import { useVisible } from './landingAnimations';
import { APP_NAME } from '@/lib/branding';
import { differentiators } from './landingData';
import { RemediationComparisonChart } from './landingCharts';

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

// ─── Component ──────────────────────────────────────────────────────
export default function AiAdvantage() {
  const { ref, visible } = useVisible(0.15);
  const isMobile = useIsMobile();

  return (
    <section
      id="ai-advantage"
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
        The AI difference
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
        What you get vs. what scanners give you
      </h2>

      {/* Side-by-side comparison */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '24px',
          marginTop: '32px',
        }}
      >
        {/* Left: What scanners give you */}
        <div
          style={{
            background: 'var(--ibm-surface-1)',
            borderRadius: '0',
            border: '1px solid var(--ibm-hairline)',
            padding: '24px',
            fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          }}
        >
          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--ibm-ink-subtle)',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: 'var(--ibm-ink-subtle)',
              }}
            >
              What scanners give you
            </span>
          </div>

          {/* Raw finding display */}
          <div
            style={{
              background: 'var(--ibm-canvas)',
              borderRadius: '0',
              padding: '16px',
              border: '1px solid var(--ibm-hairline)',
            }}
          >
            {/* CVE ID */}
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--ibm-ink-subtle)',
                }}
              >
                VulnerabilityID:
              </span>{' '}
              <span style={{ color: '#f57c00', fontSize: '13px' }}>
                CVE-2024-38512
              </span>
            </div>

            {/* Package */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ibm-ink-subtle)' }}>
                PkgName:
              </span>{' '}
              <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '13px' }}>
                express
              </span>
            </div>

            {/* Vague description */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ibm-ink-subtle)' }}>
                Description:
              </span>{' '}
              <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '12px' }}>
                Open redirect vulnerability in Express allows attackers to redirect users to arbitrary URLs via malformed input to res.redirect()
              </span>
            </div>

            {/* File path */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ibm-ink-subtle)' }}>
                Target:
              </span>{' '}
              <span style={{ color: 'var(--ibm-ink-muted)', fontSize: '13px' }}>
                auth/login.ts
              </span>
            </div>

            {/* Severity */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--ibm-ink-subtle)' }}>
                Severity:
              </span>{' '}
              <span
                style={{
                  ...badgeStyle('#f1c21b'),
                  fontSize: '11px',
                }}
              >
                MEDIUM
              </span>
            </div>

            {/* What's missing callout */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px dashed var(--ibm-hairline)',
                color: 'var(--ibm-ink-subtle)',
                fontSize: '12px',
                lineHeight: 1.5,
              }}
            >
              No context. No fix. No business impact. Is this actually exploitable? Who knows.
            </div>
          </div>
        </div>

        {/* Right: What APP_NAME gives you */}
        <div
          style={{
            background: 'var(--ibm-surface-1)',
            borderRadius: '0',
            border: '1px solid #0f62fe40',
            padding: '24px',
            position: 'relative',
          }}
        >
          {/* Subtle glow accent */}
          <div
            style={{
              position: 'absolute',
              top: '-1px',
              left: '0',
              right: '0',
              height: '3px',
              background: 'linear-gradient(90deg, #0f62fe, #0f62fe00)',
              borderRadius: '0',
            }}
          />

          {/* Panel header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#0f62fe',
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: '#0f62fe',
              }}
            >
              What {APP_NAME} gives you
            </span>
          </div>

          {/* Enriched finding display */}
          <div
            style={{
              background: 'var(--ibm-canvas)',
              borderRadius: '0',
              padding: '16px',
              border: '1px solid #0f62fe20',
            }}
          >
            {/* Title with severity */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--ibm-ink)',
                marginBottom: '12px',
                lineHeight: 1.3,
              }}
            >
              SQL injection in authentication query
              <span
                style={{
                  ...badgeStyle('#da1e28'),
                  marginLeft: '8px',
                  fontSize: '10px',
                }}
              >
                CRITICAL
              </span>
            </div>

            {/* Plain-language explanation */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#0f62fe',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  marginBottom: '4px',
                }}
              >
                Explanation
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
                This SQL query concatenates user input directly into the query string, allowing an attacker to inject arbitrary SQL commands. The username and password parameters from req.body are interpolated without parameterization.
              </p>
            </div>

            {/* Specific fix */}
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--ibm-semantic-success)',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  marginBottom: '4px',
                }}
              >
                Fix
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '10px',
                  background: 'var(--ibm-surface-1)',
                  borderRadius: '0',
                  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: 'var(--ibm-ink-muted)',
                  overflowX: 'auto',
                }}
              >
                <code>
                  <div style={{ color: '#da1e28' }}>
                    - const query = {"`SELECT * FROM users WHERE username = '${username}'`"}
                  </div>
                  <div style={{ color: '#24a148' }}>
                    + const query = &apos;SELECT * FROM users WHERE username = $1&apos;;
                  </div>
                  <div style={{ color: '#24a148' }}>
                    + const result = await db.query(query, [username]);
                  </div>
                </code>
              </pre>
            </div>

            {/* Exploitability + CWE/OWASP */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  ...badgeStyle('#0f62fe'),
                  fontSize: '11px',
                }}
              >
                CWE-89
              </span>
              <span
                style={{
                  ...badgeStyle('#f57c00'),
                  fontSize: '11px',
                }}
              >
                A03:2021
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                  color: 'var(--ibm-ink)',
                  fontWeight: 600,
                  marginLeft: '4px',
                }}
              >
                Exploit: 8.2/10
              </span>
            </div>

            {/* Business context */}
            <div
              style={{
                background: '#0f62fe10',
                border: '1px solid #0f62fe30',
                borderRadius: '0',
                padding: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: '#0f62fe',
                  marginBottom: '4px',
                }}
              >
                Business Impact
              </div>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 300,
                  lineHeight: 1.5,
                  color: 'var(--ibm-ink-muted)',
                  margin: 0,
                }}
              >
                This endpoint is part of the authentication flow — a successful injection could bypass login entirely, granting unauthorized access to any account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Differentiator cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: '20px',
          marginTop: '40px',
        }}
      >
        {differentiators.slice(0, 3).map((d) => (
          <div
            key={d.id}
            style={{
              background: 'var(--ibm-surface-1)',
              borderRadius: '0',
              padding: '24px',
              border: '1px solid var(--ibm-hairline)',
              textAlign: 'center',
            }}
          >
            {/* Title */}
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--ibm-ink)',
                margin: '0 0 8px 0',
              }}
            >
              {d.title}
            </h3>

            {/* Description */}
            <p
              className="ibm-body-lg"
              style={{
                color: 'var(--ibm-ink-muted)',
                maxWidth: '640px',
                margin: 0,
              }}
            >
              {d.description}
            </p>
          </div>
        ))}
      </div>

      {/* Remediation comparison chart */}
      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
        <RemediationComparisonChart />
      </div>
    </section>
  );
}