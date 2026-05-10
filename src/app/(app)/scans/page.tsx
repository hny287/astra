'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import RepoInput from '@/components/RepoInput';
import SeverityBadge from '@/components/SeverityBadge';

interface Scan {
  id: string;
  repoUrl: string;
  branch: string;
  status: string;
  createdAt: string;
  findings: { id: string; severity: string }[];
}

const STATUS_COLORS: Record<string, { dot: string; text: string }> = {
  PENDING: { dot: 'var(--ibm-semantic-warning)', text: 'var(--ibm-semantic-warning)' },
  RUNNING: { dot: 'var(--ibm-primary)', text: 'var(--ibm-primary)' },
  COMPLETED: { dot: 'var(--ibm-semantic-success)', text: 'var(--ibm-semantic-success)' },
  FAILED: { dot: 'var(--ibm-semantic-error)', text: 'var(--ibm-semantic-error)' },
};

export default function ScansPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/scans?limit=10')
      .then((r) => r.json())
      .then((data) => setScans(data.scans ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 48 }}>
        <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>
          Security Scanner
        </h1>
        <p className="ibm-body-lg" style={{ color: 'var(--ibm-ink-muted)', maxWidth: 600 }}>
          AI-native analysis of your codebase. Initiate a scan to identify vulnerabilities, misconfigurations, and business logic flaws.
        </p>
      </div>

      <div style={{ marginBottom: 48, padding: 24, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)' }}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>New scan</p>
        <RepoInput />
      </div>

      <div>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 16 }}>Recent scans</p>
        {loading ? (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading...</p>
        ) : scans.length === 0 ? (
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No scans yet. Start one above.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: 16 }}>
            {scans.map((scan) => {
              const severityCounts: Record<string, number> = {};
              for (const f of scan.findings ?? []) {
                severityCounts[f.severity] = (severityCounts[f.severity] || 0) + 1;
              }
              const sc = STATUS_COLORS[scan.status] ?? STATUS_COLORS.PENDING;

              return (
                <Link key={scan.id} href={`/scans/${scan.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      padding: 24,
                      background: 'var(--ibm-canvas)',
                      border: '1px solid var(--ibm-hairline)',
                      borderLeft: `3px solid ${sc.dot}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--ibm-canvas)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {scan.repoUrl.replace('https://github.com/', '')}
                        </p>
                        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 4 }}>
                          {scan.branch} &middot; {new Date(scan.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16, flexShrink: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc.dot, display: 'inline-block' }} />
                        <span className="ibm-caption" style={{ color: sc.text, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
                          {scan.status}
                        </span>
                      </div>
                    </div>
                    {scan.findings && scan.findings.length > 0 && (
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--ibm-hairline)', paddingTop: 12 }}>
                        {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const)
                          .filter((s) => severityCounts[s])
                          .map((s) => (
                            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <SeverityBadge severity={s} />
                              <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)' }}>{severityCounts[s]}</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}