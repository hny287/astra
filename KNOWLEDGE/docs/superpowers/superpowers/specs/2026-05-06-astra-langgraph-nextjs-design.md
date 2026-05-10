# Astra Next.js + LangGraph.js Architecture Design

**Date:** 2026-05-06
**Status:** Approved
**Decides:** Replaces `astra-core` CLI-only architecture with a Next.js App Router + LangGraph.js system

## 1. Overview

Astra is an AI-native code security scanner. This design migrates the existing `astra-core` Node.js CLI into a full-stack Next.js application with LangGraph.js AI orchestration. The system is **API-first**: the REST API is the primary interface; the IBM Carbon dashboard is one consumer among many (CLI, CI/CD, future integrations).

### Key architectural decisions

1. **LangGraph.js StateGraph** orchestrates the scan pipeline as durable, resumable workflows
2. **Per-node AI configuration** — each pipeline stage (discover, deep-scan, cross-file) has its own model provider, temperature, system prompt, and tools
3. **Every node output persisted** — no data loss, full audit trail, resume from any checkpoint
4. **PostgreSQL + Prisma** for persistence (production-grade, multi-user ready)
5. **Custom tools, knowledge, and instructions per node** — each LangGraph node has its own tools, knowledge base subset, and system instructions, all configurable from the dashboard
6. **Dashboard is a management console** — edit config (including switching AI providers/models per node), trigger scans with overrides, inspect node outputs, manage business logic rules
7. **Multi-provider support** — Cloud Ollama (active), Hosted Ollama, OpenAI API, Anthropic Claude API, AWS Bedrock, Azure AI Foundry, and LangGraph connectors. Dashboard UI allows switching providers per node.

## 2. System Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐│
│  │ Dashboard │  │ CLI      │  │ API v1                   ││
│  │ (Carbon)  │  │ (astra)  │  │ POST /scans              ││
│  │           │  │          │  │ GET  /scans               ││
│  │ - Config  │  │          │  │ GET  /scans/:id           ││
│  │ - Trigger │  │          │  │ GET  /scans/:id/stream    ││
│  │ - Inspect │  │          │  │ GET  /scans/:id/nodes     ││
│  │ - Rules   │  │          │  │ GET  /findings             ││
│  └────┬──────┘  └────┬─────┘  │ GET  /rules               ││
│       │              │        │ GET  /config               ││
│       └──────────────┴─────── │ PUT  /config               ││
│                              └────────────┬───────────────┘│
│                                           │                │
│                            ┌──────────────▼──────────────┐ │
│                            │   LangGraph.js StateGraph    │ │
│                            │                              │ │
│                            │  clone → discover → deep_scan → cross_file → aggregate → persist │
│                            │                              │ │
│                            │  Each node:                  │ │
│                            │   - Custom provider/model    │ │
│                            │   - Custom instructions      │ │
│                            │   - Custom tools             │ │
│                            │   - Custom knowledge base    │ │
│                            │   - Output persisted to DB    │ │
│                            └──────────────┬──────────────┘ │
│                                           │                │
│                            ┌──────────────▼──────────────┐ │
│                            │   PostgreSQL + Prisma         │ │
│                            │   scans, findings,            │ │
│                            │   business_logic_rules,       │ │
│                            │   node_outputs                │ │
│                            └─────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  AI Providers (per-node config)                      │ │
│  │  Ollama │ OpenAI │ Anthropic │ Gemini                │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## 3. Scan Pipeline (LangGraph.js StateGraph)

### 3.1 Graph definition

```typescript
interface ScanState {
  repoUrl: string;
  branch: string;
  localDir: string;
  config: ScanConfig;
  discoveredFiles: FileInfo[];
  findingsPerFile: Map<string, Finding[]>;
  fileSummaries: FileSummary[];
  crossFileFindings: Finding[];
  businessRules: BusinessLogicRule[];
  errors: string[];
  tokenUsage: { input: number; output: number };
  status: ScanStatus;
}

const graph = new StateGraph(ScanStateSchema)
  .addNode("clone", cloneNode)
  .addNode("discover", discoverNode)
  .addNode("deep_scan", deepScanNode)
  .addNode("cross_file", crossFileNode)
  .addNode("aggregate", aggregateNode)
  .addNode("persist", persistNode)
  .addEdge(START, "clone")
  .addEdge("clone", "discover")
  .addEdge("discover", "deep_scan")
  .addEdge("deep_scan", "cross_file")
  .addEdge("cross_file", "aggregate")
  .addEdge("aggregate", "persist")
  .addEdge("persist", END)
  .compile();
```

