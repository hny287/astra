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

const CATEGORIES = ['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'] as const;

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  SECURITY: { label: 'Security', color: '#DA1E28', bg: '#FFF1F1', icon: '🛡' },
  COMPLIANCE: { label: 'Compliance', color: '#0F62FE', bg: '#EDF5FF', icon: '📋' },
  SLA: { label: 'SLA', color: '#F1C121', bg: '#FFF9DB', icon: '⏱' },
  BUSINESS_LOGIC: { label: 'Biz Logic', color: '#24A137', bg: '#F0FFF0', icon: '⚙' },
};

const SEV_CONFIG: Record<string, { color: string; bg: string }> = {
  CRITICAL: { color: '#FFFFFF', bg: '#DA1E28' },
  HIGH: { color: '#FFFFFF', bg: '#EE5A6A' },
  MEDIUM: { color: '#1D1D1D', bg: '#F1C121' },
  LOW: { color: '#1D1D1D', bg: '#A7AEAF' },
  INFO: { color: '#FFFFFF', bg: '#0F62FE' },
};

const STATUS_COLORS: Record<string, { color: string; border: string }> = {
  CANDIDATE: { color: 'var(--ibm-semantic-warning)', border: 'var(--ibm-semantic-warning)' },
  CONFIRMED: { color: 'var(--ibm-semantic-success)', border: 'var(--ibm-semantic-success)' },
  REJECTED: { color: 'var(--ibm-semantic-error)', border: 'var(--ibm-semantic-error)' },
};

const INPUT: React.CSSProperties = {
  background: 'var(--ibm-canvas)',
  border: '1px solid var(--ibm-hairline)',
  padding: '10px 14px',
  fontSize: '14px',
  color: 'var(--ibm-ink)',
  fontFamily: "'IBM Plex Sans', sans-serif",
  letterSpacing: '0.16px',
  lineHeight: 1.29,
  width: '100%',
  outline: 'none',
  borderRadius: 0,
  boxSizing: 'border-box',
};

const SELECT: React.CSSProperties = {
  ...INPUT,
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23525252'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  paddingRight: 36,
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.32px',
  color: 'var(--ibm-ink-muted)',
  marginBottom: 4,
  fontFamily: "'IBM Plex Sans', sans-serif",
};

const SECTION_HEADER: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.48px',
  textTransform: 'uppercase' as const,
  color: 'var(--ibm-ink-muted)',
  marginTop: 0,
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '1px solid var(--ibm-hairline)',
};

type Tab = 'global' | 'ai-inferred';
type TypeFilter = 'ALL' | 'SECURITY' | 'COMPLIANCE' | 'SLA' | 'BUSINESS_LOGIC';

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.SECURITY;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.48px', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 0,
      background: cfg.bg, color: cfg.color,
      borderLeft: `3px solid ${cfg.color}`,
    }}>
      <span style={{ fontSize: 12 }}>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

