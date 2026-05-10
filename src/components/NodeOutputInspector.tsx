'use client';

import { useCallback, useState } from 'react';

interface NodeOutput {
  id: string;
  node: string;
  modelUsed: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  durationMs: number;
  error: string | null;
  nodeConfig: Record<string, unknown>;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
}

interface NodeOutputInspectorProps {
  outputs: NodeOutput[];
  scanId?: string;
  onRerun?: () => void;
}

export default function NodeOutputInspector({ outputs, scanId, onRerun }: NodeOutputInspectorProps) {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleRerun = useCallback(async (node: string) => {
    if (!scanId) return;
    setRetrying(node);
    try {
      await fetch(`/api/v1/scans/${scanId}/rerun-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node }),
      });
      onRerun?.();
    } catch {}
    setRetrying(null);
  }, [scanId, onRerun]);

  if (outputs.length === 0) {
    return <p className="ibm-body-sm" style={{ color: 'var(--ibm-ink-subtle)', padding: '16px 0' }}>No node outputs recorded.</p>;
  }

  return (
    <div style={{ border: '1px solid var(--ibm-hairline)' }}>
      {outputs.map((output) => {
        const isOpen = expanded === output.id;
        return (
          <div key={output.id} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
            <div
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
              onClick={() => setExpanded(isOpen ? null : output.id)}
            >
              <span style={{ color: 'var(--ibm-ink-subtle)', fontSize: 10 }}>{isOpen ? '\u25BC' : '\u25B6'}</span>
              <span className="ibm-body-emphasis" style={{ color: 'var(--ibm-ink)' }}>{output.node}</span>
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-muted)' }}>{output.modelUsed}</span>
              <span className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)' }}>({output.provider})</span>
              {output.error && (
                <span className="ibm-caption" style={{ color: 'var(--ibm-semantic-error)', marginLeft: 8 }}>failed</span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                {scanId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRerun(output.node); }}
                    disabled={retrying === output.node}
                    style={{
                      background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)',
                      color: 'var(--ibm-ink-muted)', fontSize: '12px', padding: '6px 12px', cursor: retrying === output.node ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {retrying === output.node ? 'Running...' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            {isOpen && (
              <div style={{ padding: '0 16px 16px', background: 'var(--ibm-surface-1)', borderTop: '1px solid var(--ibm-hairline)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Model', value: output.modelUsed },
                      { label: 'Provider', value: output.provider },
                      { label: 'Input tokens', value: output.inputTokens.toLocaleString() },
                      { label: 'Output tokens', value: output.outputTokens.toLocaleString() },
                      { label: 'Thinking tokens', value: output.thinkingTokens.toLocaleString() },
                      { label: 'Duration', value: `${output.durationMs.toLocaleString()}ms` },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="ibm-caption" style={{ color: 'var(--ibm-ink-subtle)', marginBottom: 2 }}>{item.label}</p>
                        <p className="ibm-body-emphasis tabular-nums" style={{ color: 'var(--ibm-ink)' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  {output.error && (
                    <div style={{ padding: 12, background: 'var(--ibm-red-10)', borderLeft: '3px solid var(--ibm-semantic-error)' }}>
                      <p className="ibm-body-sm" style={{ color: 'var(--ibm-semantic-error)' }}>Error: {output.error}</p>
                    </div>
                  )}
                  {[
                    { label: 'Node config', data: output.nodeConfig },
                    { label: 'Input', data: output.inputJson },
                    { label: 'Output', data: output.outputJson },
                  ].map(item => (
                    <details key={item.label}>
                      <summary className="ibm-caption" style={{ color: 'var(--ibm-primary)', cursor: 'pointer', fontWeight: 600 }}>{item.label}</summary>
                      <pre style={{ marginTop: 8, padding: 16, background: 'var(--ibm-surface-2)', border: '1px solid var(--ibm-hairline)', overflow: 'auto', maxHeight: 256, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', lineHeight: 1.5 }}>
                        {JSON.stringify(item.data, null, 2)}
                      </pre>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}