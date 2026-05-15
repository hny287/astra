'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
}

export default function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#0f62fe',
            primaryTextColor: '#f4f4f4',
            primaryBorderColor: '#393939',
            lineColor: '#8d8d8d',
            secondaryColor: '#1f1f1f',
            tertiaryColor: '#262626',
            background: '#161616',
            mainBkg: '#1f1f1f',
            nodeBorder: '#393939',
            clusterBkg: '#1f1f1f',
            titleColor: '#f4f4f4',
            edgeLabelBackground: '#262626',
          },
          fontFamily: '"IBM Plex Sans", sans-serif',
          fontSize: 13,
        });

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render diagram');
          setRendered(false);
        }
      }
    }

    renderChart();
    return () => { cancelled = true; };
  }, [chart]);

  return (
    <div>
      {error && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fff1f1', border: '1px solid var(--ibm-semantic-error)', color: 'var(--ibm-semantic-error)', fontSize: 13 }}>
          Diagram render error: {error}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          display: rendered ? 'block' : 'none',
          overflow: 'auto',
          maxHeight: 600,
        }}
      />
      {!rendered && !error && (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ibm-ink-muted)' }}>
          Rendering diagram...
        </div>
      )}
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowSource(!showSource)}
          style={{
            background: 'var(--ibm-surface-1)',
            border: '1px solid var(--ibm-hairline)',
            color: 'var(--ibm-ink)',
            fontSize: 13,
            padding: '6px 12px',
            cursor: 'pointer',
          }}
        >
          {showSource ? 'Hide Source' : 'View Source'}
        </button>
      </div>
      {showSource && (
        <pre style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ibm-ink)', whiteSpace: 'pre-wrap', overflowX: 'auto', marginTop: 8, padding: 16, background: 'var(--ibm-surface-1)', border: '1px solid var(--ibm-hairline)' }}>
          {chart}
        </pre>
      )}
    </div>
  );
}