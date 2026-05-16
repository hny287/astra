// src/components/landing/landingCharts.tsx
// Carbon Charts wrappers for the landing page — g100 (dark) theme.
// Each chart is a self-contained component with its own data + options.

'use client';

import {
  DonutChart,
  SimpleBarChart,
  GroupedBarChart,
  ScaleTypes,
} from '@carbon/charts-react';
import type {
  DonutChartOptions,
  BarChartOptions,
  ChartTabularData,
} from '@carbon/charts-react';

import '@carbon/charts/styles.css';

// ─── Severity Donut ──────────────────────────────────────────
const severityData: ChartTabularData = [
  { group: 'CRITICAL', value: 12 },
  { group: 'HIGH', value: 28 },
  { group: 'MEDIUM', value: 38 },
  { group: 'LOW', value: 18 },
  { group: 'INFO', value: 4 },
];

const severityOptions: DonutChartOptions = {
  title: 'Severity distribution',
  theme: 'g100',
  height: '260px',
  donut: {
    center: {
      label: 'Findings',
      number: 1247,
    },
    alignment: 'center',
  },
  pie: {
    labels: {
      formatter: () => '',
    },
  },
  legend: {
    enabled: true,
    position: 'right',
  },
  color: {
    scale: {
      CRITICAL: '#da1e28',
      HIGH: '#f57c00',
      MEDIUM: '#f1c21b',
      LOW: '#24a148',
      INFO: '#0093b7',
    },
  },
  tooltip: {
    enabled: true,
  },
};

export function SeverityDonutChart() {
  return (
    <div style={{ maxWidth: 480, width: '100%' }}>
      <DonutChart data={severityData} options={severityOptions} />
    </div>
  );
}

// ─── Category Bar Chart ──────────────────────────────────────
const categoryData: ChartTabularData = [
  { group: 'SAST', value: 424 },
  { group: 'SCA', value: 274 },
  { group: 'Secrets', value: 224 },
  { group: 'IaC', value: 175 },
  { group: 'Business Logic', value: 100 },
  { group: 'Cloud', value: 50 },
];

const categoryOptions: BarChartOptions = {
  title: 'Findings by category',
  theme: 'g100',
  height: '260px',
  axes: {
    left: {
      scaleType: ScaleTypes.LINEAR,
      title: 'Findings',
    },
    bottom: {
      scaleType: ScaleTypes.LABELS,
      title: '',
    },
  },
  bars: {
    maxWidth: 32,
  },
  legend: {
    enabled: false,
  },
  color: {
    scale: {
      SAST: '#0f62fe',
      SCA: '#4589ff',
      Secrets: '#da1e28',
      IaC: '#f1c21b',
      'Business Logic': '#f57c00',
      Cloud: '#0093b7',
    },
  },
  tooltip: {
    enabled: true,
  },
};

export function CategoryBarChart() {
  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <SimpleBarChart data={categoryData} options={categoryOptions} />
    </div>
  );
}

// ─── Remediation Comparison ───────────────────────────────────
const remediationData: ChartTabularData = [
  { group: 'Without Astra', key: 'Triage', value: 45 },
  { group: 'With Astra', key: 'Triage', value: 8 },
  { group: 'Without Astra', key: 'Fix', value: 240 },
  { group: 'With Astra', key: 'Fix', value: 40 },
  { group: 'Without Astra', key: 'Verify', value: 120 },
  { group: 'With Astra', key: 'Verify', value: 15 },
];

const remediationOptions: BarChartOptions = {
  title: 'Remediation time (minutes)',
  theme: 'g100',
  height: '260px',
  axes: {
    left: {
      scaleType: ScaleTypes.LINEAR,
      title: 'Minutes',
    },
    bottom: {
      scaleType: ScaleTypes.LABELS,
      title: '',
    },
  },
  bars: {
    maxWidth: 24,
  },
  legend: {
    enabled: true,
    position: 'bottom',
  },
  color: {
    scale: {
      'Without Astra': '#525252',
      'With Astra': '#0f62fe',
    },
  },
  tooltip: {
    enabled: true,
  },
};

export function RemediationComparisonChart() {
  return (
    <div style={{ maxWidth: 520, width: '100%' }}>
      <GroupedBarChart data={remediationData} options={remediationOptions} />
    </div>
  );
}

// ─── False Positive Bar ───────────────────────────────────────
const falsePositiveData: ChartTabularData = [
  { group: 'Raw scanners', value: 62 },
  { group: 'After Astra enrichment', value: 8 },
];

const falsePositiveOptions: BarChartOptions = {
  title: 'False positive rate (%)',
  theme: 'g100',
  height: '240px',
  axes: {
    left: {
      scaleType: ScaleTypes.LINEAR,
      title: '%',
      domain: [0, 100],
    },
    bottom: {
      scaleType: ScaleTypes.LABELS,
      title: '',
    },
  },
  bars: {
    maxWidth: 48,
  },
  legend: {
    enabled: false,
  },
  color: {
    scale: {
      'Raw scanners': '#da1e28',
      'After Astra enrichment': '#24a148',
    },
  },
  tooltip: {
    enabled: true,
  },
};

export function FalsePositiveBarChart() {
  return (
    <div style={{ maxWidth: 400, width: '100%' }}>
      <SimpleBarChart data={falsePositiveData} options={falsePositiveOptions} />
    </div>
  );
}