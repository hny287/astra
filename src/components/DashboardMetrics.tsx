'use client';

interface DashboardMetricsProps {
  findings: { severity: string; category: string; scanner: string; file: string; confidence: number }[];
  totalTokens?: { input: number; output: number; thinking: number };
  durationSeconds?: number | null;
}

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-red-50)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
  INFO: 'var(--ibm-primary)',
};

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function DashboardMetrics({ findings, totalTokens, durationSeconds }: DashboardMetricsProps) {
  const severityCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const fileSet = new Set<string>();

  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
    fileSet.add(f.file);
  }

  const criticalHigh = (severityCounts['CRITICAL'] || 0) + (severityCounts['HIGH'] || 0);
  const maxSevCount = Math.max(...Object.values(severityCounts), 1);

  const metrics = [
    { label: 'Total findings', value: String(findings.length), accent: false },
    { label: 'Critical + High', value: String(criticalHigh), accent: criticalHigh > 0 },
    { label: 'Files affected', value: String(fileSet.size), accent: false },
    ...(durationSeconds != null ? [{ label: 'Duration', value: durationSeconds < 60 ? `${durationSeconds}s` : `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`, accent: false }] : []),
    ...(totalTokens ? [{ label: 'Tokens', value: formatNum(totalTokens.input + totalTokens.output + (totalTokens.thinking || 0)), accent: false }] : []),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
        {metrics.map(m => (
          <div key={m.label} style={{ padding: 24, background: 'var(--ibm-canvas)', border: m.accent ? '2px solid var(--ibm-semantic-error)' : '1px solid var(--ibm-hairline)' }}>
            <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 8 }}>{m.label}</p>
            <p style={{ fontSize: 40, fontWeight: 300, lineHeight: 1.1, color: m.accent ? 'var(--ibm-semantic-error)' : 'var(--ibm-ink)' }}>{m.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, minHeight: 200 }}>
        <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
          <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Severity distribution</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {SEVERITY_ORDER.map(sev => {
              const count = severityCounts[sev] || 0;
              const pct = maxSevCount > 0 ? (count / maxSevCount) * 100 : 0;
              return (
                <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 80, fontSize: 12, fontWeight: 600, letterSpacing: '0.32px', color: SEVERITY_COLORS[sev] }}>{sev}</span>
                  <div style={{ flex: 1, height: 24, background: 'var(--ibm-surface-1)', position: 'relative' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: SEVERITY_COLORS[sev], transition: 'width 0.4s ease', minWidth: count > 0 ? 2 : 0 }} />
                    {count > 0 && pct < 15 && (
                      <span className="ibm-caption tabular-nums" style={{ position: 'absolute', left: `${pct + 2}%`, top: '50%', transform: 'translateY(-50%)', color: 'var(--ibm-ink)' }}>{count}</span>
                    )}
                  </div>
                  {pct >= 15 && (
                    <span className="ibm-caption tabular-nums" style={{ color: count > 0 ? '#ffffff' : 'var(--ibm-ink)', position: 'absolute', marginLeft: `${pct - 10}%`, pointerEvents: 'none' }}>{count}</span>
                  )}
                  {pct >= 15 ? null : <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', width: 32, textAlign: 'right' }}>{count}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
          <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Category distribution</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(categoryCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} style={{ padding: '12px 16px', background: 'var(--ibm-surface-1)', borderLeft: '3px solid var(--ibm-primary)', minWidth: 120 }}>
                  <p style={{ fontSize: 28, fontWeight: 300, lineHeight: 1.2, color: 'var(--ibm-ink)' }}>{count}</p>
                  <p className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginTop: 4 }}>{cat.replace('_', ' ')}</p>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}