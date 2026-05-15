# Codegraph-Powered Code Intelligence Design Spec

**Date:** 2026-05-14  
**Version:** 1.0  
**Status:** Draft  

## Design Principle

**Graceful degradation is mandatory.** Every codegraph-dependent feature must have a working fallback to the existing heuristic/git-only approach. If codegraph is not installed, times out, or fails, the system must produce the same quality of output it does today — never worse. Codegraph is an enhancement layer, not a hard dependency.

---

The `git_ingest` node produces only git metadata (commit counts, contributor stats, hotspot files, language percentages). The `git_diagram` node builds a heuristic Mermaid diagram from file paths — not real code structure. When this context is injected into AI prompts for deep-scan and cross-file analysis, the AI has no understanding of what functions exist, what modules export, how files import each other, what API routes are defined, or how data flows through the codebase. This is the gap between our current git-level intelligence and what DeepWiki/CodeWiki-style products provide.

## Solution

Use `@optave/codegraph` (Apache-2.0, 34 languages, tree-sitter-based) to build a real dependency graph from source code, then extract structured code intelligence that replaces our heuristic approach with actual AST-derived data.

## Architecture

### Pipeline Change

```
Current:  clone → discover → git_ingest(git stats) → git_diagram(heuristic) → tool_scan → deep_scan → cross_file → aggregate → persist
New:     clone → discover → git_ingest(git stats + codegraph build + codeintel extraction) → git_diagram(codegraph mermaid export) → tool_scan → deep_scan → cross_file → aggregate → persist
```

The pipeline order stays the same. The `git_ingest` node gains a codegraph build + extraction step after the git CLI commands. The `git_diagram` node switches from heuristic classification to codegraph's real dependency export.

### Data Model: CodeIntel

`RepoIntel` is extended with a new `codeIntel` field. The existing git fields remain unchanged.

```typescript
// In src/scan/state.ts

interface CodeIntelFile {
  path: string;
  language: string;
  role: 'entry' | 'core' | 'utility' | 'adapter' | 'dead' | 'leaf';
  exports: string[];
  imports: { symbol: string; from: string }[];
  functions: { name: string; lineStart: number; lineEnd: number }[];
  classes: { name: string; lineStart: number; lineEnd: number; methods: string[] }[];
}

interface ImportEdge {
  from: string;   // source file path
  to: string;     // target file path
  symbols: string[]; // imported symbols
}

interface ApiRoute {
  method: string;   // GET, POST, PUT, DELETE, PATCH
  path: string;     // /api/v1/scans
  handler: string;  // file:line reference
  middleware: string[]; // middleware names
}

interface DataModel {
  name: string;
  file: string;
  fields: { name: string; type: string; nullable: boolean }[];
  relations: { name: string; target: string; type: string }[];
}

interface CallChain {
  entry: string;      // entry point symbol
  chain: string[];    // call chain symbols
  risk: 'high' | 'medium' | 'low';
}

interface CodeIntel {
  files: CodeIntelFile[];
  imports: ImportEdge[];
  apiRoutes: ApiRoute[];
  dataModels: DataModel[];
  entryPoints: string[];
  deadExports: string[];
  callChains: CallChain[];
}

// Updated RepoIntel — add codeIntel field
export interface RepoIntel {
  // Existing fields (unchanged)
  commitCount: number;
  contributorCount: number;
  branchCount: number;
  recentCommits: { hash: string; author: string; date: string; message: string }[];
  topContributors: { name: string; email: string; commitCount: number }[];
  hotspotFiles: { path: string; changeCount: number }[];
  languages: { language: string; fileCount: number; percentage: number }[];
  dependencies: { name: string; version: string; type: string }[];
  // NEW
  codeIntel: CodeIntel;
}
```

### Database

`RepoIntel` is stored as JSON on the `Scan.repoIntel` column (already `Json?`). No schema migration needed — the JSON just gets bigger. The `codeIntel` field adds structured per-file intelligence alongside the existing git metadata.

`Scan.architectureDiagram` remains a `String?` — but now contains a real codegraph-exported Mermaid diagram instead of a heuristic one.

### NodeOutput

