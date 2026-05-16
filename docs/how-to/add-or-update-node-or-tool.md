# How to Add or Update a Pipeline Node or Scanner Tool

This is the hyper-detailed, step-by-step checklist for modifying the Astra scan pipeline. Every file you must touch is listed in exact order, with exact snippets, line references, and verification steps.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Part A: Add a New Pipeline Node](#part-a-add-a-new-pipeline-node)
3. [Part B: Add a New Scanner Tool (to an Existing Node)](#part-b-add-a-new-scanner-tool)
4. [Part C: Update an Existing Node](#part-c-update-an-existing-node)
5. [Part D: Update an Existing Scanner Tool](#part-d-update-an-existing-scanner-tool)
6. [Verification Checklist](#verification-checklist)

---

## Architecture Overview

The pipeline is a **linear DAG** executed job-by-job:

```
clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
```

Each node is:
1. A **function** in `src/scan/nodes/<name>.ts` — signature: `(state: ScanState) => Promise<Partial<ScanState>>`
2. Registered in **three** places: `queue.ts` (pipeline ordering), `worker.ts` (node function map), `state.ts` (state shape)
3. Configured in `config.ts` (Zod schema + defaults) and `seed.ts` (initial DB seed)
4. Visible in the UI via `ScanProgress.tsx`, `pipeline/page.tsx`, `scans/[id]/page.tsx` (NodeOutputInspector)
5. Rerunnable via `rerun-node/route.ts`
6. State is reconstructed from `Job.outputJson` rows via `mergeStateFromOutput` in `worker.ts`

A **scanner tool** is a subprocess binary (e.g., Trivy, Gitleaks) invoked inside a node (currently `tool_scan`). Adding a scanner means: define types for its output, write a normalizer, call the binary, and pass the findings into state.

---

## Part A: Add a New Pipeline Node

### Step 1: Define the Node Name

Pick a **snake_case** name (e.g., `dependency_scan`, `iac_scan`, `custom_check`). This name is used as:
- The filename: `src/scan/nodes/<name>.ts`
- The job `node` column value in the DB
- The `NODE_PIPELINE` array entry in `queue.ts`
- The `NODE_FNS` key in `worker.ts`
- UI labels in `ScanProgress.tsx` and `pipeline/page.tsx`

### Step 2: Add State Fields to `src/scan/state.ts`

If your node produces new data that downstream nodes consume, add fields to `ScanState`:

```typescript
// src/scan/state.ts — add to ScanState interface
export interface ScanState {
  // ... existing fields ...
  myNewField: MyNewType[];  // ← add your new field(s)
}
```

If your node doesn't produce new state (e.g., it writes directly to the DB like `persist`), skip this.

### Step 3: Add State Reconstruction in `src/scan/worker.ts`

Two places in `worker.ts`:

**3a. `reconstructState()` — initialize the field:**

```typescript
// src/scan/worker.ts — reconstructState() function
// Add to baseState object:
const baseState: ScanState = {
  // ... existing ...
  myNewField: [],   // ← initialize
};

// Add merge line in mergeStateFromOutput():
if (output.myNewField) state.myNewField = output.myNewField as MyNewType[];
```

**3b. The `mergeStateFromOutput()` function** — if your field accumulates (like `errors`), use spread: `state.myNewField = [...state.myNewField, ...(output.myNewField as MyNewType[])]`. If it replaces (like `localDir`), use direct assignment.

### Step 4: Register Node in `src/scan/queue.ts`

**4a. Add to `NODE_PIPELINE` array:**

```typescript
// src/scan/queue.ts
const NODE_PIPELINE = [
  'clone', 'discover', 'git_ingest', 'git_diagram', 'tool_scan',
  'deep_scan', 'cross_file', 'aggregate', 'persist',
  'my_new_node',  // ← add at the correct position
] as const;
```

Position matters — this defines execution order. Place your node _after_ the node that produces its inputs and _before_ the node that consumes its outputs.

**4b. Update `NodeName` type** — it's automatically derived: `typeof NODE_PIPELINE[number]`. No manual change needed.

### Step 5: Register Node in `src/scan/worker.ts`

**5a. Import your node function:**

```typescript
// src/scan/worker.ts — top imports
import { myNewNode } from './nodes/my-new-node';
```

**5b. Add to `NODE_FNS` map:**

```typescript
// src/scan/worker.ts — NODE_FNS
const NODE_FNS: Record<string, (state: ScanState) => Promise<Partial<ScanState>>> = {
  clone: cloneNode,
  // ... existing ...
  my_new_node: myNewNode,  // ← key must match NODE_PIPELINE name exactly
};
```

### Step 6: Add Config Schema Entry in `src/lib/config.ts`

**6a. Add a key to `scanSchema.nodes`:**

```typescript
// src/lib/config.ts — scanSchema
export const scanSchema = z.object({
  nodes: z.object({
    // ... existing nodes ...
    myNewNode: nodeConfigSchema,  // ← add (use camelCase for the key)
  }),
  // ...
});
```

**6b. Add a default config in `DEFAULT_NODE_CONFIGS`:**

```typescript
// src/lib/config.ts — DEFAULT_NODE_CONFIGS
const DEFAULT_NODE_CONFIGS: Record<string, z.infer<typeof nodeConfigSchema>> = {
  // ... existing ...
  myNewNode: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.2,
    thinkingDepth: 'medium',
    thinkingBudget: null,
    topP: 0.9,
    topK: null,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    scanDepth: 'standard',
    maxFileBytes: 204800,
    maxOutputTokens: 4096,
    contextWindowOverride: null,
    instructions: '',
    tools: [],
    knowledge: [],
    maxRetries: 3,
    retryBackoffMs: 2000,
    timeoutMs: 120000,
    concurrency: 1,
  },
};
```

If your node is a **system node** (no AI calls), you can create a minimal config or skip the AI provider resolution — but the config key must still exist so `ensureNodeConfigs()` doesn't crash.

**6c. Add to `mergeNodeOverrides()`:**

```typescript
// src/lib/config.ts — mergeNodeOverrides
export function mergeNodeOverrides(
  base: ScanConfig,
  overrides: {
    // ... existing ...
    myNewNode?: PartialNodeOverrides;  // ← add
  }
): ScanConfig {
  return {
    ...base,
    scan: {
      ...base.scan,
      nodes: {
        // ... existing ...
        myNewNode: { ...base.scan.nodes.myNewNode, ...overrides.myNewNode },  // ← add
      },
    },
  };
}
```

### Step 7: Update `src/providers/factory.ts` (If AI Node)

If your node calls an AI provider, add your node name to the union type in `createProviderForNode`:

```typescript
// src/providers/factory.ts — createProviderForNode
export function createProviderForNode(
  nodeName: "discover" | "deepScan" | "crossFile" | "myNewNode",  // ← add
  config: ScanConfig
): AIProvider {
```

If your node is a system node (no AI), skip this.

### Step 8: Write the Node Implementation

Create `src/scan/nodes/my-new-node.ts`:

```typescript
import type { ScanState } from '../state';
import { log } from '../log';
import { prisma } from '@/lib/db';

export async function myNewNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const errors: string[] = [];

  await log(state.scanId, 'info', 'my_new_node', 'Starting my new node...');

  try {
    // ── Your logic here ──────────────────────────────────────────────
    // Read inputs from state (state.localDir, state.discoveredFiles, etc.)
    // Do the work
    // Return partial state updates
    // ──────────────────────────────────────────────────────────────────

    const result: MyResultType[] = [];  // your actual computation

    await log(state.scanId, 'success', 'my_new_node', `Done: ${result.length} items`);

    // Save NodeOutput for observability (follow existing pattern)
    try {
      await prisma.nodeOutput.create({
        data: {
          scanId: state.scanId,
          node: 'my_new_node',
          modelUsed: 'my-model',          // or provider model name
          provider: 'system',             // or actual provider ID
          nodeConfig: {} as any,
          inputJson: {} as any,
          outputJson: { itemCount: result.length } as any,
          durationMs: Date.now() - startTime,
        },
      });
    } catch {
      errors.push('Failed to save NodeOutput for my_new_node');
    }

    return {
      myNewField: result,
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await log(state.scanId, 'error', 'my_new_node', `Failed: ${message}`);
    return {
      myNewField: [],
      errors: [`my_new_node failed: ${message}`],
      status: 'FAILED',
    };
  }
}
```

**Key conventions:**
- Always `await log()` at start, on error, and on completion
- Always wrap `prisma.nodeOutput.create` in try/catch (non-critical)
- Return `status: 'FAILED'` only for fatal errors that should stop the pipeline
- Return `errors: [...]` for non-fatal issues (pipeline continues)
- If the node uses AI, use `createProviderForNode()` + `instrumentedSend()` (see `deep-scan.ts` for the pattern)

### Step 9: Update `src/app/api/v1/scans/[id]/rerun-node/route.ts`

**9a. Add to `NODE_TO_SCANNER` mapping:**

```typescript
// rerun-node/route.ts — NODE_TO_SCANNER
const NODE_TO_SCANNER: Record<string, string[]> = {
  // ... existing ...
  my_new_node: ['my-scanner-id'],  // scanner IDs whose findings should be deleted on rerun
};
```

If your node doesn't produce findings, use an empty array: `my_new_node: []`.

**9b. Add to `VALID_NODES`:**

```typescript
// rerun-node/route.ts — VALID_NODES
const VALID_NODES: NodeName[] = [
  'clone', 'discover', 'git_ingest', 'git_diagram', 'tool_scan',
  'deep_scan', 'cross_file', 'aggregate', 'persist',
  'my_new_node',  // ← add
];
```

### Step 10: Update UI — `src/components/ScanProgress.tsx`

**10a. Add to `NODE_PIPELINE` array:**

```typescript
// ScanProgress.tsx — NODE_PIPELINE
const NODE_PIPELINE = [
  { id: 'clone', label: 'Clone', source: 'clone' },
  { id: 'discover', label: 'Discover', source: 'discover' },
  { id: 'git_ingest', label: 'Git Ingest', source: 'git_ingest' },
  { id: 'git_diagram', label: 'Git Diagram', source: 'git_diagram' },
  { id: 'tool_scan', label: 'Tool Scan', source: 'tool_scan' },
  { id: 'deep_scan', label: 'Deep Scan', source: 'deep_scan' },
  { id: 'cross_file', label: 'Cross-File', source: 'cross_file' },
  { id: 'aggregate', label: 'Aggregate', source: 'aggregate' },
  { id: 'persist', label: 'Persist', source: 'persist' },
  { id: 'my_new_node', label: 'My New Node', source: 'my_new_node' },  // ← add
] as const;
```

`id` must match the node name exactly. `source` must match the `source` field used in `ScanLog` entries. `label` is the human-readable display name.

### Step 11: Update UI — `src/app/(app)/pipeline/page.tsx`

**11a. Add to `PIPELINE_NODES` array:**

```typescript
// pipeline/page.tsx — PIPELINE_NODES
const PIPELINE_NODES = [
  { id: 'clone', label: 'Clone', type: 'system', description: '...' },
  // ... existing ...
  { id: 'my_new_node', label: 'My New Node', type: 'ai', description: 'What this node does' },  // ← add
];
```

Use `type: 'ai'` if the node uses AI, `type: 'system'` if it's a pure system node.

**11b. Add a color to `NODE_COLORS`:**

```typescript
// pipeline/page.tsx — NODE_COLORS
const NODE_COLORS: Record<string, string> = {
  // ... existing ...
  my_new_node: 'var(--ibm-teal-50)',  // ← pick a color
};
```

**11c. Add config mapping in `nodeConfigMap`:**

```typescript
// pipeline/page.tsx — inside the component
const nodeConfigMap: Record<string, NodeConfig | null> = {
  clone: null,
  // ... existing ...
  my_new_node: config.scan.nodes.myNewNode,  // ← add (null if system node)
};
```

Use `null` for system nodes (no AI config). Use `config.scan.nodes.myNewNode` for AI nodes.

### Step 12: Add a Prisma Migration (If New State Touches DB)

If your node adds new columns to the `Scan` model or a new model, create a migration:

```bash
npx prisma migrate dev --name add_my_new_node_fields
```

If your node only writes to `NodeOutput` or `Finding` (existing models), no migration needed.

### Step 13: Update Seed Data (`prisma/seed.ts`)

If the default config changed, ensure `seed.ts` will produce a valid config on fresh DB. Check the `scan.config` key in the seed upsert.

### Step 14: Update Changelog

Add an entry to `src/lib/changelog.ts` and the Changelog table in `CLAUDE.md`.

### Step 15: Update `src/scan/graph.ts` (If Using LangGraph)

The LangGraph path (`graph.ts`) is an **alternative** execution path that is NOT currently used by the worker. If you want it kept in sync:

```typescript
// src/scan/graph.ts — addNode + addEdge
.addNode('my_new_node', myNewNode)
.addEdge('previous_node', 'my_new_node')
.addEdge('my_new_node', 'next_node')
```

But this is optional — the worker doesn't use `graph.ts`.

### Step 16: Update CLAUDE.md

Update the pipeline description, known issues, key file paths, and changelog.

---

## Part B: Add a New Scanner Tool (to an Existing Node)

Scanner tools are currently all invoked inside `src/scan/nodes/tool-scan.ts`. To add a new scanner (e.g., Semgrep, Checkov, Bandit):

### Step 1: Define TypeScript Types for the Scanner's Raw Output

Add interfaces at the top of `tool-scan.ts` (follow the Trivy/Gitleaks pattern):

```typescript
// src/scan/nodes/tool-scan.ts

interface SemgrepResult {
  check_id: string;
  path: string;
  start: { line: number };
  end: { line: number };
  extra: {
    severity: string;
    message: string;
    metadata: { cwe?: string[]; owasp?: string };
  };
}
```

### Step 2: Write a Normalizer Function

Map the scanner's raw output to `UnifiedFinding[]`. Follow the `normalizeTrivyVuln` / `parseGitleaksOutput` pattern:

```typescript
function parseSemgrepOutput(json: string, localDir: string): UnifiedFinding[] {
  const findings: UnifiedFinding[] = [];
  try {
    const report = JSON.parse(json);
    const results: SemgrepResult[] = report.results ?? [];
    for (const r of results) {
      const severity = normalizeToSeverity(r.extra.severity);
      const file = r.path.replace(localDir + '/', '');
      findings.push({
        fingerprint: fingerprint('semgrep', r.check_id, file, r.start.line, r.extra.message),
        scanner: 'semgrep',
        ruleId: r.check_id,
        title: r.extra.message || r.check_id,
        description: r.extra.message || '',
        severity,
        category: 'SAST',
        file,
        lineStart: r.start.line,
        lineEnd: r.end.line,
        codeSnippet: '',
        language: '',
        cwe: r.extra.metadata.cwe ?? [],
        owasp: r.extra.metadata.owasp ? [r.extra.metadata.owasp] : [],
        aiExplanation: '',
        aiFix: '',
        exploitationScenario: '',
        exploitScore: severityToScore(severity),
        cvssScore: 0,
        cvssVector: '',
        confidence: 0.7,
        remediation: '',
        raw: JSON.stringify(r),
      });
    }
  } catch {}
  return findings;
}
```

**Critical: Every `UnifiedFinding` field must be populated.** Do not leave fields undefined. Compare against the `UnifiedFinding` interface in `src/findings/types.ts`.

### Step 3: Write a Runner Function

```typescript
async function runSemgrep(localDir: string): Promise<{ findings: UnifiedFinding[]; error: string | null }> {
  try {
    const { stdout, exitCode } = await runCommand(
      'semgrep',
      ['--config=auto', '--json', localDir],
      localDir,
      120_000,  // timeout in ms
    );
    if (!stdout.trim()) {
      return { findings: [], error: 'Semgrep produced no output' };
    }
    const findings = parseSemgrepOutput(stdout, localDir);
    await log(null as any, 'info', 'tool_scan', `Semgrep: ${findings.length} findings (exit ${exitCode})`);
    return { findings, error: null };
  } catch (e) {
    return { findings: [], error: `Semgrep failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
```

**CRITICAL: Use `execFile()` NOT `exec()`.** The `runCommand` helper already uses `execFile` with an args array — this prevents command injection. Never pass user-controlled strings through a shell.

**Exit codes:** Some scanners exit non-zero on findings (Gitleaks exits 1). The `runCommand` helper captures exit codes without throwing. Check the scanner's documentation for its exit code semantics.

**Output format:** Most scanners support `--format json` or `--json`. If a scanner requires writing to a file (like Gitleaks' `--report-path`), write to a temp file and read it back — see the Gitleaks runner for the pattern.

### Step 4: Add the Runner Call to `toolScanNode`

```typescript
// src/scan/nodes/tool-scan.ts — toolScanNode()

// Run Trivy (existing)
const trivyResult = await runTrivy(localDir);
// ...

// Run Gitleaks (existing)
const gitleaksResult = await runGitleaks(localDir);
// ...

// Run Semgrep (new)
await log(state.scanId, 'info', 'tool_scan', 'Running Semgrep...');
const semgrepResult = await runSemgrep(localDir);
if (semgrepResult.error) errors.push(semgrepResult.error);
allFindings.push(...semgrepResult.findings);
```

### Step 5: Update NodeOutput Summary

Update the `outputJson` in `prisma.nodeOutput.create` to include the new scanner's counts:

```typescript
outputJson: {
  totalFindings: allFindings.length,
  trivyFindings: trivyResult.findings.length,
  gitleaksFindings: gitleaksResult.findings.length,
  semgrepFindings: semgrepResult.findings.length,  // ← add
  // ... byCategory, bySeverity, topFindings stay the same
} as any,
```

### Step 6: Update the Log Summary

Update the final log line:

```typescript
await log(state.scanId, 'success', 'tool_scan',
  `Tool scan complete: ${allFindings.length} findings (Trivy: ${trivyResult.findings.length}, Gitleaks: ${gitleaksResult.findings.length}, Semgrep: ${semgrepResult.findings.length})`
);
```

### Step 7: Update `rerun-node/route.ts`

Update the `NODE_TO_SCANNER` mapping for `tool_scan`:

```typescript
// rerun-node/route.ts
const NODE_TO_SCANNER: Record<string, string[]> = {
  // ...
  tool_scan: ['trivy', 'gitleaks', 'semgrep'],  // ← add 'semgrep'
};
```

This ensures that when a user reruns `tool_scan`, existing findings from `semgrep` are deleted before the rerun.

### Step 8: Install the Scanner Binary in Docker

If the scanner needs to be available in the Docker container, add it to `Dockerfile`:

```dockerfile
# In the Dockerfile, in the scanner installation stage
RUN curl -L https://github.com/returntocorp/semgrep/releases/latest/download/semgrep-linux \
    -o /usr/local/bin/semgrep && chmod +x /usr/local/bin/semgrep
```

Verify the binary path matches the first argument to `runCommand()`.

### Step 9: Update Config Model String (`modelUsed`)

In `toolScanNode`, the `modelUsed` field for `NodeOutput` should be updated:

```typescript
modelUsed: 'trivy+gitleaks+semgrep',  // ← add
```

### Step 10: Update CLAUDE.md

Update:
- The scanner implementation section (add the new scanner with its command, timeout, categories)
- The `tool_scan` node description
- The `NODE_TO_SCANNER` table
- The changelog

---

## Part C: Update an Existing Node

### Step 1: Read the Current Implementation

Read `src/scan/nodes/<name>.ts` and identify what needs to change.

### Step 2: Check If State Shape Changes

If you're adding a new output field:
- Add to `ScanState` in `state.ts`
- Add initialization in `reconstructState()` in `worker.ts`
- Add merge logic in `mergeStateFromOutput()` in `worker.ts`

If you're changing an existing field's type, you may need a migration.

### Step 3: Check If Downstream Nodes Are Affected

Read the nodes that come _after_ your node in `NODE_PIPELINE`. If they consume your output (e.g., `deep_scan` reads `state.toolFindings`), ensure they still work with your changes.

### Step 4: Make the Change

Edit the node function. Follow the existing conventions:
- `await log()` at start, on error, on completion
- `prisma.nodeOutput.create` in try/catch (non-critical)
- Return `Partial<ScanState>` with only the fields your node changes
- Never mutate `state` directly — always return a new object

### Step 5: Update Config (If Parameters Changed)

If you're adding new config parameters to the node:
- Add them to `nodeConfigSchema` in `config.ts`
- Add defaults to `DEFAULT_NODE_CONFIGS`
- Regenerate the Prisma client (config is stored as `Json` in the DB)

### Step 6: Update Tests

Run existing tests:
```bash
npx vitest run
```

### Step 7: Verify

```bash
npm run lint
npm run build
```

---

## Part D: Update an Existing Scanner Tool

### Step 1: Read `src/scan/nodes/tool-scan.ts`

Identify the scanner's normalize function, runner function, and the call in `toolScanNode`.

### Step 2: Apply the Change

- **New output fields:** Update the normalizer to populate them in `UnifiedFinding`
- **New CLI flags:** Update the `args` array in `runCommand()`
- **New timeout:** Update the timeout parameter
- **Category mapping:** If the scanner produces findings in a new category, add it to `normalizeCategory` in `persist.ts` if it's not in `VALID_CATEGORIES`

### Step 3: Update Fingerprinting (If Scanner Identifier Changes)

If you change the `scanner` field in findings (e.g., from `'trivy'` to `'trivy-scan'`), existing fingerprints will break. Fingerprint format is: `SHA-256(scanner:ruleId:file:lineStart:title)` — see `src/findings/dedup.ts`.

### Step 4: Verify Downstream

`aggregate.ts` merges `state.toolFindings` with `state.allFindings` and `state.crossFileFindings`. Your findings flow through automatically via `deduplicatedFindings`.

`deep_scan.ts` reads `state.toolFindings` to inject into AI prompts — your new fields will appear there if they're on `UnifiedFinding`.

`persist.ts` calls `normalizeCategory()` and `normalizeSeverity()` — ensure your scanner's values are valid or mapped.

### Step 5: Verify

```bash
npm run lint
npm run build
```

---

## Verification Checklist

After any change, run through every item:

### Build & Lint
- [ ] `npm run lint` — no errors
- [ ] `npm run build` — compiles without errors
- [ ] `npx vitest run` — all tests pass (if tests exist)

### Pipeline Registration (New Node Only)
- [ ] `NODE_PIPELINE` in `queue.ts` — node name present in correct position
- [ ] `NODE_FNS` in `worker.ts` — import added, key present, function referenced
- [ ] `reconstructState()` in `worker.ts` — new field initialized
- [ ] `mergeStateFromOutput()` in `worker.ts` — new field merged
- [ ] `ScanState` in `state.ts` — new field(s) declared
- [ ] `scanSchema.nodes` in `config.ts` — config key added
- [ ] `DEFAULT_NODE_CONFIGS` in `config.ts` — defaults added
- [ ] `mergeNodeOverrides()` in `config.ts` — override parameter added
- [ ] `createProviderForNode()` in `factory.ts` — union type updated (AI nodes only)

### Rerun API
- [ ] `NODE_TO_SCANNER` in `rerun-node/route.ts` — scanner IDs mapped
- [ ] `VALID_NODES` in `rerun-node/route.ts` — node name present

### UI
- [ ] `NODE_PIPELINE` in `ScanProgress.tsx` — entry with matching `id` and `source`
- [ ] `PIPELINE_NODES` in `pipeline/page.tsx` — entry with `id`, `label`, `type`, `description`
- [ ] `NODE_COLORS` in `pipeline/page.tsx` — color assigned
- [ ] `nodeConfigMap` in `pipeline/page.tsx` — config or null mapped

### Node Implementation
- [ ] Node file exists: `src/scan/nodes/<name>.ts`
- [ ] Function exported with correct signature: `(state: ScanState) => Promise<Partial<ScanState>>`
- [ ] `await log()` called at start, on error, on completion
- [ ] `prisma.nodeOutput.create` wrapped in try/catch
- [ ] Returns valid `Partial<ScanState>` — never mutates `state` directly
- [ ] `status: 'FAILED'` returned only for fatal errors
- [ ] Non-fatal errors go to `errors[]` array, not thrown

### Scanner Tool (New/Updated)
- [ ] TypeScript types defined for raw scanner output
- [ ] Normalizer function maps every `UnifiedFinding` field — no `undefined` values
- [ ] Runner uses `execFile()` (NOT `exec()`) — args passed as array
- [ ] Runner handles non-zero exit codes (some scanners exit 1 on findings)
- [ ] If scanner writes to temp file, temp file is cleaned up
- [ ] `fingerprint()` called with correct args: `(scannerId, ruleId, file, lineStart, title)`
- [ ] `NODE_TO_SCANNER` in `rerun-node/route.ts` updated

### Config & Seed
- [ ] `seed.ts` produces valid config on fresh DB
- [ ] No hardcoded brand strings — use imports from `branding.ts`

### Documentation
- [ ] `src/lib/changelog.ts` — version entry added
- [ ] `CLAUDE.md` — Changelog table updated, pipeline description updated, key file paths updated
- [ ] After code changes: `graphify update .` to refresh the knowledge graph

---

## Quick Reference: File Change Matrix

| What you're doing | Files to change |
|---|---|
| **New node** | `state.ts`, `worker.ts` (import + NODE_FNS + reconstructState + mergeStateFromOutput), `queue.ts` (NODE_PIPELINE), `config.ts` (schema + defaults + mergeNodeOverrides), `factory.ts` (if AI), `nodes/<name>.ts` (new file), `rerun-node/route.ts` (NODE_TO_SCANNER + VALID_NODES), `ScanProgress.tsx` (NODE_PIPELINE), `pipeline/page.tsx` (PIPELINE_NODES + NODE_COLORS + nodeConfigMap), `changelog.ts`, `CLAUDE.md` |
| **New scanner tool** | `nodes/tool-scan.ts` (types + normalizer + runner + call in toolScanNode + NodeOutput + log), `rerun-node/route.ts` (NODE_TO_SCANNER), Dockerfile (binary install), `changelog.ts`, `CLAUDE.md` |
| **Update node** | `nodes/<name>.ts`, maybe `state.ts`, maybe `worker.ts` (merge), maybe `config.ts` (params), `changelog.ts`, `CLAUDE.md` |
| **Update scanner** | `nodes/tool-scan.ts`, maybe `rerun-node/route.ts`, `changelog.ts`, `CLAUDE.md` |