function SevBadge({ severity }: { severity: string }) {
  const cfg = SEV_CONFIG[severity] ?? SEV_CONFIG.INFO;
  return (
    <span style={{
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.48px', textTransform: 'uppercase',
      padding: '3px 10px', borderRadius: 0,
      background: cfg.bg, color: cfg.color,
    }}>
      {severity}
    </span>
  );
}

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
  const [slaAction, setSlaAction] = useState('ESCALATE');
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,22,22,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', width: 720, maxHeight: '90vh', overflow: 'auto', borderRadius: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ibm-hairline)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 300, color: 'var(--ibm-ink)', margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>Add rule</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ibm-ink-muted)', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Basic Info */}
          <div>
            <p style={SECTION_HEADER}>Basic Info</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={LABEL}>Name *</label>
                <input style={INPUT} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. No hardcoded secrets" />
              </div>
              <div>
                <label style={LABEL}>Description</label>
                <input style={INPUT} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of what this rule checks" />
              </div>
              <div>
                <label style={LABEL}>Rule text *</label>
                <textarea style={{ ...INPUT, minHeight: 100, resize: 'vertical' }} value={ruleText} onChange={e => setRuleText(e.target.value)} required placeholder="Detailed instruction for the AI scanner..." />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div>
            <p style={SECTION_HEADER}>Classification</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>Type</label>
                <select style={SELECT} value={type} onChange={e => setType(e.target.value)}>
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Severity</label>
                <select style={SELECT} value={severity} onChange={e => setSeverity(e.target.value)}>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Category</label>
                <select style={SELECT} value={category} onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={LABEL}>Scope</label>
                <select style={SELECT} value={scope} onChange={e => setScope(e.target.value)}>
                  <option value="GLOBAL">Global</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>
              <div>
                <label style={LABEL}>Priority</label>
                <input type="number" style={INPUT} value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} max={10} />
              </div>
            </div>
          </div>

          {/* Matching */}
          <div>
            <p style={SECTION_HEADER}>Matching & Metadata</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={LABEL}>CWE IDs (comma-separated)</label>
                <input style={INPUT} value={cweInput} onChange={e => setCweInput(e.target.value)} placeholder="e.g. CWE-79, CWE-89" />
              </div>
              <div>
                <label style={LABEL}>OWASP (comma-separated)</label>
                <input style={INPUT} value={owaspInput} onChange={e => setOwaspInput(e.target.value)} placeholder="e.g. A03:2021, A01:2021" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={LABEL}>Languages (comma-separated)</label>
                <input style={INPUT} value={languagesInput} onChange={e => setLanguagesInput(e.target.value)} placeholder="e.g. typescript, python" />
              </div>
              <div>
                <label style={LABEL}>Tags (comma-separated)</label>
                <input style={INPUT} value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="e.g. gdpr, pii, payments" />
              </div>
            </div>
          </div>

          {/* SLA */}
          {type === 'SLA' && (
            <div style={{ background: TYPE_CONFIG.SLA.bg, padding: 20, borderLeft: '4px solid #F1C121' }}>
              <p style={{ ...SECTION_HEADER, color: '#9A6D00', borderBottomColor: '#F1C121', marginBottom: 12 }}>SLA Configuration</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={LABEL}>SLA Severity</label>
                  <select style={SELECT} value={slaSeverity} onChange={e => setSlaSeverity(e.target.value)}>
                    {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LABEL}>Hours</label>
                  <input type="number" style={INPUT} value={slaHours} onChange={e => setSlaHours(Number(e.target.value))} min={1} />
                </div>
                <div>
                  <label style={LABEL}>Action on breach</label>
                  <select style={SELECT} value={slaAction} onChange={e => setSlaAction(e.target.value)}>
                    <option value="ESCALATE">Escalate</option>
                    <option value="NOTIFY">Notify</option>
                    <option value="AUTO_CLOSE">Auto-close</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '10px 20px', fontSize: '14px', color: 'var(--ibm-ink)', cursor: 'pointer', letterSpacing: '0.16px', borderRadius: 0 }}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none', padding: '10px 20px', fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1, borderRadius: 0 }}>Add rule</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRuleModal({ rule, onSave, onClose }: { rule: UserRule; onSave: (data: Partial<UserRule>) => void; onClose: () => void }) {
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
  const [slaAction, setSlaAction] = useState(rule.slaAction || 'ESCALATE');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,22,22,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', width: 720, maxHeight: '90vh', overflow: 'auto', borderRadius: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--ibm-hairline)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 300, color: 'var(--ibm-ink)', margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>Edit rule</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--ibm-ink-muted)', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>&times;</button>
        </div>
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Type</label><select style={SELECT} value={type} onChange={e => setType(e.target.value)}>{Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}</select></div>
            <div><label style={LABEL}>Severity</label><select style={SELECT} value={severity} onChange={e => setSeverity(e.target.value)}>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label style={LABEL}>Category</label><select style={SELECT} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Name</label><input style={INPUT} value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label style={LABEL}>Scope</label><select style={SELECT} value={scope} onChange={e => setScope(e.target.value)}><option value="GLOBAL">Global</option><option value="PROJECT">Project</option></select></div>
          </div>
          <div><label style={LABEL}>Description</label><input style={INPUT} value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div><label style={LABEL}>Rule text</label><textarea style={{ ...INPUT, minHeight: 80, resize: 'vertical' }} value={ruleText} onChange={e => setRuleText(e.target.value)} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Priority</label><input type="number" style={INPUT} value={priority} onChange={e => setPriority(Number(e.target.value))} min={0} max={10} /></div>
            <div><label style={LABEL}>CWE IDs</label><input style={INPUT} value={cweInput} onChange={e => setCweInput(e.target.value)} /></div>
            <div><label style={LABEL}>OWASP</label><input style={INPUT} value={owaspInput} onChange={e => setOwaspInput(e.target.value)} /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={LABEL}>Languages</label><input style={INPUT} value={languagesInput} onChange={e => setLanguagesInput(e.target.value)} /></div>
            <div><label style={LABEL}>Tags</label><input style={INPUT} value={tagsInput} onChange={e => setTagsInput(e.target.value)} /></div>
          </div>
          {type === 'SLA' && (
            <div style={{ background: TYPE_CONFIG.SLA.bg, padding: 20, borderLeft: '4px solid #F1C121' }}>
              <p style={{ ...SECTION_HEADER, color: '#9A6D00', borderBottomColor: '#F1C121', marginBottom: 12 }}>SLA Configuration</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div><label style={LABEL}>SLA Severity</label><select style={SELECT} value={slaSeverity} onChange={e => setSlaSeverity(e.target.value)}>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div><label style={LABEL}>Hours</label><input type="number" style={INPUT} value={slaHours} onChange={e => setSlaHours(Number(e.target.value))} min={1} /></div>
                <div><label style={LABEL}>Action</label><select style={SELECT} value={slaAction} onChange={e => setSlaAction(e.target.value)}><option value="ESCALATE">Escalate</option><option value="NOTIFY">Notify</option><option value="AUTO_CLOSE">Auto-close</option></select></div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={onClose} style={{ background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', padding: '10px 20px', fontSize: '14px', color: 'var(--ibm-ink)', cursor: 'pointer', borderRadius: 0 }}>Cancel</button>
            <button onClick={() => {
              const cwe = cweInput.split(',').map(s => s.trim()).filter(Boolean);
              const owasp = owaspInput.split(',').map(s => s.trim()).filter(Boolean);
              const languages = languagesInput.split(',').map(s => s.trim()).filter(Boolean);
              const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean);
              onSave({ name, description, ruleText, severity, category, cwe, type, scope, priority, owasp, languages, tags, ...(type === 'SLA' ? { slaSeverity, slaHours, slaAction } : {}) });
            }} style={{ background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)', border: 'none', padding: '10px 20px', fontSize: '14px', cursor: 'pointer', borderRadius: 0 }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalRulesTab({ rules, onRefresh }: { rules: UserRule[]; onRefresh: () => void }) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<UserRule | null>(null);

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/user-rules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive }) });
    onRefresh();
  };
  const handleDelete = async (id: string) => { await fetch(`/api/v1/user-rules/${id}`, { method: 'DELETE' }); onRefresh(); };
  const handleEditSave = async (id: string, data: Partial<UserRule>) => {
    await fetch(`/api/v1/user-rules/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setEditingRule(null);
    onRefresh();
  };

  const filtered = rules.filter(r => {
    if (typeFilter !== 'ALL' && r.type !== typeFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.ruleText.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (rules.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <p style={{ fontSize: 48, margin: 0, opacity: 0.3 }}>🛡</p>
        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 12 }}>No global rules yet. Create one to enforce it across all scans.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['ALL', 'SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'] as TypeFilter[]).map(f => {
          const isActive = typeFilter === f;
          const cfg = f === 'ALL' ? null : TYPE_CONFIG[f];
          return (
            <button key={f} onClick={() => setTypeFilter(f)} style={{
              padding: '6px 14px', fontSize: '12px', fontWeight: isActive ? 600 : 400, letterSpacing: '0.32px',
              background: isActive ? (cfg ? cfg.color : 'var(--ibm-ink)') : 'var(--ibm-surface-1)',
              color: isActive ? '#ffffff' : 'var(--ibm-ink-muted)',
              border: `1px solid ${isActive ? 'transparent' : 'var(--ibm-hairline)'}`,
              cursor: 'pointer', borderRadius: 0, fontFamily: "'IBM Plex Sans', sans-serif",
            }}>
              {f === 'ALL' ? 'All' : cfg?.label ?? f}
            </button>
          );
        })}
        <div style={{ flex: 1 }} />
        <input
          style={{ ...INPUT, width: 220, padding: '8px 14px', fontSize: '13px' }}
          placeholder="Search rules..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(rule => {
          const isExpanded = expandedId === rule.id;
          const cfg = TYPE_CONFIG[rule.type] ?? TYPE_CONFIG.SECURITY;
          return (
            <div key={rule.id} style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderLeft: `4px solid ${cfg.color}` }}>
              {/* Header */}
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setExpandedId(isExpanded ? null : rule.id)}>
                <TypeBadge type={rule.type} />
                <span style={{ flex: 1, fontWeight: 400, fontSize: '14px', color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.name}</span>
                <SevBadge severity={rule.severity} />
                <span style={{ fontSize: '11px', fontWeight: 400, letterSpacing: '0.16px', padding: '3px 8px', background: 'var(--ibm-surface-1)', color: 'var(--ibm-ink-muted)' }}>{rule.category}</span>
                <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', padding: '3px 8px', background: rule.isActive ? 'rgba(36,161,72,0.1)' : 'var(--ibm-surface-1)', color: rule.isActive ? '#24A137' : 'var(--ibm-ink-muted)' }}>
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--ibm-ink-subtle)' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>
              {/* Body preview */}
              {!isExpanded && (
                <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: '13px', color: 'var(--ibm-ink-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {rule.ruleText}
                  </p>
                  {(rule.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {rule.tags.slice(0, 3).map((tag, i) => (
                        <span key={i} style={{ fontSize: '10px', padding: '2px 6px', background: 'var(--ibm-surface-1)', color: 'var(--ibm-ink-muted)' }}>{tag}</span>
                      ))}
                      {rule.tags.length > 3 && <span style={{ fontSize: '10px', color: 'var(--ibm-ink-subtle)' }}>+{rule.tags.length - 3}</span>}
                    </div>
                  )}
                </div>
              )}
              {/* Expanded details */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--ibm-hairline)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
                    {rule.description && <div><p style={LABEL}>Description</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', margin: 0 }}>{rule.description}</p></div>}
                    <div><p style={LABEL}>Rule text</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', margin: 0, whiteSpace: 'pre-wrap' }}>{rule.ruleText}</p></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div><p style={LABEL}>Type</p><TypeBadge type={rule.type} /></div>
                      <div><p style={LABEL}>Scope</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', margin: 0 }}>{rule.scope === 'PROJECT' ? `Project${rule.repoUrl ? `: ${rule.repoUrl}` : ''}` : 'Global'}</p></div>
                      <div><p style={LABEL}>Priority</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', margin: 0 }}>{rule.priority}</p></div>
                    </div>
                    {rule.cwe.length > 0 && <div><p style={LABEL}>CWE</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{rule.cwe.map((c, i) => <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{c}</span>)}</div></div>}
                    {(rule.owasp ?? []).length > 0 && <div><p style={LABEL}>OWASP</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{rule.owasp.map((o, i) => <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{o}</span>)}</div></div>}
                    {(rule.languages ?? []).length > 0 && <div><p style={LABEL}>Languages</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{rule.languages.map((l, i) => <span key={i} style={{ padding: '2px 8px', background: 'rgba(15,98,254,0.08)', border: '1px solid rgba(15,98,254,0.3)', fontSize: '12px', color: 'var(--ibm-primary)' }}>{l}</span>)}</div></div>}
                    {(rule.tags ?? []).length > 0 && <div><p style={LABEL}>Tags</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{rule.tags.map((t, i) => <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{t}</span>)}</div></div>}
                    {rule.type === 'SLA' && rule.slaSeverity && (
                      <div style={{ padding: 16, background: TYPE_CONFIG.SLA.bg, borderLeft: '4px solid #F1C121' }}>
                        <p style={{ ...LABEL, color: '#9A6D00', marginBottom: 8 }}>SLA Configuration</p>
                        <div style={{ display: 'flex', gap: 24 }}>
                          <div><span style={{ fontSize: '12px', color: 'var(--ibm-ink-subtle)' }}>Severity</span><br /><span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ibm-ink)' }}>{rule.slaSeverity}</span></div>
                          <div><span style={{ fontSize: '12px', color: 'var(--ibm-ink-subtle)' }}>Hours</span><br /><span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ibm-ink)' }}>{rule.slaHours}h</span></div>
                          <div><span style={{ fontSize: '12px', color: 'var(--ibm-ink-subtle)' }}>Action</span><br /><span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ibm-ink)' }}>{rule.slaAction || '—'}</span></div>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button onClick={() => handleToggleActive(rule.id, !rule.isActive)} style={{
                        background: rule.isActive ? 'var(--ibm-surface-1)' : '#24A137', color: rule.isActive ? 'var(--ibm-ink)' : '#fff',
                        fontSize: '12px', padding: '6px 12px', border: rule.isActive ? '1px solid var(--ibm-hairline)' : 'none', cursor: 'pointer', borderRadius: 0,
                      }}>{rule.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => setEditingRule(rule)} style={{ background: 'var(--ibm-surface-1)', color: 'var(--ibm-ink)', fontSize: '12px', padding: '6px 12px', border: '1px solid var(--ibm-hairline)', cursor: 'pointer', borderRadius: 0 }}>Edit</button>
                      <button onClick={() => handleDelete(rule.id)} style={{ background: 'var(--ibm-semantic-error)', color: '#fff', fontSize: '12px', padding: '6px 12px', border: 'none', cursor: 'pointer', borderRadius: 0 }}>Delete</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', textAlign: 'center', padding: 32 }}>No rules match the current filter.</p>}

      {editingRule && <EditRuleModal rule={editingRule} onSave={data => handleEditSave(editingRule.id, data)} onClose={() => setEditingRule(null)} />}
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
    await fetch(`/api/v1/rules/${ruleId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchRules();
    onStatusChange();
  };

  const filterOptions = ['ALL', 'CANDIDATE', 'CONFIRMED', 'REJECTED'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen(!filterOpen)} style={{
            background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
            padding: '11px 16px', fontSize: '14px', color: 'var(--ibm-ink-muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, borderRadius: 0,
          }}>
            <span className="ibm-body-sm">Filter: {statusFilter === 'ALL' ? 'All' : statusFilter.charAt(0) + statusFilter.slice(1).toLowerCase()}</span>
            <span style={{ fontSize: 10 }}>{filterOpen ? '▲' : '▼'}</span>
          </button>
          {filterOpen && (
            <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 50, background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderTop: 'none', minWidth: 160 }}>
              {filterOptions.map(opt => (
                <div key={opt} onClick={() => { setStatusFilter(opt); setFilterOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--ibm-hairline)' }} onMouseEnter={e => { e.currentTarget.style.background = 'var(--ibm-surface-1)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <span className="ibm-body-sm" style={{ color: opt === statusFilter ? 'var(--ibm-primary)' : 'var(--ibm-ink)' }}>{opt === 'ALL' ? 'All' : opt.charAt(0) + opt.slice(1).toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <p style={{ fontSize: 48, margin: 0, opacity: 0.3 }}>📋</p>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 12 }}>No AI-inferred rules found. Rules appear after cross-file analysis completes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rules.map(rule => {
            const statusStyle = STATUS_COLORS[rule.status] ?? STATUS_COLORS.CANDIDATE;
            const isOpen = expanded === rule.id;
            return (
              <div key={rule.id} style={{ background: 'var(--ibm-canvas)', border: '1px solid var(--ibm-hairline)', borderLeft: `4px solid ${statusStyle.border}` }}>
                <div style={{ padding: '14px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => setExpanded(isOpen ? null : rule.id)}>
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--ibm-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rule.ruleText.length > 120 ? `${rule.ruleText.substring(0, 120)}...` : rule.ruleText}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', padding: '3px 10px', borderLeft: `3px solid ${statusStyle.border}`, color: statusStyle.color }}>{rule.status}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ibm-ink-subtle)' }}>{(rule.confidence * 100).toFixed(0)}%</span>
                  <span style={{ fontSize: 10, color: 'var(--ibm-ink-subtle)' }}>{isOpen ? '▲' : '▼'}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--ibm-hairline)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 16 }}>
                      <div><p style={LABEL}>Rule</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap', margin: 0 }}>{rule.ruleText}</p></div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><p style={LABEL}>Confidence</p><p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ibm-ink)', margin: 0 }}>{(rule.confidence * 100).toFixed(0)}%</p></div>
                        <div><p style={LABEL}>Status</p><span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', padding: '3px 10px', borderLeft: `3px solid ${statusStyle.border}`, color: statusStyle.color }}>{rule.status}</span></div>
                      </div>
                      {rule.violationDescription && <div><p style={LABEL}>Violation</p><p style={{ fontSize: '13px', color: 'var(--ibm-ink)', margin: 0 }}>{rule.violationDescription}</p></div>}
                      {rule.evidenceFiles.length > 0 && <div><p style={LABEL}>Evidence</p><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{rule.evidenceFiles.map((f, i) => <span key={i} style={{ padding: '2px 8px', background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', fontSize: '12px', color: 'var(--ibm-ink-muted)' }}>{f}</span>)}</div></div>}
                      {rule.status === 'CANDIDATE' && (
                        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                          <button onClick={e => { e.stopPropagation(); handleStatusUpdate(rule.id, 'CONFIRMED'); }} style={{ background: '#24A137', color: '#fff', fontSize: '14px', padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: 0 }}>Confirm</button>
                          <button onClick={e => { e.stopPropagation(); handleStatusUpdate(rule.id, 'REJECTED'); }} style={{ background: '#DA1E28', color: '#fff', fontSize: '14px', padding: '8px 16px', border: 'none', cursor: 'pointer', borderRadius: 0 }}>Reject</button>
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
          <h1 style={{ fontSize: 32, fontWeight: 300, lineHeight: 1.25, color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Sans', sans-serif", margin: 0 }}>Rules</h1>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 4 }}>
            Manage security rules and review AI-inferred business logic.
          </p>
        </div>
        {activeTab === 'global' && (
          <button onClick={() => setShowAddForm(true)} style={{
            background: 'var(--ibm-primary)', color: 'var(--ibm-on-primary)',
            fontSize: '14px', fontWeight: 400, letterSpacing: '0.16px',
            padding: '10px 20px', border: 'none', cursor: 'pointer', borderRadius: 0,
          }}>
            + Add rule
          </button>
        )}
      </div>

      <div style={{ borderBottom: '2px solid var(--ibm-hairline)', marginBottom: 28, display: 'flex' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '12px 20px', fontSize: '14px', fontWeight: activeTab === tab.id ? 600 : 400,
            letterSpacing: '0.16px', lineHeight: 1.29, border: 'none', cursor: 'pointer',
            background: 'transparent', color: activeTab === tab.id ? 'var(--ibm-ink)' : 'var(--ibm-ink-muted)',
            borderBottom: activeTab === tab.id ? '2px solid var(--ibm-primary)' : '2px solid transparent',
            marginBottom: '-2px', fontFamily: "'IBM Plex Sans', sans-serif",
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {tab.label}
            {tab.count != null && <span style={{ fontSize: '11px', padding: '1px 6px', background: activeTab === tab.id ? 'var(--ibm-primary)' : 'var(--ibm-surface-2)', color: activeTab === tab.id ? '#fff' : 'var(--ibm-ink-muted)' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'global' && <GlobalRulesTab rules={userRules} onRefresh={fetchUserRules} />}
      {activeTab === 'ai-inferred' && <AIInferredTab onStatusChange={() => {}} />}
      {showAddForm && <AddRuleForm onClose={() => setShowAddForm(false)} onCreated={() => { setShowAddForm(false); fetchUserRules(); }} />}
    </div>
  );
}