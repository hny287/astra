'use client';

import { useState } from 'react';

interface BusinessLogicRule {
  id: string;
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

interface BusinessLogicPanelProps {
  rules: BusinessLogicRule[];
  onStatusChange?: () => void;
}

const STATUS_STYLE: Record<string, { color: string; border: string }> = {
  CANDIDATE: { color: 'var(--ibm-semantic-warning)', border: 'var(--ibm-semantic-warning)' },
  CONFIRMED: { color: 'var(--ibm-semantic-success)', border: 'var(--ibm-semantic-success)' },
  REJECTED: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-semantic-error)' },
};

export default function BusinessLogicPanel({ rules, onStatusChange }: BusinessLogicPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rules.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No business logic rules inferred.</p>;
  }

  const handleStatusUpdate = async (ruleId: string, status: 'CONFIRMED' | 'REJECTED') => {
    await fetch(`/api/v1/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onStatusChange?.();
  };

  return (
    <div style={{ border: '1px solid var(--ibm-hairline)' }}>
      {rules.map((rule) => {
        const statusStyle = STATUS_STYLE[rule.status] ?? STATUS_STYLE.CANDIDATE;
        const isOpen = expanded === rule.id;

        return (
          <div key={rule.id} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
            <div
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => setExpanded(isOpen ? null : rule.id)}
            >
              <span style={{ color: 'var(--ibm-ink-subtle)', fontSize: 10 }}>{isOpen ? '\u25BC' : '\u25B6'}</span>
              <span className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rule.ruleText.length > 100 ? `${rule.ruleText.substring(0, 100)}...` : rule.ruleText}
              </span>
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                  padding: '2px 8px', borderLeft: `3px solid ${statusStyle.border}`, color: statusStyle.color,
                }}
              >
                {rule.status}
              </span>
              <span className="ibm-caption tabular-nums" style={{ color: 'var(--ibm-ink-subtle)' }}>
                {(rule.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 16px 16px', background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
                  <div>
                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Rule</p>
                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{rule.ruleText}</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Confidence</p>
                      <p className="ibm-body-sm tabular-nums" style={{ color: 'var(--ibm-ink)' }}>{(rule.confidence * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Status</p>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                        padding: '2px 8px', borderLeft: `3px solid ${statusStyle.border}`, color: statusStyle.color,
                      }}>
                        {rule.status}
                      </span>
                    </div>
                  </div>
                  {rule.violationDescription && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Violation</p>
                      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{rule.violationDescription}</p>
                    </div>
                  )}
                  {rule.evidenceFiles.length > 0 && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Evidence</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rule.evidenceFiles.map((f, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.status === 'CANDIDATE' && (
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(rule.id, 'CONFIRMED'); }}
                        style={{ background: 'var(--ibm-semantic-success)', color: '#ffffff', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', padding: '12px 16px', border: 'none', cursor: 'pointer' }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStatusUpdate(rule.id, 'REJECTED'); }}
                        style={{ background: 'var(--ibm-semantic-error)', color: '#ffffff', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', padding: '12px 16px', border: 'none', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
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