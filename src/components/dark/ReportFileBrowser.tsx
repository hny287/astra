'use client';

import { useState, useMemo } from 'react';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const SEVERITY_DOT: Record<Severity, string> = {
  CRITICAL: 'var(--ibm-semantic-error)',
  HIGH: 'var(--ibm-red-50)',
  MEDIUM: 'var(--ibm-semantic-warning)',
  LOW: 'var(--ibm-semantic-success)',
  INFO: 'var(--ibm-primary)',
};

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

interface FileFinding {
  file: string;
  severity: string;
  title: string;
  lineStart: number;
}

interface ReportFileBrowserProps {
  findings: FileFinding[];
}

export default function ReportFileBrowser({ findings }: ReportFileBrowserProps) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { findings: FileFinding[]; topSev: Severity }
    >();

    for (const f of findings) {
      const existing = map.get(f.file);
      if (existing) {
        existing.findings.push(f);
        if (
          (SEVERITY_RANK[f.severity] ?? 4) <
          (SEVERITY_RANK[existing.topSev] ?? 4)
        ) {
          existing.topSev = (f.severity as Severity) ?? 'INFO';
        }
      } else {
        map.set(f.file, {
          findings: [f],
          topSev: (SEVERITY_RANK[f.severity] !== undefined
            ? f.severity
            : 'INFO') as Severity,
        });
      }
    }

    return Array.from(map.entries())
      .map(([file, data]) => ({
        file,
        ...data,
        count: data.findings.length,
      }))
      .sort((a, b) => b.count - a.count);
  }, [findings]);

  const filtered = search
    ? grouped.filter((g) =>
        g.file.toLowerCase().includes(search.toLowerCase()),
      )
    : grouped;

  const toggle = (file: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  };

  return (
    <section
      style={{
        background: 'var(--ibm-canvas)',
        borderBottom: '1px solid var(--ibm-hairline)',
      }}
    >
      <div style={{ padding: '24px 32px 0' }}>
        <h2 className="ibm-subhead" style={{ color: 'var(--ibm-ink)', marginBottom: 16 }}>
          Files
        </h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter files\u2026"
          style={{
            width: '100%',
            background: 'var(--ibm-surface-1)',
            border: '1px solid var(--ibm-hairline)',
            color: 'var(--ibm-ink)',
            padding: '8px 12px',
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '0.16px',
            lineHeight: 1.29,
            outline: 'none',
            marginBottom: 16,
          }}
        />
      </div>

      <div>
        {filtered.length === 0 && (
          <p
            className="ibm-body-sm"
            style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 32px' }}
          >
            No files match.
          </p>
        )}
        {filtered.map((group) => {
          const isOpen = expanded.has(group.file);
          return (
            <div
              key={group.file}
              style={{ borderBottom: '1px solid var(--ibm-hairline)' }}
            >
              <button
                onClick={() => toggle(group.file)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 32px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  color: 'var(--ibm-ink)',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: SEVERITY_DOT[group.topSev] ?? 'var(--ibm-ink-subtle)',
                    flexShrink: 0,
                  }}
                />
                <span
                  className="ibm-body-sm"
                  style={{
                    color: 'var(--ibm-ink)',
                    flex: 1,
                    textAlign: 'left',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {group.file}
                </span>
                <span
                  style={{
                    background: 'var(--ibm-surface-2)',
                    color: 'var(--ibm-ink)',
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.32px',
                    padding: '2px 8px',
                    flexShrink: 0,
                  }}
                >
                  {group.count}
                </span>
                <span
                  style={{
                    color: 'var(--ibm-ink-subtle)',
                    fontSize: 10,
                    flexShrink: 0,
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s',
                  }}
                >
                  &#9654;
                </span>
              </button>

              {isOpen && (
                <div style={{ padding: '0 32px 12px 52px' }}>
                  {group.findings
                    .sort(
                      (a, b) =>
                        (SEVERITY_RANK[a.severity] ?? 4) -
                        (SEVERITY_RANK[b.severity] ?? 4),
                    )
                    .map((f, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '6px 0',
                          borderTop:
                            i === 0
                              ? '1px solid var(--ibm-hairline)'
                              : '1px solid transparent',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              SEVERITY_DOT[(f.severity as Severity) ?? 'INFO'] ??
                              'var(--ibm-ink-subtle)',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="ibm-body-sm"
                          style={{
                            color: 'var(--ibm-ink-muted)',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {f.title}
                        </span>
                        <span
                          className="ibm-caption"
                          style={{ color: 'var(--ibm-ink-subtle)', flexShrink: 0 }}
                        >
                          :{f.lineStart}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}