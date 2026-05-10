'use client';

import { useState, useEffect } from 'react';
import AiCallTable from '@/components/AiCallTable';

interface Stats {
  total: number;
  successCount: number;
  errorCount: number;
  errorRate: number;
  avgLatencyMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: { provider: string; count: number; avgLatencyMs: number }[];
  byModel: { model: string; count: number; avgLatencyMs: number }[];
  byStatus: { status: string; count: number }[];
}

function formatLatency(ms: number): string {
  if (ms >= 1000) return (ms / 1000).toFixed(1) + 's';
  return Math.round(ms) + 'ms';
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function Card({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        background: 'var(--ibm-surface-1)',
        border: '1px solid var(--ibm-hairline)',
        borderRadius: 0,
        padding: 24,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.16px',
          textTransform: 'uppercase',
          color: 'var(--ibm-ink-muted)',
          marginBottom: 12,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 28,
          fontWeight: 300,
          lineHeight: 1.2,
          color: valueColor || 'var(--ibm-ink)',
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function ObservabilityPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/api/v1/ai-calls/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, []);

  const tokenTotal = (stats?.totalInputTokens ?? 0) + (stats?.totalOutputTokens ?? 0);
  const errorRateNum = stats?.errorRate ?? 0;

  return (
    <div>
      <div style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.25, color: 'var(--ibm-ink)', marginBottom: 8 }}>
          Observability
        </h1>
        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
          AI call observability across all scans
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <Card label="Total Calls" value={stats ? stats.total.toLocaleString() : '—'} />
        <Card label="Avg Latency" value={stats ? formatLatency(stats.avgLatencyMs) : '—'} />
        <Card label="Token Usage" value={stats ? formatTokens(tokenTotal) : '—'} />
        <Card
          label="Error Rate"
          value={stats ? (errorRateNum * 100).toFixed(1) + '%' : '—'}
          valueColor={errorRateNum > 0.05 ? 'var(--ibm-semantic-error)' : undefined}
        />
      </div>

      <AiCallTable />
    </div>
  );
}