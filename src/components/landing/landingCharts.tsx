// src/components/landing/landingCharts.tsx
// Hand-built SVG chart components for the landing page.
// Light IBM Carbon design system — high-contrast on white/light backgrounds.
// All colors are hex literals for reliable SVG rendering.

'use client';

import { useBreakpoint } from './landingLayout';

// ─── Color Tokens (Light Carbon) ──────────────────────────────────
const c = {
  bg:            '#ffffff',
  bgAlt:         '#f4f4f4',
  text:          '#161616',
  textSecondary: '#525252',
  textMuted:     '#a8a8a8',
  accent:        '#0f62fe',
  success:       '#198038',
  warning:       '#d0a019',
  error:         '#da1e28',
  cyan:          '#0072c3',
  purple:        '#6929c4',
  gridLine:      '#e0e0e0',
};

// ─── Severity Donut ───────────────────────────────────────────────
const severityData = [
  { group: 'CRITICAL', value: 12, color: '#da1e28' },
  { group: 'HIGH',     value: 28, color: '#d0a019' },
  { group: 'MEDIUM',   value: 38, color: '#8a6f00' },
  { group: 'LOW',      value: 18, color: '#198038' },
  { group: 'INFO',      value:  4, color: '#0072c3' },
];

export function SeverityDonutChart() {
  const { isMobile } = useBreakpoint();
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
      <div
        style={{
          fontSize: '12px',
          fontWeight: 400,
          color: c.textSecondary,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        Severity distribution
      </div>
      <svg viewBox={`0 0 ${width} 240`} style={{ width: '100%', height: 'auto' }}>
        {/* Background track ring */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={c.gridLine}
          strokeWidth={strokeWidth}
        />
        {/* Arc segments */}
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
        {/* Center number */}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          style={{ fontSize: '28px', fontWeight: 300, fill: c.text }}
        >
          {total.toLocaleString()}
        </text>
        {/* Center label */}
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          style={{ fontSize: '12px', fontWeight: 400, fill: c.textSecondary }}
        >
          Findings
        </text>
        {/* Legend */}
        {severityData.map((d, i) => {
          const lx = cx + r + strokeWidth + 16;
          const ly = 40 + i * 32;
          return (
            <g key={d.group}>
              <rect x={lx} y={ly - 6} width={12} height={12} fill={d.color} rx={2} />
              <text
                x={lx + 18}
                y={ly + 4}
                style={{ fontSize: '13px', fontWeight: 400, fill: c.text }}
              >
                {d.group}
              </text>
              <text
                x={lx + 18}
                y={ly + 4}
                style={{ fontSize: '13px', fontWeight: 400, fill: c.textMuted }}
                dx="68"
              >
                ({d.value})
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Category Bar Chart ───────────────────────────────────────────
const categoryData = [
  { group: 'SAST',      value: 424, color: '#0f62fe' },
  { group: 'SCA',       value: 274, color: '#6929c4' },
  { group: 'Secrets',   value: 224, color: '#da1e28' },
  { group: 'IaC',       value: 175, color: '#d0a019' },
  { group: 'Biz Logic', value: 100, color: '#0072c3' },
  { group: 'Cloud',     value:  50, color: '#198038' },
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
      <div
        style={{
          fontSize: '12px',
          fontWeight: 400,
          color: c.textSecondary,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        Findings by category
      </div>
      <svg
        viewBox={`0 0 ${labelWidth + chartWidth + 60} ${totalHeight}`}
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Vertical grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={labelWidth}
            y1={0}
            x2={labelWidth}
            y2={totalHeight - 24}
            stroke={c.gridLine}
            strokeWidth={1}
            transform={`translate(${frac * chartWidth}, 0)`}
          />
        ))}
        {categoryData.map((d, i) => {
          const y = i * (barHeight + gap) + 4;
          const barW = (d.value / maxVal) * chartWidth;
          return (
            <g key={d.group}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                style={{ fontSize: '12px', fontWeight: 400, fill: c.textSecondary }}
              >
                {d.group}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                fill={d.color}
                rx={2}
              />
              <text
                x={labelWidth + barW + 8}
                y={y + barHeight / 2 + 4}
                style={{ fontSize: '12px', fontWeight: 400, fill: c.text }}
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Remediation Comparison ───────────────────────────────────────
const remediationLabels = ['Triage', 'Fix', 'Verify'];
const remediationWithout = [45, 240, 120];
const remediationWith = [8, 40, 15];

export function RemediationComparisonChart() {
  const maxVal = Math.max(...remediationWithout);
  const barHeight = 24;
  const gap = 6;
  const labelWidth = 80;
  const chartWidth = 280;

  const rowHeight = 2 * barHeight + gap + 4;
  const svgHeight = remediationLabels.length * rowHeight + 48;

  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 400,
          color: c.textSecondary,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        Remediation time (minutes)
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: c.textMuted, borderRadius: 2 }} />
          <span style={{ fontSize: '12px', color: c.textMuted }}>Without Astra</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 12, height: 12, background: c.accent, borderRadius: 2 }} />
          <span style={{ fontSize: '12px', color: c.textSecondary }}>With Astra</span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${labelWidth + chartWidth + 60} ${svgHeight}`}
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Vertical grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={labelWidth}
            y1={0}
            x2={labelWidth}
            y2={svgHeight}
            stroke={c.gridLine}
            strokeWidth={1}
            transform={`translate(${frac * chartWidth}, 0)`}
          />
        ))}
        {remediationLabels.map((label, i) => {
          const y = i * rowHeight + 4;
          const wBar = (remediationWithout[i] / maxVal) * chartWidth;
          const aBar = (remediationWith[i] / maxVal) * chartWidth;
          return (
            <g key={label}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                style={{ fontSize: '12px', fontWeight: 400, fill: c.textSecondary }}
              >
                {label}
              </text>
              {/* Without Astra — muted bar */}
              <rect
                x={labelWidth}
                y={y}
                width={wBar}
                height={barHeight}
                fill={c.textMuted}
                rx={2}
              />
              <text
                x={labelWidth + wBar + 8}
                y={y + barHeight / 2 + 4}
                style={{ fontSize: '12px', fontWeight: 400, fill: c.text }}
              >
                {remediationWithout[i]}m
              </text>
              {/* With Astra — accent bar */}
              <rect
                x={labelWidth}
                y={y + barHeight + 3}
                width={aBar}
                height={barHeight}
                fill={c.accent}
                rx={2}
              />
              <text
                x={labelWidth + aBar + 8}
                y={y + barHeight + 3 + barHeight / 2 + 4}
                style={{ fontSize: '12px', fontWeight: 400, fill: c.text }}
              >
                {remediationWith[i]}m
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── False Positive Bar ───────────────────────────────────────────
const fpData = [
  { group: 'Raw scanners', value: 62, color: c.error },
  { group: 'After Astra enrichment', value: 8, color: c.success },
];

export function FalsePositiveBarChart() {
  const maxVal = 100; // domain is 0-100%
  const barHeight = 36;
  const gap = 12;
  const labelWidth = 180;
  const chartWidth = 200;

  return (
    <div style={{ maxWidth: 400, width: '100%' }}>
      <div
        style={{
          fontSize: '12px',
          fontWeight: 400,
          color: c.textSecondary,
          marginBottom: '12px',
          textAlign: 'center',
        }}
      >
        False positive rate (%)
      </div>
      <svg
        viewBox={`0 0 ${labelWidth + chartWidth + 60} ${fpData.length * (barHeight + gap) + 8}`}
        style={{ width: '100%', height: 'auto' }}
      >
        {/* Vertical grid lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={labelWidth}
            y1={0}
            x2={labelWidth}
            y2={fpData.length * (barHeight + gap) + 8}
            stroke={c.gridLine}
            strokeWidth={1}
            transform={`translate(${frac * chartWidth}, 0)`}
          />
        ))}
        {fpData.map((d, i) => {
          const y = i * (barHeight + gap) + 4;
          const barW = (d.value / maxVal) * chartWidth;
          return (
            <g key={d.group}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                style={{ fontSize: '13px', fontWeight: 400, fill: c.textSecondary }}
              >
                {d.group}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                fill={d.color}
                rx={2}
              />
              <text
                x={labelWidth + barW + 8}
                y={y + barHeight / 2 + 4}
                style={{ fontSize: '14px', fontWeight: 400, fill: d.color }}
              >
                {d.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}