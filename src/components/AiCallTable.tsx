'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AiCallSummary {
  id: string;
  scanId: string | null;
  jobId: string | null;
  findingId: string | null;
  userId: string | null;
  source: string;
  node: string | null;
  provider: string;
  model: string;
  endpoint: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  latencyMs: number;
  status: string;
  createdAt: string;
}

interface AiCallDetail extends AiCallSummary {
  sdk: string | null;
  sdkVersion: string | null;
  rawRequest: unknown;
  rawResponse: unknown;
  systemPrompt: string | null;
  userPrompt: string | null;
  response: string | null;
  temperature: number | null;
  thinkingDepth: string | null;
  thinkingBudget: number | null;
  topP: number | null;
  topK: number | null;
  maxOutputTokens: number | null;
  nodeConfig: unknown;
  error: string | null;
}

type SortField = 'id' | 'createdAt' | 'provider' | 'model' | 'inputTokens' | 'outputTokens' | 'thinkingTokens' | 'latencyMs' | 'status';
type SortDir = 'asc' | 'desc';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  SUCCESS: { bg: 'var(--ibm-green-10)', color: 'var(--ibm-green-50)' },
  ERROR: { bg: 'var(--ibm-red-10)', color: 'var(--ibm-red-60)' },
  TIMEOUT: { bg: 'var(--ibm-yellow-10)', color: 'var(--ibm-yellow-20)' },
  RATE_LIMITED: { bg: 'var(--ibm-yellow-10)', color: 'var(--ibm-yellow-20)' },
  CANCELLED: { bg: 'var(--ibm-surface-1)', color: 'var(--ibm-ink-subtle)' },
};

const PAGE_SIZES = [25, 50, 100];

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour12: false });
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return ms + 'ms';
}

function CodeBlock({ content }: { content: string | null }) {
  if (!content) return <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>—</span>;
  return (
    <pre
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        lineHeight: 1.5,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--ibm-ink)',
      }}
    >
      {content}
    </pre>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  if (data === null || data === undefined) return <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>—</span>;
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return (
    <pre
      style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        lineHeight: 1.5,
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--ibm-ink)',
      }}
    >
      {text}
    </pre>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
      <span
        className="ibm-caption"
        style={{
          color: 'var(--ibm-ink-subtle)',
          flexShrink: 0,
          width: 140,
          textTransform: 'uppercase',
          letterSpacing: '0.32px',
          fontWeight: 600,
        }}
      >
        {label}
      </span>
      <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', minWidth: 0, overflowWrap: 'break-word' }}>
        {value}
      </span>
    </div>
  );
}