### 3.2 Node responsibilities

| Node | Purpose | Scan Depth | Think Depth | Tools | Knowledge | Output Persisted |
|------|---------|-----------|------------|-------|-----------|------------------|
| `clone` | Git clone, resolve branch | — | — | None | None | `{ localDir, commitSha, fileCount }` |
| `discover` | Build file list, prioritize | standard | medium | `directory-lister`, `pattern-matcher` | injection/auth patterns | `{ files: [...], skipped: [...], totalFiles }` |
| `deep_scan` | Per-file vulnerability scan | deep | high | `file-reader`, `pattern-matcher` | all patterns + guidelines | `{ findings: [...], fileSummary: {...} }` per file |
| `cross_file` | Cross-file business logic | exhaustive | max | `file-reader`, `code-searcher` | data-flow + business-logic | `{ findings: [...], rules: [...] }` |
| `aggregate` | Dedup findings, calculate totals | — | — | None | None | `{ totalFindings, uniqueFindings, tokenTotals }` |
| `persist` | Write to PostgreSQL | — | — | None | None | Confirmation with counts |

### 3.3 Per-node AI configuration

Each pipeline stage has independently configurable settings, all editable from the dashboard `/config` page:

#### Provider & Model
- **provider**: `cloud-ollama` | `hosted-ollama` | `openai` | `anthropic` | `bedrock` | `azure-ai-foundry` | `langgraph`
- **model**: model ID within that provider (e.g., `glm-5.1:cloud`, `kimi-k2.6:cloud`, `claude-sonnet-4-20250514`)

#### Thinking & Reasoning
- **temperature**: 0.0–1.0 — controls randomness/creativity (0 = deterministic, 1 = creative)
- **thinkingDepth**: `none` | `low` | `medium` | `high` | `max` — controls how deeply the AI reasons before answering. Maps to: `none`=no chain-of-thought, `low`=brief reasoning, `medium`=standard analysis, `high`=deep multi-step reasoning, `max`=exhaustive analysis with all edge cases. For providers that support it (e.g. Claude extended thinking, Ollama `num_ctx`), this also controls the thinking token budget.
- **thinkingBudget**: number | null — explicit token budget for thinking/reasoning (e.g. 4096, 8192, 16384). Overrides `thinkingDepth` if set. Supported by providers with explicit thinking controls (Claude, some Ollama models). Null = use thinkingDepth mapping.
- **topP**: 0.0–1.0 — nucleus sampling threshold
- **topK**: number | null — top-K sampling. Null = provider default.
- **frequencyPenalty**: 0.0–2.0 — penalize repeated tokens
- **presencePenalty**: 0.0–2.0 — penalize already-present tokens
- **stopSequences**: string[] — custom stop sequences for generation

#### Scan Depth & Scope
- **scanDepth**: `quick` | `standard` | `deep` | `exhaustive` — controls how thorough the analysis is per file
  - `quick`: Surface-level check, 1 pass, brief findings only (~500 output tokens)
  - `standard`: Normal analysis, 1 pass with structured output (~2K output tokens)
  - `deep`: Multi-aspect analysis with code flow tracing (~4K output tokens)
  - `exhaustive`: Full audit-depth analysis with all edge cases, data flow, and proof-of-concept (~8K output tokens)
- **maxFileBytes**: number — maximum file size to scan (per-node override, e.g. discover: 10KB, deepScan: 50KB)
- **maxOutputTokens**: number — maximum tokens the AI can generate per request (overrides model default)
- **contextWindowOverride**: number | null — override the model's context window (for models that support variable context)

#### Instructions, Knowledge & Tools
- **instructions**: custom system prompt template from `src/scan/prompts/`
- **tools**: array of tool names available to the AI during this node
- **knowledge**: knowledge base subset to inject into the system prompt for this node (e.g., which patterns/guidelines are relevant)

#### Concurrency & Retry
- **concurrency** (deep-scan only): number of parallel workers
- **maxRetries**: 0–5 — retry count for transient API failures per request
- **retryBackoffMs**: number — base delay for exponential backoff (e.g. 2000 = 2s, 4s, 8s)
- **timeoutMs**: number — per-request timeout in milliseconds (e.g. 120000 for 2 min)

