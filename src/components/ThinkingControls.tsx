'use client';

import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface ThinkingControlsProps {
  thinkingDepth?: string;
  thinkingBudget?: number | null;
  supportsThinking?: boolean;
  maxThinkingTokens?: number;
  onDepthChange: (depth: string) => void;
  onBudgetChange: (budget: number | null) => void;
}

const DEPTH_OPTIONS: { value: string; label: string; desc: string }[] = [
  { value: 'none', label: 'None', desc: 'Fastest, lowest quality' },
  { value: 'low', label: 'Low', desc: 'Quick reasoning (~1K tokens)' },
  { value: 'medium', label: 'Medium', desc: 'Standard reasoning (~2K tokens)' },
  { value: 'high', label: 'High', desc: 'Deep reasoning (~4K tokens)' },
  { value: 'max', label: 'Max', desc: 'Maximum reasoning (~8K+ tokens)' },
];

export default function ThinkingControls({
  thinkingDepth = 'none',
  thinkingBudget = null,
  supportsThinking = false,
  maxThinkingTokens = 16384,
  onDepthChange,
  onBudgetChange,
}: ThinkingControlsProps) {
  if (!supportsThinking) {
    return <p className="text-xs font-mono text-muted-foreground py-2">This model does not support extended thinking.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Thinking Depth
        </Label>
        <RadioGroup value={thinkingDepth} onValueChange={onDepthChange} className="space-y-2 mt-2">
          {DEPTH_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-3">
              <RadioGroupItem value={opt.value} id={`depth-${opt.value}`} className="border-soc-accent text-soc-accent" />
              <div className="flex items-baseline gap-2">
                <label htmlFor={`depth-${opt.value}`} className="font-mono text-sm text-foreground cursor-pointer">{opt.label}</label>
                <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>
      <div>
        <Label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Thinking Budget
          <span className="ml-2 text-muted-foreground/60">
            {thinkingBudget != null ? `${thinkingBudget.toLocaleString()} tokens` : 'auto'}
          </span>
        </Label>
        <Slider
          value={[thinkingBudget ?? 0]}
          min={0}
          max={maxThinkingTokens}
          step={256}
          onValueChange={(v) => {
            const n = typeof v === 'number' ? v : Array.isArray(v) ? v[0] : 0;
            onBudgetChange(n === 0 ? null : n);
          }}
          className="mt-2"
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
          <span>Auto</span>
          <span>{maxThinkingTokens.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}