Both `git_ingest` and `git_diagram` already create `NodeOutput` records (added in v2.22.0). The `outputJson` is updated to include:

- `git_ingest`: Add `codeIntelSummary` with file count, import edge count, API route count, data model count, entry point count, dead export count, call chain count
- `git_diagram`: Add `diagramSource` field indicating `codegraph` (was `heuristic`)

## Implementation Details

### 1. git_ingest Node (`src/scan/nodes/git-ingest.ts`)

**New dependency:** `@optave/codegraph`

**New function:** `extractCodeIntel(localDir: string, discoveredFiles: PrioritizedFile[]): CodeIntel`

Steps:
1. Run existing git CLI commands (unchanged)
2. Call `buildGraph(localDir)` — builds `.codegraph/graph.db`
3. Run `codegraph stats -j` to get overall stats and validate the build succeeded
4. For each discovered file:
   - `codegraph deps <file> -j` → extract `imports` and `exports`
   - `codegraph roles --file <file> -j` → extract `role`
   - Parse the result into `CodeIntelFile` structure
5. `codegraph roles -j` → extract `entryPoints` and `deadExports`
6. Detect API routes from Next.js App Router conventions (`app/api/` directory structure) and Express-style route patterns
7. Detect data models from Prisma schema (already available as `prisma/schema.prisma`)
8. Build `callChains` by querying security-sensitive entry points (auth, file I/O, database) and tracing their call chains
9. Clean up `.codegraph/` directory
10. Merge `codeIntel` into `repoIntel`

**Error handling:** If codegraph build fails (unsupported language, too many files, timeout), fall back to the existing heuristic-only approach. Log the error and continue. The scan must never fail because codegraph failed.

**Timeout:** Add a configurable timeout (default: 120s) for codegraph build. Large repos may take longer. If timeout is hit, skip codegraph and use git-only intelligence.

**File count limit:** For repos with >500 discovered files, only extract full `CodeIntelFile` for the top 200 by priority. The rest get a minimal entry (path, language, role only).

### 2. git_diagram Node (`src/scan/nodes/git-diagram.ts`)

**New function:** `exportMermaid(localDir: string): string`

Steps:
1. Check if `.codegraph/graph.db` exists (meaning codegraph ran successfully)
2. If yes: call `codegraph export -f mermaid` → use the real dependency graph
3. If no: fall back to existing heuristic diagram generation (unchanged)
4. Post-process the Mermaid output:
   - Trim to max 200 nodes for readability
   - Color nodes by role (entry=red, core=blue, utility=gray, dead=dashed)
   - Overlay hotspot files from `repoIntel`
5. Return the Mermaid string

**Fallback guarantee:** If codegraph is not installed or the build failed, the heuristic diagram generation still works. The system degrades gracefully.

### 3. Prompt Injection Changes

#### deep-scan (`src/scan/nodes/deep-scan.ts`)

`buildFilePrompt` currently injects `repoIntel` as flat text. Updated to inject `CodeIntel` as structured context:

```
## Codebase Intelligence

### Overview
- 47 files, 6 entry points, 12 API routes, 5 data models
- Languages: TypeScript (72%), JavaScript (15%), JSON (8%)
- 3 dead exports detected

### This File's Context
- Role: core
- Exports: authenticate, authorize, hashPassword, verifyToken
- Imports: jwt from 'jsonwebtoken', bcrypt from 'bcryptjs', User from '../models/user'

### Direct Dependencies
- src/models/user.ts → exports: User, UserCreateInput, UserUpdateInput
- src/lib/db.ts → exports: prisma
- src/lib/rbac.ts → exports: requireAuth, canWrite, canAdmin

### API Routes Reaching This File
- POST /api/v1/auth/login → src/app/api/v1/auth/login/route.ts:12 → authenticate
- POST /api/v1/users → src/app/api/v1/users/route.ts:8 → authorize

### Data Models
- User (src/prisma/schema.prisma): id, email, name, passwordHash, role, avatarUrl, createdAt, updatedAt
- Session (src/prisma/schema.prisma): id, userId, token, expiresAt
```

