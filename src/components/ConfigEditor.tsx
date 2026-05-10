'use client';

import { useState, useEffect, useCallback } from 'react';
import ProviderSelector from './ProviderSelector';
import ThinkingControls from './ThinkingControls';

interface NodeConfig {
  provider: string;
  model: string;
  temperature: number;
  thinkingDepth: string;
  thinkingBudget: number | null;
  topP: number;
  topK: number | null;
  scanDepth: string;
  maxFileBytes: number;
  maxOutputTokens: number;
  contextWindowOverride: number | null;
  instructions: string;
  tools: string[];
  knowledge: string[];
  maxRetries: number;
  retryBackoffMs: number;
  timeoutMs: number;
  concurrency?: number;
}

interface ChatConfig {
  provider: string;
  model: string;
  temperature: number;
  thinkingDepth: string;
  thinkingBudget: number | null;
  topP: number;
  topK: number | null;
  frequencyPenalty: number;
  presencePenalty: number;
  stopSequences: string[];
  maxOutputTokens: number;
  maxRetries: number;
  retryBackoffMs: number;
  timeoutMs: number;
  systemPrompt: string;
}

interface ScanConfig {
  providers: Record<string, unknown>;
  scan: {
    nodes: {
      discover: NodeConfig;
      deepScan: NodeConfig;
      crossFile: NodeConfig;
    };
    severity: string[];
    ignore: string[];
  };
  chat?: ChatConfig;
}

const SCAN_NODE_TABS = [
  { key: 'discover', label: 'Discover' },
  { key: 'deepScan', label: 'Deep Scan' },
  { key: 'crossFile', label: 'Cross-File' },
];

const CHAT_DEPTH_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'max', label: 'Max' },
];

const fieldStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--ibm-surface-1)',
  border: '1px solid var(--ibm-hairline)',
  borderBottom: '2px solid var(--ibm-hairline)',
  padding: '8px 12px',
  fontSize: '14px',
  fontFamily: "'IBM Plex Sans', sans-serif",
  letterSpacing: '0.16px',
  color: 'var(--ibm-ink)',
  outline: 'none',
  borderRadius: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.32px',
  textTransform: 'uppercase' as const,
  color: 'var(--ibm-ink-muted)',
  marginBottom: 6,
};

const sectionStyle: React.CSSProperties = {
  padding: 24,
  background: 'var(--ibm-canvas)',
  border: '1px solid var(--ibm-hairline)',
};