export default function AiCallTable({ scanId }: { scanId?: string }) {
  const [items, setItems] = useState<AiCallSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AiCallDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<{ text: string; inputTokens: number; outputTokens: number; durationMs: number } | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [providers, setProviders] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String(page * pageSize));
    if (search) params.set('search', search);
    if (provider) params.set('provider', provider);
    if (model) params.set('model', model);
    if (status) params.set('status', status);
    if (source) params.set('source', source);
    if (scanId) params.set('scanId', scanId);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    return `/api/v1/ai-calls?${params.toString()}`;
  }, [page, pageSize, search, provider, model, status, source, scanId, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    fetch(buildUrl())
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [buildUrl, refreshKey]);

  const refreshData = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    fetch('/api/v1/ai-calls/stats')
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.byProvider?.map((p: { provider: string }) => p.provider) ?? []);
        setModels(data.byModel?.map((m: { model: string }) => m.model) ?? []);
        setSources([...new Set((data.items ?? []).map((i: AiCallSummary) => i.source).filter(Boolean))] as string[]);
      })
      .catch(() => {});
  }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      setRetryResult(null);
      setRetryError(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    setDetail(null);
    setRetryResult(null);
    setRetryError(null);
    try {
      const res = await fetch(`/api/v1/ai-calls/${id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!expandedId) return;
    setRetrying(true);
    setRetryResult(null);
    setRetryError(null);
    try {
      const res = await fetch(`/api/v1/ai-calls/${expandedId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRetryError(data.error || 'Retry failed');
      } else {
        setRetryResult(data.response);
      }
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Retry failed');
    } finally {
      setRetrying(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedItems = [...items].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    let cmp = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') cmp = aVal.localeCompare(bVal);
    else cmp = (aVal as number) - (bVal as number);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const resetFilters = () => {
    setSearch('');
    setProvider('');
    setModel('');
    setStatus('');
    setSource('');
    setDateFrom('');
    setDateTo('');
    setPage(0);
  };

  const hasNext = (page + 1) * pageSize < total;
  const showing = total === 0 ? '0-0' : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, total)}`;

  const selectStyle: React.CSSProperties = {
    height: 32,
    padding: '4px 8px',
    fontSize: 14,
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    border: '1px solid var(--ibm-hairline)',
    background: 'var(--ibm-surface-1)',
    color: 'var(--ibm-ink)',
    cursor: 'pointer',
    borderRadius: 0,
  };

  const inputStyle: React.CSSProperties = {
    height: 32,
    padding: '4px 12px',
    fontSize: 14,
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    border: '1px solid var(--ibm-hairline)',
    background: 'var(--ibm-surface-1)',
    color: 'var(--ibm-ink)',
    borderRadius: 0,
  };

  const thBase: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.32px',
    textTransform: 'uppercase' as const,
    color: 'var(--ibm-ink-muted)',
    borderBottom: '1px solid var(--ibm-hairline)',
    background: 'var(--ibm-surface-1)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none' as const,
  };

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          padding: 16,
          background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)',
          marginBottom: 0,
        }}
      >
        <input
          type="text"
          placeholder="Search prompts..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ ...inputStyle, minWidth: 180 }}
        />
        <select value={provider} onChange={(e) => { setProvider(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">All providers</option>
          {providers.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={model} onChange={(e) => { setModel(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">All models</option>
          {models.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">All statuses</option>
          {['SUCCESS', 'ERROR', 'TIMEOUT', 'RATE_LIMITED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} style={selectStyle}>
          <option value="">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          style={inputStyle}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          style={inputStyle}
        />
        <button
          onClick={resetFilters}
          style={{
            height: 32,
            padding: '4px 16px',
            fontSize: 14,
            fontFamily: "'IBM Plex Sans', sans-serif",
            letterSpacing: '0.16px',
            border: '1px solid var(--ibm-hairline)',
            background: 'var(--ibm-canvas)',
            color: 'var(--ibm-ink-muted)',
            cursor: 'pointer',
            borderRadius: 0,
          }}
        >
          Reset
        </button>
        <button
          onClick={refreshData}
          style={{
            height: 32,
            padding: '4px 12px',
            fontSize: 14,
            fontFamily: "'IBM Plex Sans', sans-serif",
            letterSpacing: '0.16px',
            border: '1px solid var(--ibm-hairline)',
            background: 'var(--ibm-canvas)',
            color: 'var(--ibm-ink)',
            cursor: 'pointer',
            borderRadius: 0,
          }}
          title="Refresh"
        >
          ⟳
        </button>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--ibm-hairline)', borderTop: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, letterSpacing: '0.16px' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, width: 32, cursor: 'default' }} />
              <th style={{ ...thBase, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }} onClick={() => handleSort('id')}>
                Call ID{sortIndicator('id')}
              </th>
              <th style={thBase} onClick={() => handleSort('createdAt')}>
                Timestamp{sortIndicator('createdAt')}
              </th>
              <th style={thBase} onClick={() => handleSort('provider')}>
                Provider{sortIndicator('provider')}
              </th>
              <th style={thBase} onClick={() => handleSort('model')}>
                Model{sortIndicator('model')}
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('inputTokens')}>
                In Tokens{sortIndicator('inputTokens')}
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('outputTokens')}>
                Out Tokens{sortIndicator('outputTokens')}
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('thinkingTokens')}>
                Think Tokens{sortIndicator('thinkingTokens')}
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => handleSort('latencyMs')}>
                Latency{sortIndicator('latencyMs')}
              </th>
              <th style={thBase} onClick={() => handleSort('status')}>
                Status{sortIndicator('status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--ibm-ink-subtle)' }}>
                  Loading...
                </td>
              </tr>
            ) : sortedItems.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: 'var(--ibm-ink-subtle)' }}>
                  No AI calls found.
                </td>
              </tr>
            ) : (
              sortedItems.map((item) => {
                const isExpanded = expandedId === item.id;
                const ss = STATUS_STYLES[item.status] ?? STATUS_STYLES.CANCELLED;
                const cs: React.CSSProperties = { padding: '10px 16px', borderBottom: '1px solid var(--ibm-hairline)' };
                return (
                  <React.Fragment key={item.id}>
                    <tr style={{ background: isExpanded ? 'var(--ibm-surface-1)' : 'var(--ibm-canvas)', cursor: 'pointer' }} onClick={() => toggleExpand(item.id)}>
                      <td style={{ ...cs, width: 32 }}><span style={{ color: 'var(--ibm-primary)', fontSize: 10, display: 'inline-block', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span></td>
                      <td style={{ ...cs, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'var(--ibm-ink-muted)' }} title={item.id}>{item.id.slice(0, 8)}...</td>
                      <td style={cs}><span style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13, letterSpacing: '0.16px', color: 'var(--ibm-ink)' }}>{formatTimestamp(item.createdAt)}</span></td>
                      <td style={cs}><span style={{ display: 'inline-block', padding: '2px 8px', background: 'var(--ibm-surface-2)', fontSize: 12, fontWeight: 600, letterSpacing: '0.32px', color: 'var(--ibm-ink-muted)' }}>{item.provider}</span></td>
                      <td style={cs}><span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: 'var(--ibm-ink)' }}>{item.model}</span></td>
                      <td style={{ ...cs, textAlign: 'right' }}><span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ibm-ink)' }}>{item.inputTokens.toLocaleString()}</span></td>
                      <td style={{ ...cs, textAlign: 'right' }}><span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ibm-ink)' }}>{item.outputTokens.toLocaleString()}</span></td>
                      <td style={{ ...cs, textAlign: 'right' }}><span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--ibm-ink)' }}>{item.thinkingTokens.toLocaleString()}</span></td>
                      <td style={{ ...cs, textAlign: 'right', whiteSpace: 'nowrap' }}><span style={{ fontSize: 13, color: 'var(--ibm-ink)' }}>{formatLatency(item.latencyMs)}</span></td>
                      <td style={cs}><span style={{ display: 'inline-block', padding: '2px 8px', background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', border: `1px solid ${ss.color}` }}>{item.status}</span></td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} style={{ padding: 0, borderBottom: '1px solid var(--ibm-hairline)' }}>
                          {detailLoading ? (
                            <div style={{ padding: 24, color: 'var(--ibm-ink-subtle)' }}>Loading detail...</div>
                          ) : detail ? (
                            <div style={{ padding: 24 }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginBottom: 24 }}>
                                <MetaRow label="Call ID" value={detail.id} />
                                <MetaRow label="Source" value={detail.source || '—'} />
                                <MetaRow label="Endpoint" value={detail.endpoint || '—'} />
                                <MetaRow label="Scan" value={detail.scanId ? <Link href={`/scans/${detail.scanId}`} style={{ color: 'var(--ibm-primary)' }}>{detail.scanId}</Link> : '—'} />
                                <MetaRow label="Job ID" value={detail.jobId || '—'} />
                                <MetaRow label="Finding" value={detail.findingId ? <Link href={`/scans/${detail.scanId || ''}`} style={{ color: 'var(--ibm-primary)' }}>{detail.findingId}</Link> : '—'} />
                                <MetaRow label="User" value={detail.userId || '—'} />
                                <MetaRow label="SDK" value={detail.sdk ? `${detail.sdk}${detail.sdkVersion ? ` v${detail.sdkVersion}` : ''}` : '—'} />
                                <MetaRow label="Temperature" value={detail.temperature != null ? String(detail.temperature) : '—'} />
                                <MetaRow label="Thinking Depth" value={detail.thinkingDepth || '—'} />
                                <MetaRow label="Thinking Budget" value={detail.thinkingBudget != null ? String(detail.thinkingBudget) : '—'} />
                                <MetaRow label="Top P" value={detail.topP != null ? String(detail.topP) : '—'} />
                                <MetaRow label="Top K" value={detail.topK != null ? String(detail.topK) : '—'} />
                                <MetaRow label="Max Output Tokens" value={detail.maxOutputTokens != null ? String(detail.maxOutputTokens) : '—'} />
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                <button
                                  onClick={handleRetry}
                                  disabled={retrying}
                                  style={{
                                    height: 32,
                                    padding: '4px 16px',
                                    fontSize: 14,
                                    fontFamily: "'IBM Plex Sans', sans-serif",
                                    letterSpacing: '0.16px',
                                    border: '1px solid var(--ibm-primary)',
                                    background: retrying ? 'var(--ibm-surface-1)' : 'var(--ibm-primary)',
                                    color: retrying ? 'var(--ibm-ink-subtle)' : '#fff',
                                    cursor: retrying ? 'not-allowed' : 'pointer',
                                    borderRadius: 0,
                                    fontWeight: 600,
                                  }}
                                >
                                  {retrying ? 'Retrying...' : '↻ Retry Call'}
                                </button>
                                {retryResult && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ibm-green-50)' }}>
                                    <span>Retry succeeded — {retryResult.inputTokens} in / {retryResult.outputTokens} out tokens, {formatLatency(retryResult.durationMs)}</span>
                                  </div>
                                )}
                                {retryError && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ibm-red-60)' }}>
                                    <span>{retryError}</span>
                                  </div>
                                )}
                              </div>
                              {retryResult && (
                                <div style={{ marginBottom: 16 }}>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Retry Response</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-green-10)', border: '1px solid var(--ibm-green-50)', padding: 12 }}>
                                    <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ibm-ink)' }}>
                                      {retryResult.text}
                                    </pre>
                                  </div>
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>System Prompt</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}><CodeBlock content={detail.systemPrompt} /></div>
                                </div>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>User Prompt</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}><CodeBlock content={detail.userPrompt} /></div>
                                </div>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Response</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}><CodeBlock content={detail.response} /></div>
                                </div>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Error</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: detail.error ? 'var(--ibm-red-10)' : 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}>
                                    {detail.error ? <pre style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: 'var(--ibm-semantic-error)' }}>{detail.error}</pre> : <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>—</span>}
                                  </div>
                                </div>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Raw Request</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}><JsonBlock data={detail.rawRequest} /></div>
                                </div>
                                <div>
                                  <p className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 8 }}>Raw Response</p>
                                  <div style={{ maxHeight: 200, overflow: 'auto', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: 12 }}><JsonBlock data={detail.rawResponse} /></div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          border: '1px solid var(--ibm-hairline)',
          borderTop: 0,
          background: 'var(--ibm-canvas)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
            Showing {showing} of {total}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            style={selectStyle}
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}/page</option>)}
          </select>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              height: 32,
              padding: '4px 12px',
              fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: '0.16px',
              border: '1px solid var(--ibm-hairline)',
              background: 'var(--ibm-canvas)',
              color: page === 0 ? 'var(--ibm-ink-subtle)' : 'var(--ibm-ink)',
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              borderRadius: 0,
              marginRight: 8,
            }}
          >
            ← Prev
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
            style={{
              height: 32,
              padding: '4px 12px',
              fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif",
              letterSpacing: '0.16px',
              border: '1px solid var(--ibm-hairline)',
              background: 'var(--ibm-canvas)',
              color: !hasNext ? 'var(--ibm-ink-subtle)' : 'var(--ibm-ink)',
              cursor: !hasNext ? 'not-allowed' : 'pointer',
              borderRadius: 0,
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}