For files >200, only inject the top-200 most relevant files plus the current file's direct import graph neighbors.

#### cross-file (`src/scan/nodes/cross-file.ts`)

`buildCrossFileUserPrompt` currently injects repoIntel as flat text. Updated to include full `CodeIntel`:

```
## Codebase Intelligence

### Full File Map
[All 47 files with path, role, exports count, imports count]

### Import Graph
[src/auth/login.ts → src/models/user.ts (User, UserCreateInput), src/lib/db.ts (prisma), ...]
[All import edges]

### API Routes
- GET /api/v1/scans → src/app/api/v1/scans/route.ts:15
- POST /api/v1/scans → src/app/api/v1/scans/route.ts:42
- GET /api/v1/findings → src/app/api/v1/findings/route.ts:11
[All routes]

### Data Models & Relations
- User ↔ Scan (one-to-many), User ↔ Finding (one-to-many)
- Scan → Finding (one-to-many), Scan → Job (one-to-many)
[All models and relations]

### Call Chains (Security-Relevant)
- POST /login → authenticate → hashPassword/verifyToken → User.findOne
- GET /scans → requireAuth → authorize → prisma.scan.findMany
[All chains]

### Dead Exports
- formatTime (unused), parsePagination (used only in tests)
[All dead exports]
```

#### AI Chat (`src/lib/ai-chat.ts`)

When scan context is injected, include a condensed summary:

```
You are analyzing the repository: https://github.com/org/repo
Repository has 1423 commits, 8 contributors, 3 branches
Languages: TypeScript (72%), JavaScript (15%), JSON (8%)
Code structure: 47 files, 6 entry points, 12 API routes, 5 data models, 3 dead exports
Key API routes: GET /api/v1/scans, POST /api/v1/scans, GET /api/v1/findings, ...
Data models: User, Scan, Finding, Job, Config
Architecture diagram: [Mermaid diagram]
```

### 4. API Endpoints

No new API endpoints needed. The existing endpoints return `repoIntel` (which now contains `codeIntel`) and `architectureDiagram` (which now contains a real Mermaid diagram).

The `/api/v1/scans/[id]` endpoint already returns `repoIntel` as JSON. The `codeIntel` field is a nested object within it — no API change required.

The `/api/v1/scans/[id]/progress` endpoint returns jobs. `git_ingest` and `git_diagram` already have Job records with status tracking.

### 5. UI Changes

#### ScanProgress Component

Already updated to show all 9 nodes (v2.22.0). No further changes needed.

#### NodeOutputInspector

Already shows `inputJson` and `outputJson` as collapsible JSON. The `git_ingest` output now includes `codeIntelSummary` with counts. The `git_diagram` output shows `diagramSource: "codegraph"` or `"heuristic"`.

#### Architecture Tab

Already uses `MermaidDiagram` component (v2.22.0). The diagram content is now real dependency data instead of heuristic classification. No UI change needed.

New sub-section in the Architecture tab: **Code Structure** card showing:
- File count by role (entry, core, utility, adapter, dead)
- API route count
- Data model count
- Dead export count
- Import graph density (edges / possible edges)

This uses `scan.repoIntel.codeIntel` data already returned by the API.

### 6. Worker & Job Queue

No changes to the worker or job queue. `git_ingest` and `git_diagram` are already in the pipeline. The `requeueJob` logic in `queue.ts` already handles these nodes.

**ETA impact:** Codegraph build adds ~5-30 seconds depending on repo size. For repos <100 files, it's under 5 seconds. For repos with 500+ files, it can take 15-30 seconds. This is acceptable within the pipeline — the alternative is AI prompt context that lacks structural understanding.

### 7. Logging

`git_ingest` already logs via `await log(scanId, level, 'git_ingest', message)`. Add new log entries:

- `info: git_ingest: Starting codegraph build...`
- `info: git_ingest: Codegraph build completed in Xms (Y files, Z edges)`
- `warn: git_ingest: Codegraph build failed: <error>. Falling back to git-only intelligence.`
- `info: git_ingest: CodeIntel extracted: X files, Y imports, Z API routes, W data models, V call chains, U dead exports`

