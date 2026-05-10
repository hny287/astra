# Astra LangGraph Pipeline — Workflow Reference

**Date:** 2026-05-09
**Purpose:** Exhaustive technical reference for how the scan pipeline executes, how state flows between nodes, how configuration is resolved per node, and how the job queue drives everything at runtime.

---

## 1. Architecture: Two Layers

There are **two parallel definitions** of the pipeline that coexist in the codebase:

| Layer | File | What it does | Used at runtime? |
|-------|------|--------------|-------------------|
| LangGraph `StateGraph` | `src/scan/graph.ts` | Defines the graph topology (nodes + edges), compiles with `createScanGraph()` | **No.** The function exists but is never called. |
| PostgreSQL job queue | `src/scan/queue.ts` + `src/scan/worker.ts` | Sequential job processing: claim job → run node function → enqueue next job | **Yes.** This is what actually runs. |

The `StateGraph` in `graph.ts` defines the state schema with `Annotation.Root({...})` and reducers, but the worker bypasses it entirely. The worker calls node functions directly from a plain `NODE_FNS` map and manages state through the `Job` model in PostgreSQL.

**Why both exist:** The `StateGraph` was the original design intent (see design spec `2026-05-06-astra-langgraph-nextjs-design.md`). The job queue was built as a simpler runtime that achieves the same sequential pipeline without LangGraph's `stream()`/checkpointing overhead. The `StateGraph` definition remains as documentation of the intended state schema and reducers.

---

## 2. The Graph Topology

```
START → clone → discover → deep_scan → cross_file → aggregate → persist → END
```

Linear, no branching, no parallelism at the graph level. Each node runs to completion before the next begins.

The only node that runs sub-operations in parallel is `deep_scan`, which processes multiple files concurrently using `Promise.all(batchedFiles)` with a concurrency limit from config.

---

## 3. State: What Flows Through the Pipeline

### 3.1 ScanState interface

Defined in `src/scan/state.ts`:

```typescript
interface ScanState {
  repoUrl: string;                    // Set by POST /scans, never modified
  branch: string;                     // Set by POST /scans, never modified
  localDir: string;                   // Set by clone
  commitSha: string;                  // Set by clone
  scanId: string;                     // Set by worker before first node
  config: AstraConfig;               // Full config snapshot, set once
  discoveredFiles: PrioritizedFile[]; // Set by discover
  skippedFiles: string[];            // Set by discover
  totalFiles: number;                // Set by discover
  findingsPerFile: Record<string, UnifiedFinding[]>; // Built by deep_scan
  fileSummaries: FileSummary[];      // Built by deep_scan
  crossFileFindings: UnifiedFinding[]; // Built by cross_file
  businessRules: BusinessLogicRule[];  // Built by cross_file
  allFindings: UnifiedFinding[];     // Set by aggregate
  deduplicatedFindings: UnifiedFinding[]; // Set by aggregate
  errors: string[];                  // Appended by any node on failure
  tokenUsage: { input: number; output: number; thinking: number }; // Accumulated by AI nodes
  status: ScanStatus;               // PENDING → RUNNING → COMPLETED | FAILED
  currentJobId?: string;             // Set by worker per-job
  userId?: string;                   // Set by worker from scan.userId
  currentJobInput?: Record<string, unknown>; // Raw job input
}
```

### 3.2 LangGraph Annotation reducers (from `graph.ts`)

These define how partial state updates merge into the full state:

| Field | Reducer | Behavior |
|-------|----------|----------|
| `repoUrl`, `branch`, `localDir`, `commitSha`, `scanId`, `config`, `discoveredFiles`, `totalFiles`, `allFindings`, `deduplicatedFindings`, `status` | `(_, update) => update` | **Last-write-wins.** New value replaces old. |
| `skippedFiles`, `fileSummaries`, `crossFileFindings`, `businessRules`, `errors` | `(a, b) => [...a, ...b]` | **Append.** New items are concatenated onto existing array. |
| `findingsPerFile` | `(a, b) => ({ ...a, ...b })` | **Merge objects.** New file entries are merged into the existing map. |
| `tokenUsage` | `(a, b) => ({ input: a.input + b.input, output: a.output + b.output, thinking: a.thinking + b.thinking })` | **Additive.** Token counts accumulate across nodes. |

### 3.3 How state actually moves between nodes (runtime)

At runtime, the worker does NOT use LangGraph's state machine. Instead:

