# Configuration Schema

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Complete Zod schema for Astra configuration.

---

## Full Schema

```typescript
import { z } from "zod";

// Node-level configuration
export const nodeConfigSchema = z.object({
  provider: z.enum([
    "cloud-ollama",
    "hosted-ollama",
    "openai",
    "anthropic",
    "bedrock",
    "azure-ai-foundry",
    "langgraph",
  ]),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  thinkingDepth: z
    .enum(["none", "low", "medium", "high", "max"])
    .default("medium"),
  thinkingBudget: z.number().nullable().default(null),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().nullable().default(null),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  scanDepth: z
    .enum(["quick", "standard", "deep", "exhaustive"])
    .default("standard"),
  maxFileBytes: z.number().positive().default(204800),
  maxOutputTokens: z.number().positive().default(4096),
  contextWindowOverride: z.number().nullable().default(null),
  instructions: z.string().default(""),
  tools: z.array(z.string()).default([]),
  knowledge: z.array(z.string()).default([]),
  maxRetries: z.number().min(0).max(5).default(3),
  retryBackoffMs: z.number().positive().default(2000),
  timeoutMs: z.number().positive().default(120000),
  concurrency: z.number().positive().optional(),
});

// Chat configuration
export const chatConfigSchema = z.object({
  provider: z.enum([
    "cloud-ollama",
    "hosted-ollama",
    "openai",
    "anthropic",
    "bedrock",
    "azure-ai-foundry",
    "langgraph",
  ]),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.3),
  thinkingDepth: z.enum(["none", "low", "medium", "high", "max"]).default("low"),
  thinkingBudget: z.number().nullable().default(null),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().nullable().default(null),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  maxOutputTokens: z.number().positive().default(2048),
  maxRetries: z.number().min(0).max(5).default(2),
  retryBackoffMs: z.number().positive().default(1000),
  timeoutMs: z.number().positive().default(30000),
  systemPrompt: z.string().default(DEFAULT_SYSTEM_PROMPT),
});

// Provider model configuration
export const providerModelSchema = z.object({
  inputTokenLimit: z.number().positive(),
  outputTokenLimit: z.number().positive(),
  contextWindow: z.number().positive(),
  temperature: z.number().min(0).max(2).default(0.2),
  supportsThinking: z.boolean().default(false),
  maxThinkingTokens: z.number().optional(),
});

// Provider configuration
export const providerSchema = z.object({
  baseURL: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  models: z.record(z.string(), providerModelSchema),
});

// Scan configuration
export const scanSchema = z.object({
  nodes: z.object({
    discover: nodeConfigSchema,
    gitIngest: nodeConfigSchema,
    gitDiagram: nodeConfigSchema,
    toolScan: nodeConfigSchema,
    deepScan: nodeConfigSchema,
    crossFile: nodeConfigSchema,
  }),
  severity: z.array(z.string()).default([
    "CRITICAL",
    "HIGH",
    "MEDIUM",
    "LOW",
    "INFO",
  ]),
  ignore: z.array(z.string()).default([]),
});

// Full configuration
export const configSchema = z.object({
  providers: z.record(z.string(), providerSchema),
  scan: scanSchema,
  chat: chatConfigSchema.optional(),
});

export type ScanConfig = z.infer<typeof configSchema>;
export type NodeConfig = z.infer<typeof nodeConfigSchema>;
export type ChatConfig = z.infer<typeof chatConfigSchema>;
```

---

## Default Node Configurations

```typescript
const DEFAULT_NODE_CONFIGS = {
  discover: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    thinkingDepth: 'low',
    timeoutMs: 60000,
    maxRetries: 2
  },
  gitIngest: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    thinkingDepth: 'none',
    timeoutMs: 30000
  },
  gitDiagram: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    thinkingDepth: 'low',
    timeoutMs: 60000
  },
  toolScan: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    thinkingDepth: 'none',
    timeoutMs: 180000
  },
  deepScan: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    thinkingDepth: 'medium',
    concurrency: 5,
    timeoutMs: 120000
  },
  crossFile: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    thinkingDepth: 'medium',
    timeoutMs: 180000
  }
};
```

---

## Thinking Depth Budgets

```typescript
const THINKING_DEPTH_BUDGET = {
  none: 0,
  low: 1024,
  medium: 2048,
  high: 4096,
  max: 8192
};
```

---

## Scan Depth Output Tokens

```typescript
const SCAN_DEPTH_OUTPUT_TOKENS = {
  quick: 500,
  standard: 2048,
  deep: 4096,
  exhaustive: 8192
};
```

---

## See Also

- [Config API](../api/config.md)
- [Node Configuration Reference](./nodes.md)
- [Provider Registry](./providers.md)