All of these are editable from the dashboard `/config` page. The UI provides:
- Dropdowns for provider/model selection
- Sliders for temperature, topP, thinkingBudget
- Radio buttons for thinkingDepth and scanDepth
- Prompt editor (monospace textarea) for instructions
- Tool toggles (checkboxes)
- Knowledge base tag selectors (checkboxes with categories)
- Number inputs for concurrency, retries, timeout, maxFileBytes, maxOutputTokens

Example config:
```json
{
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
        "instructions": "custom-discover",
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
        "instructions": "custom-deep-scan",
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
        "instructions": "custom-cross-file",
        "tools": ["file-reader", "code-searcher"],
        "knowledge": ["patterns:data-flow", "guidelines:business-logic"],
        "maxRetries": 3,
        "retryBackoffMs": 2000,
        "timeoutMs": 180000
      }
    },
    "severity": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]
  }
}
```

### 3.4 Streaming

LangGraph's `.stream()` yields state updates per node. The SSE endpoint pipes these to clients:

```
event: node_complete
data: {"node": "discover", "filesFound": 64, "skipped": 8}

event: progress
data: {"node": "deep_scan", "completed": 12, "total": 64, "currentFile": "src/auth.ts"}

event: node_complete
data: {"node": "deep_scan", "findings": 23, "summaries": 60}

event: node_complete
data: {"node": "cross_file", "findings": 5, "rules": 3}

event: scan_complete
data: {"totalFindings": 28, "durationSeconds": 142}
```

### 3.5 Scan Presets

Presets are named configurations that set all per-node fields at once. Users can select a preset when starting a scan, then override individual fields if needed.

Built-in presets:

| Preset | Description | discover | deepScan | crossFile |
|--------|-------------|----------|----------|-----------|
| `quick` | Fast surface scan | scanDepth:quick, think:low, output:500 | scanDepth:quick, think:medium, output:1K | skip |
| `standard` | Normal security review | scanDepth:standard, think:medium | scanDepth:standard, think:high, output:2K | scanDepth:standard, think:high |
| `deep` | Thorough audit (default) | scanDepth:standard, think:medium | scanDepth:deep, think:high, output:4K | scanDepth:deep, think:max, output:4K |
| `exhaustive` | Full audit with all edge cases | scanDepth:deep, think:high | scanDepth:exhaustive, think:max, output:8K | scanDepth:exhaustive, think:max, output:8K |

Custom presets can be created via `POST /api/v1/presets` and are stored in the database.

### 3.6 Checkpointing and resume

LangGraph's checkpointing persists state after each node. On crash:
1. Scan status set to `FAILED` in DB
2. On restart, load last checkpoint from `node_outputs` table
3. Resume from the next node (skipping completed ones)

## 4. Data Model (Prisma + PostgreSQL)

```prisma
model Scan {
  id              String    @id @default(cuid())
  repoUrl         String
  branch          String    @default("main")
  commitSha       String?
  status          ScanStatus @default(PENDING)
  configJson      Json       // full config snapshot including per-node AI settings
  durationSeconds Int?
  totalInputTokens Int      @default(0)
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
  scan           Scan     @relation(fields: [scanId], references: [id])
  scanId         String
  scanner        String   // "ai-discover" | "ai-deep-scan" | "ai-cross-file"
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
  scan                Scan     @relation(fields: [scanId], references: [id])
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
  id            String   @id @default(cuid())
  scan          Scan     @relation(fields: [scanId], references: [id])
  scanId        String
  node          String   // "clone" | "discover" | "deep_scan" | "cross_file" | "aggregate" | "persist"
  modelUsed     String   // e.g. "kimi-k2.6:cloud"
  provider      String   // e.g. "cloud-ollama"
  nodeConfig    Json     // snapshot of the per-node config used (provider, model, temperature, thinkingDepth, scanDepth, tools, knowledge, etc.)
  inputJson     Json     // what went into the node
  outputJson    Json     // raw node output
  inputTokens   Int      @default(0)
  outputTokens  Int      @default(0)
  thinkingTokens Int     @default(0)  // reasoning/thinking tokens (where provider reports them)
  durationMs    Int      @default(0)
  error         String?  // null if success
  createdAt     DateTime @default(now())

  @@index([scanId])
  @@index([node])
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

## 5. API (v1, REST)

### 5.1 Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/scans` | Start a scan. Body: `{ repoUrl, branch?, config?, scanDepth?, thinkingDepth? }`. Returns `{ scanId, status }`. |
| GET | `/api/v1/scans` | List scans. Query: `?status=RUNNING&limit=20&offset=0`. |
| GET | `/api/v1/scans/[id]` | Get scan details with all findings. |
| GET | `/api/v1/scans/[id]/stream` | SSE stream for live progress events. |
| GET | `/api/v1/scans/[id]/nodes` | Get all node outputs. Query: `?node=deep_scan`. |
| GET | `/api/v1/findings` | Query findings. Query: `?severity=CRITICAL&category=SAST&scanId=...`. |
| GET | `/api/v1/rules` | List business logic rules. Query: `?scanId=...&status=CANDIDATE`. |
| PATCH | `/api/v1/rules/[id]` | Update rule status (CANDIDATE → CONFIRMED/REJECTED). |
| GET | `/api/v1/config` | Get current scan config (providers, models, per-node settings with all AI params). |
| PUT | `/api/v1/config` | Update scan config. Body: `{ nodes: { ... } }`. Accepts all per-node fields (provider, model, temperature, thinkingDepth, thinkingBudget, scanDepth, tools, knowledge, etc.). |
| GET | `/api/v1/presets` | List available scan presets (quick, standard, deep, exhaustive). |
| POST | `/api/v1/presets` | Create custom preset. Body: `{ name, nodes: { ... } }`. |
| GET | `/api/v1/providers` | List all registered providers with available models and their capabilities (thinking support, context window, etc.). |
| POST | `/api/v1/providers/test` | Test provider connection. Body: `{ provider, model? }`. Returns `{ connected, latencyMs }`. |