1. **Before each node:** Worker reconstructs state by reading all completed `Job` rows for this scan from PostgreSQL, merging their `outputJson` fields in pipeline order.
2. **During each node:** The node function receives the full `ScanState` and returns a `Partial<ScanState>` with only the fields it changed.
3. **After each node:** Worker stores the partial output as `outputJson` on the completed `Job` row. Then enqueues the next node's job with `inputJson` carrying forward any fields the next node needs.

This means state is **persisted to disk between every node** via the `Job` table, achieving the same durability as LangGraph checkpointing through a different mechanism.

---

## 4. Node-by-Node: What Each One Does

### 4.1 `clone`

**File:** `src/scan/nodes/clone.ts`
**AI-powered:** No
**Config used:** None (deterministic git operations)

**Input from state:**
- `repoUrl` — the repository URL
- `branch` — git branch (default: `main`)
- `userId` — used to look up GitHub PAT for private repos

**Steps:**
1. Create temp directory (`astra-scan-<cuid>`)
2. Resolve clone URL: if `userId` exists, look up their `GithubProfile`, decrypt the access token with `AES-256-GCM`, inject it into the URL as `https://<token>:x-oauth-basic@github.com/...`
3. Run `git clone --branch <branch> --single-branch --depth 1 <url> <tmpdir>`
4. Run `git rev-parse HEAD` to get commit SHA
5. Count files in cloned directory

**Output (partial state):**
- `localDir` — absolute path to temp directory
- `commitSha` — resolved commit hash
- `status` — set to `RUNNING` on success
- `errors` — appended on failure

**Failure modes:**
- Git clone fails (repo not found, auth failure, network error)
- `localDir` contains `astra-scan-` as safety check before cleanup
- Temp dir cleanup on failure via `cleanupScanTmpDir()`

**Security:** PAT is never logged. Clone log prints the original `repoUrl`, not the token-injected URL.

---

### 4.2 `discover`

**File:** `src/scan/nodes/discover.ts`
**AI-powered:** Yes
**Config node:** `config.scan.nodes.discover`
**Tools available:** `directory_lister`, `pattern_matcher`

**Input from state:**
- `localDir` — from clone
- `config` — for provider/model/temperature settings
- `scanId` — for AI call logging

**Steps:**
1. Walk the cloned directory tree
2. Skip directories: `.git`, `node_modules`, `__pycache__`, `.venv`, `dist`, `build`, `.next`, `vendor`, `.terraform`
3. Prioritize files by security relevance (file extension, path patterns)
4. Call AI provider with a prompt that includes the file list and asks for prioritization
5. Parse AI response into a `PrioritizedFile[]` with `path`, `priority`, `language` fields

**Output (partial state):**
- `discoveredFiles` — prioritized file list
- `skippedFiles` — files that were skipped
- `totalFiles` — count of discovered files
- `tokenUsage` — accumulated token counts
- `errors` — appended on failure
- `status` — updated

**AI prompt pattern:** Sends the file tree + directory listing tool results to the model. Model returns a JSON array of prioritized files with security relevance scores.

---

### 4.3 `deep_scan`

**File:** `src/scan/nodes/deep-scan.ts`
**AI-powered:** Yes
**Config node:** `config.scan.nodes.deepScan`
**Tools available:** `file_reader`, `pattern_matcher`
**Parallel:** Yes — files are batched and processed concurrently

**Input from state:**
- `localDir` — from clone
- `discoveredFiles` — from discover
- `config` — for provider/model/temperature/scanDepth/concurrency settings
- `scanId` — for AI call logging
- `userId` — for scan ownership

**Steps:**
1. Read `discoveredFiles` list
2. Filter by `maxFileBytes` (skip files larger than configured limit)
3. Batch files by `concurrency` setting (default: 5 parallel)
4. For each file:
   a. Read file contents
   b. Call `createProviderForNode(config, 'deepScan')` to instantiate the AI provider
   c. Call `instrumentedSend()` with a vulnerability analysis prompt
   d. Parse AI response into `UnifiedFinding[]` and `FileSummary`
   e. Log AI call to `AiCallLog` table
5. Merge all per-file results

