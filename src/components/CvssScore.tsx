'use client';

import { useState } from 'react';

const CVSS_RANGES = [
  { min: 9.0, max: 10.0, label: 'Critical', color: '#da1e28', textColor: '#fff', description: 'Exploitable with minimal effort. Leads to complete system compromise, data exfiltration, or remote code execution.' },
  { min: 7.0, max: 8.9, label: 'High', color: '#fa4d56', textColor: '#fff', description: 'Significant impact. Typically allows privilege escalation, authentication bypass, or substantial data exposure.' },
  { min: 4.0, max: 6.9, label: 'Medium', color: '#f1c21b', textColor: '#161616', description: 'Moderate impact. May require user interaction or specific conditions. Can lead to information disclosure or limited access.' },
  { min: 0.1, max: 3.9, label: 'Low', color: '#42be65', textColor: '#fff', description: 'Limited impact. Requires unlikely combinations of circumstances. Minor information leak or denial of service.' },
  { min: 0, max: 0, label: 'None', color: '#a8a8a8', textColor: '#fff', description: 'No measurable security impact.' },
];

function getRange(score: number) {
  if (score === 0) return CVSS_RANGES[4];
  for (const r of CVSS_RANGES) {
    if (score >= r.min && score <= r.max) return r;
  }
  return CVSS_RANGES[2];
}

interface CvssScoreProps {
  score: number;
  compact?: boolean;
}

export default function CvssScore({ score, compact }: CvssScoreProps) {
  const [showTip, setShowTip] = useState(false);
  const range = getRange(score);

  if (compact) {
    return (
      <span
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={() => setShowTip(v => !v)}
        style={{ position: 'relative', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
      >
        <span style={{
          display: 'inline-block', padding: '1px 6px', fontSize: 11, fontWeight: 600,
          background: range.color, color: range.textColor, letterSpacing: '0.32px',
        }}>
          {score.toFixed(1)}
        </span>
        {showTip && (
          <span style={{
            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            background: '#161616', color: '#fff', padding: '8px 12px', fontSize: 12, lineHeight: 1.4,
            width: 220, zIndex: 100, marginBottom: 4,
            fontFamily: "'IBM Plex Sans', sans-serif", letterSpacing: '0.16px',
          }}>
            <span style={{ fontWeight: 600, color: range.color }}>CVSS v3.1 {score.toFixed(1)} — {range.label}</span>
            <br />
            <span style={{ color: '#c6c6c6' }}>{range.description}</span>
            <span style={{ display: 'block', marginTop: 6, borderTop: '1px solid #393939', paddingTop: 6, color: '#a8a8a8', fontSize: 11 }}>
              0.0 None · 0.1–3.9 Low · 4.0–6.9 Medium · 7.0–8.9 High · 9.0–10.0 Critical
            </span>
          </span>
        )}
      </span>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        CVSS Score
        <span
          onMouseEnter={() => setShowTip(true)}
          onMouseLeave={() => setShowTip(false)}
          onClick={() => setShowTip(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 16, height: 16, borderRadius: '50%', background: 'var(--ibm-surface-2)',
            fontSize: 11, fontWeight: 600, color: 'var(--ibm-ink-muted)', cursor: 'pointer',
            border: '1px solid var(--ibm-hairline)',
          }}
        >
          ?
        </span>
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, background: 'var(--ibm-surface-2)', position: 'relative' }}>
          <div style={{
            width: `${Math.min(score / 10, 1) * 100}%`,
            height: '100%',
            background: range.color,
            transition: 'width 0.3s ease',
          }} />
          {/* Tick marks */}
          <div style={{ position: 'absolute', top: 0, left: '40%', width: 1, height: 8, background: 'var(--ibm-hairline)' }} />
          <div style={{ position: 'absolute', top: 0, left: '70%', width: 1, height: 8, background: 'var(--ibm-hairline)' }} />
          <div style={{ position: 'absolute', top: 0, left: '90%', width: 1, height: 8, background: 'var(--ibm-hairline)' }} />
        </div>
        <span style={{
          padding: '2px 8px', fontSize: 12, fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace",
          background: range.color, color: range.textColor, letterSpacing: '0.32px',
        }}>
          {score.toFixed(1)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: range.color, letterSpacing: '0.32px' }}>
          {range.label}
        </span>
      </div>
      {showTip && (
        <div style={{
          marginTop: 8, padding: '10px 14px', background: 'var(--ibm-surface-1)',
          border: '1px solid var(--ibm-hairline)', fontSize: 13, lineHeight: 1.5,
          color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Sans', sans-serif",
        }}>
          <span style={{ fontWeight: 600, color: range.color }}>CVSS v3.1 {score.toFixed(1)} — {range.label}</span>
          <p style={{ margin: '6px 0 0', color: 'var(--ibm-ink-muted)', fontSize: 12 }}>
            {range.description}
          </p>
          <table style={{ marginTop: 8, width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <tbody>
              {CVSS_RANGES.filter(r => r.label !== 'None').map(r => (
                <tr key={r.label} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
                  <td style={{ padding: '3px 8px 3px 0', fontWeight: 600, color: r.color }}>{r.label}</td>
                  <td style={{ padding: '3px 0', fontFamily: "'IBM Plex Mono', monospace" }}>{r.min.toFixed(1)}–{r.max.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}