### 5.2 Scan lifecycle

1. Client calls `POST /api/v1/scans` with `{ repoUrl, branch: "main" }`
2. Server creates Scan record (status: PENDING), invokes LangGraph graph
3. Graph transitions: PENDING → RUNNING → COMPLETED (or FAILED)
4. Each node writes to `NodeOutput` table before proceeding
5. Final `persist` node writes findings, rules, and sets status to COMPLETED
6. SSE stream pushes events to connected clients throughout

### 5.3 Config overrides on scan trigger

When starting a scan, the POST body can include config overrides (any subset of per-node fields):
```json
{
  "repoUrl": "https://github.com/org/repo.git",
  "branch": "main",
  "config": {
    "nodes": {
      "deepScan": {
        "model": "glm-5.1:cloud",
        "provider": "cloud-ollama",
        "scanDepth": "exhaustive",
        "thinkingDepth": "max",
        "thinkingBudget": 16384,
        "knowledge": ["patterns:*", "guidelines:owasp-top10"]
      }
    }
  }
}
```
These override the saved defaults for this scan only.

## 6. LangGraph Tools

Each node has access to specific tools the AI can invoke:

| Tool | Available To | Purpose |
|------|-------------|---------|
| `directory-lister` | discover | List directory tree, filter by extension |
| `pattern-matcher` | discover, deep-scan | Quick regex pre-check for known vulnerability patterns |
| `file-reader` | deep-scan, cross-file | Read file contents with line ranges |
| `code-searcher` | cross-file | Search across codebase for symbols, imports, patterns |

Tools are defined as LangGraph-compatible tool functions that execute in the server context (not arbitrary code execution).

## 7. Per-Node Instructions, Knowledge, and Tools

### 7.1 Instructions (system prompts)

Each node uses a custom instruction template from `src/scan/prompts/`:

```
src/scan/prompts/
├── discover.ts      // Instructs AI to analyze file tree and prioritize
├── deep-scan.ts     // Instructs AI to find vulnerabilities per file
└── cross-file.ts    // Instructs AI to analyze cross-file patterns
```

Instructions are parameterized with the node's configured knowledge base subset and can be edited from the dashboard.

### 7.2 Knowledge (per-node knowledge base subset)

Each node selects which parts of the knowledge base are injected into its system prompt. This gives the AI focused, relevant context instead of overwhelming it with everything.

Knowledge is organized by tag:
- `patterns:injection` — SQL injection, XSS, command injection patterns
- `patterns:auth` — authentication/authorization vulnerability patterns
- `patterns:data-flow` — data flow and taint tracking patterns
- `patterns:crypto` — weak cryptography patterns
- `patterns:config` — misconfiguration patterns
- `patterns:*` — all patterns
- `guidelines:owasp-top10` — OWASP Top 10 guidelines
- `guidelines:business-logic` — business logic flaw guidelines
- `guidelines:*` — all guidelines

The knowledge configuration per node is editable from the dashboard via checkboxes.

### 7.3 Tools

Per-node tool assignment (see Section 6). Tools are toggled on/off per node in the dashboard.

