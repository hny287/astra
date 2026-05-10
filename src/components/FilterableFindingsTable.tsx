'use client';

import { useState, useMemo } from 'react';
import SeverityBadge from './SeverityBadge';
import AlertDetail from './AlertDetail';
import { useAiChat } from './AiChatProvider';

type AlertStatus = 'OPEN' | 'CONFIRMED' | 'FALSE_POSITIVE' | 'REMEDIATED' | 'ACCEPTED_RISK' | 'IN_PROGRESS';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OPEN: { color: 'var(--ibm-semantic-error)', label: 'Open' },
  CONFIRMED: { color: 'var(--ibm-semantic-warning)', label: 'Confirmed' },
  FALSE_POSITIVE: { color: 'var(--ibm-ink-subtle)', label: 'False Positive' },
  REMEDIATED: { color: 'var(--ibm-semantic-success)', label: 'Remediated' },
  ACCEPTED_RISK: { color: 'var(--ibm-primary)', label: 'Accept Risk' },
  IN_PROGRESS: { color: 'var(--ibm-blue-50)', label: 'In Progress' },
};

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
  exploitationScenario: string | null;
  exploitScore: number | null;
  cwe: string[];
  owasp: string[];
  remediation: string;
  description: string;
  status: AlertStatus;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string } | null;
  task?: { id: string; title: string; status: string; priority: string } | null;
}

interface FilterableFindingsTableProps {
  findings: Finding[];
  onRefresh?: () => void;
}

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
const CATEGORIES = ['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'] as const;
const STATUSES: { value: string; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'FALSE_POSITIVE', label: 'False Positive' },
  { value: 'REMEDIATED', label: 'Remediated' },
  { value: 'ACCEPTED_RISK', label: 'Accepted Risk' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
];

