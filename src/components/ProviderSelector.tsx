'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface ProviderModel {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsThinking: boolean;
  maxThinkingTokens: number;
}

interface Provider {
  id: string;
  name: string;
  models: ProviderModel[];
}

interface ProviderSelectorProps {
  selectedProvider?: string;
  selectedModel?: string;
  onChange: (provider: string, model: string) => void;
}

export default function ProviderSelector({ selectedProvider, selectedModel, onChange }: ProviderSelectorProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [currentProvider, setCurrentProvider] = useState(selectedProvider ?? '');
  const [currentModel, setCurrentModel] = useState(selectedModel ?? '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; latencyMs: number; error?: string } | null>(null);

  useEffect(() => {
    fetch('/api/v1/providers')
      .then((r) => r.json())
      .then((data) => setProviders(data.providers ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setCurrentProvider(selectedProvider ?? '');
    setCurrentModel(selectedModel ?? '');
  }, [selectedProvider, selectedModel]);

  const activeProvider = providers.find((p) => p.id === currentProvider);

  const handleProviderChange = (value: string) => {
    setCurrentProvider(value);
    setCurrentModel('');
    setTestResult(null);
    const prov = providers.find((p) => p.id === value);
    if (prov?.models.length) {
      setCurrentModel(prov.models[0].id);
      onChange(value, prov.models[0].id);
    }
  };

  const handleModelChange = (value: string) => {
    setCurrentModel(value);
    onChange(currentProvider, value);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/v1/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: currentProvider, model: currentModel }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({ connected: false, latencyMs: 0, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Provider</Label>
          <Select value={currentProvider} onValueChange={(v) => handleProviderChange(v ?? '')}>
            <SelectTrigger className="font-mono text-sm bg-soc-bg border-soc-border">
              <SelectValue placeholder="Select provider..." />
            </SelectTrigger>
            <SelectContent className="bg-soc-surface border-soc-border">
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.id} className="font-mono text-sm">
                  {p.name || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Model</Label>
          <Select value={currentModel} onValueChange={(v) => handleModelChange(v ?? '')} disabled={!currentProvider}>
            <SelectTrigger className="font-mono text-sm bg-soc-bg border-soc-border">
              <SelectValue placeholder="Select model..." />
            </SelectTrigger>
            <SelectContent className="bg-soc-surface border-soc-border">
              {activeProvider?.models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="font-mono text-sm">
                  {m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={handleTest}
          disabled={!currentProvider || !currentModel || testing}
          className="font-mono text-xs border-soc-border text-muted-foreground hover:text-foreground hover:border-soc-accent/50"
        >
          {testing ? 'Testing...' : '⚡ Test Connection'}
        </Button>
        {testResult && (
          <span className={`font-mono text-xs flex items-center gap-1.5 ${testResult.connected ? 'text-green-400' : 'text-red-400'}`}>
            <span className="text-base">{testResult.connected ? '✓' : '✗'}</span>
            {testResult.connected
              ? `Connected (${testResult.latencyMs}ms)`
              : `Failed: ${testResult.error}`}
          </span>
        )}
      </div>
    </div>
  );
}