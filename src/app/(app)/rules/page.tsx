'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserRule {
  id: string;
  name: string;
  description: string;
  ruleText: string;
  severity: string;
  category: string;
  cwe: string[];
  isActive: boolean;
  isBuiltin: boolean;
  scanId: string | null;
  createdAt: string;
  updatedAt: string;
  // New fields
  type: string;
  scope: string;
  repoUrl: string | null;
  languages: string[];
  paths: string[];
  excludePaths: string[];
  matchPattern: string | null;
  owasp: string[];
  priority: number;
  fixSuggestion: string | null;
  references: string[];
  tags: string[];
  codeRule: string | null;
  source: string;
  slaSeverity: string | null;
  slaHours: number | null;
  slaAction: string | null;
  status: string;
}

interface BusinessLogicRule {
  id: string;
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
  createdAt: string;
}

const SEVERITY_STYLES: Record<string, { color: string; border: string }> = {
  CRITICAL: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-red-50)' },
  HIGH: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-semantic-warning)' },
  MEDIUM: { color: 'var(--ibm-semantic-warning)', border: 'var(--ibm-yellow-50)' },
  LOW: { color: 'var(--ibm-semantic-success)', border: 'var(--ibm-green-40)' },
  INFO: { color: 'var(--ibm-primary)', border: 'var(--ibm-blue-50)' },
};

const TYPE_STYLES: Record<string, { color: string; bg: string }> = {
  SECURITY: { color: 'var(--ibm-semantic-error)', bg: 'rgba(218,30,40,0.08)' },
  COMPLIANCE: { color: 'var(--ibm-primary)', bg: 'rgba(15,98,254,0.08)' },
  SLA: { color: 'var(--ibm-semantic-warning)', bg: 'rgba(241,194,27,0.08)' },
  BUSINESS_LOGIC: { color: 'var(--ibm-semantic-success)', bg: 'rgba(36,161,72,0.08)' },
};

const TYPE_LABELS: Record<string, string> = {
  SECURITY: 'Security',
  COMPLIANCE: 'Compliance',
  SLA: 'SLA',
  BUSINESS_LOGIC: 'Biz Logic',
};

const STATUS_COLORS: Record<string, { color: string; border: string }> = {
  CANDIDATE: { color: 'var(--ibm-semantic-warning)', border: 'var(--ibm-semantic-warning)' },
  CONFIRMED: { color: 'var(--ibm-semantic-success)', border: 'var(--ibm-semantic-success)' },
  REJECTED: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-semantic-error)' },
};

type Tab = 'global' | 'ai-inferred';

function SeverityTag({ severity }: { severity: string }) {
  const s = severity in SEVERITY_STYLES ? severity : 'INFO';
  const style = SEVERITY_STYLES[s];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
      padding: '2px 8px', borderLeft: `3px solid ${style.border}`, color: style.color,
    }}>
      {s}
    </span>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'var(--ibm-canvas)',
  border: '1px solid var(--ibm-hairline)',
  padding: '11px 16px',
  fontSize: '14px',
  color: 'var(--ibm-ink)',
  fontFamily: "'IBM Plex Sans', sans-serif",
  letterSpacing: '0.16px',
  lineHeight: 1.29,
  width: '100%',
  outline: 'none',
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23525252'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 16px center',
  paddingRight: 40,
};

function AddRuleForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [category, setCategory] = useState('SAST');
  const [cweInput, setCweInput] = useState('');
  const [type, setType] = useState('SECURITY');
  const [scope, setScope] = useState('GLOBAL');
  const [priority, setPriority] = useState(0);
  const [owaspInput, setOwaspInput] = useState('');
  const [languagesInput, setLanguagesInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [slaSeverity, setSlaSeverity] = useState('HIGH');
  const [slaHours, setSlaHours] = useState(24);
  const [slaAction, setSlaAction] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !ruleText.trim()) return;
    setSubmitting(true);
    const cwe = cweInput.split(',').map(s => s.trim()).filter(Boolean);
    const owasp = owaspInput.split(',').map(s => s.trim()).filter(Boolean);
    const languages = languagesInput.split(',').map(s => s.trim()).filter(Boolean);
    const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/v1/user-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, description, ruleText, severity, category, cwe,
          type, scope, priority, owasp, languages, tags,
          ...(type === 'SLA' ? { slaSeverity, slaHours, slaAction } : {}),
        }),
      });
      if (res.ok) onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,22,22,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={onClose}>
      <div style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', width: 600, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="ibm-subhead" style={{ color: 'var(--ibm-ink)' }}>Add rule</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ibm-ink-muted)', fontSize: 18, cursor: 'pointer', padding: 4 }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Name</label>
            <input style={INPUT_STYLE} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Description</label>
            <input style={INPUT_STYLE} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Rule text</label>
            <textarea style={{ ...INPUT_STYLE, minHeight: 120, resize: 'vertical' }} value={ruleText} onChange={e => setRuleText(e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Type</label>
              <select style={SELECT_STYLE} value={type} onChange={e => setType(e.target.value)}>
                {['SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'].map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Scope</label>
              <select style={SELECT_STYLE} value={scope} onChange={e => setScope(e.target.value)}>
                {['GLOBAL', 'PROJECT'].map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Severity</label>
              <select style={SELECT_STYLE} value={severity} onChange={e => setSeverity(e.target.value)}>
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Category</label>
              <select style={SELECT_STYLE} value={category} onChange={e => setCategory(e.target.value)}>
                {['SAST', 'DAST', 'SCA', 'IAC', 'SECRET', 'COMPOSITION', 'CUSTOM'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Priority</label>
              <input type="number" style={INPUT_STYLE} value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} />
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>CWE IDs (comma-separated)</label>
              <input style={INPUT_STYLE} value={cweInput} onChange={e => setCweInput(e.target.value)} placeholder="e.g. CWE-79, CWE-89" />
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>OWASP (comma-separated)</label>
              <input style={INPUT_STYLE} value={owaspInput} onChange={e => setOwaspInput(e.target.value)} placeholder="e.g. A03:2021, A01:2021" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Languages (comma-separated)</label>
              <input style={INPUT_STYLE} value={languagesInput} onChange={e => setLanguagesInput(e.target.value)} placeholder="e.g. python, javascript" />
            </div>
            <div>
              <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Tags (comma-separated)</label>
              <input style={INPUT_STYLE} value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. auth, xss, injection" />
            </div>
          </div>
          {type === 'SLA' && (
            <div style={{ padding: 16, background: TYPE_STYLES.SLA.bg, border: '1px solid var(--ibm-semantic-warning)' }}>
              <p className="ibm-label" style={{ color: 'var(--ibm-semantic-warning)', marginBottom: 12 }}>SLA Configuration</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Severity</label>
                  <select style={SELECT_STYLE} value={slaSeverity} onChange={e => setSlaSeverity(e.target.value)}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Hours</label>
                  <input type="number" style={INPUT_STYLE} value={slaHours} onChange={e => setSlaHours(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Action</label>
                  <input style={INPUT_STYLE} value={slaAction} onChange={e => setSlaAction(e.target.value)} placeholder="e.g. notify, escalate" />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '12px 16px', fontSize: '14px', color: 'var(--ibm-ink)', cursor: 'pointer', letterSpacing: '0.16px' }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none', padding: '12px 16px', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>Add rule</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRuleInline({ rule, onSave, onCancel }: { rule: UserRule; onSave: (data: Partial<UserRule>) => void; onCancel: () => void }) {
  const [name, setName] = useState(rule.name);
  const [description, setDescription] = useState(rule.description);
  const [ruleText, setRuleText] = useState(rule.ruleText);
  const [severity, setSeverity] = useState(rule.severity);
  const [category, setCategory] = useState(rule.category);
  const [cweInput, setCweInput] = useState(rule.cwe.join(', '));
  const [type, setType] = useState(rule.type || 'SECURITY');
  const [scope, setScope] = useState(rule.scope || 'GLOBAL');
  const [priority, setPriority] = useState(rule.priority ?? 0);
  const [owaspInput, setOwaspInput] = useState((rule.owasp ?? []).join(', '));
  const [languagesInput, setLanguagesInput] = useState((rule.languages ?? []).join(', '));
  const [tagsInput, setTagsInput] = useState((rule.tags ?? []).join(', '));
  const [slaSeverity, setSlaSeverity] = useState(rule.slaSeverity || 'HIGH');
  const [slaHours, setSlaHours] = useState(rule.slaHours ?? 24);
  const [slaAction, setSlaAction] = useState(rule.slaAction || '');

  return (
    <div style={{ padding: 16, background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Name</label>
            <input style={INPUT_STYLE} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Description</label>
            <input style={INPUT_STYLE} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Rule text</label>
          <textarea style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }} value={ruleText} onChange={e => setRuleText(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Type</label>
            <select style={SELECT_STYLE} value={type} onChange={e => setType(e.target.value)}>
              {['SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'].map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Scope</label>
            <select style={SELECT_STYLE} value={scope} onChange={e => setScope(e.target.value)}>
              {['GLOBAL', 'PROJECT'].map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Priority</label>
            <input type="number" style={INPUT_STYLE} value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Severity</label>
            <select style={SELECT_STYLE} value={severity} onChange={e => setSeverity(e.target.value)}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Category</label>
            <select style={SELECT_STYLE} value={category} onChange={e => setCategory(e.target.value)}>
              {['SAST', 'DAST', 'SCA', 'IAC', 'SECRET', 'COMPOSITION', 'CUSTOM'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>CWE IDs</label>
            <input style={INPUT_STYLE} value={cweInput} onChange={e => setCweInput(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>OWASP</label>
            <input style={INPUT_STYLE} value={owaspInput} onChange={e => setOwaspInput(e.target.value)} />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Languages</label>
            <input style={INPUT_STYLE} value={languagesInput} onChange={e => setLanguagesInput(e.target.value)} />
          </div>
          <div>
            <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>Tags</label>
            <input style={INPUT_STYLE} value={tagsInput} onChange={e => setTagsInput(e.target.value)} />
          </div>
        </div>
        {type === 'SLA' && (
          <div style={{ padding: 12, background: TYPE_STYLES.SLA.bg, border: '1px solid var(--ibm-semantic-warning)' }}>
            <p className="ibm-label" style={{ color: 'var(--ibm-semantic-warning)', marginBottom: 8 }}>SLA Configuration</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Severity</label>
                <select style={SELECT_STYLE} value={slaSeverity} onChange={e => setSlaSeverity(e.target.value)}>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Hours</label>
                <input type="number" style={INPUT_STYLE} value={slaHours} onChange={e => setSlaHours(Number(e.target.value))} min={1} />
              </div>
              <div>
                <label className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 4, display: 'block' }}>SLA Action</label>
                <input style={INPUT_STYLE} value={slaAction} onChange={e => setSlaAction(e.target.value)} />
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', padding: '8px 12px', fontSize: '12px', color: 'var(--ibm-ink)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={() => {
            const cwe = cweInput.split(',').map(s => s.trim()).filter(Boolean);
            const owasp = owaspInput.split(',').map(s => s.trim()).filter(Boolean);
            const languages = languagesInput.split(',').map(s => s.trim()).filter(Boolean);
            const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
            onSave({
              name, description, ruleText, severity, category, cwe,
              type, scope, priority, owasp, languages, tags,
              ...(type === 'SLA' ? { slaSeverity, slaHours, slaAction } : {}),
            });
          }} style={{ background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none', padding: '8px 12px', fontSize: '12px', cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function GlobalRulesTab({ rules, onRefresh }: { rules: UserRule[]; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/user-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    });
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/v1/user-rules/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleEditSave = async (id: string, data: Partial<UserRule>) => {
    await fetch(`/api/v1/user-rules/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    setEditingId(null);
    onRefresh();
  };

  if (rules.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No global rules yet. Create one to apply it across all scans.</p>;
  }

  return (
    <div style={{ border: '1px solid var(--ibm-hairline)' }}>
      {rules.map(rule => {
        const isExpanded = expandedId === rule.id;
        const isEditing = editingId === rule.id;

        return (
          <div key={rule.id} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
            <div
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => {
                if (isEditing) return;
                setExpandedId(isExpanded ? null : rule.id);
              }}
            >
              <span style={{ color: 'var(--ibm-ink-subtle)', fontSize: 10, flexShrink: 0 }}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
              <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rule.name}
              </span>
              <span style={{
                fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                padding: '2px 8px',
                background: (TYPE_STYLES[rule.type] ?? TYPE_STYLES.SECURITY).bg,
                color: (TYPE_STYLES[rule.type] ?? TYPE_STYLES.SECURITY).color,
              }}>{TYPE_LABELS[rule.type] ?? rule.type}</span>
              <SeverityTag severity={rule.severity} />
              <span style={{
                fontSize: '12px', fontWeight: 400, letterSpacing: '0.16px',
                padding: '2px 8px', background: 'var(--ibm-surface-2)', color: 'var(--ibm-ink-muted)',
              }}>{rule.category}</span>
              <span style={{
                fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                padding: '2px 8px',
                borderLeft: `3px solid ${rule.isActive ? 'var(--ibm-semantic-success)' : 'var(--ibm-ink-subtle)'}`,
                color: rule.isActive ? 'var(--ibm-semantic-success)' : 'var(--ibm-ink-subtle)',
              }}>{rule.isActive ? 'Active' : 'Inactive'}</span>
            </div>
            {isExpanded && !isEditing && (
              <div style={{ padding: '0 16px 16px', background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Type</p>
                      <span style={{
                        display: 'inline-flex', fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                        padding: '2px 8px',
                        background: (TYPE_STYLES[rule.type] ?? TYPE_STYLES.SECURITY).bg,
                        color: (TYPE_STYLES[rule.type] ?? TYPE_STYLES.SECURITY).color,
                      }}>{TYPE_LABELS[rule.type] ?? rule.type}</span>
                    </div>
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Scope</p>
                      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{rule.scope ? (rule.scope.charAt(0) + rule.scope.slice(1).toLowerCase()) : 'Global'}</p>
                    </div>
                  </div>
                  {rule.description && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Description</p>
                      <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)' }}>{rule.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Rule text</p>
                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap' }}>{rule.ruleText}</p>
                  </div>
                  {rule.cwe.length > 0 && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>CWE</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rule.cwe.map((c, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(rule.owasp ?? []).length > 0 && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>OWASP</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rule.owasp.map((o, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{o}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(rule.languages ?? []).length > 0 && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Languages</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rule.languages.map((lang, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: 'rgba(15,98,254,0.08)', border: '1px solid var(--ibm-primary)', fontSize: '12px', color: 'var(--ibm-primary)' }}>{lang}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(rule.tags ?? []).length > 0 && (
                    <div>
                      <p className="ibm-label" style={{ color: 'var(--ibm-primary)', marginBottom: 4 }}>Tags</p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {rule.tags.map((tag, i) => (
                          <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {rule.type === 'SLA' && rule.slaSeverity && (
                    <div style={{ padding: 12, background: TYPE_STYLES.SLA.bg, border: '1px solid var(--ibm-semantic-warning)' }}>
                      <p className="ibm-label" style={{ color: 'var(--ibm-semantic-warning)', marginBottom: 8 }}>SLA Configuration</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div>
                          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Severity</p>
                          <p className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{rule.slaSeverity}</p>
                        </div>
                        <div>
                          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Hours</p>
                          <p className="ibm-body-emphasis tabular-nums" style={{ color: 'var(--ibm-ink)' }}>{rule.slaHours}</p>
                        </div>
                        <div>
                          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Action</p>
                          <p className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{rule.slaAction || '--'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                    <button
                      onClick={e => { e.stopPropagation(); handleToggleActive(rule.id, !rule.isActive); }}
                      style={{
                        background: rule.isActive ? 'var(--ibm-surface-2)' : 'var(--ibm-semantic-success)',
                        color: rule.isActive ? 'var(--ibm-ink)' : '#ffffff',
                        fontSize: '12px', fontWeight: 400, letterSpacing: '0.16px', padding: '8px 12px', border: '1px solid var(--ibm-hairline)', cursor: 'pointer',
                      }}
                    >
                      {rule.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setEditingId(rule.id); }}
                      style={{ background: 'var(--ibm-surface-2)', color: 'var(--ibm-ink)', fontSize: '12px', fontWeight: 400, letterSpacing: '0.16px', padding: '8px 12px', border: '1px solid var(--ibm-hairline)', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(rule.id); }}
                      style={{ background: 'var(--ibm-semantic-error)', color: '#ffffff', fontSize: '12px', fontWeight: 400, letterSpacing: '0.16px', padding: '8px 12px', border: 'none', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isEditing && (
              <EditRuleInline
                rule={rule}
                onSave={data => handleEditSave(rule.id, data)}
                onCancel={() => setEditingId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function AIInferredTab({ onStatusChange }: { onStatusChange: () => void }) {
  const [rules, setRules] = useState<BusinessLogicRule[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    const res = await fetch(`/api/v1/rules?${params.toString()}`);
    const data = await res.json();
    setRules(data.rules ?? []);
  }, [statusFilter]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleStatusUpdate = async (ruleId: string, status: 'CONFIRMED' | 'REJECTED') => {
    await fetch(`/api/v1/rules/${ruleId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchRules();
    onStatusChange();
  };

  const filterOptions = ['ALL', 'CANDIDATE', 'CONFIRMED', 'REJECTED'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            style={{
              background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
              padding: '11px 16px', fontSize: '14px', color: 'var(--ibm-ink-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            <span className="ibm-body-sm">Filter: {statusFilter === 'ALL' ? 'All' : statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}</span>
            <span style={{ fontSize: 10 }}>{filterOpen ? '\u25B2' : '\u25BC'}</span>
          </button>
          {filterOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 50,
              background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderTop: 'none', minWidth: 160,
            }}>
              {filterOptions.map(opt => (
                <div
                  key={opt}
                  onClick={() => { setStatusFilter(opt); setFilterOpen(false); }}
                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--ibm-hairline)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span className="ibm-body-sm" style={{ color: opt === statusFilter ? 'var(--ibm-primary)' : 'var(--ibm-ink)' }}>
                    {opt === 'ALL' ? 'All' : opt.charAt(0) + opt.slice(1).toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>No AI-inferred rules found.</p>
      ) : (
        <div style={{ border: '1px solid var(--ibm-hairline)' }}>
          {rules.map(rule => {
            const statusStyle = STATUS_COLORS[rule.status] ?? STATUS_COLORS.CANDIDATE;
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
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    fontSize: '12px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase',
                    padding: '2px 8px', borderLeft: `3px solid ${statusStyle.border}`, color: statusStyle.color,
                  }}>
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
                              <span key={i} style={{ padding: '4px 8px', background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{f}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {rule.status === 'CANDIDATE' && (
                        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusUpdate(rule.id, 'CONFIRMED'); }}
                            style={{ background: 'var(--ibm-semantic-success)', color: '#ffffff', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', padding: '12px 16px', border: 'none', cursor: 'pointer' }}
                          >Confirm</button>
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusUpdate(rule.id, 'REJECTED'); }}
                            style={{ background: 'var(--ibm-semantic-error)', color: '#ffffff', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', padding: '12px 16px', border: 'none', cursor: 'pointer' }}
                          >Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [showAddForm, setShowAddForm] = useState(false);
  const [userRules, setUserRules] = useState<UserRule[]>([]);

  const fetchUserRules = useCallback(async () => {
    const res = await fetch('/api/v1/user-rules?global=true');
    const data = await res.json();
    setUserRules(data.rules ?? []);
  }, []);

  useEffect(() => { fetchUserRules(); }, [fetchUserRules]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'global', label: 'Global Rules', count: userRules.length },
    { id: 'ai-inferred', label: 'AI-Inferred Rules' },
  ];

  return (
    <div style={{ maxWidth: 1152, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="ibm-display-md" style={{ color: 'var(--ibm-ink)', marginBottom: 8 }}>Rules</h1>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)' }}>
            Manage global security rules and review AI-inferred business logic.
          </p>
        </div>
        {activeTab === 'global' && (
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)',
              fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px',
              padding: '12px 16px', border: 'none', cursor: 'pointer',
            }}
          >
            Add rule
          </button>
        )}
      </div>

      <div style={{ borderBottom: '2px solid var(--ibm-hairline)', marginBottom: 32, display: 'flex' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400,
              letterSpacing: '0.16px', lineHeight: 1.29, border: 'none', cursor: 'pointer',
              background: 'transparent', color: activeTab === tab.id ? 'var(--ibm-ink)' : 'var(--ibm-ink-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--ibm-primary)' : '2px solid transparent',
              marginBottom: '-2px', fontFamily: "'IBM Plex Sans', sans-serif",
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {tab.label}
            {tab.count != null && (
              <span style={{
                fontSize: '12px', padding: '1px 6px',
                background: activeTab === tab.id ? 'var(--ibm-primary)' : 'var(--ibm-surface-2)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--ibm-ink-muted)',
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'global' && (
        <GlobalRulesTab rules={userRules} onRefresh={fetchUserRules} />
      )}

      {activeTab === 'ai-inferred' && (
        <AIInferredTab onStatusChange={() => {}} />
      )}

      {showAddForm && (
        <AddRuleForm
          onClose={() => setShowAddForm(false)}
          onCreated={() => { setShowAddForm(false); fetchUserRules(); }}
        />
      )}
    </div>
  );
}