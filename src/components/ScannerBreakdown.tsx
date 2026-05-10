'use client';

import SeverityBadge from './SeverityBadge';

interface Finding {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  scanner: string;
  category: string;
}

interface ScannerBreakdownProps {
  findings: Finding[];
}

const SEVERITY_ORDER: Array<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'> = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function ScannerBreakdown({ findings }: ScannerBreakdownProps) {
  const severityCounts: Record<string, number> = {};
  const scannerCounts: Record<string, number> = {};

  for (const f of findings) {
    severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
    scannerCounts[f.scanner] = (scannerCounts[f.scanner] || 0) + 1;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div>
        <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 12 }}>By severity</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          <div style={{ padding: 16, textAlign: 'center', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
            <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.2, color: 'var(--ibm-primary)' }}>
              {findings.length}
            </div>
            <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)', marginTop: 4 }}>Total</div>
          </div>
          {SEVERITY_ORDER.map((sev) => (
            <div key={sev} style={{ padding: 16, textAlign: 'center', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
              <SeverityBadge severity={sev} />
              <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.2, color: 'var(--ibm-ink)', marginTop: 8 }}>
                {severityCounts[sev] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {Object.keys(scannerCounts).length > 0 && (
        <div>
          <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 12 }}>By scanner</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {Object.entries(scannerCounts).map(([scanner, count]) => (
              <div key={scanner} style={{ padding: 16, textAlign: 'center', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
                <div className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{scanner}</div>
                <div style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.2, color: 'var(--ibm-ink)', marginTop: 4 }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}