`git_diagram` logs:
- `info: git_diagram: Using codegraph-exported Mermaid diagram`
- `info: git_diagram: Codegraph not available, using heuristic diagram`

### 8. Scan State Reconstruction

`mergeStateFromOutput` in `worker.ts` already merges `repoIntel` from job output. Since `codeIntel` is a nested field within `repoIntel`, it will be serialized and deserialized correctly through the existing mechanism. No change needed.

### 9. Configuration

Add codegraph settings to the scan config under `scan.nodes.gitIngest`:

```typescript
// In src/lib/config.ts, extend the gitIngest config
gitIngest: {
  provider: 'system',
  model: 'git',
  enabled: true,           // master switch for codegraph
  timeoutMs: 120000,      // codegraph build timeout
  maxFiles: 500,           // max files for full extraction (beyond this, minimal only)
  maxFilesInPrompt: 200,   // max CodeIntelFile entries in AI prompts
  maxCallChains: 50,       // max call chains to extract
  maxApiRoutes: 100,       // max API routes to extract
  fallbackToHeuristic: true, // fall back to heuristic if codegraph fails
}
```

### 10. Prisma Schema

No migration needed. `Scan.repoIntel` is `Json?` — the `codeIntel` field is just more JSON data within the existing column.

### 11. Error Handling & Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| `@optave/codegraph` not installed | Skip codegraph, use git-only RepoIntel + heuristic diagram |
| `buildGraph()` throws error | Log warning, skip codegraph, continue with git-only data |
| `buildGraph()` exceeds timeout | Cancel build, skip codegraph, continue with git-only data |
| Repo has >500 files | Extract full CodeIntelFile for top 200 only, minimal for rest |
| Codegraph returns empty graph | Treat as failure, fall back to heuristic |
| `.codegraph/` directory cleanup fails | Log warning, continue (non-critical) |

### 12. Package Dependency

Add `@optave/codegraph` to `package.json`. This package includes:
- Native Rust binary (napi-rs) for fast parsing on Linux/macOS/Windows
- WASM fallback for environments without native binary support
- SQLite dependency for graph storage (bundled)

Install command: `npm install @optave/codegraph`

The package is ~15MB with native bindings. WASM fallback adds ~8MB.

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Add `@optave/codegraph` dependency |
| `src/scan/state.ts` | Add `CodeIntel` interfaces, extend `RepoIntel` with `codeIntel` field |
| `src/scan/nodes/git-ingest.ts` | Add `extractCodeIntel()` function using codegraph API, merge into RepoIntel |
| `src/scan/nodes/git-diagram.ts` | Add `exportMermaid()` function using codegraph export, with heuristic fallback |
| `src/scan/nodes/deep-scan.ts` | Update `buildFilePrompt()` to inject CodeIntel structured context |
| `src/scan/nodes/cross-file.ts` | Update `buildCrossFileUserPrompt()` to inject full CodeIntel |
| `src/lib/ai-chat.ts` | Update `buildSystemPrompt()` to inject CodeIntel summary for scan-level chat |
| `src/lib/config.ts` | Add codegraph config fields to `gitIngest` node config |
| `src/app/(app)/scans/[id]/page.tsx` | Add Code Structure card to Architecture tab |
| `src/lib/changelog.ts` | Add v2.23.0 entry |
| `CLAUDE.md` | Update changelog table |

## Verification

1. Run a scan on a small repo (<50 files) — verify codegraph builds successfully and CodeIntel is populated
2. Check deep_scan prompt contains Codebase Intelligence section with file map, imports, API routes
3. Check cross_file prompt contains full CodeIntel with call chains and dead exports
4. Check Architecture tab renders real Mermaid diagram from codegraph export
5. Check Architecture tab shows Code Structure card with file role breakdown
6. Test graceful degradation: uninstall codegraph, run scan — should fall back to git-only intelligence
7. Test timeout: set very low timeout, verify it falls back gracefully
8. Test large repo (>500 files): verify truncated CodeIntel in prompts, full CodeIntel in NodeOutput
9. Check AI chat includes CodeIntel summary when scanId is present
10. Verify `.codegraph/` directory is cleaned up after extraction