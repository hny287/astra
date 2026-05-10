'use client';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-red-50)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
  INFO: 'var(--ibm-primary)',
};

interface Finding {
  title: string;
  severity: string;
  category: string;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  aiExplanation: string | null;
  aiFix: string | null;
  exploitationScenario: string | null;
  cwe: string[];
  owasp: string[];
  exploitScore: number;
  confidence: number;
  description: string;
  remediation: string;
  scanner: string;
}

interface ReportFindingDetailProps {
  finding: Finding;
}

export default function ReportFindingDetail({
  finding,
}: ReportFindingDetailProps) {
  const sev = ([
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFO',
  ].includes(finding.severity)
    ? finding.severity
    : 'INFO') as Severity;
  const sevColor = SEVERITY_COLOR[sev];

  const codeLines = finding.codeSnippet.split('\n');
  const lineNumWidth = String(
    Math.max(finding.lineEnd, finding.lineStart + codeLines.length - 1),
  ).length;

  return (
    <article
      style={{
        background: 'var(--ibm-canvas)',
        border: '1px solid var(--ibm-hairline)',
      }}
    >
      <div
        style={{
          borderLeft: `4px solid ${sevColor}`,
          background: 'var(--ibm-surface-1)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            className="ibm-label"
            style={{ color: sevColor }}
          >
            {sev}
          </span>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>
            {finding.category}
          </span>
        </div>
        <h2 className="ibm-subhead" style={{ color: 'var(--ibm-ink)', margin: 0 }}>
          {finding.title}
        </h2>
        <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
          {finding.file}:{finding.lineStart}
          {finding.lineEnd !== finding.lineStart &&
            `\u2013${finding.lineEnd}`}
        </span>
      </div>

      {finding.description && (
        <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>
            Description
          </h3>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>
            {finding.description}
          </p>
        </section>
      )}

      {finding.codeSnippet && (
        <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>
            Code
          </h3>
          <pre
            style={{
              background: 'var(--ibm-surface-1)',
              border: '1px solid var(--ibm-hairline)',
              padding: 0,
              overflow: 'auto',
              maxHeight: 360,
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 13,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {codeLines.map((line, i) => {
              const lineNum = finding.lineStart + i;
              const affected =
                lineNum >= finding.lineStart && lineNum <= finding.lineEnd;
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    borderLeft: affected
                      ? '3px solid var(--ibm-semantic-error)'
                      : '3px solid transparent',
                    background: affected
                      ? 'var(--ibm-red-10)'
                      : 'transparent',
                  }}
                >
                  <span
                    style={{
                      width: `${lineNumWidth + 2}ch`,
                      textAlign: 'right',
                      paddingRight: 16,
                      color: 'var(--ibm-ink-subtle)',
                      userSelect: 'none',
                      flexShrink: 0,
                      display: 'inline-block',
                    }}
                  >
                    {lineNum}
                  </span>
                  <span style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre' }}>
                    {line}
                  </span>
                </div>
              );
            })}
          </pre>
        </section>
      )}

      {finding.aiExplanation && (
        <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-semantic-success)', marginBottom: 8 }}>
            AI Explanation
          </h3>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>
            {finding.aiExplanation}
          </p>
        </section>
      )}

      {finding.exploitationScenario && (
        <section
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--ibm-hairline)',
            borderLeft: '4px solid var(--ibm-semantic-error)',
            marginLeft: 0,
          }}
        >
          <h3 className="ibm-label" style={{ color: 'var(--ibm-semantic-error)', marginBottom: 8 }}>
            Proof of Concept
          </h3>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>
            {finding.exploitationScenario}
          </p>
        </section>
      )}

      {(finding.cwe.length > 0 || finding.owasp.length > 0) && (
        <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>
            References
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {finding.cwe.map((c) => {
              const id = c.replace(/^CWE-/, '');
              return (
                <a
                  key={c}
                  href={`https://cwe.mitre.org/data/definitions/${id}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'var(--ibm-surface-1)',
                    border: '1px solid var(--ibm-hairline)',
                    color: 'var(--ibm-primary)',
                    padding: '4px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.32px',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
                  }}
                >
                  {c}
                </a>
              );
            })}
            {finding.owasp.map((o) => (
              <a
                key={o}
                href="https://owasp.org/www-project-top-ten/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: 'var(--ibm-surface-1)',
                  border: '1px solid var(--ibm-hairline)',
                  color: 'var(--ibm-primary)',
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.32px',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
                }}
              >
                {o}
              </a>
            ))}
          </div>
        </section>
      )}

      {(finding.remediation || finding.aiFix) && (
        <section style={{ padding: '20px 24px', borderBottom: '1px solid var(--ibm-hairline)' }}>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-semantic-success)', marginBottom: 8 }}>
            Remediation
          </h3>
          {finding.remediation && (
            <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap', marginBottom: finding.aiFix ? 12 : 0 }}>
              {finding.remediation}
            </p>
          )}
          {finding.aiFix && (
            <pre
              style={{
                background: 'var(--ibm-surface-1)',
                border: '1px solid var(--ibm-hairline)',
                padding: 16,
                overflow: 'auto',
                maxHeight: 240,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                lineHeight: 1.5,
                color: 'var(--ibm-ink)',
                margin: 0,
              }}
            >
              {finding.aiFix}
            </pre>
          )}
        </section>
      )}

      <div
        style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          flexWrap: 'wrap',
        }}
      >
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
          Scanner: {finding.scanner}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
            Exploit Score
          </span>
          <div
            style={{
              width: 80,
              height: 6,
              background: 'var(--ibm-surface-2)',
              position: 'relative',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${finding.exploitScore * 10}%`,
                background:
                  finding.exploitScore >= 8
                    ? 'var(--ibm-semantic-error)'
                    : finding.exploitScore >= 5
                      ? 'var(--ibm-semantic-warning)'
                      : 'var(--ibm-semantic-success)',
              }}
            />
          </div>
          <span
            className="ibm-body-emphasis"
            style={{ color: 'var(--ibm-ink)' }}
          >
            {finding.exploitScore.toFixed(1)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
            Confidence
          </span>
          <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>
            {(finding.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
    </article>
  );
}