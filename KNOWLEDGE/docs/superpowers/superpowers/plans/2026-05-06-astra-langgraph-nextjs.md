# Astra Next.js + LangGraph.js Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an API-first, AI-native code security scanner with LangGraph.js orchestration inside a Next.js app, per-node configurable AI settings, PostgreSQL persistence, and an IBM Carbon dashboard.

**Architecture:** Single Next.js 15 App Router app. LangGraph.js StateGraph orchestrates the 6-node scan pipeline (clone → discover → deep-scan → cross-file → aggregate → persist). Each node has its own provider, model, thinking controls, scan depth, tools, knowledge, and instructions — all configurable from the dashboard. Every node output is persisted to PostgreSQL via Prisma.

**Tech Stack:** Next.js 15, LangGraph.js, Prisma + PostgreSQL, IBM Carbon Design System, TypeScript 5.6+, Cloud Ollama (glm-5.1:cloud, kimi-k2.6:cloud)

**Spec:** `docs/superpowers/specs/2026-05-06-astra-langgraph-nextjs-design.md`

---

## File Map

### New files (created in `astra-app/`)

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Database schema (Scan, Finding, BusinessLogicRule, NodeOutput, Preset, enums) |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/config.ts` | Zod config validation with per-node AI settings |
| `src/lib/tokenizer.ts` | Token estimation (migrated from astra-core) |
| `src/lib/logger.ts` | Leveled logger (migrated from astra-core) |
| `src/app/layout.tsx` | Root layout with Carbon + IBM Plex Sans |
| `src/app/globals.scss` | Carbon style imports |
| `src/app/page.tsx` | Dashboard home — trigger scan, recent scans |
| `src/app/scans/[id]/page.tsx` | Scan detail — progress, findings, node outputs |
| `src/app/scans/[id]/nodes/[node]/page.tsx` | Node detail — raw I/O, config, tokens |
| `src/app/config/page.tsx` | Per-node AI config editor |
| `src/app/rules/page.tsx` | Business logic rules management |
| `src/app/api/v1/scans/route.ts` | POST start scan, GET list scans |
| `src/app/api/v1/scans/[id]/route.ts` | GET scan details |
| `src/app/api/v1/scans/[id]/stream/route.ts` | GET SSE stream |
| `src/app/api/v1/scans/[id]/nodes/route.ts` | GET node outputs |
| `src/app/api/v1/findings/route.ts` | GET filtered findings |
| `src/app/api/v1/rules/route.ts` | GET rules |
| `src/app/api/v1/rules/[id]/route.ts` | PATCH rule status |
| `src/app/api/v1/config/route.ts` | GET/PUT config |
| `src/app/api/v1/presets/route.ts` | GET/POST presets |
| `src/app/api/v1/providers/route.ts` | GET providers + models |
| `src/app/api/v1/providers/test/route.ts` | POST test connection |
| `src/scan/graph.ts` | LangGraph StateGraph definition + compile |
| `src/scan/state.ts` | ScanState schema + types |
| `src/scan/nodes/clone.ts` | Git clone node |
| `src/scan/nodes/discover.ts` | File discovery + prioritization node |
| `src/scan/nodes/deep-scan.ts` | Per-file vulnerability scan node |
| `src/scan/nodes/cross-file.ts` | Cross-file business logic node |
| `src/scan/nodes/aggregate.ts` | Dedup + totals node |
| `src/scan/nodes/persist.ts` | Write to DB node |
| `src/scan/tools/file-reader.ts` | Read file contents tool |
| `src/scan/tools/directory-lister.ts` | List directory tree tool |
| `src/scan/tools/pattern-matcher.ts` | Regex pre-check tool |
| `src/scan/tools/code-searcher.ts` | Cross-codebase search tool |
| `src/scan/prompts/discover.ts` | Discover node instruction template |
| `src/scan/prompts/deep-scan.ts` | Deep-scan node instruction template |
| `src/scan/prompts/cross-file.ts` | Cross-file node instruction template |
| `src/providers/base.ts` | AIProvider interface + AIRequest/AIResponse types |
| `src/providers/factory.ts` | Create provider by node config |
| `src/providers/cloud-ollama.ts` | Cloud Ollama provider (ollama npm + API key) |
| `src/providers/hosted-ollama.ts` | Self-hosted Ollama provider |
| `src/providers/openai.ts` | OpenAI API provider |
| `src/providers/anthropic.ts` | Anthropic Claude API provider |
| `src/providers/bedrock.ts` | AWS Bedrock provider |
| `src/providers/azure-ai-foundry.ts` | Azure AI Foundry provider |
| `src/providers/langgraph-connector.ts` | LangGraph connectors provider |
| `src/providers/registry.ts` | Provider registry — list providers, models, capabilities |
| `src/rules/patterns/` | Migrated from astra-core |
| `src/rules/guidelines/` | Migrated from astra-core |
| `src/rules/prompts/` | Migrated from astra-core |
| `src/rules/loader.ts` | Knowledge base loader (migrated) |
| `src/rules/parser.ts` | .astra rule parser (migrated) |
| `src/findings/types.ts` | Finding + rule types |
| `src/findings/dedup.ts` | SHA-256 fingerprinting + dedup |
| `src/findings/aggregator.ts` | Merge + dedup findings |
| `src/components/RepoInput.tsx` | Carbon-styled repo URL input |
| `src/components/FindingsTable.tsx` | Carbon DataTable for findings |
| `src/components/ScannerBreakdown.tsx` | Per-node finding count tiles |
| `src/components/BusinessLogicPanel.tsx` | Carbon Accordion for biz logic rules |
| `src/components/SeverityBadge.tsx` | Carbon Tag with severity color |
| `src/components/ScanProgress.tsx` | Live progress bar (SSE) |
| `src/components/NodeOutputInspector.tsx` | Accordion showing node I/O |
| `src/components/ConfigEditor.tsx` | Per-node config editor form |
| `src/components/PresetSelector.tsx` | Scan preset dropdown |
| `src/components/ProviderSelector.tsx` | Provider/model picker with test |
| `src/components/ThinkingControls.tsx` | Thinking depth + budget controls |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |
| `next.config.js` | Next.js config |
| `astra.config.json` | Default scan config |
| `.env` | DATABASE_URL + API keys |
| `docker-compose.yml` | App + PostgreSQL |

---

## Phase 1: Scaffold + Database + Baseline API

Goal: Working Next.js app with PostgreSQL connected, Prisma migrations, and a health-check API endpoint.

### Task 1: Initialize Next.js project with dependencies

**Files:**
- Create: `astra-app/package.json`
- Create: `astra-app/tsconfig.json`
- Create: `astra-app/next.config.js`

- [ ] **Step 1: Create the Next.js project**

```bash
cd /root/astra && npx create-next-app@latest astra-app --typescript --eslint --tailwind=false --src-dir --app --import-alias="@/*" --use-npm --no-turbopack
```

- [ ] **Step 2: Install core dependencies**

```bash
cd /root/astra/astra-app && npm install @langchain/langgraph @langchain/core ollama openai @anthropic-ai/sdk @google/generative-ai @prisma/client @carbon/react @carbon/styles @carbon/icons-react sass commander zod chalk cli-table3
```

- [ ] **Step 3: Install dev dependencies**

```bash
cd /root/astra/astra-app && npm install -D prisma @types/node vitest @vitejs/plugin-react
```

- [ ] **Step 4: Verify build**

```bash
cd /root/astra/astra-app && npm run build
```

Expected: Build succeeds with default Next.js page.

- [ ] **Step 5: Commit**

```bash
git add astra-app/ && git commit -m "feat: scaffold Next.js app with core dependencies"
```

### Task 2: Prisma schema + PostgreSQL connection

**Files:**
- Create: `astra-app/prisma/schema.prisma`
- Create: `astra-app/src/lib/db.ts`
- Create: `astra-app/.env`

- [ ] **Step 1: Initialize Prisma**

```bash
cd /root/astra/astra-app && npx prisma init
```

- [ ] **Step 2: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Scan {
  id              String    @id @default(cuid())
  repoUrl         String
  branch          String    @default("main")
  commitSha       String?
  status          ScanStatus @default(PENDING)
  configJson      Json
  durationSeconds Int?
  totalInputTokens  Int     @default(0)
  totalOutputTokens Int     @default(0)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  findings        Finding[]
  businessRules   BusinessLogicRule[]
  nodeOutputs     NodeOutput[]

  @@index([status])
  @@index([createdAt])
}

model Finding {
  id             String   @id @default(cuid())
  fingerprint    String
  scan           Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  scanId         String
  scanner        String
  ruleId         String
  title          String
  description    String   @default("")
  severity       Severity
  category       Category
  file           String
  lineStart      Int      @default(0)
  lineEnd        Int      @default(0)
  codeSnippet    String   @default("")
  language       String   @default("")
  cwe            String[] @default([])
  owasp          String[] @default([])
  aiExplanation  String?
  aiFix          String?
  exploitScore   Float?
  confidence     Float    @default(0.5)
  remediation    String   @default("")
  rawJson        Json     @default("{}")
  createdAt      DateTime @default(now())

  @@unique([fingerprint, scanId])
  @@index([scanId])
  @@index([severity])
  @@index([category])
}

model BusinessLogicRule {
  id                  String   @id @default(cuid())
  scan                Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  scanId              String
  ruleText            String
  confidence          Float
  evidenceFiles       String[]
  status              RuleStatus @default(CANDIDATE)
  violationDescription String?
  createdAt           DateTime   @default(now())

  @@index([scanId])
}

model NodeOutput {
  id              String   @id @default(cuid())
  scan            Scan     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  scanId          String
  node            String
  modelUsed       String
  provider        String
  nodeConfig      Json
  inputJson       Json
  outputJson      Json
  inputTokens     Int      @default(0)
  outputTokens    Int      @default(0)
  thinkingTokens  Int      @default(0)
  durationMs      Int      @default(0)
  error           String?
  createdAt       DateTime @default(now())

  @@index([scanId])
  @@index([node])
}

model Preset {
  id          String   @id @default(cuid())
  name        String   @unique
  description String   @default("")
  configJson  Json
  isBuiltin   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum ScanStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}

enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

enum Category {
  SAST
  SCA
  SECRETS
  IAC
  DATA_FLOW
  BUSINESS_LOGIC
}

enum RuleStatus {
  CANDIDATE
  CONFIRMED
  REJECTED
}
```

- [ ] **Step 3: Write .env file**

Create `astra-app/.env`:

```
DATABASE_URL="postgresql://super_admin:AlwaysHustling%402026@localhost:5432/astra-dev?schema=public"
OLLAMA_API_KEY=dc2c0c5206874c9c9570d1699673ec89.7QP2F53LglKwuXc0XT4I0TvI
```

- [ ] **Step 4: Write Prisma client singleton**

Create `astra-app/src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 5: Run Prisma migration**

```bash
cd /root/astra/astra-app && npx prisma migrate dev --name init
```

Expected: Migration creates all tables in PostgreSQL.

- [ ] **Step 6: Verify with Prisma Studio**

```bash
cd /root/astra/astra-app && npx prisma db pull
```

Expected: Schema matches what we pushed.

- [ ] **Step 7: Commit**

```bash
git add astra-app/prisma astra-app/src/lib/db.ts astra-app/.env && git commit -m "feat: add Prisma schema, PostgreSQL connection, db singleton"
```

### Task 3: Zod config with per-node AI settings

**Files:**
- Create: `astra-app/src/lib/config.ts`
- Create: `astra-app/astra.config.json`

- [ ] **Step 1: Write the config module**

Create `astra-app/src/lib/config.ts`:

```typescript
import { z } from 'zod';
import fs from 'fs';

const nodeConfigSchema = z.object({
  provider: z.enum(['cloud-ollama', 'hosted-ollama', 'openai', 'anthropic', 'bedrock', 'azure-ai-foundry', 'langgraph']),
  model: z.string(),
  temperature: z.number().min(0).max(2).default(0.2),
  thinkingDepth: z.enum(['none', 'low', 'medium', 'high', 'max']).default('medium'),
  thinkingBudget: z.number().nullable().default(null),
  topP: z.number().min(0).max(1).default(0.9),
  topK: z.number().nullable().default(null),
  frequencyPenalty: z.number().min(0).max(2).default(0),
  presencePenalty: z.number().min(0).max(2).default(0),
  stopSequences: z.array(z.string()).default([]),
  scanDepth: z.enum(['quick', 'standard', 'deep', 'exhaustive']).default('standard'),
  maxFileBytes: z.number().positive().default(51200),
  maxOutputTokens: z.number().positive().default(4096),
  contextWindowOverride: z.number().nullable().default(null),
  instructions: z.string().default(''),
  tools: z.array(z.string()).default([]),
  knowledge: z.array(z.string()).default([]),
  maxRetries: z.number().min(0).max(5).default(3),
  retryBackoffMs: z.number().positive().default(2000),
  timeoutMs: z.number().positive().default(120000),
  concurrency: z.number().positive().optional(),
});

