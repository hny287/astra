'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NodeOutput {
  id: string;
  node: string;
  modelUsed: string;
  provider: string;
  nodeConfig: Record<string, unknown>;
  inputJson: Record<string, unknown>;
  outputJson: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  durationMs: number;
  error: string | null;
}

export default function NodeDetailPage() {
  const params = useParams();
  const scanId = params.id as string;
  const nodeName = params.node as string;
  const [outputs, setOutputs] = useState<NodeOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/scans/${scanId}/nodes?node=${encodeURIComponent(nodeName)}`)
      .then((r) => r.json())
      .then((data) => setOutputs(data.outputs ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scanId, nodeName]);

  if (loading) return <div className="font-mono text-sm text-muted-foreground p-8">Loading node output...</div>;
  if (outputs.length === 0) return <div className="font-mono text-sm text-muted-foreground p-8">No outputs found for node &quot;{nodeName}&quot;.</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href={`/scans/${scanId}`} className="text-xs font-mono text-soc-accent hover:underline mb-2 inline-block">
          ← Back to scan
        </Link>
        <h1 className="text-xl font-bold font-mono text-foreground tracking-tight">
          Node: <span className="text-soc-accent">{nodeName}</span>
        </h1>
      </div>

      {outputs.map((output) => (
        <Card key={output.id} className="bg-soc-surface border-soc-border mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-soc-accent">
              {output.modelUsed} <span className="text-muted-foreground font-normal">via {output.provider}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Input Tokens</p>
                <p className="text-sm font-mono tabular-nums">{output.inputTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Output Tokens</p>
                <p className="text-sm font-mono tabular-nums">{output.outputTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Thinking Tokens</p>
                <p className="text-sm font-mono tabular-nums">{output.thinkingTokens.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Duration</p>
                <p className="text-sm font-mono tabular-nums">{output.durationMs.toLocaleString()}ms</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Model</p>
                <p className="text-sm font-mono">{output.modelUsed}</p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-soc-accent mb-0.5">Provider</p>
                <p className="text-sm font-mono">{output.provider}</p>
              </div>
            </div>
            {output.error && (
              <div className="p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-sm font-mono">
                Error: {output.error}
              </div>
            )}
            <details open>
              <summary className="text-[10px] font-mono uppercase tracking-wider text-soc-accent cursor-pointer hover:text-foreground transition-colors mb-2">
                Node Config
              </summary>
              <pre className="p-3 rounded bg-soc-bg border border-soc-border overflow-auto text-xs font-mono max-h-80">
                {JSON.stringify(output.nodeConfig, null, 2)}
              </pre>
            </details>
            <details>
              <summary className="text-[10px] font-mono uppercase tracking-wider text-soc-accent cursor-pointer hover:text-foreground transition-colors mb-2">
                Input JSON
              </summary>
              <pre className="p-3 rounded bg-soc-bg border border-soc-border overflow-auto text-xs font-mono max-h-80">
                {JSON.stringify(output.inputJson, null, 2)}
              </pre>
            </details>
            <details>
              <summary className="text-[10px] font-mono uppercase tracking-wider text-soc-accent cursor-pointer hover:text-foreground transition-colors mb-2">
                Output JSON
              </summary>
              <pre className="p-3 rounded bg-soc-bg border border-soc-border overflow-auto text-xs font-mono max-h-80">
                {JSON.stringify(output.outputJson, null, 2)}
              </pre>
            </details>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}