## 8. Project Structure

```
astra-app/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Root layout (Carbon + IBM Plex Sans)
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── scans/
│   │   │   └── [id]/page.tsx         # Scan detail
│   │   ├── config/page.tsx           # Per-node AI config editor
│   │   ├── rules/page.tsx            # Business logic rules management
│   │   └── api/
│   │       └── v1/
│   │           ├── scans/
│   │           │   ├── route.ts
│   │           │   └── [id]/
│   │           │       ├── route.ts
│   │           │       ├── stream/route.ts
│   │           │       └── nodes/route.ts
│   │           ├── findings/route.ts
│   │           ├── rules/
│   │           │   ├── route.ts
│   │           │   └── [id]/route.ts
│   │           └── config/route.ts
│   ├── scan/                          # LangGraph workflow
│   │   ├── graph.ts                  # StateGraph definition + compile
│   │   ├── state.ts                  # ScanState schema + types
│   │   ├── nodes/
│   │   │   ├── clone.ts
│   │   │   ├── discover.ts
│   │   │   ├── deep-scan.ts
│   │   │   ├── cross-file.ts
│   │   │   ├── aggregate.ts
│   │   │   └── persist.ts
│   │   ├── tools/
│   │   │   ├── file-reader.ts
│   │   │   ├── directory-lister.ts
│   │   │   ├── pattern-matcher.ts
│   │   │   └── code-searcher.ts
│   │   └── prompts/
│   │       ├── discover.ts
│   │       ├── deep-scan.ts
│   │       └── cross-file.ts
│   ├── providers/
│   │   ├── factory.ts
│   │   ├── base.ts
│   │   ├── cloud-ollama.ts
│   │   ├── hosted-ollama.ts
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── bedrock.ts
│   │   ├── azure-ai-foundry.ts
│   │   └── langgraph-connector.ts
│   ├── rules/
│   │   ├── patterns/
│   │   ├── guidelines/
│   │   └── loader.ts
│   ├── components/
│   │   ├── RepoInput.tsx
│   │   ├── FindingsTable.tsx
│   │   ├── ScannerBreakdown.tsx
│   │   ├── BusinessLogicPanel.tsx
│   │   ├── SeverityBadge.tsx
│   │   ├── ScanProgress.tsx
│   │   ├── NodeOutputInspector.tsx
│   │   ├── ConfigEditor.tsx
│   │   ├── PresetSelector.tsx
│   │   ├── ProviderSelector.tsx
│   │   └── ThinkingControls.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── config.ts
│   │   ├── tokenizer.ts
│   │   └── logger.ts
│   └── cli.ts                        # CLI entry point (commander)
├── public/
├── Dockerfile
├── docker-compose.yml
├── astra.config.json
├── package.json
└── tsconfig.json
```

## 9. Dashboard Pages

| Page | Purpose |
|------|---------|
| `/` | Home — start scan (select preset, custom config overrides), recent scans list |
| `/scans/[id]` | Scan detail — live progress (SSE), findings table, node outputs accordion |
| `/scans/[id]/nodes/[node]` | Node detail — raw input/output JSON, node config used, tokens, timing, thinking tokens |
| `/config` | Per-node AI config editor — pick provider/model, set temperature/topP/topK, thinkingDepth/thinkingBudget, scanDepth, toggle tools, select knowledge, edit instructions, set retries/timeout, test provider connection |
| `/rules` | Business logic rules — list all, confirm/reject CANDIDATE rules |

## 10. Migration from astra-core

Code that migrates directly (with adaptation):
- `src/rules/` (patterns, guidelines, loader) → `src/rules/`
- `src/ai/prompt-builder.ts` → `src/scan/prompts/` (refactored into per-node templates)
- `src/discover.ts` (heuristic prioritization, file filtering) → `src/scan/nodes/discover.ts`
- `src/layers/deep-scan.ts` (parsing, concurrency) → `src/scan/nodes/deep-scan.ts`
- `src/layers/cross-file.ts` (cross-file analysis) → `src/scan/nodes/cross-file.ts`
- `src/findings/dedup.ts` → `src/scan/nodes/aggregate.ts`
- `src/config.ts` (Zod schemas, extended for per-node config) → `src/lib/config.ts`
- `src/tokenizer.ts` → `src/lib/tokenizer.ts`
- `src/logger.ts` → `src/lib/logger.ts`
- `src/ai/ollama.ts` → `src/providers/cloud-ollama.ts` + `src/providers/hosted-ollama.ts`
- `src/ai/openai.ts`, `anthropic.ts` → `src/providers/openai.ts`, `anthropic.ts`
- New: `src/providers/bedrock.ts`, `azure-ai-foundry.ts`, `langgraph-connector.ts`
- `astra.config.json` (extended with `nodes` section)

