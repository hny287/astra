'use client';

import { useState } from 'react';

interface FileExplorerProps {
  findings: { file: string; severity: string; title: string; lineStart: number }[];
}

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-red-50)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
  INFO: 'var(--ibm-primary)',
};

function buildTree(findings: FileExplorerProps['findings']) {
  const tree: Record<string, { files: Record<string, typeof findings>; dirs: Record<string, { files: Record<string, typeof findings>; dirs: Record<string, unknown> }> }> = {};

  for (const f of findings) {
    const parts = f.file.split('/');
    const fileName = parts.pop()!;
    let current: any = tree;
    for (const part of parts) {
      if (!current[part]) current[part] = { files: {}, dirs: {} };
      current = current[part].dirs;
    }
    if (!current[''].files) current[''].files = {};
    if (!current[''].files[fileName]) current[''].files[fileName] = [];
    current[''].files[fileName].push(f);
  }
  return tree;
}

export default function FileExplorer({ findings }: FileExplorerProps) {
  const fileMap: Record<string, { count: number; severities: Record<string, number>; title: string; line: number }> = {};

  for (const f of findings) {
    if (!fileMap[f.file]) {
      fileMap[f.file] = { count: 0, severities: {}, title: f.title, line: f.lineStart };
    }
    fileMap[f.file].count++;
    fileMap[f.file].severities[f.severity] = (fileMap[f.file].severities[f.severity] || 0) + 1;
  }

  const sortedFiles = Object.entries(fileMap).sort(([, a], [, b]) => b.count - a.count);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');

  const filtered = filter
    ? sortedFiles.filter(([f]) => f.toLowerCase().includes(filter.toLowerCase()))
    : sortedFiles;

  const toggle = (file: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  if (findings.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No files with findings.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ padding: '12px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input
          type="text"
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            flex: 1, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)',
            borderBottom: '1px solid var(--ibm-hairline-strong)', padding: '8px 12px',
            fontSize: '14px', fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)',
            outline: 'none', letterSpacing: '0.16px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
        />
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>
          {filtered.length} file{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filtered.map(([file, info]) => {
          const isOpen = expanded.has(file);
          const fileFindings = findings.filter(f => f.file === file);
          const worstSev = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].find(s => info.severities[s]) || 'INFO';

          return (
            <div key={file} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
              <div
                style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => toggle(file)}
              >
                <span style={{ color: 'var(--ibm-ink-subtle)', fontSize: 10 }}>{isOpen ? '\u25BC' : '\u25B6'}</span>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEVERITY_DOT[worstSev], flexShrink: 0 }} />
                <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</span>
                <span style={{
                  display: 'inline-flex', fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px',
                  padding: '2px 8px', borderLeft: `3px solid ${SEVERITY_DOT[worstSev]}`, color: SEVERITY_DOT[worstSev],
                }}>{info.count}</span>
              </div>
              {isOpen && (
                <div style={{ background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
                  {fileFindings.map((f, i) => (
                    <div key={i} style={{ padding: '8px 16px 8px 40px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: i < fileFindings.length - 1 ? '1px solid var(--ibm-hairline)' : 'none' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: SEVERITY_DOT[f.severity], flexShrink: 0 }} />
                      <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                      <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-subtle)' }}>L{f.lineStart}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}