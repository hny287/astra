'use client';

import { useState, useEffect } from 'react';
import { landingTokens, sectionStyles } from './landingStyles';
import { useVisible } from './landingAnimations';
import { APP_NAME } from '@/lib/branding';

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

// ─── Differentiator data ────────────────────────────────────────────
const differentiators = [
  {
    id: 'business-logic',
    title: 'Business logic detection',
    description: 'Finds IDOR, BOLA, and BFLA vulnerabilities that pattern-matching scanners miss. 49% of critical bug-bounty findings are authorization flaws invisible to static rules.',
    icon: '⚡',
  },
  {
    id: 'cross-file',
    title: 'Cross-file reasoning',
    description: 'Connects data flows across files and services. Traces how user input travels from route handlers through middleware to database queries — and where it lacks sanitization.',
    icon: '\u{1F517}',
  },
  {
    id: 'ai-sast',
    title: 'AI-aware SAST',
    description: 'Tuned for AI-generated code patterns. Detects vibe-coded vulnerabilities like hallucinated imports, copy-paste errors, and insecure defaults from LLM-generated files.',
    icon: '\u{1F916}',
  },
];

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
      <p style={{ ...sectionStyles.eyebrow, textAlign: 'center' }}>
        The AI difference
      </p>
      <h2
        style={{
          ...sectionStyles.headline,
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
            background: landingTokens.bgSurface1,
            borderRadius: '12px',
            border: `1px solid ${landingTokens.borderSubtle}`,
            padding: '24px',
            fontFamily: landingTokens.fontMono,
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
                background: landingTokens.inkMuted,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: landingTokens.inkMuted,
              }}
            >
              What scanners give you
            </span>
          </div>

          {/* Raw finding display */}
          <div
            style={{
              background: landingTokens.bgCanvas,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${landingTokens.borderSubtle}`,
            }}
          >
            {/* CVE ID */}
            <div style={{ marginBottom: '12px' }}>
              <span
                style={{
                  fontSize: '11px',
                  color: landingTokens.inkMuted,
                }}
              >
                VulnerabilityID:
              </span>{' '}
              <span style={{ color: landingTokens.accentHigh, fontSize: '13px' }}>
                CVE-2024-38512
              </span>
            </div>

            {/* Package */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: landingTokens.inkMuted }}>
                PkgName:
              </span>{' '}
              <span style={{ color: landingTokens.inkSecondary, fontSize: '13px' }}>
                express
              </span>
            </div>

            {/* Vague description */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: landingTokens.inkMuted }}>
                Description:
              </span>{' '}
              <span style={{ color: landingTokens.inkSecondary, fontSize: '12px' }}>
                Open redirect vulnerability in Express allows attackers to redirect users to arbitrary URLs via malformed input to res.redirect()
              </span>
            </div>

            {/* File path */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: landingTokens.inkMuted }}>
                Target:
              </span>{' '}
              <span style={{ color: landingTokens.inkSecondary, fontSize: '13px' }}>
                auth/login.ts
              </span>
            </div>

            {/* Severity */}
            <div>
              <span style={{ fontSize: '11px', color: landingTokens.inkMuted }}>
                Severity:
              </span>{' '}
              <span
                style={{
                  ...sectionStyles.badge(landingTokens.accentMedium),
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
                borderTop: `1px dashed ${landingTokens.borderSubtle}`,
                color: landingTokens.inkMuted,
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
            background: landingTokens.bgSurface1,
            borderRadius: '12px',
            border: `1px solid ${landingTokens.accentPrimary}40`,
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
              background: `linear-gradient(90deg, ${landingTokens.accentPrimary}, ${landingTokens.accentPrimary}00)`,
              borderRadius: '12px 12px 0 0',
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
                background: landingTokens.accentPrimary,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                color: landingTokens.accentPrimary,
              }}
            >
              What {APP_NAME} gives you
            </span>
          </div>

          {/* Enriched finding display */}
          <div
            style={{
              background: landingTokens.bgCanvas,
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${landingTokens.accentPrimary}20`,
            }}
          >
            {/* Title with severity */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: landingTokens.inkPrimary,
                marginBottom: '12px',
                lineHeight: 1.3,
              }}
            >
              SQL injection in authentication query
              <span
                style={{
                  ...sectionStyles.badge(landingTokens.accentCritical),
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
                  color: landingTokens.accentPrimary,
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
                  color: landingTokens.inkSecondary,
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
                  color: landingTokens.accentLow,
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
                  background: landingTokens.bgSurface1,
                  borderRadius: '6px',
                  fontFamily: landingTokens.fontMono,
                  fontSize: '12px',
                  lineHeight: 1.6,
                  color: landingTokens.inkSecondary,
                  overflowX: 'auto',
                }}
              >
                <code>
                  <div style={{ color: landingTokens.accentCritical }}>
                    - const query = {"`SELECT * FROM users WHERE username = '${username}'`"}
                  </div>
                  <div style={{ color: landingTokens.accentLow }}>
                    + const query = &apos;SELECT * FROM users WHERE username = $1&apos;;
                  </div>
                  <div style={{ color: landingTokens.accentLow }}>
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
                  ...sectionStyles.badge(landingTokens.accentPrimary),
                  fontSize: '11px',
                }}
              >
                CWE-89
              </span>
              <span
                style={{
                  ...sectionStyles.badge(landingTokens.accentHigh),
                  fontSize: '11px',
                }}
              >
                A03:2021
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: landingTokens.fontMono,
                  color: landingTokens.inkPrimary,
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
                background: `${landingTokens.accentPrimary}10`,
                border: `1px solid ${landingTokens.accentPrimary}30`,
                borderRadius: '6px',
                padding: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.06em',
                  color: landingTokens.accentPrimary,
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
                  color: landingTokens.inkSecondary,
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
        {differentiators.map((d) => (
          <div
            key={d.id}
            style={{
              ...sectionStyles.card,
              textAlign: 'center',
            }}
          >
            {/* Icon */}
            <div
              style={{
                fontSize: '28px',
                marginBottom: '12px',
                lineHeight: 1,
              }}
            >
              {d.icon}
            </div>

            {/* Title */}
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: landingTokens.inkPrimary,
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              {d.title}
            </h3>

            {/* Description */}
            <p
              style={{
                fontSize: '14px',
                fontWeight: 300,
                lineHeight: 1.6,
                color: landingTokens.inkSecondary,
                margin: 0,
              }}
            >
              {d.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}