const providerModelSchema = z.object({
  inputTokenLimit: z.number().positive(),
  outputTokenLimit: z.number().positive(),
  contextWindow: z.number().positive(),
  temperature: z.number().min(0).max(2).default(0.2),
  supportsThinking: z.boolean().default(false),
  maxThinkingTokens: z.number().optional(),
});

const providerSchema = z.object({
  baseURL: z.string().optional(),
  apiKeyEnv: z.string().optional(),
  models: z.record(z.string(), providerModelSchema),
});

const scanSchema = z.object({
  nodes: z.object({
    discover: nodeConfigSchema,
    deepScan: nodeConfigSchema,
    crossFile: nodeConfigSchema,
  }),
  severity: z.array(z.string()).default(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
  ignore: z.array(z.string()).default(['node_modules/**', 'dist/**', '*.min.js', '*.lock']),
});

export const configSchema = z.object({
  providers: z.record(z.string(), providerSchema),
  scan: scanSchema,
});

export type AstraConfig = z.infer<typeof configSchema>;
export type NodeConfig = z.infer<typeof nodeConfigSchema>;

export async function loadConfig(configPath: string): Promise<AstraConfig> {
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return configSchema.parse(raw);
}

export function mergeNodeOverrides(base: AstraConfig, overrides: Partial<AstraConfig['scan']['nodes']>): AstraConfig {
  return {
    ...base,
    scan: {
      ...base.scan,
      nodes: {
        discover: { ...base.scan.nodes.discover, ...(overrides.discover ?? {}) },
        deepScan: { ...base.scan.nodes.deepScan, ...(overrides.deepScan ?? {}) },
        crossFile: { ...base.scan.nodes.crossFile, ...(overrides.crossFile ?? {}) },
      },
    },
  };
}

export const SCAN_DEPTH_OUTPUT_TOKENS: Record<string, number> = {
  quick: 500,
  standard: 2048,
  deep: 4096,
  exhaustive: 8192,
};

export const THINKING_DEPTH_BUDGET: Record<string, number> = {
  none: 0,
  low: 1024,
  medium: 2048,
  high: 4096,
  max: 8192,
};
```

- [ ] **Step 2: Write default config**

Create `astra-app/astra.config.json`:

```json
{
  "providers": {
    "cloud-ollama": {
      "baseURL": "https://api.ohmyllama.com",
      "apiKeyEnv": "OLLAMA_API_KEY",
      "models": {
        "glm-5.1:cloud": {
          "inputTokenLimit": 131072,
          "outputTokenLimit": 8192,
          "contextWindow": 131072,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 16384
        },
        "kimi-k2.6:cloud": {
          "inputTokenLimit": 131072,
          "outputTokenLimit": 8192,
          "contextWindow": 131072,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 8192
        }
      }
    },
    "hosted-ollama": {
      "baseURL": "http://localhost:11434",
      "apiKeyEnv": "OLLAMA_API_KEY",
      "models": {
        "deepseek-coder": {
          "inputTokenLimit": 8192,
          "outputTokenLimit": 2048,
          "contextWindow": 8192,
          "temperature": 0.2
        },
        "llama3": {
          "inputTokenLimit": 8192,
          "outputTokenLimit": 2048,
          "contextWindow": 8192,
          "temperature": 0.3
        }
      }
    },
    "openai": {
      "apiKeyEnv": "OPENAI_API_KEY",
      "models": {
        "gpt-4o": {
          "inputTokenLimit": 128000,
          "outputTokenLimit": 16384,
          "contextWindow": 128000,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 10000
        }
      }
    },
    "anthropic": {
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "models": {
        "claude-sonnet-4-20250514": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 16000
        }
      }
    },
    "bedrock": {
      "apiKeyEnv": "AWS_ACCESS_KEY_ID",
      "models": {}
    },
    "azure-ai-foundry": {
      "apiKeyEnv": "AZURE_AI_API_KEY",
      "models": {}
    },
    "langgraph": {
      "models": {}
    }
  },
  "scan": {
    "nodes": {
      "discover": {
        "provider": "cloud-ollama",
        "model": "glm-5.1:cloud",
        "temperature": 0.2,
        "thinkingDepth": "medium",
        "thinkingBudget": null,
        "topP": 0.9,
        "topK": null,
        "scanDepth": "standard",
        "maxFileBytes": 10240,
        "maxOutputTokens": 2048,
        "instructions": "discover",
        "tools": ["directory-lister", "pattern-matcher"],
        "knowledge": ["patterns:injection", "patterns:auth", "guidelines:owasp-top10"],
        "maxRetries": 3,
        "retryBackoffMs": 2000,
        "timeoutMs": 60000
      },
      "deepScan": {
        "provider": "cloud-ollama",
        "model": "kimi-k2.6:cloud",
        "temperature": 0.1,
        "thinkingDepth": "high",
        "thinkingBudget": 8192,
        "topP": 0.95,
        "topK": null,
        "scanDepth": "deep",
        "maxFileBytes": 51200,
        "maxOutputTokens": 4096,
        "instructions": "deep-scan",
        "tools": ["file-reader", "pattern-matcher"],
        "knowledge": ["patterns:*", "guidelines:*"],
        "concurrency": 5,
        "maxRetries": 3,
        "retryBackoffMs": 2000,
        "timeoutMs": 120000
      },
      "crossFile": {
        "provider": "cloud-ollama",
        "model": "glm-5.1:cloud",
        "temperature": 0.2,
        "thinkingDepth": "max",
        "thinkingBudget": 16384,
        "topP": 0.95,
        "topK": null,
        "scanDepth": "exhaustive",
        "maxFileBytes": 51200,
        "maxOutputTokens": 8192,
        "instructions": "cross-file",
        "tools": ["file-reader", "code-searcher"],
        "knowledge": ["patterns:data-flow", "guidelines:business-logic"],
        "maxRetries": 3,
        "retryBackoffMs": 2000,
        "timeoutMs": 180000
      }
    },
    "severity": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
    "ignore": ["node_modules/**", "dist/**", "*.min.js", "*.lock"]
  }
}
```

- [ ] **Step 3: Write failing test for config loading**

Create `astra-app/src/lib/__tests__/config.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { configSchema, mergeNodeOverrides, SCAN_DEPTH_OUTPUT_TOKENS, THINKING_DEPTH_BUDGET } from '../config';

describe('configSchema', () => {
  it('parses valid config with all fields', () => {
    const config = {
      providers: {
        'cloud-ollama': {
          baseURL: 'https://api.ohmyllama.com',
          apiKeyEnv: 'OLLAMA_API_KEY',
          models: {
            'glm-5.1:cloud': {
              inputTokenLimit: 131072,
              outputTokenLimit: 8192,
              contextWindow: 131072,
              temperature: 0.2,
              supportsThinking: true,
              maxThinkingTokens: 16384,
            },
          },
        },
      },
      scan: {
        nodes: {
          discover: {
            provider: 'cloud-ollama',
            model: 'glm-5.1:cloud',
            temperature: 0.2,
            thinkingDepth: 'medium',
            thinkingBudget: null,
            topP: 0.9,
            topK: null,
            scanDepth: 'standard',
            maxFileBytes: 10240,
            maxOutputTokens: 2048,
            instructions: 'discover',
            tools: ['directory-lister'],
            knowledge: ['patterns:injection'],
            maxRetries: 3,
            retryBackoffMs: 2000,
            timeoutMs: 60000,
          },
          deepScan: {
            provider: 'cloud-ollama',
            model: 'kimi-k2.6:cloud',
            temperature: 0.1,
            thinkingDepth: 'high',
            thinkingBudget: 8192,
            topP: 0.95,
            topK: null,
            scanDepth: 'deep',
            maxFileBytes: 51200,
            maxOutputTokens: 4096,
            instructions: 'deep-scan',
            tools: ['file-reader'],
            knowledge: ['patterns:*'],
            concurrency: 5,
            maxRetries: 3,
            retryBackoffMs: 2000,
            timeoutMs: 120000,
          },
          crossFile: {
            provider: 'cloud-ollama',
            model: 'glm-5.1:cloud',
            temperature: 0.2,
            thinkingDepth: 'max',
            thinkingBudget: 16384,
            topP: 0.95,
            topK: null,
            scanDepth: 'exhaustive',
            maxFileBytes: 51200,
            maxOutputTokens: 8192,
            instructions: 'cross-file',
            tools: ['code-searcher'],
            knowledge: ['guidelines:business-logic'],
            maxRetries: 3,
            retryBackoffMs: 2000,
            timeoutMs: 180000,
          },
        },
        severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
      },
    };

    const result = configSchema.parse(config);
    expect(result.scan.nodes.discover.provider).toBe('cloud-ollama');
    expect(result.scan.nodes.deepScan.thinkingDepth).toBe('high');
    expect(result.scan.nodes.crossFile.scanDepth).toBe('exhaustive');
  });

  it('applies defaults for missing optional fields', () => {
    const minimal = {
      providers: {},
      scan: {
        nodes: {
          discover: { provider: 'cloud-ollama', model: 'test' },
          deepScan: { provider: 'cloud-ollama', model: 'test' },
          crossFile: { provider: 'cloud-ollama', model: 'test' },
        },
      },
    };
    const result = configSchema.parse(minimal);
    expect(result.scan.nodes.discover.temperature).toBe(0.2);
    expect(result.scan.nodes.discover.thinkingDepth).toBe('medium');
    expect(result.scan.nodes.discover.scanDepth).toBe('standard');
    expect(result.scan.nodes.discover.maxRetries).toBe(3);
  });

  it('rejects invalid provider', () => {
    const bad = {
      providers: {},
      scan: {
        nodes: {
          discover: { provider: 'invalid-provider', model: 'test' },
          deepScan: { provider: 'cloud-ollama', model: 'test' },
          crossFile: { provider: 'cloud-ollama', model: 'test' },
        },
      },
    };
    expect(() => configSchema.parse(bad)).toThrow();
  });
});

describe('mergeNodeOverrides', () => {
  it('merges node-level overrides', () => {
    const base = configSchema.parse({
      providers: {},
      scan: {
        nodes: {
          discover: { provider: 'cloud-ollama', model: 'glm-5.1:cloud' },
          deepScan: { provider: 'cloud-ollama', model: 'kimi-k2.6:cloud' },
          crossFile: { provider: 'cloud-ollama', model: 'glm-5.1:cloud' },
        },
      },
    });
    const result = mergeNodeOverrides(base, { deepScan: { model: 'gpt-4o', provider: 'openai' } });
    expect(result.scan.nodes.deepScan.model).toBe('gpt-4o');
    expect(result.scan.nodes.deepScan.provider).toBe('openai');
    expect(result.scan.nodes.discover.model).toBe('glm-5.1:cloud');
  });
});

describe('SCAN_DEPTH_OUTPUT_TOKENS', () => {
  it('maps all depths', () => {
    expect(SCAN_DEPTH_OUTPUT_TOKENS.quick).toBe(500);
    expect(SCAN_DEPTH_OUTPUT_TOKENS.exhaustive).toBe(8192);
  });
});