export default function FilterableFindingsTable({ findings, onRefresh }: FilterableFindingsTableProps) {
  const { openChat } = useAiChat();
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [scannerFilter, setScannerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assignFilter, setAssignFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<string>('severity');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pageSize = 25;

  const scanners = useMemo(() => [...new Set(findings.map(f => f.scanner))], [findings]);

  const assignees = useMemo(() => {
    const map = new Map<string, string>();
    findings.forEach(f => {
      if (f.assignedToId && f.assignedTo?.name) map.set(f.assignedToId, f.assignedTo.name);
      else if (f.assignedToId) map.set(f.assignedToId, f.assignedToId);
    });
    return Array.from(map.entries());
  }, [findings]);

  const filtered = useMemo(() => {
    let result = findings;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(f => f.title.toLowerCase().includes(s) || f.file.toLowerCase().includes(s) || (f.aiExplanation || '').toLowerCase().includes(s));
    }
    if (sevFilter !== 'ALL') result = result.filter(f => f.severity === sevFilter);
    if (catFilter !== 'ALL') result = result.filter(f => f.category === catFilter);
    if (scannerFilter !== 'ALL') result = result.filter(f => f.scanner === scannerFilter);
    if (statusFilter !== 'ALL') result = result.filter(f => f.status === statusFilter);
    if (assignFilter === 'unassigned') result = result.filter(f => !f.assignedToId);
    else if (assignFilter !== 'ALL') result = result.filter(f => f.assignedToId === assignFilter);

    const sevOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'severity') cmp = (sevOrder[a.severity] ?? 5) - (sevOrder[b.severity] ?? 5);
      else if (sortField === 'file') cmp = a.file.localeCompare(b.file);
      else if (sortField === 'category') cmp = a.category.localeCompare(b.category);
      else if (sortField === 'confidence') cmp = a.confidence - b.confidence;
      else if (sortField === 'line') cmp = a.lineStart - b.lineStart;
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else cmp = a.title.localeCompare(b.title);
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return result;
  }, [findings, search, sevFilter, catFilter, scannerFilter, statusFilter, assignFilter, sortField, sortDir]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const toggle = (key: string) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const arrow = (field: string) => sortField === field ? (sortDir === 'asc' ? ' \u2191' : ' \u2193') : '';

  const selectStyle: React.CSSProperties = {
    background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-primary)',
    padding: '8px 12px', fontSize: '14px', color: 'var(--ibm-ink)', cursor: 'pointer',
    fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px',
    appearance: 'none', WebkitAppearance: 'none',
  };

  if (findings.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No alerts.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <input
          type="text" placeholder="Search alerts..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
          style={{
            flex: '1 1 200px', background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)',
            borderBottom: '1px solid var(--ibm-hairline-strong)', padding: '8px 12px', fontSize: '14px',
            fontFamily: "'IBM Plex Sans', sans-serif", color: 'var(--ibm-ink)', outline: 'none', letterSpacing: '0.16px',
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottom = '1px solid var(--ibm-hairline-strong)'; }}
        />
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }} style={selectStyle}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sevFilter} onChange={e => { setSevFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="ALL">All severity</option>
          {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="ALL">All category</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
        </select>
        {scanners.length > 1 && (
          <select value={scannerFilter} onChange={e => { setScannerFilter(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="ALL">All scanner</option>
            {scanners.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
        {assignees.length > 0 && (
          <select value={assignFilter} onChange={e => { setAssignFilter(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="ALL">All assigned</option>
            <option value="unassigned">Unassigned</option>
            {assignees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        )}
        <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{filtered.length} alert{filtered.length !== 1 ? 's' : ''}</span>
        {onRefresh && (
          <button onClick={onRefresh} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '6px 12px', fontSize: '13px', fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px', cursor: 'pointer', color: 'var(--ibm-ink)', borderRadius: 0 }} title="Refresh">⟳</button>
        )}
      </div>

      <div style={{ border: '1px solid var(--ibm-hairline)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 90px 100px 1fr 60px 1fr 80px 80px 48px 70px 40px', padding: '10px 16px', background: 'var(--ibm-surface-1)', borderBottom: '1px solid var(--ibm-hairline)' }}>
          {[
            { field: 'severity', label: 'Sev' },
            { field: 'status', label: 'Status' },
            { field: 'id', label: 'ID' },
            { field: 'file', label: 'File' },
            { field: 'line', label: 'Line' },
            { field: 'title', label: 'Title' },
            { field: '', label: 'Scanner' },
            { field: 'category', label: 'Category' },
            { field: 'confidence', label: 'Conf' },
            { field: '', label: 'Task' },
            { field: '', label: '' },
          ].map(col => (
            <span
              key={col.field || col.label || col.label + '1'}
              onClick={() => col.field && toggleSort(col.field)}
              className="ibm-label"
              style={{ color: 'var(--ibm-ink-muted)', cursor: col.field ? 'pointer' : 'default', textAlign: col.field === 'confidence' ? 'right' : 'left' }}
            >
              {col.label}{col.field ? arrow(col.field) : ''}
            </span>
          ))}
        </div>

        {paged.map(f => {
          const key = f.fingerprint || (f.id + '-' + f.file + '-' + f.lineStart);
          const isOpen = expanded.has(key);
          const sCfg = STATUS_CONFIG[f.status] ?? STATUS_CONFIG.OPEN;
          return (
            <div key={key} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '80px 90px 100px 1fr 60px 1fr 80px 80px 48px 70px 40px', padding: '8px 16px', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => toggle(key)}
              >
                <SeverityBadge severity={f.severity} />
                <span style={{
                  borderLeft: `3px solid ${sCfg.color}`, paddingLeft: 8,
                  fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px',
                  color: sCfg.color, textTransform: 'uppercase', whiteSpace: 'nowrap',
                }}>
                  {sCfg.label}
                </span>
                <span className="ibm-caption" style={{ fontFamily: "'IBM Plex Mono', monospace", color: 'var(--ibm-ink-muted)', fontSize: 12 }} title={f.id}>{f.id.slice(0, 8)}…</span>
                <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file}</span>
                <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)' }}>{f.lineStart}</span>
                <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.title}</span>
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{f.scanner}</span>
                <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{f.category.replace('_', ' ')}</span>
                <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-muted)', textAlign: 'right' }}>{f.confidence != null ? `${(f.confidence * 100).toFixed(0)}%` : '\u2014'}</span>
                <span className="ibm-caption" style={{ color: f.task ? 'var(--ibm-primary)' : 'var(--ibm-ink-subtle)', fontSize: 11 }}>
                  {f.task ? f.task.status : '\u2014'}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); setSelectedId(f.id); }}
                  style={{ background: 'none', border: '1px solid var(--ibm-hairline)', cursor: 'pointer', color: 'var(--ibm-primary)', fontSize: '11px', padding: '2px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  title="Open alert detail"
                >
                  &#x2192;
                </button>
              </div>
              {isOpen && (
                <div style={{ padding: '0 16px 16px', background: 'var(--ibm-surface-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span className="ibm-label" style={{ color: 'var(--ibm-ink-muted)' }}>Assigned:</span>
                    <span className="ibm-body-sm" style={{ color: f.assignedToId ? 'var(--ibm-ink)' : 'var(--ibm-ink-subtle)' }}>
                      {f.assignedTo?.name ?? (f.assignedToId ?? 'Unassigned')}
                    </span>
                    <button
                      onClick={() => openChat({ findingId: f.id, findingTitle: f.title })}
                      style={{ marginLeft: 'auto', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer', color: 'var(--ibm-primary)', letterSpacing: '0.16px' }}
                    >
                      AI Assist
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 4 }}>
                    {f.description && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Description</p>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{f.description}</p>
                      </div>
                    )}
                    {f.aiExplanation && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI explanation</p>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{f.aiExplanation}</p>
                      </div>
                    )}
                    {f.aiFix && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>AI fix</p>
                        <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>{f.aiFix}</pre>
                      </div>
                    )}
                    {f.exploitationScenario && (
                      <div style={{ borderLeft: '3px solid var(--ibm-semantic-error)', paddingLeft: 12 }}>
                        <p className="ibm-label" style={{ color: 'var(--ibm-semantic-error)', marginBottom: 4 }}>Proof of Concept</p>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{f.exploitationScenario}</p>
                      </div>
                    )}
                    {f.remediation && (
                      <div style={{ borderLeft: '3px solid var(--ibm-semantic-success)', paddingLeft: 12 }}>
                        <p className="ibm-label" style={{ color: 'var(--ibm-semantic-success)', marginBottom: 4 }}>Remediation</p>
                        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{f.remediation}</p>
                      </div>
                    )}
                    {(f.cwe.length > 0 || f.owasp.length > 0) && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>References</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {f.cwe.map(c => (
                            <a key={c} href={`https://cwe.mitre.org/data/definitions/${c.replace('CWE-', '')}.html`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                              {c}
                            </a>
                          ))}
                          {f.owasp.map(o => (
                            <a key={o} href={`https://owasp.org/www-project-top-ten/${o}`} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', color: 'var(--ibm-primary)', padding: '2px 8px', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", textDecoration: 'none', letterSpacing: '0.16px' }}>
                              {o}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {f.exploitScore != null && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Exploit Score</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)' }}>
                            <div style={{ width: `${Math.min(f.exploitScore / 10, 1) * 100}%`, height: '100%', background: f.exploitScore >= 8 ? 'var(--ibm-semantic-error)' : f.exploitScore >= 5 ? 'var(--ibm-semantic-warning)' : 'var(--ibm-semantic-success)' }} />
                          </div>
                          <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", minWidth: 28 }}>{f.exploitScore.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                    {f.codeSnippet && (
                      <div>
                        <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Code snippet</p>
                        <pre style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 240, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>{f.codeSnippet}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--ibm-hairline)' }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '8px 16px', fontSize: '14px', color: page === 0 ? 'var(--ibm-ink-subtle)' : 'var(--ibm-ink)', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
          >Previous</button>
          <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '8px 16px', fontSize: '14px', color: page >= totalPages - 1 ? 'var(--ibm-ink-subtle)' : 'var(--ibm-ink)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}
          >Next</button>
        </div>
      )}

      {selectedId && (
        <AlertDetail findingId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}