'use client';

import { useMemo } from 'react';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_COLOR: Record<Severity, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-red-50)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
  INFO: 'var(--ibm-primary)',
};

const SEVERITY_ORDER: Severity[] = [
  'CRITICAL',
  'HIGH',
  'MEDIUM',
  'LOW',
  'INFO',
];

interface Finding {
  severity: string;
  category: string;
  exploitScore: number;
  file: string;
  confidence: number;
}

interface ExecutiveSummaryProps {
  findings: Finding[];
  totalTokens?: { input: number; output: number };
  durationSeconds?: number | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function ExecutiveSummary({
  findings,
  totalTokens,
  durationSeconds,
}: ExecutiveSummaryProps) {
  const { severityCounts, categoryCounts, criticalHigh, filesAffected } =
    useMemo(() => {
      const severityCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      const files = new Set<string>();
      let criticalHigh = 0;

      for (const f of findings) {
        const sev = (SEVERITY_ORDER.includes(f.severity as Severity)
          ? f.severity
          : 'INFO') as Severity;
        severityCounts[sev] = (severityCounts[sev] || 0) + 1;
        if (sev === 'CRITICAL' || sev === 'HIGH') criticalHigh++;
        categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
        files.add(f.file);
      }
      return { severityCounts, categoryCounts, criticalHigh, filesAffected: files.size };
    }, [findings]);

  const maxSeverityCount = Math.max(
    1,
    ...SEVERITY_ORDER.map((s) => severityCounts[s] || 0),
  );

  const categories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <section
      style={{
        background: 'var(--ibm-canvas)',
        padding: 32,
        borderBottom: '1px solid var(--ibm-hairline)',
        border: '1px solid var(--ibm-hairline)',
      }}
    >
      <h2
        className="ibm-subhead"
        style={{ color: 'var(--ibm-ink)', marginBottom: 24 }}
      >
        Executive Summary
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 32,
        }}
      >
        <StatCard label="Total Findings" value={findings.length} accentColor="var(--ibm-semantic-success)" />
        <StatCard
          label="Critical + High"
          value={criticalHigh}
          accentColor={criticalHigh > 0 ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)'}
        />
        <StatCard label="Files Affected" value={filesAffected} accentColor="var(--ibm-primary)" />
        {durationSeconds != null && (
          <StatCard
            label="Duration"
            value={formatDuration(durationSeconds)}
            accentColor="var(--ibm-ink-muted)"
          />
        )}
        {totalTokens && (
          <StatCard
            label="Tokens"
            value={`${formatTokens(totalTokens.input)} / ${formatTokens(totalTokens.output)}`}
            accentColor="var(--ibm-ink-muted)"
          />
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
        }}
      >
        <div>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>
            Severity Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SEVERITY_ORDER.map((sev) => {
              const count = severityCounts[sev] || 0;
              const pct = (count / maxSeverityCount) * 100;
              return (
                <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span
                    className="ibm-label"
                    style={{ color: SEVERITY_COLOR[sev], width: 72, flexShrink: 0 }}
                  >
                    {sev}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 20,
                      background: 'var(--ibm-surface-1)',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: SEVERITY_COLOR[sev],
                        minWidth: count > 0 ? 2 : 0,
                      }}
                    />
                  </div>
                  <span
                    className="ibm-body-emphasis"
                    style={{
                      color: 'var(--ibm-ink)',
                      width: 32,
                      textAlign: 'right',
                      flexShrink: 0,
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>
            Category Distribution
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: 8,
            }}
          >
            {categories.map(([cat, count]) => (
              <div
                key={cat}
                style={{
                  background: 'var(--ibm-surface-1)',
                  border: '1px solid var(--ibm-hairline)',
                  padding: '12px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>
                  {cat.replace('_', ' ')}
                </span>
                <span
                  className="ibm-subhead"
                  style={{ color: 'var(--ibm-semantic-success)' }}
                >
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: number | string;
  accentColor: string;
}) {
  return (
    <div
      style={{
        background: 'var(--ibm-surface-1)',
        borderLeft: `3px solid ${accentColor}`,
        padding: '16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>
        {label}
      </span>
      <span
        className="ibm-headline"
        style={{ color: 'var(--ibm-ink)' }}
      >
        {value}
      </span>
    </div>
  );
}