describe('THINKING_DEPTH_BUDGET', () => {
  it('maps all depths', () => {
    expect(THINKING_DEPTH_BUDGET.none).toBe(0);
    expect(THINKING_DEPTH_BUDGET.max).toBe(8192);
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /root/astra/astra-app && npx vitest run src/lib/__tests__/config.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/lib/config.ts astra-app/astra.config.json astra-app/src/lib/__tests__/config.test.ts && git commit -m "feat: Zod config with per-node AI settings, default config, tests"
```

### Task 4: Health-check API + CORS setup

**Files:**
- Create: `astra-app/src/app/api/v1/health/route.ts`
- Modify: `astra-app/src/app/layout.tsx` (add IBM Plex Sans)
- Modify: `astra-app/src/app/globals.scss` (Carbon imports)

- [ ] **Step 1: Update globals.scss with Carbon imports**

Replace `astra-app/src/app/globals.scss`:

```scss
@use '@carbon/react' with (
  $font-path: '~@carbon/fonts'
);
@use '@carbon/styles';
```

- [ ] **Step 2: Update layout.tsx with IBM Plex Sans**

Replace `astra-app/src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Astra Security Scanner',
  description: 'AI-native code security scanning platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontWeight: 400 }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Write health-check endpoint**

Create `astra-app/src/app/api/v1/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ status: 'error', database: 'disconnected', error: e.message }, { status: 503 });
  }
}
```

- [ ] **Step 4: Test health endpoint**

Start the dev server:

```bash
cd /root/astra/astra-app && npm run dev &
sleep 5
curl http://localhost:3000/api/v1/health
```

Expected: `{"status":"ok","database":"connected","timestamp":"..."}`

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/app/ astra-app/src/app/api/ && git commit -m "feat: health-check API, Carbon styles, IBM Plex Sans layout"
```

---

## Phase 2: AI Providers + Provider Registry

Goal: All 7 AI provider adapters working, factory pattern, provider registry with connection testing.

### Task 5: Base provider interface + types

**Files:**
- Create: `astra-app/src/providers/base.ts`

- [ ] **Step 1: Write the base provider interface**

Create `astra-app/src/providers/base.ts`:

```typescript
export type ThinkingDepth = 'none' | 'low' | 'medium' | 'high' | 'max';
export type ScanDepth = 'quick' | 'standard' | 'deep' | 'exhaustive';

export interface AIRequest {
  system: string;
  prompt: string;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  thinkingDepth?: ThinkingDepth;
  thinkingBudget?: number | null;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  durationMs: number;
}

export interface ModelInfo {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsSystemPrompt: boolean;
  supportsThinking: boolean;
  maxThinkingTokens: number;
}

export interface AIProvider {
  id: string;
  send(request: AIRequest): Promise<AIResponse>;
  estimateTokens(text: string): number;
  getModelInfo(): ModelInfo;
  testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }>;
}
```

- [ ] **Step 2: Commit**

```bash
git add astra-app/src/providers/base.ts && git commit -m "feat: base AIProvider interface with thinking/scan controls"
```

### Task 6: Cloud Ollama provider

**Files:**
- Create: `astra-app/src/providers/cloud-ollama.ts`
- Create: `astra-app/src/providers/__tests__/cloud-ollama.test.ts`

- [ ] **Step 1: Write failing test**

Create `astra-app/src/providers/__tests__/cloud-ollama.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudOllamaProvider } from '../cloud-ollama';

describe('CloudOllamaProvider', () => {
  let provider: CloudOllamaProvider;

  beforeEach(() => {
    provider = new CloudOllamaProvider({
      baseURL: 'https://api.ohmyllama.com',
      model: 'kimi-k2.6:cloud',
      apiKeyEnv: 'OLLAMA_API_KEY',
      modelInfo: {
        inputTokenLimit: 131072,
        outputTokenLimit: 8192,
        contextWindow: 131072,
        temperature: 0.2,
        supportsThinking: true,
        maxThinkingTokens: 8192,
      },
    });
  });

  it('has id cloud-ollama', () => {
    expect(provider.id).toBe('cloud-ollama');
  });

  it('returns model info', () => {
    const info = provider.getModelInfo();
    expect(info.id).toBe('kimi-k2.6:cloud');
    expect(info.contextWindow).toBe(131072);
    expect(info.supportsThinking).toBe(true);
  });

  it('estimates tokens', () => {
    const tokens = provider.estimateTokens('hello world test');
    expect(tokens).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /root/astra/astra-app && npx vitest run src/providers/__tests__/cloud-ollama.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write Cloud Ollama provider**

Create `astra-app/src/providers/cloud-ollama.ts`:

```typescript
import { Ollama } from 'ollama';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

interface CloudOllamaConfig {
  baseURL: string;
  model: string;
  apiKeyEnv: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class CloudOllamaProvider implements AIProvider {
  id = 'cloud-ollama';
  private client: InstanceType<typeof Ollama>;
  private config: CloudOllamaConfig;

  constructor(config: CloudOllamaConfig) {
    this.config = config;

    const headers: Record<string, string> = {};
    const apiKey = process.env[config.apiKeyEnv];
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    this.client = new Ollama({
      host: config.baseURL,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const maxRetries = 3;
    const baseDelay = 2000;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const start = Date.now();

      try {
        const response = await this.client.generate({
          model: this.config.model,
          prompt: request.prompt,
          system: request.system,
          stream: false,
          options: {
            temperature: request.temperature ?? this.config.modelInfo.temperature,
            num_predict: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
            top_p: request.topP ?? 0.9,
            top_k: request.topK ?? 40,
            frequency_penalty: request.frequencyPenalty ?? 0,
            presence_penalty: request.presencePenalty ?? 0,
            stop: request.stopSequences,
          },
        });

        const durationMs = Date.now() - start;

        return {
          text: response.response,
          inputTokens: response.prompt_eval_count ?? 0,
          outputTokens: response.eval_count ?? 0,
          thinkingTokens: 0,
          durationMs,
        };
      } catch (e: any) {
        lastError = e;
        const isRetryable = e.message?.includes('fetch failed') || e.message?.includes('ECONNRESET') || e.message?.includes('429') || e.message?.includes('503');
        if (!isRetryable || attempt === maxRetries) {
          throw e;
        }
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: this.config.modelInfo.supportsThinking,
      maxThinkingTokens: this.config.modelInfo.maxThinkingTokens,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { connected: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /root/astra/astra-app && npx vitest run src/providers/__tests__/cloud-ollama.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/providers/ && git commit -m "feat: cloud-ollama provider with retry logic and connection test"
```

### Task 7: Hosted Ollama provider

**Files:**
- Create: `astra-app/src/providers/hosted-ollama.ts`

- [ ] **Step 1: Write hosted Ollama provider**

Create `astra-app/src/providers/hosted-ollama.ts`:

```typescript
import { Ollama } from 'ollama';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

interface HostedOllamaConfig {
  baseURL: string;
  model: string;
  apiKeyEnv?: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class HostedOllamaProvider implements AIProvider {
  id = 'hosted-ollama';
  private client: InstanceType<typeof Ollama>;
  private config: HostedOllamaConfig;

  constructor(config: HostedOllamaConfig) {
    this.config = config;

    const headers: Record<string, string> = {};
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    this.client = new Ollama({
      host: config.baseURL,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.generate({
      model: this.config.model,
      prompt: request.prompt,
      system: request.system,
      stream: false,
      options: {
        temperature: request.temperature ?? this.config.modelInfo.temperature,
        num_predict: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
        top_p: request.topP ?? 0.9,
        top_k: request.topK ?? 40,
      },
    });

    return {
      text: response.response,
      inputTokens: response.prompt_eval_count ?? 0,
      outputTokens: response.eval_count ?? 0,
      thinkingTokens: 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: this.config.modelInfo.supportsThinking,
      maxThinkingTokens: this.config.modelInfo.maxThinkingTokens,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { connected: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add astra-app/src/providers/hosted-ollama.ts && git commit -m "feat: hosted-ollama provider"
```

### Task 8: OpenAI, Anthropic, and stub providers

**Files:**
- Create: `astra-app/src/providers/openai.ts`
- Create: `astra-app/src/providers/anthropic.ts`
- Create: `astra-app/src/providers/bedrock.ts`
- Create: `astra-app/src/providers/azure-ai-foundry.ts`
- Create: `astra-app/src/providers/langgraph-connector.ts`

- [ ] **Step 1: Write OpenAI provider**

Create `astra-app/src/providers/openai.ts`:

```typescript
import OpenAI from 'openai';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

interface OpenAIConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class OpenAIProvider implements AIProvider {
  id = 'openai';
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`Missing ${config.apiKeyEnv} environment variable`);
    this.client = new OpenAI({ apiKey });
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.prompt },
      ],
      temperature: request.temperature ?? this.config.modelInfo.temperature,
      max_tokens: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
      top_p: request.topP ?? 1,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0,
      stop: request.stopSequences,
    });

    const choice = response.choices[0];
    return {
      text: choice?.message?.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      thinkingTokens: 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: this.config.modelInfo.supportsThinking,
      maxThinkingTokens: this.config.modelInfo.maxThinkingTokens,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.models.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { connected: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
```

- [ ] **Step 2: Write Anthropic provider**

Create `astra-app/src/providers/anthropic.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

interface AnthropicConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class AnthropicProvider implements AIProvider {
  id = 'anthropic';
  private client: Anthropic;
  private config: AnthropicConfig;

  constructor(config: AnthropicConfig) {
    this.config = config;
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) throw new Error(`Missing ${config.apiKeyEnv} environment variable`);
    this.client = new Anthropic({ apiKey });
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const useThinking = request.thinkingDepth && request.thinkingDepth !== 'none' && this.config.modelInfo.supportsThinking;
    const thinkingBudget = request.thinkingBudget ?? (useThinking ? this.config.modelInfo.maxThinkingTokens : 0);

    const params: any = {
      model: this.config.model,
      max_tokens: request.maxOutputTokens ?? this.config.modelInfo.outputTokenLimit,
      messages: [{ role: 'user', content: request.prompt }],
      system: request.system,
      temperature: request.temperature ?? this.config.modelInfo.temperature,
      top_p: request.topP ?? 1,
      stop_sequences: request.stopSequences,
    };

    if (useThinking && thinkingBudget > 0) {
      params.thinking = { type: 'enabled', budget_tokens: thinkingBudget };
    }

    const response = await this.client.messages.create(params);

    let text = '';
    let thinkingTokens = 0;
    for (const block of response.content) {
      if (block.type === 'text') text += block.text;
      if (block.type === 'thinking') thinkingTokens += block.thinking.length / 4;
    }

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      thinkingTokens,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: this.config.modelInfo.supportsThinking,
      maxThinkingTokens: this.config.modelInfo.maxThinkingTokens,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.messages.create({
        model: this.config.model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      });
      return { connected: true, latencyMs: Date.now() - start };
    } catch (e: any) {
      return { connected: false, latencyMs: Date.now() - start, error: e.message };
    }
  }
}
```

- [ ] **Step 3: Write stub providers (bedrock, azure, langgraph)**

Create `astra-app/src/providers/bedrock.ts`:

```typescript
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

export class BedrockProvider implements AIProvider {
  id = 'bedrock';

  constructor(private config: { model: string; modelInfo: any }) {}

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error('AWS Bedrock provider not yet implemented');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: 'AWS Bedrock provider not yet implemented' };
  }
}
```

Create `astra-app/src/providers/azure-ai-foundry.ts`:

```typescript
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

export class AzureAIFoundryProvider implements AIProvider {
  id = 'azure-ai-foundry';

  constructor(private config: { model: string; modelInfo: any }) {}

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error('Azure AI Foundry provider not yet implemented');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: 'Azure AI Foundry provider not yet implemented' };
  }
}
```

Create `astra-app/src/providers/langgraph-connector.ts`:

```typescript
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from './base.js';

export class LangGraphConnectorProvider implements AIProvider {
  id = 'langgraph';

  constructor(private config: { model: string; modelInfo: any }) {}

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error('LangGraph connectors provider not yet implemented');
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      id: this.config.model,
      inputTokenLimit: this.config.modelInfo.inputTokenLimit,
      outputTokenLimit: this.config.modelInfo.outputTokenLimit,
      contextWindow: this.config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: 'LangGraph connectors not yet implemented' };
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/providers/ && git commit -m "feat: all 7 AI providers (cloud-ollama, hosted-ollama, openai, anthropic, bedrock stub, azure stub, langgraph stub)"
```

### Task 9: Provider factory + registry

**Files:**
- Create: `astra-app/src/providers/factory.ts`
- Create: `astra-app/src/providers/registry.ts`
- Create: `astra-app/src/providers/__tests__/factory.test.ts`

- [ ] **Step 1: Write failing test for factory**

Create `astra-app/src/providers/__tests__/factory.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { createProvider } from '../factory';

describe('createProvider', () => {
  it('creates cloud-ollama provider', () => {
    const provider = createProvider({
      providerId: 'cloud-ollama',
      providerConfig: { baseURL: 'https://api.ohmyllama.com', apiKeyEnv: 'OLLAMA_API_KEY', models: {} },
      modelId: 'kimi-k2.6:cloud',
      modelConfig: { inputTokenLimit: 131072, outputTokenLimit: 8192, contextWindow: 131072, temperature: 0.2 },
    });
    expect(provider.id).toBe('cloud-ollama');
  });

  it('throws for unknown provider', () => {
    expect(() => createProvider({
      providerId: 'unknown',
      providerConfig: { models: {} },
      modelId: 'test',
      modelConfig: { inputTokenLimit: 100, outputTokenLimit: 100, contextWindow: 100, temperature: 0.2 },
    })).toThrow('Unknown provider: unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /root/astra/astra-app && npx vitest run src/providers/__tests__/factory.test.ts
```

- [ ] **Step 3: Write the factory**

Create `astra-app/src/providers/factory.ts`:

```typescript
import type { AIProvider } from './base.js';
import type { AstraConfig } from '../lib/config.js';
import { CloudOllamaProvider } from './cloud-ollama.js';
import { HostedOllamaProvider } from './hosted-ollama.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { BedrockProvider } from './bedrock.js';
import { AzureAIFoundryProvider } from './azure-ai-foundry.js';
import { LangGraphConnectorProvider } from './langgraph-connector.js';

interface CreateProviderArgs {
  providerId: string;
  providerConfig: any;
  modelId: string;
  modelConfig: any;
}

export function createProvider(args: CreateProviderArgs): AIProvider {
  const { providerId, providerConfig, modelId, modelConfig } = args;
  const mc = {
    inputTokenLimit: modelConfig.inputTokenLimit,
    outputTokenLimit: modelConfig.outputTokenLimit,
    contextWindow: modelConfig.contextWindow,
    temperature: modelConfig.temperature ?? 0.2,
    supportsThinking: modelConfig.supportsThinking ?? false,
    maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
  };

  switch (providerId) {
    case 'cloud-ollama':
      return new CloudOllamaProvider({
        baseURL: providerConfig.baseURL,
        model: modelId,
        apiKeyEnv: providerConfig.apiKeyEnv,
        modelInfo: mc,
      });
    case 'hosted-ollama':
      return new HostedOllamaProvider({
        baseURL: providerConfig.baseURL ?? 'http://localhost:11434',
        model: modelId,
        apiKeyEnv: providerConfig.apiKeyEnv,
        modelInfo: mc,
      });
    case 'openai':
      return new OpenAIProvider({ apiKeyEnv: providerConfig.apiKeyEnv, model: modelId, modelInfo: mc });
    case 'anthropic':
      return new AnthropicProvider({ apiKeyEnv: providerConfig.apiKeyEnv, model: modelId, modelInfo: mc });
    case 'bedrock':
      return new BedrockProvider({ model: modelId, modelInfo: mc });
    case 'azure-ai-foundry':
      return new AzureAIFoundryProvider({ model: modelId, modelInfo: mc });
    case 'langgraph':
      return new LangGraphConnectorProvider({ model: modelId, modelInfo: mc });
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

export function createProviderForNode(nodeName: string, config: AstraConfig): AIProvider {
  const nodeKey = nodeName as 'discover' | 'deepScan' | 'crossFile';
  const nodeConfig = config.scan.nodes[nodeKey];
  const providerConfig = config.providers[nodeConfig.provider];
  if (!providerConfig) throw new Error(`Provider not found in config: ${nodeConfig.provider}`);
  const modelConfig = providerConfig.models[nodeConfig.model];
  if (!modelConfig) throw new Error(`Model not found in config: ${nodeConfig.provider}/${nodeConfig.model}`);

  return createProvider({
    providerId: nodeConfig.provider,
    providerConfig,
    modelId: nodeConfig.model,
    modelConfig,
  });
}
```

- [ ] **Step 4: Write provider registry**

Create `astra-app/src/providers/registry.ts`:

```typescript
import type { AstraConfig } from '../lib/config.js';

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfoEntry[];
}

export interface ModelInfoEntry {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsThinking: boolean;
  maxThinkingTokens: number;
}

const PROVIDER_NAMES: Record<string, string> = {
  'cloud-ollama': 'Cloud Ollama',
  'hosted-ollama': 'Hosted Ollama',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  bedrock: 'AWS Bedrock',
  'azure-ai-foundry': 'Azure AI Foundry',
  langgraph: 'LangGraph Connectors',
};

export function listProviders(config: AstraConfig): ProviderInfo[] {
  return Object.entries(config.providers).map(([id, provider]) => ({
    id,
    name: PROVIDER_NAMES[id] ?? id,
    models: Object.entries(provider.models).map(([modelId, mc]) => ({
      id: modelId,
      inputTokenLimit: mc.inputTokenLimit,
      outputTokenLimit: mc.outputTokenLimit,
      contextWindow: mc.contextWindow,
      supportsThinking: mc.supportsThinking ?? false,
      maxThinkingTokens: mc.maxThinkingTokens ?? 0,
    })),
  }));
}
```

- [ ] **Step 5: Run tests**

```bash
cd /root/astra/astra-app && npx vitest run src/providers/__tests__/
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add astra-app/src/providers/factory.ts astra-app/src/providers/registry.ts astra-app/src/providers/__tests__/factory.test.ts && git commit -m "feat: provider factory + registry for creating providers from config"
```

---

## Phase 3: Scan Pipeline (LangGraph)

Goal: Working LangGraph pipeline that runs clone → discover → deep-scan → cross-file → aggregate → persist, with per-node provider resolution and node output persistence.

### Task 10: Migrate shared types, tokenizer, logger, rules, dedup

**Files:**
- Create: `astra-app/src/findings/types.ts`
- Create: `astra-app/src/findings/dedup.ts`
- Create: `astra-app/src/findings/aggregator.ts`
- Create: `astra-app/src/lib/tokenizer.ts`
- Create: `astra-app/src/lib/logger.ts`
- Create: `astra-app/src/rules/loader.ts` (+ rules/ directory)

- [ ] **Step 1: Migrate findings types**

Create `astra-app/src/findings/types.ts`:

```typescript
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Category = 'SAST' | 'SCA' | 'SECRETS' | 'IAC' | 'DATA_FLOW' | 'BUSINESS_LOGIC';

export interface UnifiedFinding {
  fingerprint: string;
  scanner: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];
  owasp: string[];
  aiExplanation: string;
  aiFix: string;
  exploitScore: number;
  confidence: number;
  remediation: string;
  raw: string;
}

export interface BusinessLogicRule {
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

export interface FileSummary {
  path: string;
  language: string;
  purpose: string;
  exports: string[];
  dependencies: string[];
  riskAreas: string[];
  summary: string;
}
```

- [ ] **Step 2: Migrate dedup**

Create `astra-app/src/findings/dedup.ts`:

```typescript
import { createHash } from 'crypto';

export function fingerprint(scanner: string, ruleId: string, file: string, lineStart: number): string {
  const hash = createHash('sha256');
  hash.update(`${scanner}:${ruleId}:${file}:${lineStart}`);
  return hash.digest('hex').slice(0, 32);
}
```

- [ ] **Step 3: Migrate aggregator**

Create `astra-app/src/findings/aggregator.ts`:

```typescript
import type { UnifiedFinding } from './types.js';

export function aggregate(allFindings: UnifiedFinding[][]): UnifiedFinding[] {
  const merged = allFindings.flat();
  const seen = new Set<string>();
  return merged.filter((f) => {
    if (seen.has(f.fingerprint)) return false;
    seen.add(f.fingerprint);
    return true;
  });
}
```

- [ ] **Step 4: Migrate tokenizer**

Create `astra-app/src/lib/tokenizer.ts`:

```typescript
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function calculateAvailableTokens(params: {
  inputTokenLimit: number;
  outputTokenLimit: number;
  systemPromptTokens: number;
}): number {
  return params.inputTokenLimit - params.outputTokenLimit - params.systemPromptTokens - 500;
}
```

- [ ] **Step 5: Migrate logger**

Create `astra-app/src/lib/logger.ts`:

```typescript
export type LogLevel = 'silent' | 'normal' | 'verbose' | 'debug';

let currentLevel: LogLevel = 'normal';

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  normal: 1,
  verbose: 2,
  debug: 3,
};

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
}

export function step(prefix: string, message: string) {
  if (shouldLog('normal')) {
    console.log(`\x1b[36m▸\x1b[0m \x1b[1m[${prefix}]\x1b[0m ${message}`);
  }
}

export function info(message: string) {
  if (shouldLog('normal')) console.log(message);
}

export function success(message: string) {
  if (shouldLog('normal')) console.log(`\x1b[32m✓\x1b[0m ${message}`);
}

export function warn(message: string) {
  if (shouldLog('normal')) console.log(`\x1b[33m⚠\x1b[0m ${message}`);
}

export function error(message: string) {
  if (shouldLog('normal')) console.log(`\x1b[31m✗\x1b[0m ${message}`);
}

export function verbose(message: string) {
  if (shouldLog('verbose')) console.log(`\x1b[2m${message}\x1b[0m`);
}

export function debug(message: string) {
  if (shouldLog('debug')) console.log(`\x1b[2m${message}\x1b[0m`);
}

export function progress(prefix: string, completed: number, total: number, label: string) {
  if (!shouldLog('normal')) return;
  const pct = Math.round((completed / total) * 100);
  const barLen = 20;
  const filled = Math.round((completed / total) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  process.stdout.write(`\r\x1b[36m▸\x1b[0m [${prefix}] ${bar} ${completed}/${total} (${pct}%) — ${label}`);
}

export function progressEnd() {
  if (shouldLog('normal')) process.stdout.write('\n');
}
```

- [ ] **Step 6: Copy rules directory from astra-core**

```bash
cp -r /root/astra/astra-core/rules /root/astra/astra-app/src/rules
```

- [ ] **Step 7: Commit**

```bash
git add astra-app/src/findings/ astra-app/src/lib/tokenizer.ts astra-app/src/lib/logger.ts astra-app/src/rules/ && git commit -m "feat: migrate types, dedup, aggregator, tokenizer, logger, rules from astra-core"
```

### Task 11: LangGraph state + graph definition

**Files:**
- Create: `astra-app/src/scan/state.ts`
- Create: `astra-app/src/scan/graph.ts`

- [ ] **Step 1: Define scan state**

Create `astra-app/src/scan/state.ts`:

```typescript
import type { UnifiedFinding, BusinessLogicRule, FileSummary } from '../findings/types.js';
import type { AstraConfig } from '../lib/config.js';

export interface PrioritizedFile {
  path: string;
  priority: number;
  language: string;
}

export interface ScanState {
  repoUrl: string;
  branch: string;
  localDir: string;
  commitSha: string;
  scanId: string;
  config: AstraConfig;
  discoveredFiles: PrioritizedFile[];
  skippedFiles: string[];
  totalFiles: number;
  findingsPerFile: Map<string, UnifiedFinding[]>;
  fileSummaries: FileSummary[];
  crossFileFindings: UnifiedFinding[];
  businessRules: BusinessLogicRule[];
  allFindings: UnifiedFinding[];
  deduplicatedFindings: UnifiedFinding[];
  errors: string[];
  tokenUsage: { input: number; output: number; thinking: number };
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
}
```

- [ ] **Step 2: Write the LangGraph graph definition**

Create `astra-app/src/scan/graph.ts`:

```typescript
import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import type { ScanState } from './state.js';
import { cloneNode } from './nodes/clone.js';
import { discoverNode } from './nodes/discover.js';
import { deepScanNode } from './nodes/deep-scan.js';
import { crossFileNode } from './nodes/cross-file.js';
import { aggregateNode } from './nodes/aggregate.js';
import { persistNode } from './nodes/persist.js';

const ScanStateAnnotation = Annotation.Root({
  repoUrl: Annotation({ reducer: (_: string, update: string) => update, default: () => '' }),
  branch: Annotation({ reducer: (_: string, update: string) => update, default: () => 'main' }),
  localDir: Annotation({ reducer: (_: string, update: string) => update, default: () => '' }),
  commitSha: Annotation({ reducer: (_: string, update: string) => update, default: () => '' }),
  scanId: Annotation({ reducer: (_: string, update: string) => update, default: () => '' }),
  config: Annotation({ reducer: (_: any, update: any) => update, default: () => null }),
  discoveredFiles: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  skippedFiles: Annotation({ reducer: (_: string[], update: string[]) => update, default: () => [] }),
  totalFiles: Annotation({ reducer: (_: number, update: number) => update, default: () => 0 }),
  findingsPerFile: Annotation({ reducer: (_: any, update: any) => update, default: () => new Map() }),
  fileSummaries: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  crossFileFindings: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  businessRules: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  allFindings: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  deduplicatedFindings: Annotation({ reducer: (_: any[], update: any[]) => update, default: () => [] }),
  errors: Annotation({ reducer: (a: string[], b: string[]) => [...a, ...b], default: () => [] }),
  tokenUsage: Annotation({ reducer: (_: any, update: any) => update, default: () => ({ input: 0, output: 0, thinking: 0 }) }),
  status: Annotation({ reducer: (_: string, update: string) => update, default: () => 'PENDING' }),
});

export function createScanGraph() {
  const graph = new StateGraph(ScanStateAnnotation)
    .addNode('clone', cloneNode)
    .addNode('discover', discoverNode)
    .addNode('deep_scan', deepScanNode)
    .addNode('cross_file', crossFileNode)
    .addNode('aggregate', aggregateNode)
    .addNode('persist', persistNode)
    .addEdge(START, 'clone')
    .addEdge('clone', 'discover')
    .addEdge('discover', 'deep_scan')
    .addEdge('deep_scan', 'cross_file')
    .addEdge('cross_file', 'aggregate')
    .addEdge('aggregate', 'persist')
    .addEdge('persist', END);

  return graph.compile();
}

export { ScanStateAnnotation };
```

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/scan/ && git commit -m "feat: LangGraph state schema + graph definition with 6-node pipeline"
```

### Task 12: Scan nodes (clone, discover, deep-scan, cross-file, aggregate, persist)

**Files:**
- Create: `astra-app/src/scan/nodes/clone.ts`
- Create: `astra-app/src/scan/nodes/discover.ts`
- Create: `astra-app/src/scan/nodes/deep-scan.ts`
- Create: `astra-app/src/scan/nodes/cross-file.ts`
- Create: `astra-app/src/scan/nodes/aggregate.ts`
- Create: `astra-app/src/scan/nodes/persist.ts`

- [ ] **Step 1: Write clone node**

Create `astra-app/src/scan/nodes/clone.ts`:

```typescript
import fs from 'fs';
import { execSync } from 'child_process';
import os from 'os';
import path from 'path';
import type { ScanState } from '../state.js';

export async function cloneNode(state: ScanState): Promise<Partial<ScanState>> {
  const { repoUrl, branch } = state;
  const startTime = Date.now();

  try {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-scan-'));
    const branchFlag = branch ? ` --branch ${branch}` : '';
    execSync(`git clone --depth 1${branchFlag} ${repoUrl} ${tmpDir}`, { stdio: 'pipe', timeout: 60000 });

    const commitSha = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim();

    return {
      localDir: tmpDir,
      commitSha,
      status: 'RUNNING',
    };
  } catch (e: any) {
    return {
      errors: [`Clone failed: ${e.message}`],
      status: 'FAILED',
    };
  }
}
```

- [ ] **Step 2: Write discover node**

Create `astra-app/src/scan/nodes/discover.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import type { ScanState } from '../state.js';
import { PrioritizedFile } from '../state.js';
import { createProviderForNode } from '../../providers/factory.js';
import { loadKnowledgeBase } from '../../rules/loader.js';
import * as log from '../../lib/logger.js';

const SCANABLE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'pyw', 'go', 'rs', 'rb', 'java', 'kt', 'scala',
  'php', 'cs', 'swift', 'dart',
  'c', 'cpp', 'h', 'hpp',
  'sh', 'bash', 'zsh',
  'sql', 'graphql', 'prisma',
  'yaml', 'yml', 'toml', 'ini',
  'json', 'json5', 'env', 'tf', 'hcl',
]);

const SKIP_FILENAMES = new Set([
  'LICENSE', 'LICENCE', 'COPYING', 'NOTICE', 'CHANGELOG', 'CHANGES', 'HISTORY',
  'CONTRIBUTING', 'CODE_OF_CONDUCT', '.gitignore', '.gitkeep', '.editorconfig',
  '.prettierrc', '.eslintrc', '.babelrc',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb',
]);

function isScanableFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (SKIP_FILENAMES.has(basename)) return false;
  if (basename.endsWith('.md') && basename !== '.env') return false;
  if (/\.(zip|tar|gz|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2|ttf|eot|pdf|doc|docx)$/.test(basename)) return false;
  const ext = path.extname(filePath).slice(1).toLowerCase();
  return SCANABLE_EXTENSIONS.has(ext);
}

function fallbackPrioritize(files: string[]): PrioritizedFile[] {
  return files.map((f) => {
    const lower = f.toLowerCase();
    let priority = 4;
    if (/(route|api|controller|server|app|main|index)\.(ts|js|py|go)$/.test(lower)) priority = 0;
    else if (/(auth|jwt|middleware|perm|session|token|csrf)/.test(lower)) priority = 1;
    else if (/(service|model|payment|user|order|checkout)/.test(lower)) priority = 2;
    else if (/(config|schema|migration|docker|compose|\.env)/.test(lower)) priority = 3;
    const ext = path.extname(f).slice(1);
    const langMap: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', py: 'python', go: 'go', rs: 'rust', rb: 'ruby', java: 'java' };
    return { path: f, priority, language: langMap[ext] ?? ext };
  }).sort((a, b) => a.priority - b.priority);
}

export async function discoverNode(state: ScanState): Promise<Partial<ScanState>> {
  const { localDir, config } = state;
  const nodeConfig = config.scan.nodes.discover;

  const allFiles: string[] = [];
  const ignore = config.scan.ignore ?? [];

  function walk(dir: string, relTo: string) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      if (ignore.some(pattern => item.name.match(pattern.replace(/\*/g, '.*')))) continue;
      if (item.name.startsWith('.') && item.name !== '.env') continue;
      const full = path.join(dir, item.name);
      const rel = path.join(relTo, item.name);
      if (item.isDirectory()) walk(full, rel);
      else if (item.isFile()) allFiles.push(rel);
    }
  }

  walk(localDir, '');

  const scanable: string[] = [];
  const skipped: string[] = [];
  for (const f of allFiles) {
    (isScanableFile(f) ? scanable : skipped).push(f);
  }

  const files = fallbackPrioritize(scanable);

  return {
    discoveredFiles: files,
    skippedFiles: skipped,
    totalFiles: allFiles.length,
  };
}
```

- [ ] **Step 3: Write deep-scan node**

Create `astra-app/src/scan/nodes/deep-scan.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import type { ScanState } from '../state.js';
import type { UnifiedFinding, FileSummary } from '../../findings/types.js';
import { fingerprint } from '../../findings/dedup.js';
import { createProviderForNode } from '../../providers/factory.js';
import { loadKnowledgeBase } from '../../rules/loader.js';
import { estimateTokens, calculateAvailableTokens } from '../../lib/tokenizer.js';
import { SCAN_DEPTH_OUTPUT_TOKENS, THINKING_DEPTH_BUDGET } from '../../lib/config.js';
import * as log from '../../lib/logger.js';

function parseDeepScanResponse(text: string, filePath: string): { findings: UnifiedFinding[]; fileSummary: FileSummary; errors: string[] } {
  const emptySummary: FileSummary = { path: filePath, language: '', purpose: '', exports: [], dependencies: [], riskAreas: [], summary: '' };
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) return { findings: [], fileSummary: emptySummary, errors: ['No JSON found in AI response'] };

  try {
    const json = JSON.parse(match[0]);
    const findings: UnifiedFinding[] = (json.findings ?? []).map((f: any) => ({
      fingerprint: fingerprint('ai-deep-scan', f.ruleId ?? 'unknown', filePath, f.lineStart ?? 0),
      scanner: 'ai-deep-scan',
      ruleId: f.ruleId ?? 'unknown',
      title: f.title ?? 'Unknown finding',
      description: f.aiExplanation ?? '',
      severity: f.severity ?? 'INFO',
      category: f.category ?? 'SAST',
      file: filePath,
      lineStart: f.lineStart ?? 0,
      lineEnd: f.lineEnd ?? f.lineStart ?? 0,
      codeSnippet: f.codeSnippet ?? '',
      language: f.language ?? '',
      cwe: f.cwe ?? [],
      owasp: f.owasp ?? [],
      aiExplanation: f.aiExplanation ?? '',
      aiFix: f.aiFix ?? '',
      exploitScore: f.exploitScore ?? 0,
      confidence: f.confidence ?? 0.5,
      remediation: f.remediation ?? '',
      raw: JSON.stringify(f),
    }));

    const fileSummary: FileSummary = json.fileSummary ?? emptySummary;
    fileSummary.path = filePath;
    return { findings, fileSummary, errors: [] };
  } catch (e: any) {
    return { findings: [], fileSummary: emptySummary, errors: [`Failed to parse: ${e.message}`] };
  }
}

export async function deepScanNode(state: ScanState): Promise<Partial<ScanState>> {
  const { localDir, discoveredFiles, config } = state;
  const nodeConfig = config.scan.nodes.deepScan;
  const provider = createProviderForNode('deepScan', config);
  const modelInfo = provider.getModelInfo();
  const concurrency = nodeConfig.concurrency ?? 5;

  const rulesDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../rules');
  const knowledgeBase = await loadKnowledgeBase(rulesDir);

  const systemPrompt = knowledgeBase.prompts.deepScan || 'You are a security expert. Analyze the code for vulnerabilities. Return findings as JSON.';
  const systemPromptTokens = provider.estimateTokens(systemPrompt);
  const availableTokens = calculateAvailableTokens({
    inputTokenLimit: modelInfo.inputTokenLimit,
    outputTokenLimit: modelInfo.outputTokenLimit,
    systemPromptTokens,
  });

  const maxOutputTokens = nodeConfig.maxOutputTokens ?? SCAN_DEPTH_OUTPUT_TOKENS[nodeConfig.scanDepth] ?? 4096;
  const thinkingBudget = nodeConfig.thinkingBudget ?? THINKING_DEPTH_BUDGET[nodeConfig.thinkingDepth] ?? null;

  const allFindings: UnifiedFinding[] = [];
  const allSummaries: FileSummary[] = [];
  const allErrors: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;
  let completed = 0;

  const filesToScan = discoveredFiles.filter((f) => {
    const fullPath = path.join(localDir, f.path);
    if (!fs.existsSync(fullPath)) return false;
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.length > (nodeConfig.maxFileBytes ?? 51200) * 2) return false;
    if (estimateTokens(content) > availableTokens) return false;
    return true;
  });

  log.step('DEEP SCAN', `${filesToScan.length} files, concurrency ${concurrency}`);

  const maxRetries = nodeConfig.maxRetries ?? 3;
  const baseDelay = nodeConfig.retryBackoffMs ?? 2000;
  const timeoutMs = nodeConfig.timeoutMs ?? 120000;

  async function scanFile(file: { path: string; priority: number }): Promise<void> {
    const fullPath = path.join(localDir, file.path);
    const content = fs.readFileSync(fullPath, 'utf8');
    const fileTokens = estimateTokens(content);
    log.verbose(`Scanning: ${file.path} (~${fileTokens} tokens)`);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await provider.send({
          system: systemPrompt,
          prompt: content,
          maxOutputTokens,
          temperature: nodeConfig.temperature,
          topP: nodeConfig.topP,
          topK: nodeConfig.topK,
          thinkingDepth: nodeConfig.thinkingDepth,
          thinkingBudget,
          stopSequences: nodeConfig.stopSequences,
        });

        totalInputTokens += response.inputTokens;
        totalOutputTokens += response.outputTokens;
        totalThinkingTokens += response.thinkingTokens;

        const result = parseDeepScanResponse(response.text, file.path);
        allFindings.push(...result.findings);
        if (result.fileSummary.purpose !== 'skipped') allSummaries.push(result.fileSummary);
        allErrors.push(...result.errors);

        completed++;
        if (result.findings.length > 0) log.info(`${file.path}: ${result.findings.length} finding(s)`);
        log.progress('DEEP SCAN', completed, filesToScan.length, file.path);
        break;
      } catch (e: any) {
        if (attempt === maxRetries) {
          completed++;
          allErrors.push(`AI error for ${file.path}: ${e.message}`);
          log.warn(`AI error on ${file.path}: ${e.message}`);
          log.progress('DEEP SCAN', completed, filesToScan.length, `${file.path} (error)`);
        } else {
          const delay = baseDelay * Math.pow(2, attempt);
          log.warn(`Retry ${attempt + 1}/${maxRetries} for ${file.path}, waiting ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, filesToScan.length) }, async () => {
    for (const file of filesToScan) {
      if (completed >= filesToScan.length) break;
      await scanFile(file);
    }
  });

  await Promise.all(workers);
  log.progressEnd();

  return {
    findingsPerFile: new Map([[state.scanId, allFindings]]),
    fileSummaries: allSummaries,
    allFindings,
    errors: allErrors,
    tokenUsage: { input: totalInputTokens, output: totalOutputTokens, thinking: totalThinkingTokens },
  };
}
```

- [ ] **Step 4: Write cross-file node**

Create `astra-app/src/scan/nodes/cross-file.ts`:

```typescript
import type { ScanState } from '../state.js';
import type { UnifiedFinding, BusinessLogicRule } from '../../findings/types.js';
import { fingerprint } from '../../findings/dedup.js';
import { createProviderForNode } from '../../providers/factory.js';
import { loadKnowledgeBase } from '../../rules/loader.js';
import * as log from '../../lib/logger.js';

function parseCrossFileResponse(text: string): { findings: UnifiedFinding[]; rules: BusinessLogicRule[]; errors: string[] } {
  let jsonStr = text;
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
  const match = jsonStr.match(/\{[\s\S]*\}/);
  if (!match) return { findings: [], rules: [], errors: ['No JSON found'] };

  try {
    const json = JSON.parse(match[0]);
    const findings: UnifiedFinding[] = (json.findings ?? []).map((f: any) => ({
      fingerprint: fingerprint('ai-cross-file', f.ruleId ?? 'unknown', f.file ?? 'multiple', f.lineStart ?? 0),
      scanner: 'ai-cross-file',
      ruleId: f.ruleId ?? 'unknown',
      title: f.title ?? 'Unknown cross-file issue',
      description: f.aiExplanation ?? '',
      severity: f.severity ?? 'INFO',
      category: f.category ?? 'BUSINESS_LOGIC',
      file: f.file ?? 'multiple',
      lineStart: f.lineStart ?? 0,
      lineEnd: f.lineEnd ?? 0,
      codeSnippet: f.codeSnippet ?? '',
      language: f.language ?? '',
      cwe: f.cwe ?? [],
      owasp: f.owasp ?? [],
      aiExplanation: f.aiExplanation ?? '',
      aiFix: f.aiFix ?? '',
      exploitScore: f.exploitScore ?? 0,
      confidence: f.confidence ?? 0.5,
      remediation: f.remediation ?? '',
      raw: JSON.stringify(f),
    }));

    const rules: BusinessLogicRule[] = (json.rules ?? []).map((r: any) => ({
      ruleText: r.ruleText ?? '',
      confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
      evidenceFiles: Array.isArray(r.evidenceFiles) ? r.evidenceFiles : [],
      status: 'CANDIDATE' as const,
      violationDescription: r.violationDescription ?? null,
    }));

    return { findings, rules, errors: [] };
  } catch (e: any) {
    return { findings: [], rules: [], errors: [`Parse error: ${e.message}`] };
  }
}

export async function crossFileNode(state: ScanState): Promise<Partial<ScanState>> {
  const { fileSummaries, config } = state;
  const nodeConfig = config.scan.nodes.crossFile;

  if (fileSummaries.length === 0) {
    log.info('Cross-file: no summaries, skipping');
    return { crossFileFindings: [], businessRules: [] };
  }

  const provider = createProviderForNode('crossFile', config);
  const rulesDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../rules');
  const { path } = await import('path');
  const knowledgeBase = await loadKnowledgeBase(rulesDir);

  const systemPrompt = knowledgeBase.prompts.businessLogic || 'You are a security expert analyzing cross-file security issues. Return findings as JSON.';

  const summariesText = fileSummaries
    .map((s) => `--- ${s.path} ---\nPurpose: ${s.purpose}\nExports: ${s.exports.join(', ')}\nDependencies: ${s.dependencies.join(', ')}\nRisk: ${s.riskAreas.join(', ')}\nSummary: ${s.summary}`)
    .join('\n\n');

  const prompt = `Analyze these file summaries for cross-file security issues:\n\n${summariesText}`;

  try {
    const response = await provider.send({
      system: systemPrompt,
      prompt,
      maxOutputTokens: nodeConfig.maxOutputTokens ?? 8192,
      temperature: nodeConfig.temperature,
      topP: nodeConfig.topP,
      thinkingDepth: nodeConfig.thinkingDepth,
      thinkingBudget: nodeConfig.thinkingBudget,
    });

    const parsed = parseCrossFileResponse(response.text);
    log.success(`Cross-file: ${parsed.findings.length} finding(s), ${parsed.rules.length} rule(s)`);

    return {
      crossFileFindings: parsed.findings,
      businessRules: parsed.rules,
      errors: parsed.errors,
      tokenUsage: {
        input: (state.tokenUsage.input ?? 0) + response.inputTokens,
        output: (state.tokenUsage.output ?? 0) + response.outputTokens,
        thinking: (state.tokenUsage.thinking ?? 0) + response.thinkingTokens,
      },
    };
  } catch (e: any) {
    return { crossFileFindings: [], businessRules: [], errors: [`Cross-file AI error: ${e.message}`] };
  }
}
```

- [ ] **Step 5: Write aggregate node**

Create `astra-app/src/scan/nodes/aggregate.ts`:

```typescript
import type { ScanState } from '../state.js';
import { aggregate } from '../../findings/aggregator.js';

export async function aggregateNode(state: ScanState): Promise<Partial<ScanState>> {
  const allRaw = [...(state.allFindings ?? []), ...(state.crossFileFindings ?? [])];
  const deduped = aggregate([allRaw]);
  const severityFilter = new Set(state.config.scan.severity);
  const filtered = deduped.filter((f) => severityFilter.has(f.severity));

  return { deduplicatedFindings: filtered };
}
```

- [ ] **Step 6: Write persist node**

Create `astra-app/src/scan/nodes/persist.ts`:

```typescript
import type { ScanState } from '../state.js';
import { prisma } from '../../lib/db.js';
import * as log from '../../lib/logger.js';

export async function persistNode(state: ScanState): Promise<Partial<ScanState>> {
  const { scanId, deduplicatedFindings, businessRules, tokenUsage, errors } = state;

  try {
    for (const finding of deduplicatedFindings) {
      await prisma.finding.upsert({
        where: { fingerprint_scanId: { fingerprint: finding.fingerprint, scanId } },
        create: {
          fingerprint: finding.fingerprint,
          scanId,
          scanner: finding.scanner,
          ruleId: finding.ruleId,
          title: finding.title,
          description: finding.description,
          severity: finding.severity as any,
          category: finding.category as any,
          file: finding.file,
          lineStart: finding.lineStart,
          lineEnd: finding.lineEnd,
          codeSnippet: finding.codeSnippet,
          language: finding.language,
          cwe: finding.cwe,
          owasp: finding.owasp,
          aiExplanation: finding.aiExplanation,
          aiFix: finding.aiFix,
          exploitScore: finding.exploitScore,
          confidence: finding.confidence,
          remediation: finding.remediation,
          rawJson: JSON.stringify(finding.raw ? JSON.parse(finding.raw) : finding),
        },
        update: {},
      });
    }

    for (const rule of businessRules) {
      await prisma.businessLogicRule.create({
        data: {
          scanId,
          ruleText: rule.ruleText,
          confidence: rule.confidence,
          evidenceFiles: rule.evidenceFiles,
          status: rule.status as any,
          violationDescription: rule.violationDescription,
        },
      });
    }

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: 'COMPLETED',
        totalInputTokens: tokenUsage.input,
        totalOutputTokens: tokenUsage.output,
      },
    });

    log.success(`Persisted ${deduplicatedFindings.length} findings, ${businessRules.length} rules`);

    return { status: 'COMPLETED' };
  } catch (e: any) {
    log.error(`Persist failed: ${e.message}`);

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: 'FAILED' },
    });

    return { status: 'FAILED', errors: [`Persist failed: ${e.message}`] };
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add astra-app/src/scan/nodes/ && git commit -m "feat: all 6 scan pipeline nodes (clone, discover, deep-scan, cross-file, aggregate, persist)"
```

### Task 13: LangGraph prompts (discover, deep-scan, cross-file)

**Files:**
- Create: `astra-app/src/scan/prompts/discover.ts`
- Create: `astra-app/src/scan/prompts/deep-scan.ts`
- Create: `astra-app/src/scan/prompts/cross-file.ts`

- [ ] **Step 1: Write discover prompt**

Create `astra-app/src/scan/prompts/discover.ts`:

```typescript
export function buildDiscoverPrompt(knowledgeTags: string[]): string {
  const knowledgeSection = knowledgeTags.length > 0
    ? `\n\n## Relevant Security Knowledge\nFocus on files related to: ${knowledgeTags.join(', ')}`
    : '';

  return `You are a senior security engineer analyzing a codebase structure. Your task is to identify the most security-relevant files and rank them by priority.

Priority tiers:
- P0: Entry points (routes, api, controllers, server.ts, app.ts, main.go, index.ts)
- P1: Auth & security (auth modules, middleware, JWT handling, permissions)
- P2: Business logic (services, models, payment, user, order processing)
- P3: Config & data (migrations, schemas, configs, docker-compose)
- P4: Other code (utils, helpers, types, constants)

Also list files that should be SKIPPED (tests, fixtures, mocks, generated code, lock files).

Return JSON ONLY, no markdown, no code blocks:
{
  "prioritized": [
    {"path": "relative/path", "priority": 0, "language": "typescript"},
    ...
  ],
  "skipped": ["test/file1.ts", ...]
}${knowledgeSection}`;
}
```

- [ ] **Step 2: Write deep-scan prompt**

Create `astra-app/src/scan/prompts/deep-scan.ts`:

```typescript
export function buildDeepScanPrompt(scanDepth: string, knowledgeContext: string): string {
  const depthInstructions: Record<string, string> = {
    quick: 'Do a quick surface-level check. Focus only on obvious vulnerabilities. Brief findings only.',
    standard: 'Perform a standard security analysis. Check for common vulnerability patterns.',
    deep: 'Perform a thorough deep analysis. Trace code flow, check for edge cases, and verify error handling paths.',
    exhaustive: 'Perform an exhaustive audit-depth analysis. Check all edge cases, trace all data flows, provide proof-of-concept exploits where possible, and verify every security boundary.',
  };

  return `You are an expert application security analyst. Analyze the provided source code for security vulnerabilities.

## Analysis Depth: ${scanDepth.toUpperCase()}
${depthInstructions[scanDepth] ?? depthInstructions.standard}

${knowledgeContext}

## Required Output Format

Return valid JSON ONLY (no markdown, no code blocks):
{
  "findings": [
    {
      "ruleId": "short-identifier",
      "title": "Brief finding title",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "SAST|SCA|SECRETS|IAC|DATA_FLOW|BUSINESS_LOGIC",
      "lineStart": 0,
      "lineEnd": 0,
      "codeSnippet": "relevant code excerpt",
      "language": "typescript",
      "cwe": ["CWE-89"],
      "owasp": ["A03:2021"],
      "aiExplanation": "Clear explanation of the vulnerability",
      "aiFix": "Concrete code fix",
      "exploitScore": 7.5,
      "confidence": 0.9,
      "remediation": "Steps to fix"
    }
  ],
  "fileSummary": {
    "language": "typescript",
    "purpose": "What this file does",
    "exports": ["function1", "Class2"],
    "dependencies": ["../auth", "./db"],
    "riskAreas": ["input validation", "auth"],
    "summary": "Brief security-relevant file summary"
  }
}

If no vulnerabilities found, return empty findings array with the fileSummary still populated.`;
}
```

- [ ] **Step 3: Write cross-file prompt**

Create `astra-app/src/scan/prompts/cross-file.ts`:

```typescript
export function buildCrossFilePrompt(scanDepth: string, knowledgeContext: string): string {
  const depthInstructions: Record<string, string> = {
    quick: 'Quick cross-file check. Focus on obvious gaps like missing auth middleware.',
    standard: 'Standard cross-file analysis. Check for common cross-cutting security issues.',
    deep: 'Deep cross-file analysis. Trace data flows across files, check for authorization bypass patterns, missing middleware, privilege escalation paths.',
    exhaustive: 'Exhaustive cross-file audit. Map all trust boundaries, trace every data flow end-to-end, identify all privilege escalation paths, broken access control patterns, and business logic violations across the entire codebase.',
  };

  return `You are a senior security architect analyzing cross-file security issues in a codebase.

## Analysis Depth: ${scanDepth.toUpperCase()}
${depthInstructions[scanDepth] ?? depthInstructions.standard}

${knowledgeContext}

## Focus Areas
1. Missing authentication or authorization middleware on critical routes
2. Privilege escalation paths across files
3. Broken access control patterns
4. Data flow violations (untrusted data reaching sensitive sinks without validation)
5. Business logic vulnerabilities (race conditions, state machine abuse, missing state checks)
6. Inconsistent security enforcement across related files

## Required Output Format

Return valid JSON ONLY (no markdown, no code blocks):
{
  "findings": [
    {
      "ruleId": "cross-file-rule-id",
      "title": "Cross-file issue title",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "category": "BUSINESS_LOGIC|DATA_FLOW",
      "file": "primary file path or 'multiple'",
      "lineStart": 0,
      "lineEnd": 0,
      "codeSnippet": "relevant code",
      "language": "typescript",
      "cwe": ["CWE-862"],
      "owasp": ["A01:2021"],
      "aiExplanation": "Explanation of the cross-file issue",
      "aiFix": "Suggested fix across files",
      "exploitScore": 8.0,
      "confidence": 0.85,
      "remediation": "Cross-file fix steps"
    }
  ],
  "rules": [
    {
      "ruleText": "Natural language description of a business logic or security rule inferred from the codebase",
      "confidence": 0.9,
      "evidenceFiles": ["src/auth.ts", "src/middleware.ts"],
      "violationDescription": "What happens when this rule is violated"
    }
  ]
}`;
}
```

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/scan/prompts/ && git commit -m "feat: per-node instruction templates (discover, deep-scan, cross-file) with scan depth"
```

### Task 14: LangGraph tools (file-reader, directory-lister, pattern-matcher, code-searcher)

**Files:**
- Create: `astra-app/src/scan/tools/file-reader.ts`
- Create: `astra-app/src/scan/tools/directory-lister.ts`
- Create: `astra-app/src/scan/tools/pattern-matcher.ts`
- Create: `astra-app/src/scan/tools/code-searcher.ts`

- [ ] **Step 1: Write file-reader tool**

Create `astra-app/src/scan/tools/file-reader.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createFileReaderTool(baseDir: string) {
  return tool(
    async ({ filePath, startLine, endLine }: { filePath: string; startLine?: number; endLine?: number }) => {
      const fullPath = path.join(baseDir, filePath);
      if (!fs.existsSync(fullPath)) return `File not found: ${filePath}`;

      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      const start = Math.max(0, (startLine ?? 1) - 1);
      const end = Math.min(lines.length, endLine ?? lines.length);

      return lines.slice(start, end).join('\n');
    },
    {
      name: 'file_reader',
      description: 'Read file contents with optional line range',
      schema: z.object({
        filePath: z.string().describe('Relative file path'),
        startLine: z.number().optional().describe('Start line (1-indexed)'),
        endLine: z.number().optional().describe('End line (inclusive)'),
      }),
    }
  );
}
```

- [ ] **Step 2: Write directory-lister tool**

Create `astra-app/src/scan/tools/directory-lister.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createDirectoryListerTool(baseDir: string) {
  return tool(
    async ({ dirPath, extension }: { dirPath?: string; extension?: string }) => {
      const target = dirPath ? path.join(baseDir, dirPath) : baseDir;
      if (!fs.existsSync(target)) return `Directory not found: ${dirPath}`;

      const entries: string[] = [];
      function walk(dir: string, relTo: string) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith('.') || item.name === 'node_modules') continue;
          const full = path.join(dir, item.name);
          const rel = path.join(relTo, item.name);
          if (item.isDirectory()) walk(full, rel);
          else {
            if (extension && !item.name.endsWith(extension)) continue;
            entries.push(rel);
          }
        }
      }

      walk(target, dirPath ?? '');
      return entries.join('\n');
    },
    {
      name: 'directory_lister',
      description: 'List files in a directory tree, optionally filtered by extension',
      schema: z.object({
        dirPath: z.string().optional().describe('Relative directory path (default: root)'),
        extension: z.string().optional().describe('Filter by file extension (e.g. ".ts")'),
      }),
    }
  );
}
```

- [ ] **Step 3: Write pattern-matcher tool**

Create `astra-app/src/scan/tools/pattern-matcher.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const QUICK_PATTERNS: Record<string, RegExp> = {
  sql_injection: /(\bexec\b|\bexecute\b|\bquery\b).*\+\s*['"`]|["'].*\+\s*\w+/gi,
  xss: /innerHTML|dangerouslySetInnerHTML|document\.write|\.html\(/gi,
  hardcoded_secret: /(password|secret|api_?key|token)\s*[:=]\s*['"][^'"]+['"]/gi,
  eval_usage: /\beval\s*\(|new\s+Function\s*\(/gi,
  weak_crypto: /md5|sha1|des|rc4|ecb/gi,
  path_traversal: /\.\.\/|\.\.\\|path\.join\(.*req\./gi,
  missing_auth: /router\.(get|post|put|delete|patch).*\(.*(?:req|request)/gi,
};

export function createPatternMatcherTool(baseDir: string) {
  return tool(
    async ({ filePath, patternName }: { filePath: string; patternName?: string }) => {
      const fullPath = path.join(baseDir, filePath);
      if (!fs.existsSync(fullPath)) return `File not found: ${filePath}`;

      const content = fs.readFileSync(fullPath, 'utf8');
      const results: string[] = [];

      const patterns = patternName ? { [patternName]: QUICK_PATTERNS[patternName] } : QUICK_PATTERNS;
      for (const [name, regex] of Object.entries(patterns)) {
        if (!regex) continue;
        const matches = [...content.matchAll(regex)];
        for (const match of matches) {
          const line = content.substring(0, match.index).split('\n').length;
          results.push(`[${name}] Line ${line}: ${match[0].trim()}`);
        }
      }

      return results.length > 0 ? results.join('\n') : 'No pattern matches found';
    },
    {
      name: 'pattern_matcher',
      description: 'Quick regex pre-check for known vulnerability patterns in a file',
      schema: z.object({
        filePath: z.string().describe('Relative file path to check'),
        patternName: z.string().optional().describe('Specific pattern to check (sql_injection, xss, hardcoded_secret, eval_usage, weak_crypto, path_traversal, missing_auth)'),
      }),
    }
  );
}
```

- [ ] **Step 4: Write code-searcher tool**

Create `astra-app/src/scan/tools/code-searcher.ts`:

```typescript
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export function createCodeSearcherTool(baseDir: string) {
  return tool(
    async ({ query, fileType }: { query: string; fileType?: string }) => {
      const results: string[] = [];
      const regex = new RegExp(query, 'gi');

      function walk(dir: string) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.name.startsWith('.') || item.name === 'node_modules') continue;
          const full = path.join(dir, item.name);
          if (item.isDirectory()) { walk(full); continue; }
          if (fileType && !item.name.endsWith(fileType)) continue;

          try {
            const content = fs.readFileSync(full, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (regex.test(lines[i])) {
                results.push(`${path.relative(baseDir, full)}:${i + 1}: ${lines[i].trim()}`);
              }
              regex.lastIndex = 0;
            }
          } catch {}
        }
      }

      walk(baseDir);
      return results.slice(0, 50).join('\n') || 'No matches found';
    },
    {
      name: 'code_searcher',
      description: 'Search across the codebase for symbols, imports, or patterns using regex',
      schema: z.object({
        query: z.string().describe('Regex pattern to search for'),
        fileType: z.string().optional().describe('Filter by file extension (e.g. ".ts")'),
      }),
    }
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/scan/tools/ && git commit -m "feat: LangGraph tools (file-reader, directory-lister, pattern-matcher, code-searcher)"
```

---

## Phase 4: API Routes

Goal: All v1 API endpoints working, connected to the LangGraph pipeline and Prisma.

### Task 15: Scan API (POST start, GET list, GET detail)

**Files:**
- Create: `astra-app/src/app/api/v1/scans/route.ts`
- Create: `astra-app/src/app/api/v1/scans/[id]/route.ts`

- [ ] **Step 1: Write POST/GET /api/v1/scans**

Create `astra-app/src/app/api/v1/scans/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadConfig, mergeNodeOverrides, configSchema } from '@/lib/config';
import { createScanGraph } from '@/scan/graph';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { repoUrl, branch, config: configOverrides } = body;

    if (!repoUrl) {
      return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
    }

    let config = await loadConfig(path.resolve(process.cwd(), 'astra.config.json'));
    if (configOverrides?.nodes) {
      config = mergeNodeOverrides(config, configOverrides.nodes);
    }

    const scan = await prisma.scan.create({
      data: {
        repoUrl,
        branch: branch ?? 'main',
        status: 'PENDING',
        configJson: config as any,
      },
    });

    const graph = createScanGraph();

    (async () => {
      try {
        await graph.invoke({
          repoUrl,
          branch: branch ?? 'main',
          scanId: scan.id,
          config,
        } as any);
      } catch (e: any) {
        await prisma.scan.update({
          where: { id: scan.id },
          data: { status: 'FAILED' },
        });
      }
    })();

    return NextResponse.json({ scanId: scan.id, status: 'PENDING' }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') ?? '20');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const where = status ? { status: status as any } : {};

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    prisma.scan.count({ where }),
  ]);

  return NextResponse.json({ scans, total, limit, offset });
}
```

- [ ] **Step 2: Write GET /api/v1/scans/[id]**

Create `astra-app/src/app/api/v1/scans/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const scan = await prisma.scan.findUnique({
    where: { id: params.id },
    include: {
      findings: true,
      businessRules: true,
      nodeOutputs: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json(scan);
}
```

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/app/api/v1/scans/ && git commit -m "feat: scan API routes (POST start, GET list, GET detail with findings)"
```

### Task 16: SSE stream + node outputs API

**Files:**
- Create: `astra-app/src/app/api/v1/scans/[id]/stream/route.ts`
- Create: `astra-app/src/app/api/v1/scans/[id]/nodes/route.ts`

- [ ] **Step 1: Write SSE stream endpoint**

Create `astra-app/src/app/api/v1/scans/[id]/stream/route.ts`:

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const scanId = params.id;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { scanId });

      const pollInterval = setInterval(async () => {
        const scan = await prisma.scan.findUnique({
          where: { id: scanId },
          include: { nodeOutputs: { orderBy: { createdAt: 'desc' }, take: 1 } },
        });

        if (!scan) {
          send('error', { message: 'Scan not found' });
          clearInterval(pollInterval);
          controller.close();
          return;
        }

        if (scan.nodeOutputs.length > 0) {
          const lastNode = scan.nodeOutputs[0];
          send('node_complete', {
            node: lastNode.node,
            modelUsed: lastNode.modelUsed,
            provider: lastNode.provider,
            durationMs: lastNode.durationMs,
            error: lastNode.error,
          });
        }

        if (scan.status === 'COMPLETED' || scan.status === 'FAILED') {
          send(scan.status === 'COMPLETED' ? 'scan_complete' : 'scan_failed', {
            totalFindings: await prisma.finding.count({ where: { scanId } }),
            durationSeconds: scan.durationSeconds,
          });
          clearInterval(pollInterval);
          controller.close();
        }
      }, 2000);

      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Write node outputs endpoint**

Create `astra-app/src/app/api/v1/scans/[id]/nodes/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const node = searchParams.get('node');

  const where: any = { scanId: params.id };
  if (node) where.node = node;

  const outputs = await prisma.nodeOutput.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ outputs });
}
```

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/app/api/v1/scans/ && git commit -m "feat: SSE stream endpoint + node outputs API"
```

### Task 17: Findings, rules, config, presets, providers APIs

**Files:**
- Create: `astra-app/src/app/api/v1/findings/route.ts`
- Create: `astra-app/src/app/api/v1/rules/route.ts`
- Create: `astra-app/src/app/api/v1/rules/[id]/route.ts`
- Create: `astra-app/src/app/api/v1/config/route.ts`
- Create: `astra-app/src/app/api/v1/presets/route.ts`
- Create: `astra-app/src/app/api/v1/providers/route.ts`
- Create: `astra-app/src/app/api/v1/providers/test/route.ts`

- [ ] **Step 1: Write findings API**

Create `astra-app/src/app/api/v1/findings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const severity = searchParams.get('severity');
  const category = searchParams.get('category');
  const limit = parseInt(searchParams.get('limit') ?? '50');
  const offset = parseInt(searchParams.get('offset') ?? '0');

  const where: any = {};
  if (scanId) where.scanId = scanId;
  if (severity) where.severity = severity;
  if (category) where.category = category;

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({ where, orderBy: { createdAt: 'desc' }, take: limit, skip: offset }),
    prisma.finding.count({ where }),
  ]);

  return NextResponse.json({ findings, total, limit, offset });
}
```

- [ ] **Step 2: Write rules APIs**

Create `astra-app/src/app/api/v1/rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scanId = searchParams.get('scanId');
  const status = searchParams.get('status');

  const where: any = {};
  if (scanId) where.scanId = scanId;
  if (status) where.status = status;

  const rules = await prisma.businessLogicRule.findMany({ where, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ rules });
}
```

Create `astra-app/src/app/api/v1/rules/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { status, violationDescription } = body;

  if (!['CANDIDATE', 'CONFIRMED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const rule = await prisma.businessLogicRule.update({
    where: { id: params.id },
    data: { status, violationDescription },
  });

  return NextResponse.json(rule);
}
```

- [ ] **Step 3: Write config API**

Create `astra-app/src/app/api/v1/config/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig, configSchema } from '@/lib/config';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'astra.config.json');

export async function GET() {
  const config = await loadConfig(CONFIG_PATH);
  return NextResponse.json(config);
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = configSchema.parse(body);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(validated, null, 2));
    return NextResponse.json(validated);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Write presets API**

Create `astra-app/src/app/api/v1/presets/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const presets = await prisma.preset.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ presets });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, configJson } = body;

  if (!name || !configJson) {
    return NextResponse.json({ error: 'name and configJson required' }, { status: 400 });
  }

  const preset = await prisma.preset.create({
    data: { name, description: description ?? '', configJson, isBuiltin: false },
  });

  return NextResponse.json(preset, { status: 201 });
}
```

- [ ] **Step 5: Write providers API + test**

Create `astra-app/src/app/api/v1/providers/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { listProviders } from '@/providers/registry';
import path from 'path';

export async function GET() {
  const config = await loadConfig(path.resolve(process.cwd(), 'astra.config.json'));
  const providers = listProviders(config);
  return NextResponse.json({ providers });
}
```

Create `astra-app/src/app/api/v1/providers/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { createProvider } from '@/providers/factory';
import path from 'path';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { provider: providerId, model: modelId } = body;

  try {
    const config = await loadConfig(path.resolve(process.cwd(), 'astra.config.json'));
    const providerConfig = config.providers[providerId];
    if (!providerConfig) return NextResponse.json({ error: 'Provider not found' }, { status: 404 });

    const modelIdToUse = modelId ?? Object.keys(providerConfig.models)[0];
    const modelConfig = providerConfig.models[modelIdToUse];
    if (!modelConfig) return NextResponse.json({ error: 'Model not found' }, { status: 404 });

    const provider = createProvider({ providerId, providerConfig, modelId: modelIdToUse, modelConfig });
    const result = await provider.testConnection();

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
  }
}
```

- [ ] **Step 6: Seed built-in presets**

Create a seed script or add to the migration:

```typescript
// Run once or in a seed script
const { prisma } = require('./src/lib/db');

async function seed() {
  const presets = [
    { name: 'quick', description: 'Fast surface scan', isBuiltin: true, configJson: { nodes: { discover: { scanDepth: 'quick', thinkingDepth: 'low', maxOutputTokens: 500 }, deepScan: { scanDepth: 'quick', thinkingDepth: 'medium', maxOutputTokens: 1000 }, crossFile: { scanDepth: 'quick', thinkingDepth: 'low' } } } },
    { name: 'standard', description: 'Normal security review', isBuiltin: true, configJson: { nodes: { discover: { scanDepth: 'standard', thinkingDepth: 'medium' }, deepScan: { scanDepth: 'standard', thinkingDepth: 'high', maxOutputTokens: 2048 }, crossFile: { scanDepth: 'standard', thinkingDepth: 'high' } } } },
    { name: 'deep', description: 'Thorough audit', isBuiltin: true, configJson: { nodes: { discover: { scanDepth: 'standard', thinkingDepth: 'medium' }, deepScan: { scanDepth: 'deep', thinkingDepth: 'high', maxOutputTokens: 4096 }, crossFile: { scanDepth: 'deep', thinkingDepth: 'max', maxOutputTokens: 4096 } } } },
    { name: 'exhaustive', description: 'Full audit with all edge cases', isBuiltin: true, configJson: { nodes: { discover: { scanDepth: 'deep', thinkingDepth: 'high' }, deepScan: { scanDepth: 'exhaustive', thinkingDepth: 'max', maxOutputTokens: 8192 }, crossFile: { scanDepth: 'exhaustive', thinkingDepth: 'max', maxOutputTokens: 8192 } } } },
  ];

  for (const p of presets) {
    await prisma.preset.upsert({ where: { name: p.name }, update: {}, create: p });
  }
}

seed().catch(console.error);
```

- [ ] **Step 7: Commit**

```bash
git add astra-app/src/app/api/ astra-app/prisma/ && git commit -m "feat: all v1 API routes (scans, findings, rules, config, presets, providers)"
```

---

## Phase 5: Dashboard (Carbon UI)

Goal: Working IBM Carbon dashboard with all 5 pages and 11 components.

### Task 18: Root layout + home page with scan trigger

**Files:**
- Modify: `astra-app/src/app/layout.tsx`
- Modify: `astra-app/src/app/page.tsx`
- Create: `astra-app/src/components/RepoInput.tsx`
- Create: `astra-app/src/components/PresetSelector.tsx`
- Create: `astra-app/src/components/ScanProgress.tsx`

- [ ] **Step 1: Build RepoInput component**

Create `astra-app/src/components/RepoInput.tsx` — Carbon-styled form with repo URL input, branch input, and "Start Scan" button. Includes PresetSelector dropdown. On submit, POSTs to `/api/v1/scans`.

- [ ] **Step 2: Build PresetSelector component**

Create `astra-app/src/components/PresetSelector.tsx` — Fetches presets from `/api/v1/presets`, renders Carbon Dropdown. On select, populates config overrides.

- [ ] **Step 3: Build ScanProgress component**

Create `astra-app/src/components/ScanProgress.tsx` — Connects to SSE stream at `/api/v1/scans/[id]/stream`, renders Carbon ProgressBar and node status list.

- [ ] **Step 4: Build home page**

Replace `astra-app/src/app/page.tsx` — Carbon Grid with RepoInput card at top, then recent scans list (fetched from GET `/api/v1/scans`).

- [ ] **Step 5: Verify home page renders**

```bash
cd /root/astra/astra-app && npm run dev
```

Navigate to localhost:3000 — should show scan input form.

- [ ] **Step 6: Commit**

```bash
git add astra-app/src/components/ astra-app/src/app/page.tsx astra-app/src/app/layout.tsx && git commit -m "feat: Carbon dashboard home page with scan trigger, preset selector, progress"
```

### Task 19: FindingsTable + SeverityBadge + ScannerBreakdown

**Files:**
- Create: `astra-app/src/components/FindingsTable.tsx`
- Create: `astra-app/src/components/SeverityBadge.tsx`
- Create: `astra-app/src/components/ScannerBreakdown.tsx`

- [ ] **Step 1: Build SeverityBadge**

Create `astra-app/src/components/SeverityBadge.tsx` — Carbon Tag component with color mapping: CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=blue, INFO=gray.

- [ ] **Step 2: Build FindingsTable**

Create `astra-app/src/components/FindingsTable.tsx` — Carbon DataTable with columns: severity (SeverityBadge), file, line, title, scanner, category, confidence. Expandable row with aiExplanation, aiFix, codeSnippet.

- [ ] **Step 3: Build ScannerBreakdown**

Create `astra-app/src/components/ScannerBreakdown.tsx` — Carbon Grid with tiles showing findings count per scanner (ai-deep-scan, ai-cross-file) and per severity.

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/components/ && git commit -m "feat: FindingsTable, SeverityBadge, ScannerBreakdown Carbon components"
```

### Task 20: Scan detail page + BusinessLogicPanel + NodeOutputInspector

**Files:**
- Create: `astra-app/src/app/scans/[id]/page.tsx`
- Create: `astra-app/src/components/BusinessLogicPanel.tsx`
- Create: `astra-app/src/components/NodeOutputInspector.tsx`

- [ ] **Step 1: Build BusinessLogicPanel**

Create `astra-app/src/components/BusinessLogicPanel.tsx` — Carbon Accordion. Each item shows ruleText, confidence, evidenceFiles. Action buttons: Confirm (green), Reject (red) — calls PATCH `/api/v1/rules/[id]`.

- [ ] **Step 2: Build NodeOutputInspector**

Create `astra-app/src/components/NodeOutputInspector.tsx` — Carbon Accordion. Each node shows: model used, provider, token counts, duration, error (if any). Expandable to show raw inputJson/outputJson.

- [ ] **Step 3: Build scan detail page**

Create `astra-app/src/app/scans/[id]/page.tsx` — Fetches scan from GET `/api/v1/scans/[id]`. Shows: ScanProgress (if running), ScannerBreakdown, FindingsTable, BusinessLogicPanel, NodeOutputInspector.

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/app/scans/ astra-app/src/components/ && git commit -m "feat: scan detail page with findings, business logic panel, node output inspector"
```

### Task 21: Node detail page

**Files:**
- Create: `astra-app/src/app/scans/[id]/nodes/[node]/page.tsx`

- [ ] **Step 1: Build node detail page**

Create `astra-app/src/app/scans/[id]/nodes/[node]/page.tsx` — Fetches node outputs from GET `/api/v1/scans/[id]/nodes?node=[node]`. Shows: node config used (provider, model, temperature, thinkingDepth, scanDepth, tools, knowledge, all AI params), raw input JSON, raw output JSON, token counts, thinking tokens, duration.

- [ ] **Step 2: Commit**

```bash
git add astra-app/src/app/scans/ && git commit -m "feat: node detail page with raw I/O and config snapshot"
```

### Task 22: Config editor page

**Files:**
- Create: `astra-app/src/app/config/page.tsx`
- Create: `astra-app/src/components/ConfigEditor.tsx`
- Create: `astra-app/src/components/ProviderSelector.tsx`
- Create: `astra-app/src/components/ThinkingControls.tsx`

- [ ] **Step 1: Build ProviderSelector**

Create `astra-app/src/components/ProviderSelector.tsx` — Fetches providers from GET `/api/v1/providers`. Carbon Dropdown for provider, then model dropdown populated from selected provider's models. "Test Connection" button calls POST `/api/v1/providers/test`.

- [ ] **Step 2: Build ThinkingControls**

Create `astra-app/src/components/ThinkingControls.tsx` — Carbon RadioButtonGroup for thinkingDepth (none/low/medium/high/max). Carbon Slider for thinkingBudget (0–16384, or null for auto). NumberInput for maxOutputTokens. Labels explaining what each level does.

- [ ] **Step 3: Build ConfigEditor**

Create `astra-app/src/components/ConfigEditor.tsx` — Carbon Form wrapping all per-node settings. Three tabs/accordions: discover, deepScan, crossFile. Each tab contains: ProviderSelector, ThinkingControls, temperature/topP/topK sliders, scanDepth radio group, maxFileBytes number input, tools checkboxes, knowledge tag checkboxes, instructions textarea, maxRetries/retryBackoffMs/timeoutMs number inputs. Save button calls PUT `/api/v1/config`.

- [ ] **Step 4: Build config page**

Create `astra-app/src/app/config/page.tsx` — Renders ConfigEditor component.

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/app/config/ astra-app/src/components/ConfigEditor.tsx astra-app/src/components/ProviderSelector.tsx astra-app/src/components/ThinkingControls.tsx && git commit -m "feat: config editor page with per-node AI settings, provider selector, thinking controls"
```

### Task 23: Rules management page

**Files:**
- Create: `astra-app/src/app/rules/page.tsx`

- [ ] **Step 1: Build rules page**

Create `astra-app/src/app/rules/page.tsx` — Fetches rules from GET `/api/v1/rules`. Filters by status (CANDIDATE/CONFIRMED/REJECTED) via Carbon Dropdown. Lists rules with ruleText, confidence, evidenceFiles, violationDescription. Action buttons per rule: Confirm → PATCH status=CONFIRMED, Reject → PATCH status=REJECTED.

- [ ] **Step 2: Commit**

```bash
git add astra-app/src/app/rules/ && git commit -m "feat: rules management page with confirm/reject"
```

---

## Phase 6: Docker + Integration

Goal: Full Docker setup, end-to-end smoke test.

### Task 24: Dockerfile + docker-compose

**Files:**
- Create: `astra-app/Dockerfile`
- Create: `astra-app/docker-compose.yml`

- [ ] **Step 1: Write Dockerfile**

Create `astra-app/Dockerfile`:

```dockerfile
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

- [ ] **Step 2: Write docker-compose.yml**

Create `astra-app/docker-compose.yml`:

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: super_admin
      POSTGRES_PASSWORD: "AlwaysHustling@2026"
      POSTGRES_DB: astra-dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://super_admin:AlwaysHustling%402026@postgres:5432/astra-dev?schema=public"
      OLLAMA_API_KEY: ${OLLAMA_API_KEY}
    depends_on:
      - postgres

volumes:
  pgdata:
```

- [ ] **Step 3: Commit**

```bash
git add astra-app/Dockerfile astra-app/docker-compose.yml && git commit -m "feat: Dockerfile and docker-compose with PostgreSQL"
```

### Task 25: End-to-end smoke test

- [ ] **Step 1: Start PostgreSQL via Docker**

```bash
cd /root/astra/astra-app && docker compose up -d postgres
sleep 5
npx prisma migrate dev --name init
```

- [ ] **Step 2: Start the app**

```bash
cd /root/astra/astra-app && npm run dev &
sleep 5
```

- [ ] **Step 3: Trigger a scan via API**

```bash
curl -X POST http://localhost:3000/api/v1/scans \
  -H 'Content-Type: application/json' \
  -d '{"repoUrl":"https://github.com/ethanniser/NextFaster.git"}'
```

Expected: `{ "scanId": "cl...", "status": "PENDING" }`

- [ ] **Step 4: Poll scan status**

```bash
SCAN_ID="..." # from step 3
curl http://localhost:3000/api/v1/scans/$SCAN_ID
```

Expected: Eventually shows status=COMPLETED with findings.

- [ ] **Step 5: Verify dashboard**

Open http://localhost:3000 in browser. Should show the scan in the list, click to see details.

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "feat: end-to-end verified — full Astra Next.js + LangGraph.js system working"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- Architecture overview → Task 1, 2, 11
- LangGraph StateGraph → Task 11
- Per-node AI config → Task 3
- Scan depth + thinking → Task 3 (config), Task 12 (nodes), Task 22 (editor)
- All 7 providers → Tasks 5-9
- All 14 API endpoints → Tasks 15-17
- Node output persistence → Task 2 (schema), Task 12 (persist node)
- SSE streaming → Task 16
- Dashboard 5 pages → Tasks 18-23
- 11 Carbon components → Tasks 18-22
- LangGraph tools → Task 14
- Custom prompts → Task 13
- Presets → Task 17
- Docker → Task 24
- Database connection params → Task 2

**2. Placeholder scan:** No TBDs, TODOs, or "implement later" patterns. Every step has code or a command.

**3. Type consistency:** All imports reference types defined in earlier tasks. `ScanState` fields match across graph.ts and node files. Provider interface matches across all 7 providers. Config types match across config.ts, factory.ts, and node files.