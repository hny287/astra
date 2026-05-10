'use client';

import { useState } from 'react';
import SeverityBadge from './SeverityBadge';

interface Finding {
  id: string;
  fingerprint?: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  file: string;
  lineStart: number;
  lineEnd: number;
  title: string;
  scanner: string;
  category: string;
  confidence: number;
  aiExplanation: string | null;
  aiFix: string | null;
  codeSnippet: string;
}

interface FindingsTableProps {
  findings: Finding[];
  onRefresh?: () => void;
}

export default function FindingsTable({ findings, onRefresh }: FindingsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (findings.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No findings.</p>;
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={{ border: '1px solid var(--ibm-hairline)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px 1fr 80px 80px 48px 40px', padding: '12px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', alignItems: 'center' }}>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Sev</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>File</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Line</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Title</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Scanner</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Category</span>
        <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', textAlign: 'right' }}>Conf</span>
        {onRefresh ? (
          <button onClick={onRefresh} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '4px 8px', fontSize: '13px', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', cursor: 'pointer', color: 'var(--ibm-ink)', borderRadius: 0, lineHeight: 1 }} title="Refresh">⟳</button>
        ) : <span />}
      </div>
      {findings.map((f) => {
        const key = f.fingerprint || (f.id + '-' + f.file + '-' + f.lineStart);
        const isOpen = expanded.has(key);
        return (
          <div
            key={key}
            style={{ borderBottom: '1px solid var(--ibm-hairline)', cursor: 'pointer' }}
            onClick={() => toggle(key)}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 60px 1fr 80px 80px 48px', padding: '10px 16px', alignItems: 'center' }}>
              <SeverityBadge severity={f.severity} />
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file}</span>
              <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)' }}>
                {f.lineStart}{f.lineEnd !== f.lineStart ? `-${f.lineEnd}` : ''}
              </span>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{f.scanner}</span>
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{f.category}</span>
              <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)', textAlign: 'right' }}>
                {f.confidence != null ? `${(f.confidence * 100).toFixed(0)}%` : '\u2014'}
              </span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 16px 16px', background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
                  {f.aiExplanation && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI explanation</p>
                      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{f.aiExplanation}</p>
                    </div>
                  )}
                  {f.aiFix && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI fix</p>
                      <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>
                        {f.aiFix}
                      </pre>
                    </div>
                  )}
                  {f.codeSnippet && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Code snippet</p>
                      <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>
                        {f.codeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}