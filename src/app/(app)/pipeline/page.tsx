'use client';

import { useState, useEffect, useCallback } from 'react';

interface NodeConfig {
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

interface PipelineConfig {
  providers: Record<string, { baseURL?: string; apiKeyEnv?: string; models: Record<string, { inputTokenLimit: number; outputTokenLimit: number; contextWindow: number; temperature: number; supportsThinking: boolean; maxThinkingTokens?: number }> }>;
  scan: {
    nodes: {
      discover: NodeConfig;
      deepScan: NodeConfig;
      crossFile: NodeConfig;
    };
    severity: string[];
    ignore: string[];
  };
  chat?: {
    provider: string;
    model: string;
    temperature: number;
    systemPrompt: string;
    maxOutputTokens: number;
  };
}

const PIPELINE_NODES = [
  { id: 'clone', label: 'Clone', type: 'system', description: 'Git clone the target repository to a temp directory' },
  { id: 'discover', label: 'Discover', type: 'ai', description: 'AI-guided file discovery and prioritization' },
  { id: 'deep_scan', label: 'Deep Scan', type: 'ai', description: 'Per-file vulnerability analysis with AI' },
  { id: 'cross_file', label: 'Cross-File', type: 'ai', description: 'Cross-file business logic and data flow analysis' },
  { id: 'aggregate', label: 'Aggregate', type: 'system', description: 'Deduplicate and merge findings from all scanners' },
  { id: 'persist', label: 'Persist', type: 'system', description: 'Save findings, tasks, and business rules to database' },
];

const NODE_COLORS: Record<string, string> = {
  clone: 'var(--ibm-blue-50)',
  discover: 'var(--ibm-purple-50)',
  deep_scan: 'var(--ibm-semantic-error)',
  cross_file: 'var(--ibm-semantic-warning)',
  aggregate: 'var(--ibm-semantic-success)',
  persist: 'var(--ibm-primary)',
};

const PROVIDERS = ['cloud-ollama', 'hosted-ollama', 'openai', 'anthropic'];
const SCAN_DEPTHS = ['quick', 'standard', 'deep', 'exhaustive'];
const THINKING_DEPTHS = ['none', 'low', 'medium', 'high', 'max'];

function NodeConfigEditor({ nodeId, config, onChange, models }: { nodeId: string; config: NodeConfig; onChange: (c: NodeConfig) => void; models: string[] }) {
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 28, padding: '4px 8px', fontSize: 13,
    fontFamily: "'IBM Plex Sans', sans-serif", border: '1px solid var(--ibm-hairline)',
    background: 'var(--ibm-surface-1)', color: 'var(--ibm-ink)', borderRadius: 0,
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase' as const, color: 'var(--ibm-ink-muted)', marginBottom: 2 };
  const row = (label: string, el: React.ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={labelStyle}>{label}</span>
      {el}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 16px' }}>
      {row('Provider', <select value={config.provider} onChange={e => onChange({ ...config, provider: e.target.value })} style={inputStyle}>
        {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>)}
      {row('Model', <select value={config.model} onChange={e => onChange({ ...config, model: e.target.value })} style={inputStyle}>
        {models.map(m => <option key={m} value={m}>{m}</option>)}
      </select>)}
      {row('Temperature', <input type="number" step="0.1" min="0" max="2" value={config.temperature} onChange={e => onChange({ ...config, temperature: parseFloat(e.target.value) || 0 })} style={inputStyle} />)}
      {row('Scan Depth', <select value={config.scanDepth} onChange={e => onChange({ ...config, scanDepth: e.target.value })} style={inputStyle}>
        {SCAN_DEPTHS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>)}
      {row('Thinking Depth', <select value={config.thinkingDepth} onChange={e => onChange({ ...config, thinkingDepth: e.target.value })} style={inputStyle}>
        {THINKING_DEPTHS.map(d => <option key={d} value={d}>{d}</option>)}
      </select>)}
      {row('Max Output Tokens', <input type="number" step="256" value={config.maxOutputTokens} onChange={e => onChange({ ...config, maxOutputTokens: parseInt(e.target.value) || 4096 })} style={inputStyle} />)}
      {row('Top P', <input type="number" step="0.05" min="0" max="1" value={config.topP} onChange={e => onChange({ ...config, topP: parseFloat(e.target.value) || 0.9 })} style={inputStyle} />)}
      {row('Max Retries', <input type="number" min="0" max="5" value={config.maxRetries} onChange={e => onChange({ ...config, maxRetries: parseInt(e.target.value) || 3 })} style={inputStyle} />)}
      {row('Concurrency', <input type="number" min="1" max="20" value={config.concurrency ?? 5} onChange={e => onChange({ ...config, concurrency: parseInt(e.target.value) || 5 })} style={inputStyle} />)}
      {row('Timeout (ms)', <input type="number" step="5000" value={config.timeoutMs} onChange={e => onChange({ ...config, timeoutMs: parseInt(e.target.value) || 120000 })} style={inputStyle} />)}
      {row('Retry Backoff (ms)', <input type="number" step="500" value={config.retryBackoffMs} onChange={e => onChange({ ...config, retryBackoffMs: parseInt(e.target.value) || 2000 })} style={inputStyle} />)}
      {row('Instructions', <textarea value={config.instructions} onChange={e => onChange({ ...config, instructions: e.target.value })} style={{ ...inputStyle, height: 48, resize: 'vertical' }} placeholder="Additional instructions for this node..." />)}
    </div>
  );
}

export default function PipelinePage() {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const allModels = config ? Object.values(config.providers).flatMap(p => Object.keys(p.models)) : [];

  const updateNodeConfig = (nodeKey: 'discover' | 'deepScan' | 'crossFile', newConfig: NodeConfig) => {
    if (!config) return;
    setConfig({
      ...config,
      scan: {
        ...config.scan,
        nodes: { ...config.scan.nodes, [nodeKey]: newConfig },
      },
    });
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch('/api/v1/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveResult('Saved');
      } else {
        const data = await res.json();
        setSaveResult(`Error: ${data.error || 'Save failed'}`);
      }
    } catch (err) {
      setSaveResult(`Error: ${err instanceof Error ? err.message : 'Save failed'}`);
    }
    setSaving(false);
  };

  if (loading || !config) {
    return (
      <div style={{ padding: 32 }}>
        <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>Loading pipeline configuration...</p>
      </div>
    );
  }

  const nodeConfigMap: Record<string, NodeConfig | null> = {
    clone: null,
    discover: config.scan.nodes.discover,
    deep_scan: config.scan.nodes.deepScan,
    cross_file: config.scan.nodes.crossFile,
    aggregate: null,
    persist: null,
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>Pipeline</h1>
          <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-muted)', marginTop: 4 }}>Configure and manage the scan pipeline nodes</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveResult && (
            <span className="ibm-caption" style={{ color: saveResult.startsWith('Error') ? 'var(--ibm-semantic-error)' : 'var(--ibm-semantic-success)' }}>
              {saveResult}
            </span>
          )}
          <button
            onClick={saveConfig}
            disabled={saving}
            style={{
              height: 36, padding: '6px 20px', fontSize: 14,
              fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 600,
              border: '1px solid var(--ibm-primary)', background: saving ? 'var(--ibm-surface-1)' : 'var(--ibm-primary)',
              color: saving ? 'var(--ibm-ink-subtle)' : '#fff', cursor: saving ? 'not-allowed' : 'pointer', borderRadius: 0,
            }}
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Pipeline Graph */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '24px 0', overflowX: 'auto' }}>
        {PIPELINE_NODES.map((node, i) => {
          const isSelected = selectedNode === node.id;
          const nodeColor = NODE_COLORS[node.id];
          const isAi = node.type === 'ai';
          return (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                onClick={() => setSelectedNode(isSelected ? null : node.id)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 20px', minWidth: 120, cursor: 'pointer',
                  background: isSelected ? 'var(--ibm-surface-1)' : 'var(--ibm-canvas)',
                  borderTop: `4px solid ${nodeColor}`,
                  borderRight: `2px solid ${isSelected ? nodeColor : 'var(--ibm-hairline)'}`,
                  borderBottom: `2px solid ${isSelected ? nodeColor : 'var(--ibm-hairline)'}`,
                  borderLeft: `2px solid ${isSelected ? nodeColor : 'var(--ibm-hairline)'}`,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: nodeColor,
                  boxShadow: isSelected ? `0 0 8px ${nodeColor}` : 'none',
                  transition: 'box-shadow 0.15s',
                }} />
                <span className="ibm-label" style={{ color: 'var(--ibm-ink)', textAlign: 'center', lineHeight: 1.2 }}>{node.label}</span>
                {isAi && <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', fontSize: 10 }}>{nodeConfigMap[node.id]?.provider}</span>}
                <span className="ibm-caption" style={{
                  background: isAi ? 'var(--ibm-purple-10)' : 'var(--ibm-surface-2)',
                  color: isAi ? 'var(--ibm-purple-50)' : 'var(--ibm-ink-subtle)',
                  padding: '1px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '0.32px',
                  textTransform: 'uppercase', border: `1px solid ${isAi ? 'var(--ibm-purple-50)' : 'var(--ibm-hairline)'}`,
                }}>
                  {isAi ? 'AI' : 'SYSTEM'}
                </span>
              </div>
              {i < PIPELINE_NODES.length - 1 && (
                <div style={{ width: 32, height: 2, background: 'var(--ibm-hairline-strong)', margin: '0 4px', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Node Detail */}
      {selectedNode && (
        <div style={{ marginTop: 16, padding: 24, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
          {(() => {
            const node = PIPELINE_NODES.find(n => n.id === selectedNode)!;
            const nodeCfg = nodeConfigMap[selectedNode];
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: NODE_COLORS[selectedNode] }} />
                  <h3 className="ibm-headline" style={{ color: 'var(--ibm-ink)', margin: 0 }}>{node.label}</h3>
                  <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>{node.description}</span>
                </div>
                {nodeCfg ? (
                  <NodeConfigEditor
                    nodeId={selectedNode}
                    config={nodeCfg}
                    onChange={c => updateNodeConfig(selectedNode as 'discover' | 'deepScan' | 'crossFile', c)}
                    models={allModels}
                  />
                ) : (
                  <div style={{ padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)' }}>
                    <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)' }}>
                      This is a system node with no AI configuration. It runs automatically as part of the pipeline.
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Node Summary Table */}
      <div style={{ marginTop: 32 }}>
        <h3 className="ibm-label" style={{ color: 'var(--ibm-ink-muted)', marginBottom: 12 }}>Node Summary</h3>
        <div style={{ border: '1px solid var(--ibm-hairline)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, letterSpacing: '0.16px' }}>
            <thead>
              <tr style={{ background: 'var(--ibm-surface-1)' }}>
                {['Node', 'Type', 'Provider', 'Model', 'Temperature', 'Scan Depth', 'Concurrency', 'Timeout'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, letterSpacing: '0.32px', textTransform: 'uppercase', color: 'var(--ibm-ink-muted)', borderBottom: '1px solid var(--ibm-hairline)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PIPELINE_NODES.map(node => {
                const cfg = nodeConfigMap[node.id];
                return (
                  <tr key={node.id} style={{ borderBottom: '1px solid var(--ibm-hairline)', cursor: 'pointer' }} onClick={() => setSelectedNode(node.id)}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: NODE_COLORS[node.id] }} />
                        <span style={{ fontWeight: 600, color: 'var(--ibm-ink)' }}>{node.label}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', textTransform: 'uppercase', border: `1px solid ${node.type === 'ai' ? 'var(--ibm-purple-50)' : 'var(--ibm-hairline)'}`, color: node.type === 'ai' ? 'var(--ibm-purple-50)' : 'var(--ibm-ink-subtle)' }}>
                        {node.type}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>{cfg?.provider || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13 }}>{cfg?.model || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)', fontVariantNumeric: 'tabular-nums' }}>{cfg?.temperature ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)' }}>{cfg?.scanDepth || '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)', fontVariantNumeric: 'tabular-nums' }}>{cfg?.concurrency ?? '—'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--ibm-ink)', fontVariantNumeric: 'tabular-nums' }}>{cfg ? `${(cfg.timeoutMs / 1000).toFixed(0)}s` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}