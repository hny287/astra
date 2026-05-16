// src/components/landing/landingCharts.tsx
// Hand-built SVG chart components for the landing page.
// Replaces @carbon/charts to avoid D3/SSR runtime issues.
// Theme-aware via CSS variables.

'use client';

import { useState, useEffect } from 'react';

// ─── Mobile breakpoint hook ────────────────────────────────────────
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 672);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

// ─── Severity Donut ──────────────────────────────────────────────
const severityData = [
  { group: 'CRITICAL', value: 12, color: '#da1e28' },
  { group: 'HIGH', value: 28, color: '#f57c00' },
  { group: 'MEDIUM', value: 38, color: '#f1c21b' },
  { group: 'LOW', value: 18, color: '#24a148' },
  { group: 'INFO', value: 4, color: '#0093b7' },
];

export function SeverityDonutChart() {
  const isMobile = useIsMobile();
  const total = severityData.reduce((s, d) => s + d.value, 0);
  const cx = isMobile ? 120 : 140;
  const cy = 120;
  const r = 90;
  const strokeWidth = 40;

  let cumAngle = -90;
  const arcs = severityData.map((d) => {
    const angle = (d.value / total) * 360;
    const startAngle = cumAngle;
    cumAngle += angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (cumAngle * Math.PI) / 180;
    const largeArc = angle > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    return { ...d, path: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`, startAngle };
  });

  const width = isMobile ? 280 : 420;

  return (
    <div style={{ maxWidth: 480, width: '100%' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ibm-ink-subtle)', marginBottom: '12px', textAlign: 'center' }}>
        Severity distribution
      </div>
      <svg viewBox={`0 0 ${width} 240`} style={{ width: '100%', height: 'auto' }}>
        {arcs.map((arc) => (
          <path
            key={arc.group}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: '28px', fontWeight: 600, fill: 'var(--ibm-ink)' }}>
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" style={{ fontSize: '12px', fontWeight: 400, fill: 'var(--ibm-ink-subtle)' }}>
          Findings
        </text>
        {/* Legend */}
        {severityData.map((d, i) => {
          const lx = cx + r + strokeWidth + 16;
          const ly = 40 + i * 32;
          return (
            <g key={d.group}>
              <rect x={lx} y={ly - 6} width={12} height={12} fill={d.color} />
              <text x={lx + 18} y={ly + 4} style={{ fontSize: '13px', fill: 'var(--ibm-ink-muted)' }}>
                {d.group} ({d.value})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category Bar Chart ──────────────────────────────────────────
const categoryData = [
  { group: 'SAST', value: 424, color: '#0f62fe' },
  { group: 'SCA', value: 274, color: '#4589ff' },
  { group: 'Secrets', value: 224, color: '#da1e28' },
  { group: 'IaC', value: 175, color: '#f1c21b' },
  { group: 'Biz Logic', value: 100, color: '#f57c00' },
  { group: 'Cloud', value: 50, color: '#0093b7' },
];

export function CategoryBarChart() {
  const maxVal = Math.max(...categoryData.map((d) => d.value));
  const barHeight = 28;
  const gap = 8;
  const labelWidth = 80;
  const chartWidth = 320;
  const totalHeight = categoryData.length * (barHeight + gap) + 24;

  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ibm-ink-subtle)', marginBottom: '12px', textAlign: 'center' }}>
        Findings by category
      </div>
      <svg viewBox={`0 0 ${labelWidth + chartWidth + 60} ${totalHeight}`} style={{ width: '100%', height: 'auto' }}>
        {categoryData.map((d, i) => {
          const y = i * (barHeight + gap) + 4;
          const barW = (d.value / maxVal) * chartWidth;
          return (
            <g key={d.group}>
              <text x={labelWidth - 8} y={y + barHeight / 2 + 4} textAnchor="end" style={{ fontSize: '12px', fill: 'var(--ibm-ink-muted)' }}>
                {d.group}
              </text>
              <rect x={labelWidth} y={y} width={barW} height={barHeight} fill={d.color} rx={0} />
              <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4} style={{ fontSize: '12px', fill: 'var(--ibm-ink)' }}>
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Remediation Comparison ──────────────────────────────────────
const remediationLabels = ['Triage', 'Fix', 'Verify'];
const remediationWithout = [45, 240, 120];
const remediationWith = [8, 40, 15];

export function RemediationComparisonChart() {
  const maxVal = Math.max(...remediationWithout);
  const barHeight = 24;
  const gap = 6;
  const groupGap = 20;
  const labelWidth = 80;
  const chartWidth = 280;

  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ibm-ink-subtle)', marginBottom: '12px', textAlign: 'center' }}>
        Remediation time (minutes)
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: '#525252' }} />
          <span style={{ fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>Without Astra</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: '#0f62fe' }} />
          <span style={{ fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>With Astra</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${labelWidth + chartWidth + 60} ${remediationLabels.length * (2 * barHeight + gap + 4) + groupGap + 8}`} style={{ width: '100%', height: 'auto' }}>
        {remediationLabels.map((label, i) => {
          const y = i * (2 * barHeight + gap + 4) + 4;
          const wBar = (remediationWithout[i] / maxVal) * chartWidth;
          const aBar = (remediationWith[i] / maxVal) * chartWidth;
          return (
            <g key={label}>
              <text x={labelWidth - 8} y={y + barHeight / 2 + 4} textAnchor="end" style={{ fontSize: '12px', fill: 'var(--ibm-ink-muted)' }}>
                {label}
              </text>
              <rect x={labelWidth} y={y} width={wBar} height={barHeight} fill="#525252" />
              <text x={labelWidth + wBar + 8} y={y + barHeight / 2 + 4} style={{ fontSize: '12px', fill: 'var(--ibm-ink)' }}>
                {remediationWithout[i]}m
              </text>
              <rect x={labelWidth} y={y + barHeight + 3} width={aBar} height={barHeight} fill="#0f62fe" />
              <text x={labelWidth + aBar + 8} y={y + barHeight + 3 + barHeight / 2 + 4} style={{ fontSize: '12px', fill: 'var(--ibm-ink)' }}>
                {remediationWith[i]}m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── False Positive Bar ──────────────────────────────────────────
const fpData = [
  { group: 'Raw scanners', value: 62, color: '#da1e28' },
  { group: 'After Astra enrichment', value: 8, color: '#24a148' },
];

export function FalsePositiveBarChart() {
  const maxVal = 100; // domain is 0-100%
  const barHeight = 36;
  const gap = 12;
  const labelWidth = 180;
  const chartWidth = 200;

  return (
    <div style={{ maxWidth: 400, width: '100%' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: 'var(--ibm-ink-subtle)', marginBottom: '12px', textAlign: 'center' }}>
        False positive rate (%)
      </div>
      <svg viewBox={`0 0 ${labelWidth + chartWidth + 60} ${fpData.length * (barHeight + gap) + 8}`} style={{ width: '100%', height: 'auto' }}>
        {fpData.map((d, i) => {
          const y = i * (barHeight + gap) + 4;
          const barW = (d.value / maxVal) * chartWidth;
          return (
            <g key={d.group}>
              <text x={labelWidth - 8} y={y + barHeight / 2 + 4} textAnchor="end" style={{ fontSize: '13px', fill: 'var(--ibm-ink-muted)' }}>
                {d.group}
              </text>
              <rect x={labelWidth} y={y} width={barW} height={barHeight} fill={d.color} />
              <text x={labelWidth + barW + 8} y={y + barHeight / 2 + 4} style={{ fontSize: '14px', fontWeight: 600, fill: d.color }}>
                {d.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}