**Output (partial state):**
- `findingsPerFile` — `Record<string, UnifiedFinding[]>` keyed by file path
- `fileSummaries` — `FileSummary[]` (one per scanned file)
- `tokenUsage` — accumulated from all AI calls
- `errors` — appended on per-file failure (doesn't halt the entire scan)
- `status` — updated

**Concurrency:** Files are processed in batches of `config.scan.nodes.deepScan.concurrency` (default 5). Each batch runs with `Promise.all()`. Failed individual files are logged to `errors` but don't fail the entire scan.

**Retry logic:** Each AI call uses `maxRetries` with `retryBackoffMs` exponential backoff. Empty AI responses are detected and retried.

**AI prompt:** Sends the file content + pattern matcher results + scan depth instructions. Asks for structured JSON output with vulnerability findings including severity, CWE, OWASP, exploit score, and remediation.

---

### 4.4 `cross_file`

**File:** `src/scan/nodes/cross-file.ts`
**AI-powered:** Yes
**Config node:** `config.scan.nodes.crossFile`
**Tools available:** `file_reader`, `code_searcher`

**Input from state:**
- `localDir` — from clone
- `findingsPerFile` — from deep_scan
- `fileSummaries` — from deep_scan
- `config` — for provider/model/temperature settings
- `scanId` — for AI call logging

**Steps:**
1. Aggregate all `fileSummaries` into a codebase map
2. Call AI provider with the aggregated summaries and ask for:
   a. Cross-file business logic vulnerabilities (data flows, missing auth middleware, privilege escalation)
   b. Security invariants (rules that should hold across the codebase)
3. Parse AI response into:
   - `crossFileFindings: UnifiedFinding[]` — violations of security invariants
   - `businessRules: BusinessLogicRule[]` — inferred security rules with confidence scores

**Output (partial state):**
- `crossFileFindings` — findings that span multiple files
- `businessRules` — inferred security invariants
- `tokenUsage` — accumulated
- `errors` — appended on failure
- `status` — updated

**AI prompt:** Sends the full list of file summaries (not raw code) and asks the model to identify cross-file patterns, data flows, and security invariants. This runs after `deep_scan` completes so it has access to all per-file findings.

---

### 4.5 `aggregate`

**File:** `src/scan/nodes/aggregate.ts`
**AI-powered:** No
**Deterministic:** Yes

**Input from state:**
- `findingsPerFile` — from deep_scan
- `crossFileFindings` — from cross_file

**Steps:**
1. Collect all findings from `findingsPerFile` into a flat `allFindings` array
2. Append `crossFileFindings` to `allFindings`
3. Deduplicate by `fingerprint` (SHA-256 of `scanner + ruleId + file + lineStart`)
4. Filter by configured severity levels (`config.scan.severity`)
5. Sort by severity (CRITICAL → HIGH → MEDIUM → LOW → INFO)

**Output (partial state):**
- `allFindings` — all findings before dedup
- `deduplicatedFindings` — deduplicated and filtered findings
- `status` — updated

**No AI calls.** This is pure data processing.

---

### 4.6 `persist`

**File:** `src/scan/nodes/persist.ts`
**AI-powered:** No
**Deterministic:** Yes

**Input from state:**
- `allFindings` — from aggregate
- `deduplicatedFindings` — from aggregate
- `businessRules` — from cross_file
- `scanId` — for DB writes

**Steps:**
1. Write all `deduplicatedFindings` to `Finding` table in PostgreSQL
2. Create `Task` records for HIGH and CRITICAL findings (auto-generated remediation tasks)
3. Write `businessRules` to `BusinessLogicRule` table with `CANDIDATE` status
4. Update `Scan` record: set `status = COMPLETED`, calculate `durationSeconds`

**Output (partial state):**
- `status` — set to `COMPLETED`
- `errors` — appended on DB write failure

**Failure:** If persist fails, the scan status is set to `FAILED` and all findings are lost (they exist only in memory). This is a known issue — findings should be written incrementally during `deep_scan`, not all at once in `persist`.

---

## 5. Configuration Resolution

### 5.1 How config reaches each node

```
POST /api/v1/scans
  body: { repoUrl, branch, config?: { nodes?: { discover?, deepScan?, crossFile? } } }
    ↓
loadConfigFromDb() → full AstraConfig
    ↓
if (body.config?.nodes) → mergeNodeOverrides(baseConfig, body.config.nodes)
    ↓
scan.configJson = mergedConfig  (stored in DB)
    ↓
worker reads scan.configJson → passes to each node function as state.config
    ↓
each node reads state.config.scan.nodes.<nodeName> for its specific settings
```

### 5.2 Per-node config resolution

Each AI-powered node resolves its AI provider like this:

```
nodeConfig = state.config.scan.nodes[<nodeName>]  // e.g. 'deepScan'
provider = createProviderForNode(nodeConfig)        // factory.ts
```

`createProviderForNode()` does:
1. Read `nodeConfig.provider` (e.g. `"cloud-ollama"`)
2. Read `nodeConfig.model` (e.g. `"kimi-k2.6:cloud"`)
3. Look up the provider config from `state.config.providers[provider]` (baseURL, apiKeyEnv)
4. Read `nodeConfig.temperature`, `nodeConfig.thinkingDepth`, etc.
5. Map `thinkingDepth` to `thinkingBudget` using `THINKING_DEPTH_BUDGET` mapping if `thinkingBudget` is null
6. Map `scanDepth` to `maxOutputTokens` using `SCAN_DEPTH_OUTPUT_TOKENS` mapping
7. Return an instantiated `AIProvider` object

### 5.3 Non-AI nodes (clone, aggregate, persist)

These nodes read from `state.config` but don't instantiate AI providers. They use:
- `clone`: No config needed (uses `userId` for PAT resolution)
- `aggregate`: `state.config.scan.severity` for filtering
- `persist`: No config needed (pure DB writes)

### 5.4 Config override chain

```
DB defaults (astra.config)
  ↓ mergeNodeOverrides()
Per-scan overrides (POST body config.nodes)
  ↓
Final per-node config
```

`mergeNodeOverrides(base, overrides)` deep-merges the override partial config into the base config. Only the 3 AI nodes (discover, deepScan, crossFile) can be overridden per-scan.

---

## 6. Job Queue: How Nodes Actually Execute

### 6.1 The pipeline

```typescript
const NODE_PIPELINE = ['clone', 'discover', 'deep_scan', 'cross_file', 'aggregate', 'persist'];
```

### 6.2 Scan creation flow

```
POST /api/v1/scans { repoUrl, branch, config? }
  ↓
requireAuth() → userId
  ↓
loadConfigFromDb() → mergeNodeOverrides() → finalConfig
  ↓
prisma.scan.create({ repoUrl, branch, configJson: finalConfig, status: PENDING, userId })
  ↓
enqueuePipeline(scanId, { repoUrl, branch, config: finalConfig })
  → creates Job(PENDING, node='clone') with inputJson = { repoUrl, branch, config }
  ↓
startWorker() → begins polling
```

### 6.3 Worker execution loop

```
processNextJob()
  ↓
claimNextJob() → picks oldest PENDING Job, sets to RUNNING
  ↓
reconstructState(scanId, inputJson)
  → reads all completed Jobs for this scan
  → merges their outputJson fields in pipeline order
  → builds ScanState
  ↓
nodeFn(state) → Partial<ScanState>
  ↓
markJobComplete(jobId, outputJson)
  ↓
enqueueNextJob(scanId, currentNode)
  → creates Job(PENDING, node=getNextNode(currentNode))
  ↓
processNextJob() → recurse
```

### 6.4 State reconstruction

```typescript
async function reconstructState(scanId: string, inputJson: Record<string, unknown>): Promise<ScanState> {
  // Start with defaults
  const state: ScanState = { ...defaultScanState, ...inputJson };

  // Merge outputs from all completed jobs for this scan
  const completedJobs = await prisma.job.findMany({
    where: { scanId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
  });

  for (const job of completedJobs) {
    mergeStateFromOutput(state, job.outputJson as Record<string, unknown>);
  }

  return state;
}
```

`mergeStateFromOutput()` applies the same reducer logic as the LangGraph annotations:
- Arrays: append
- Objects: merge
- Scalars: last-write-wins
- `tokenUsage`: additive

### 6.5 Error handling

If a node throws:
1. Worker catches the error
2. Calls `markJobFailed(jobId, errorMessage)`
3. Calls `markScanFailed(scanId)`
4. Worker continues to `processNextJob()` for other scans
5. Failed scan can be resumed via `POST /api/v1/scans/:id/resume`
6. Individual nodes can be re-run via `POST /api/v1/scans/:id/rerun-node`

### 6.6 Stuck job cleanup

`cleanupStuckJobs()` runs periodically. Any job in `RUNNING` status for more than 10 minutes is reset to `PENDING` so it can be reclaimed.

---

## 7. AI Provider Factory

### 7.1 How providers are instantiated

`src/providers/factory.ts`:

```typescript
function createProviderForNode(nodeConfig: NodeConfig): AIProvider {
  // 1. Get provider name from node config
  // 2. Get provider config from scan.config.providers[provider]
  // 3. Look up model in provider config for token limits
  // 4. Instantiate the provider class with (providerConfig, nodeConfig)
  // 5. Return AIProvider instance
}
```

### 7.2 Provider interface

```typescript
interface AIProvider {
  readonly id: string;
  send(request: AIRequest): Promise<AIResponse>;
  sendStream(request: AIRequest): AsyncGenerator<StreamChunk>;  // design spec, not yet implemented
  testConnection(): Promise<boolean>;
  estimateTokens(text: string): number;
}
```

### 7.3 Provider implementations

| Provider | File | SDK | Status |
|----------|------|-----|--------|
| Cloud Ollama | `cloud-ollama.ts` | `ollama` npm → `https://api.ohmyllama.com` | Active |
| Hosted Ollama | `hosted-ollama.ts` | `ollama` npm → local `OLLAMA_HOST` | Active |
| OpenAI | `openai.ts` | `openai` npm | Active |
| Anthropic | `anthropic.ts` | `@anthropic-ai/sdk` | Active |
| AWS Bedrock | `bedrock.ts` | AWS SDK | Stub — throws "not yet implemented" |
| Azure AI Foundry | `azure-ai-foundry.ts` | Azure SDK | Stub — throws "not yet implemented" |
| LangGraph | `langgraph-connector.ts` | — | Stub — throws "not yet implemented" |

### 7.4 AI call instrumentation

Every AI call goes through `instrumentedSend()` in `src/lib/ai-instrumentation.ts`:

```
instrumentedSend(provider, request, nodeConfig, scanId)
  ↓
  start = Date.now()
  response = await provider.send(request)
  ↓
  prisma.aiCallLog.create({
    provider: nodeConfig.provider,
    model: nodeConfig.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    thinkingTokens: response.thinkingTokens,
    durationMs: Date.now() - start,
    status: response.error ? 'FAILED' : 'SUCCESS',
    requestJson: request,      // full prompt
    responseJson: response,    // full response
    scanId: scanId,
    nodeId: nodeConfig,        // which pipeline node
  })
  ↓
  return response
```

This gives full observability in the `/observability` page.

---

## 8. Tools: What the AI Can Call

### 8.1 Tool creation

Tools are created per-node using factory functions that bind the `baseDir` (the cloned repo path):

```typescript
// In deep-scan.ts:
const tools = [
  createFileReaderTool(state.localDir),
  createPatternMatcherTool(state.localDir),
];
```

Each tool validates that file paths resolve within `baseDir` (path traversal protection).

### 8.2 Tool → Node assignment

| Tool | Factory Function | Input Schema | Used By |
|------|-----------------|--------------|---------|
| `directory_lister` | `createDirectoryListerTool(baseDir)` | `dirPath: string` (required), `extensionFilter?: string` | discover |
| `pattern_matcher` | `createPatternMatcherTool(baseDir)` | `filePath: string` (required), `patternName: string` (required) — one of 7 built-in patterns | discover, deep_scan |
| `file_reader` | `createFileReaderTool(baseDir)` | `filePath: string` (required), `startLine?: number`, `endLine?: number` (1-indexed) | deep_scan, cross_file |
| `code_searcher` | `createCodeSearcherTool(baseDir)` | `regex: string` (required), `fileFilter?: string`, `maxResults?: number` (default 50) | cross_file |

### 8.3 Pattern matcher built-in patterns

| Pattern Name | Regex | Category |
|-------------|-------|----------|
| `sql_injection` | `/(?:execute\s*\(|\.query\s*\(|\.raw\s*\(|\.exec\s*\(|string\.format.*(?:SELECT\|INSERT\|UPDATE\|DELETE\|DROP))/i` | SAST |
| `xss` | `/(?:innerHTML\|document\.write\|v-html\|dangerouslySetInnerHTML\|\.html\s*\()/i` | SAST |
| `hardcoded_secret` | `/(?:password\s*[:=]\s*['"][^'"]+['"]\|api_?key\s*[:=]\s*['"][^'"]+['"]\|secret\s*[:=]\s*['"][^'"]+['"]\|token\s*[:=]\s*['"][^'"]+['"]\|private_?key\s*[:=]\s*['"][^'"]+['"])/i` | Secrets |
| `eval_usage` | `/(?:\beval\s*\(\|new\s+Function\s*\(\|setTimeout\s*\(\s*['"\`]\|setInterval\s*\(\s*['"\`])/i` | SAST |
| `weak_crypto` | `/(?:MD5\|SHA1\|DES\|RC4\|ECB\|hashlib\.md5\|hashlib\.sha1\|crypto\.createCipher\b)/i` | SAST |
| `path_traversal` | `/(?:\.\.\/\|\.\.\\\|path\.join\s*\([^)]*\.\.\|\.\.\/\|readFile\s*\([^)]*\+\|writeFile\s*\([^)]*\+)/i` | SAST |
| `missing_auth` | `/(?:app\.(get\|post\|put\|delete\|patch)\s*\(\s*['"])/i` | SAST |

### 8.4 Current tool usage gap

The tools are **defined** using LangChain's `tool()` function from `@langchain/core/tools` with Zod schemas, but they are **not yet wired into the AI call flow**. The node functions call AI providers directly with prompts, not through LangGraph's tool-calling mechanism. The tools exist as utility functions that could be invoked by an AI agent in a future implementation.

---

## 9. Scan Presets

### 9.1 Built-in presets

| Preset | discover | deepScan | crossFile |
|--------|----------|----------|-----------|
| `quick` | depth:quick, think:low, out:500 | depth:quick, think:medium, out:1K | skip |
| `standard` | depth:standard, think:medium | depth:standard, think:high, out:2K | depth:standard, think:high |
| `deep` (default) | depth:standard, think:medium | depth:deep, think:high, out:4K | depth:deep, think:max, out:4K |
| `exhaustive` | depth:deep, think:high | depth:exhaustive, think:max, out:8K | depth:exhaustive, think:max, out:8K |

### 9.2 Preset storage

Presets are stored in the `Preset` table in PostgreSQL. Built-in presets (seeded) have `userId: null`. Custom presets are scoped to a user.

### 9.3 Per-scan override

When creating a scan via `POST /api/v1/scans`, the `config.nodes` object allows overriding any per-node setting:

```json
{
  "repoUrl": "https://github.com/org/repo",
  "branch": "main",
  "config": {
    "nodes": {
      "deepScan": {
        "model": "claude-sonnet-4-20250514",
        "thinkingDepth": "max",
        "concurrency": 3
      }
    }
  }
}
```

This merges on top of the DB config via `mergeNodeOverrides()`.

---

## 10. API Endpoints for Pipeline Interaction

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/v1/scans` | Create scan (repoUrl, branch, config overrides) |
| `GET` | `/api/v1/scans/:id` | Get scan detail including status, config, counts |
| `GET` | `/api/v1/scans/:id/nodes` | Get all Job records for this scan (NodeOutput-style) |
| `GET` | `/api/v1/scans/:id/progress` | SSE stream for real-time progress updates |
| `POST` | `/api/v1/scans/:id/cancel` | Set scan status to FAILED, stop processing |
| `POST` | `/api/v1/scans/:id/resume` | Resume a failed scan from the next uncompleted node |
| `POST` | `/api/v1/scans/:id/rerun-node` | Re-run a specific node (body: `{ node: 'deep_scan' }`) |
| `GET` | `/api/v1/scans/:id/logs` | Get scan log entries |
| `GET` | `/api/v1/config` | Get current config (includes all per-node settings) |
| `PUT` | `/api/v1/config` | Update config (ADMIN only) |
| `GET` | `/api/v1/presets` | List presets |
| `POST` | `/api/v1/presets` | Create custom preset |

---

## 11. Known Gaps and Intended Work

| Gap | Current State | Intended State |
|-----|---------------|----------------|
| LangGraph execution not used | `graph.ts` compiles but `createScanGraph()` is never called | Nodes should run through `StateGraph.stream()` with checkpointing |
| Tools not wired to AI | Tools defined with Zod schemas but nodes call AI directly | AI should invoke tools through LangGraph's tool-calling |
| Streaming not implemented | `sendStream()` is a design spec, not yet built | SSE endpoints for real-time progress |
| No parallel graph branches | Pipeline is strictly linear | Future: parallel scanner nodes, conditional routing |
| Findings written all at once | `persist` node writes all findings in one transaction | Incremental writes during `deep_scan` |
| Worker queue fairness | `claimNextJob()` picks oldest PENDING globally | Per-scan priority, stale job filtering |
| Bandit/Checkov not wired | Installed in Dockerfile but not called | Additional scanner integrations |
| `cross_file` context window bomb | Concatenates ALL file summaries into one prompt | Token budgeting, summarization, chunking |