function NodeConfigPanel({ config, providers, onChange }: {
  config: NodeConfig;
  providers: { id: string; models: { id: string; supportsThinking: boolean; maxThinkingTokens: number }[] }[];
  onChange: (update: Partial<NodeConfig>) => void;
}) {
  const activeProvider = providers.find((p) => p.id === config.provider);
  const activeModel = activeProvider?.models.find((m) => m.id === config.model);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Provider & Model</p>
        <ProviderSelector
          selectedProvider={config.provider}
          selectedModel={config.model}
          onChange={(provider, model) => onChange({ provider, model })}
        />
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Thinking</p>
        <ThinkingControls
          thinkingDepth={config.thinkingDepth}
          thinkingBudget={config.thinkingBudget}
          supportsThinking={activeModel?.supportsThinking ?? false}
          maxThinkingTokens={activeModel?.maxThinkingTokens ?? 16384}
          onDepthChange={(depth) => onChange({ thinkingDepth: depth })}
          onBudgetChange={(budget) => onChange({ thinkingBudget: budget })}
        />
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Parameters</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Temperature</label>
            <input type="number" min={0} max={2} step={0.1} value={config.temperature} onChange={(e) => onChange({ temperature: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Top P</label>
            <input type="number" min={0} max={1} step={0.05} value={config.topP} onChange={(e) => onChange({ topP: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Max Output Tokens</label>
            <input type="number" min={256} max={32768} step={256} value={config.maxOutputTokens} onChange={(e) => onChange({ maxOutputTokens: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Max File Bytes</label>
            <input type="number" min={1024} max={1048576} step={1024} value={config.maxFileBytes} onChange={(e) => onChange({ maxFileBytes: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Retry & Timeout</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Max Retries</label>
            <input type="number" min={0} max={5} step={1} value={config.maxRetries} onChange={(e) => onChange({ maxRetries: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Retry Backoff (ms)</label>
            <input type="number" min={100} max={30000} step={500} value={config.retryBackoffMs} onChange={(e) => onChange({ retryBackoffMs: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Timeout (ms)</label>
            <input type="number" min={5000} max={600000} step={5000} value={config.timeoutMs} onChange={(e) => onChange({ timeoutMs: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatConfigPanel({ config, providers, onChange }: {
  config: ChatConfig;
  providers: { id: string; models: { id: string; supportsThinking: boolean; maxThinkingTokens: number }[] }[];
  onChange: (update: Partial<ChatConfig>) => void;
}) {
  const activeProvider = providers.find((p) => p.id === config.provider);
  const activeModel = activeProvider?.models.find((m) => m.id === config.model);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Provider & Model</p>
        <ProviderSelector
          selectedProvider={config.provider}
          selectedModel={config.model}
          onChange={(provider, model) => onChange({ provider, model })}
        />
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>System Prompt</p>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={5}
          style={{
            ...fieldStyle,
            resize: 'vertical',
            minHeight: 100,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 13,
            lineHeight: 1.5,
          }}
          onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }}
        />
        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginTop: 8 }}>
          This sets the AI&apos;s personality and behavior for all chat interactions.
        </p>
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Thinking</p>
        <ThinkingControls
          thinkingDepth={config.thinkingDepth}
          thinkingBudget={config.thinkingBudget}
          supportsThinking={activeModel?.supportsThinking ?? false}
          maxThinkingTokens={activeModel?.maxThinkingTokens ?? 16384}
          onDepthChange={(depth) => onChange({ thinkingDepth: depth })}
          onBudgetChange={(budget) => onChange({ thinkingBudget: budget })}
        />
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Parameters</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Temperature</label>
            <input type="number" min={0} max={2} step={0.1} value={config.temperature} onChange={(e) => onChange({ temperature: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Top P</label>
            <input type="number" min={0} max={1} step={0.05} value={config.topP} onChange={(e) => onChange({ topP: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Max Output Tokens</label>
            <input type="number" min={256} max={32768} step={256} value={config.maxOutputTokens} onChange={(e) => onChange({ maxOutputTokens: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Frequency Penalty</label>
            <input type="number" min={0} max={2} step={0.1} value={config.frequencyPenalty} onChange={(e) => onChange({ frequencyPenalty: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Presence Penalty</label>
            <input type="number" min={0} max={2} step={0.1} value={config.presencePenalty} onChange={(e) => onChange({ presencePenalty: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>Retry & Timeout</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          <div>
            <label style={labelStyle}>Max Retries</label>
            <input type="number" min={0} max={5} step={1} value={config.maxRetries} onChange={(e) => onChange({ maxRetries: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
          <div>
            <label style={labelStyle}>Timeout (ms)</label>
            <input type="number" min={5000} max={120000} step={5000} value={config.timeoutMs} onChange={(e) => onChange({ timeoutMs: Number(e.target.value) })} style={fieldStyle} onFocus={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-primary)'; }} onBlur={(e) => { e.currentTarget.style.borderBottom = '2px solid var(--ibm-hairline)'; }} />
          </div>
        </div>
      </div>
    </div>
  );
}

const PROMPT_KEYS = [
  { key: 'discover', label: 'Discover', description: 'File prioritization and discovery prompt' },
  { key: 'deepScan', label: 'Deep Scan', description: 'Per-file vulnerability analysis prompt' },
  { key: 'crossFile', label: 'Cross-File', description: 'Cross-file business logic inference prompt' },
  { key: 'chat', label: 'Chat', description: 'General AI security assistant system prompt' },
] as const;

function PromptsPanel() {
  const [prompts, setPrompts] = useState<Record<string, { current: string; default: string; isCustom: boolean }> | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/prompts')
      .then((r) => r.json())
      .then((data) => setPrompts(data.prompts))
      .catch(() => {});
  }, []);

  const handleSave = async (key: string) => {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/v1/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, prompt: editValue }),
      });
      if (!res.ok) throw new Error('Save failed');
      setEditingKey(null);
      // Reload
      const data = await (await fetch('/api/v1/prompts')).json();
      setPrompts(data.prompts);
      setStatus(`${key} prompt saved.`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm(`Reset ${key} prompt to default? This cannot be undone.`)) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/v1/prompts?key=${key}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Reset failed');
      const data = await (await fetch('/api/v1/prompts')).json();
      setPrompts(data.prompts);
      setStatus(`${key} prompt reset to default.`);
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(null), 3000);
    }
  };

  if (!prompts) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading prompts...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {PROMPT_KEYS.map(({ key, label, description }) => {
        const prompt = prompts[key];
        if (!prompt) return null;
        const isEditing = editingKey === key;

        return (
          <div key={key} style={sectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>{label} Prompt</p>
                <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 2 }}>{description}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {prompt.isCustom && (
                  <button
                    onClick={() => handleReset(key)}
                    disabled={saving}
                    style={{ background: 'var(--ibm-canvas)', color: 'var(--ibm-semantic-error)', fontSize: 13, padding: '8px 16px', border: '1px solid var(--ibm-semantic-error)', cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.16px' }}
                  >
                    Reset to Default
                  </button>
                )}
                {!isEditing && (
                  <button
                    onClick={() => { setEditingKey(key); setEditValue(prompt.current); }}
                    style={{ background: 'var(--ibm-primary)', color: '#fff', fontSize: 13, padding: '8px 16px', border: 'none', cursor: 'pointer', letterSpacing: '0.16px' }}
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            {prompt.isCustom && <span className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-warning)', marginBottom: 8, display: 'block' }}>Customized</span>}
            {isEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ width: '100%', minHeight: 300, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: 12, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)', resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleSave(key)}
                    disabled={saving}
                    style={{ background: saving ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)', color: saving ? 'var(--ibm-ink-subtle)' : '#fff', fontSize: 13, padding: '8px 16px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', letterSpacing: '0.16px' }}
                  >
                    {saving ? 'Saving...' : 'Save Prompt'}
                  </button>
                  <button
                    onClick={() => setEditingKey(null)}
                    style={{ background: 'var(--ibm-canvas)', color: 'var(--ibm-ink)', fontSize: 13, padding: '8px 16px', border: '1px solid var(--ibm-hairline)', cursor: 'pointer', letterSpacing: '0.16px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <pre style={{ background: 'var(--ibm-surface-1)', padding: 12, fontSize: 12, lineHeight: 1.5, maxHeight: 200, overflow: 'auto', border: '1px solid var(--ibm-hairline)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {prompt.current.slice(0, 500)}{prompt.current.length > 500 ? '...' : ''}
              </pre>
            )}
          </div>
        );
      })}
      {status && (
        <span className="ibm-body-sm" style={{ color: status.startsWith('Error') ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)' }}>
          {status}
        </span>
      )}
    </div>
  );
}

export default function ConfigEditor() {
  const [config, setConfig] = useState<ScanConfig | null>(null);
  const [providers, setProviders] = useState<{ id: string; models: { id: string; supportsThinking: boolean; maxThinkingTokens: number }[] }[]>([]);
  const [activeTab, setActiveTab] = useState<string>('discover');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/config')
      .then((r) => r.json())
      .then((data) => setConfig(data))
      .catch(() => {});
    fetch('/api/v1/providers')
      .then((r) => r.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => {});
  }, []);

  const handleNodeChange = useCallback((nodeKey: string, update: Partial<NodeConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scan: {
          ...prev.scan,
          nodes: {
            ...prev.scan.nodes,
            [nodeKey]: { ...prev.scan.nodes[nodeKey as keyof typeof prev.scan.nodes], ...update } as NodeConfig,
          },
        },
      };
    });
  }, []);

  const handleChatChange = useCallback((update: Partial<ChatConfig>) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chat: { ...prev.chat!, ...update },
      };
    });
  }, []);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/v1/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }
      setSaveStatus('Configuration saved successfully.');
    } catch (err) {
      setSaveStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (!config) return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading configuration...</p>;

  const allTabs = [...SCAN_NODE_TABS, { key: 'chat', label: 'Chat AI' }, { key: 'prompts', label: 'Prompts' }];

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--ibm-hairline)', marginBottom: 24 }}>
        {allTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="ibm-body-sm"
            style={{
              color: activeTab === tab.key ? 'var(--ibm-primary)' : 'var(--ibm-ink-muted)',
              textDecoration: 'none',
              padding: '12px 20px',
              borderBottom: activeTab === tab.key ? '2px solid var(--ibm-primary)' : '2px solid transparent',
              fontWeight: activeTab === tab.key ? 600 : 400,
              background: 'transparent',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {SCAN_NODE_TABS.some(t => t.key === activeTab) && (
        <NodeConfigPanel
          config={config.scan.nodes[activeTab as keyof typeof config.scan.nodes]}
          providers={providers}
          onChange={(update) => handleNodeChange(activeTab, update)}
        />
      )}

      {activeTab === 'chat' && config.chat && (
        <ChatConfigPanel
          config={config.chat}
          providers={providers}
          onChange={handleChatChange}
        />
      )}

      {activeTab === 'prompts' && <PromptsPanel />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: saving ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
            color: saving ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
            border: 'none',
            padding: '12px 24px',
            fontSize: 14,
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: '0.16px',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
        {saveStatus && (
          <span className="ibm-body-sm" style={{ color: saveStatus.startsWith('Error') ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)' }}>
            {saveStatus}
          </span>
        )}
      </div>
    </div>
  );
}