Code that's new:
- LangGraph.js StateGraph + state schema
- Next.js App Router + API routes
- Prisma schema + PostgreSQL
- SSE streaming endpoint
- Carbon dashboard components (port from `astra-poc/components/` + new ones)
- LangGraph tools (file-reader, directory-lister, pattern-matcher, code-searcher)
- CLI entry point that calls the REST API (the Next.js server must be running for CLI scans; this ensures both CLI and dashboard go through the same pipeline and persistence layer)
- Node persistence layer (NodeOutput model)

Code that's dropped:
- `astra-core/src/orchestrator.ts` (replaced by LangGraph graph)
- `astra-core/src/layers/deep-scan.ts` `runWithConcurrency` (LangGraph handles parallelism)
- SQLite (`better-sqlite3`) (replaced by PostgreSQL + Prisma)
- `astra-poc/lib/scanners.ts` (static scanners — AI-only now)
- `astra-poc/lib/normalize.ts` (replaced by LangGraph node parsing)

## 11. AI Provider Registry

The system supports multiple AI providers. Each can be configured per-node from the dashboard.

### 11.1 Supported providers

| Provider ID | Name | Auth | Status |
|------------|------|------|--------|
| `cloud-ollama` | Cloud Ollama (Ollama Cloud API) | `OLLAMA_API_KEY` env var | **Active** (primary) |
| `hosted-ollama` | Hosted Ollama (self-hosted server) | `OLLAMA_HOST` URL + optional key | Supported |
| `openai` | OpenAI API | `OPENAI_API_KEY` env var | Supported |
| `anthropic` | Anthropic Claude API | `ANTHROPIC_API_KEY` env var | Supported |
| `bedrock` | AWS Bedrock | AWS credentials (IAM/keys) | Supported |
| `azure-ai-foundry` | Azure AI Foundry | Azure API key | Supported |
| `langgraph` | LangGraph Connectors | Per-connector config | Supported |

### 11.2 Active models (Cloud Ollama)

For the current development phase, we use Cloud Ollama with two models:

| Model ID | Context Window | Best For |
|----------|---------------|----------|
| `glm-5.1:cloud` | 131,072 tokens | Discovery, cross-file analysis (strong reasoning) |
| `kimi-k2.6:cloud` | 131,072 tokens | Deep-scan per-file (fast, accurate vulnerability detection) |

### 11.3 Provider switching in UI

The `/config` dashboard page provides:
- **Provider dropdown** per node — select from all registered providers
- **Model dropdown** per node — dynamically populated based on selected provider
- **Connection test** button — verify provider credentials before saving
- **Per-node preview** — shows which provider+model+tools+knowledge each node will use

All changes are persisted via `PUT /api/v1/config` and take effect on the next scan.

## 12. Database Connection

| Parameter | Value |
|-----------|-------|
| Host | `localhost` |
| Port | `5432` |
| User | `super_admin` |
| Password | `AlwaysHustling@2026` |
| Database | `astra-dev` |
| Schema | `public` |

Connection string: `postgresql://super_admin:AlwaysHustling%402026@localhost:5432/astra-dev?schema=public`

Environment variable: `DATABASE_URL="postgresql://super_admin:AlwaysHustling%402026@localhost:5432/astra-dev?schema=public"`

## 13. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15 |
| UI | IBM Carbon Design System | Latest |
| AI Orchestration | LangGraph.js | Latest |
| AI Providers | Cloud Ollama (active), Hosted Ollama, OpenAI, Anthropic, Bedrock, Azure AI Foundry, LangGraph Connectors | Via respective SDKs |
| Database | PostgreSQL | 16+ |
| ORM | Prisma | Latest |
| Language | TypeScript | 5.6+ |
| CSS | Sass + Carbon | Latest |
| Monospace font | IBM Plex Sans | 300/400/600 |

## 14. Non-Goals (for this phase)

- Static scanner integration (Trivy, Semgrep, Gitleaks, Bearer) — AI-only scanning
- Authentication / authorization (SAML, OIDC, RBAC) — single-user for now
- CI/CD integration webhooks — API-first, consumers can call directly
- Multi-tenant isolation — single database, single user
- Production deployment (Docker, K8s) — local dev first