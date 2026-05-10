# Astra App — File System Glossary

Auto-generated catalogue of every file in `astra-app/src/`. Updated 2026-05-08.

---

## Directory Structure

```
astra-app/src/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (app)/              # Authenticated app group (AppShell layout)
│   ├── api/                # API route handlers
│   └── auth/               # Sign-in/sign-up pages
├── components/             # React UI components
│   ├── dark/               # Report-style dark-theme components
│   └── ui/                 # shadcn/ui primitives (button, card, dialog, etc.)
├── findings/               # Finding aggregation & deduplication
├── generated/prisma/       # Prisma generated client & model types
├── lib/                    # Shared libraries (auth, config, AI, RBAC, etc.)
├── providers/              # AI provider implementations
├── rules/                  # Custom rule DSL loader & parser
├── scan/                   # Scan pipeline engine
│   ├── nodes/              # Pipeline node implementations
│   ├── prompts/            # AI prompt builders
│   ├── reports/            # Report generators (HTML, Markdown)
│   └── tools/              # LangChain tools for AI agent
├── types/                  # TypeScript type declarations
├── instrumentation.ts      # Next.js instrumentation hook
└── middleware.ts           # Auth middleware (NextAuth)
```

---

## Root Files

### `src/middleware.ts`
Auth middleware wrapping all routes with NextAuth's `auth()`. Public routes: `/`, `/auth/*`, `/api/auth/*`, `/api/v1/auth/*`, `/api/v1/health`, `/_next/*`, `/favicon.ico`. All other routes redirect to `/auth/signin` if unauthenticated.

### `src/instrumentation.ts`
Next.js instrumentation hook — initializes the structured logger on startup.

### `src/types/next-auth.d.ts`
Extends NextAuth `Session` and `User` types with `id` and `role` fields.

---

## App Pages — `src/app/`

### `src/app/page.tsx`
Landing page. Redirects authenticated users to `/scans`. Shows hero + CTA for guests.

### `src/app/layout.tsx`
Root layout. Wraps all pages with `ThemeProvider`, `AuthProvider`, `TooltipProvider`, and `Toaster`.

### `src/app/auth/signin/page.tsx`
Email/password sign-in form using NextAuth `signIn('credentials', ...)`.

### `src/app/auth/signup/page.tsx`
Account registration. Creates account via `POST /api/v1/auth/signup` then auto-signs in.

---

## Authenticated App — `src/app/(app)/`

### `src/app/(app)/layout.tsx`
App shell layout. Wraps all authenticated pages with `AppShell` (sidebar navigation).

### `src/app/(app)/scans/page.tsx`
Main dashboard. Shows `RepoInput` to trigger scans, lists recent scans with severity badges. Fetches `GET /api/v1/scans?limit=10`.

### `src/app/(app)/scans/[id]/page.tsx`
Scan detail with 7 tabs: Overview (pipeline + metrics), Alerts, Files, Rules, Pipeline, Chat, AI Calls. Supports cancel/resume/rescan. Supports `?tab=` query param.

### `src/app/(app)/scans/[id]/report/page.tsx`
Standalone scan report with executive summary, file browser, and finding detail cards. Supports multi-format export.

### `src/app/(app)/scans/[id]/nodes/[node]/page.tsx`
Drill-down view for a single pipeline node's output (config, I/O JSON, tokens, timing).

### `src/app/(app)/tasks/page.tsx`
Task management dashboard. Shows open task count + `TaskDataTable`.

### `src/app/(app)/config/page.tsx`
Configuration editor page. Renders `ConfigEditor`.

### `src/app/(app)/observability/page.tsx`
AI call observability dashboard. Shows stats cards + `AiCallTable`.

### `src/app/(app)/pipeline/page.tsx`
Visual pipeline configuration editor with per-node config (provider, model, temperature, etc.).

### `src/app/(app)/changelog/page.tsx`
Release history rendered from `CHANGELOG` data.

### `src/app/(app)/rules/page.tsx`
Two-tab rules page: Global Rules (CRUD for user-defined rules) and AI-Inferred Rules (confirm/reject business logic rules).

### `src/app/(app)/settings/page.tsx`
Settings hub with links to Profile, GitHub, and User Management sub-pages.

### `src/app/(app)/settings/github/page.tsx`
Server component fetching GitHub profile + repo count. Passes to `GithubSettingsClient`.

### `src/app/(app)/settings/github/GithubSettingsClient.tsx`
Client component for GitHub link/unlink UI. Calls `DELETE /api/v1/github/unlink`, `GET /api/v1/github/repos`.

### `src/app/(app)/settings/profile/page.tsx`
Profile settings page wrapper. Renders `ProfileSettingsClient`.

### `src/app/(app)/settings/profile/ProfileSettingsClient.tsx`
Shows user account info (name, email, role) and GitHub link/unlink. Calls `GET /api/v1/auth/me`.

### `src/app/(app)/settings/users/page.tsx`
Admin user management: list, create, change roles, delete users. Calls `GET /api/v1/users`, `POST /api/v1/auth/signup`, `PATCH /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`.

---

## API Routes — `src/app/api/`

### Auth

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/auth/[...nextauth]` | GET, POST | NextAuth catch-all handler | — | This IS auth |
| `/api/v1/auth/me` | GET | Current user profile + GitHub info | User, GithubProfile | `auth()` session |
| `/api/v1/auth/signup` | POST | Register new account (rate-limited 5/min IP) | User | Optional (unauthed = VIEWER) |
| `/api/v1/auth/verify` | POST | Verify credentials (rate-limited 10/min IP) | User | None (this IS verification) |

### Scans

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/scans` | GET, POST | List scans / Create scan | Scan, UserRule | `requireAuth()` |
| `/api/v1/scans/[id]` | GET | Scan detail with findings, rules, node outputs | Scan, Finding, BusinessLogicRule, NodeOutput | `requireAuth()` + `requireScanOwnership()` |
| `/api/v1/scans/[id]/cancel` | POST | Cancel running scan | Job, Scan | `requireAuth()` + ownership + `canWrite()` |
| `/api/v1/scans/[id]/chat` | GET, POST | Scan-level AI chat | AiConversation, Scan, Finding | `requireAuth()` |
| `/api/v1/scans/[id]/export` | GET | Export (JSON/CSV/Markdown/HTML/SARIF) | Scan, Finding, BusinessLogicRule | `requireAuth()` + ownership |
| `/api/v1/scans/[id]/logs` | GET | Paginated scan logs | ScanLog | `requireAuth()` + ownership |
| `/api/v1/scans/[id]/nodes` | GET | Node outputs for scan | NodeOutput | `requireAuth()` + ownership |
| `/api/v1/scans/[id]/progress` | GET | Real-time pipeline progress | Scan, ScanLog | `requireAuth()` + ownership |
| `/api/v1/scans/[id]/rerun-node` | POST | Re-run a single pipeline node | Job, Finding, Scan | `requireAuth()` + ownership + `canWrite()` |
| `/api/v1/scans/[id]/resume` | POST | Resume failed scan | Job, Scan | `requireAuth()` + ownership + `canWrite()` |
| `/api/v1/scans/[id]/stream` | GET | SSE stream of scan updates | Scan, Job | **NONE** |

### Findings

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/findings` | GET | List findings with filters | Finding (includes Task) | `requireAuth()` |
| `/api/v1/findings/[id]` | GET, PATCH | Get/update finding | Finding, AlertHistory | `requireAuth()` + `canWrite()` for PATCH |
| `/api/v1/findings/[id]/chat` | GET, POST | Finding-level AI chat | AiConversation, Finding | `requireAuth()` |
| `/api/v1/findings/[id]/comments` | GET, POST | Finding comments | AlertComment, AlertHistory | `requireAuth()` + `canWrite()` for POST |
| `/api/v1/findings/[id]/history` | GET | Finding audit history | AlertHistory | **NONE** |
| `/api/v1/findings/[id]/rescan` | POST | Per-file rescan | Finding, Scan, Job | `requireAuth()` + `canWrite()` |
| `/api/v1/findings/[id]/task` | POST | Create task from finding | Finding, Task | `requireAuth()` + `canWrite()` |

### Tasks

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/tasks` | GET, POST | List/create tasks | Task, TaskHistory | `requireAuth()` + `canWrite()` for POST |
| `/api/v1/tasks/[id]` | GET, PATCH, DELETE | Get/update/delete task | Task, TaskHistory | `requireAuth()` + `canWrite()` / `canAdmin()` |
| `/api/v1/tasks/[id]/comments` | GET, POST | Task comments | TaskComment, TaskHistory | `requireAuth()` + `canWrite()` for POST |
| `/api/v1/tasks/[id]/history` | GET | Task audit history | TaskHistory | **NONE** |
| `/api/v1/tasks/[id]/rescan` | POST | Rescan task's linked file | Task, Finding, Scan, Job | `requireAuth()` + `canWrite()` |
| `/api/v1/tasks/ai-suggest` | POST | AI task grouping suggestions | Finding | `requireAuth()` + `canWrite()` |
| `/api/v1/tasks/batch` | POST | Batch task operations | Task, TaskHistory | `requireAuth()` + `canWrite()` / `canAdmin()` |

### AI Calls

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/ai-calls` | GET | List AI call logs with filters | AiCallLog | `requireAuth()` |
| `/api/v1/ai-calls/[id]` | GET | Single AI call detail | AiCallLog | `requireAuth()` |
| `/api/v1/ai-calls/[id]/retry` | POST | Re-execute a logged AI call | AiCallLog | `requireAuth()` |
| `/api/v1/ai-calls/stats` | GET | Aggregate AI call statistics | AiCallLog | `requireAuth()` |

### Chat

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/chat` | GET, POST | Global AI chat (not scan/finding) | AiConversation | `requireAuth()` |

### Config & Providers

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/config` | GET, PUT | Global scan config | Config | `requireAuth()` + `canAdmin()` |
| `/api/v1/providers` | GET | List providers & models | Config (via loadConfigFromDb) | `requireAuth()` |
| `/api/v1/providers/test` | POST | Test provider connection | Config (via loadConfigFromDb) | `requireAuth()` |
| `/api/v1/presets` | GET, POST | List/create presets | Preset | `requireAuth()` |
| `/api/v1/preferences` | GET, POST | User preference key-values | UserPreference | `requireAuth()` |
| `/api/v1/prompts` | GET, PUT, DELETE | System prompt management (discover/deepScan/crossFile/chat) | Config | GET: `requireAuth()`, PUT/DELETE: `requireAuth()` + `canAdmin()` |

### Rules

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/rules` | GET | AI-inferred business logic rules | BusinessLogicRule | **NONE** |
| `/api/v1/rules/[id]` | PATCH | Update rule status | BusinessLogicRule | **NONE** |
| `/api/v1/user-rules` | GET, POST | User-defined custom rules | UserRule | `requireAuth()` |
| `/api/v1/user-rules/[id]` | PATCH, DELETE | Update/delete custom rule | UserRule | `requireAuth()` + `canAdmin()` for DELETE |

### Users & GitHub

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/users` | GET | List all users | User | `requireAuth()` + `canAdmin()` |
| `/api/v1/users/[id]` | PATCH, DELETE | Change role / delete user | User | `requireAuth()` + `canAdmin()` |
| `/api/v1/github/repos` | GET | List user's GitHub repos | GithubProfile | `auth()` session |
| `/api/v1/github/branches` | GET | List repo branches | GithubProfile | `auth()` session |
| `/api/v1/github/link` | POST | Link GitHub PAT | GithubProfile | `auth()` session |
| `/api/v1/github/unlink` | DELETE | Remove GitHub profile | GithubProfile | `auth()` session |

### Health

| Route | Methods | Purpose | DB Tables | Auth |
|-------|---------|---------|-----------|------|
| `/api/v1/health` | GET | DB health check (SELECT 1) | — | None (intentionally public) |

---

## Components — `src/components/`

### Core Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `AppShell.tsx` | Top-level layout with nav, user menu, chat FAB | — | AiChatProvider, ThemeToggle, UserMenu |
| `AuthProvider.tsx` | Wraps next-auth SessionProvider | — | — |
| `ThemeProvider.tsx` | Light/dark theme context + persistence | GET/POST /api/v1/preferences | — |
| `ThemeToggle.tsx` | Light/dark toggle button | — | — |
| `UserButton.tsx` | User dropdown with settings + sign out | — | — |

### Scan Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `RepoInput.tsx` | Scan launch form (GitHub browser, branch picker, presets, rules) | GET repos, GET branches, POST scans | PresetSelector, GitHubLinkPrompt |
| `ScanProgress.tsx` | Real-time 6-node pipeline progress viewer | GET progress (polled), POST cancel/resume | — |
| `ScanChat.tsx` | Inline per-scan AI chat | GET/POST scans/{id}/chat | — |
| `DashboardMetrics.tsx` | Summary metric cards + severity/category bars | — (props) | — |
| `ScannerBreakdown.tsx` | Finding counts by severity & scanner | — (props) | SeverityBadge |
| `ExportPanel.tsx` | Export buttons (JSON/CSV/SARIF/HTML/Markdown) | GET scans/{id}/export | — |
| `SeverityBadge.tsx` | Color-coded severity tag | — | — |

### Finding/Alert Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `FilterableFindingsTable.tsx` | Full-featured filterable/sortable findings table with detail panel | — (delegates to AlertDetail) | SeverityBadge, AlertDetail, AiChatProvider |
| `FindingsTable.tsx` | Simpler expandable findings table | — (props) | SeverityBadge |
| `AlertDetail.tsx` | Slide-in finding detail with status, comments, AI chat, rescan, task creation | GET/PATCH findings, POST comments/task/rescan, GET users | SeverityBadge, AiChatProvider |
| `FileExplorer.tsx` | Filterable file tree with findings grouped by path | — (props) | — |
| `BusinessLogicPanel.tsx` | Inferred rules with confirm/reject actions | PATCH rules/{id} | — |

### Task Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `TaskDataTable.tsx` | Full task management table with filters, batch ops, AI suggestions, comments, history, rescan | GET/POST/PATCH tasks, POST batch/ai-suggest/rescan, GET users | — |

### Config Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `ConfigEditor.tsx` | Tabbed scan config editor (nodes + chat) | GET/PUT config, GET providers | ProviderSelector, ThinkingControls |
| `PresetSelector.tsx` | Preset dropdown | GET presets | — |
| `ProviderSelector.tsx` | Provider/model selector with test connection | GET providers, POST providers/test | — |
| `ThinkingControls.tsx` | Thinking depth radio + budget slider | — (props) | — |

### Observability Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `AiCallTable.tsx` | Paginated AI call log table with retry | GET ai-calls, GET ai-calls/stats, GET/POST ai-calls/{id}/retry | — |
| `NodeOutputInspector.tsx` | Pipeline node output viewer with rerun | POST scans/{id}/rerun-node | — |
| `LiveLog.tsx` | Polling live-log viewer | GET scans/{id}/logs (polled every 2s) | — |

### Chat Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `AiChatProvider.tsx` | Global chat FAB + slide-in sidebar | GET/POST chat, GET/POST findings/{id}/chat | — |

### GitHub Components

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `GitHubLinkPrompt.tsx` | GitHub PAT link form | POST github/link | — |

### Report Components (dark/)

| File | Purpose | API Calls | Children |
|------|---------|-----------|----------|
| `dark/ReportHeader.tsx` | Report header with repo info + rescan | — (props) | — |
| `dark/ExecutiveSummary.tsx` | Report stat cards + distribution bars | — (props) | — |
| `dark/ReportFileBrowser.tsx` | Report file tree with finding entries | — (props) | — |
| `dark/ReportFindingDetail.tsx` | Report full finding detail card | — (props) | — |

### UI Primitives (`ui/`)

shadcn/ui components: `accordion`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `progress`, `radio-group`, `select`, `separator`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `tooltip`.

---

## Libraries — `src/lib/`

| File | Purpose | Exports | DB/External |
|------|---------|---------|-------------|
| `auth.ts` | NextAuth v5 config (credentials, JWT, callbacks) | `handlers`, `auth`, `signIn`, `signOut` | NextAuth |
| `config.ts` | Zod config schemas + DB loader/saver + node override merging + prompt DB helpers | `configSchema`, `AstraConfig`, `NodeConfig`, `ChatConfig`, `loadConfig`, `loadConfigFromDb`, `saveConfigToDb`, `mergeNodeOverrides`, `loadPromptFromDb`, `savePromptToDb`, `listPromptsFromDb` | Config table, astra.config.json |
| `db.ts` | Singleton PrismaClient with PrismaPg adapter | `prisma` | PostgreSQL |
| `ai-chat.ts` | Chat orchestration — resolves provider, loads DB prompts, builds system prompt with finding context + conversation history, sends via instrumentedSend | `sendChatMessage` (accepts conversationHistory) | AI providers, config, ai-instrumentation |
| `ai-instrumentation.ts` | Wraps AI calls with observability — logs to AiCallLog table | `InstrumentationSource`, `InstrumentationContext`, `instrumentedSend` | AiCallLog table |
| `rbac.ts` | Auth helpers — requireAuth, role checks, scan ownership | `requireAuth`, `requireRole`, `canWrite`, `canAdmin`, `requireScanOwnership` | Scan, User (via auth()) |
| `encryption.ts` | AES-256-GCM encrypt/decrypt with `enc:` prefix backward compat | `encrypt`, `decrypt` | Node.js crypto |
| `github.ts` | GitHub REST API client for repos + branches | `getGithubRepos`, `getGithubBranches` | api.github.com |
| `pagination.ts` | Parse/validate limit/offset query params | `PaginationParams`, `parsePagination` | — |
| `rate-limit.ts` | In-memory sliding-window rate limiter | `rateLimit` | — |
| `task-sync.ts` | Create triage tasks from findings + bidirectional assignment sync | `createTaskFromFinding`, `syncFindingAssignmentToTask`, `syncTaskAssignmentToFinding` | Finding, Task tables |
| `tokenizer.ts` | Character-based token estimator + available token calculator | `estimateTokens`, `calculateAvailableTokens` | — |
| `logger.ts` | Console logger with levels, colors, progress bar | `LogLevel`, `setLogLevel`, `step`, `info`, `success`, `warn`, `error`, `verbose`, `debug`, `progress` | — |
| `structured-logger.ts` | Edge-safe logger facade (re-exports Pino on Node.js, silent on Edge) | `logger`, `Logger` | — |
| `structured-logger-node.ts` | Pino JSON logger writing to logs/astra.log | `logger` | logs/astra.log |
| `changelog.ts` | Static changelog data array | `ChangelogEntry`, `CHANGELOG` | — |
| `utils.ts` | Tailwind class merge utility (shadcn convention) | `cn` | — |

---

## AI Providers — `src/providers/`

| File | Purpose | Class | External API |
|------|---------|-------|-------------|
| `base.ts` | Provider contract — AIProvider interface, request/response types, multi-turn message support | `AIProvider` (interface), `AIRequest`, `AIResponse`, `ChatMessage`, `ModelInfo`, `ThinkingDepth`, `ScanDepth` | — |
| `factory.ts` | Instantiate provider by ID + config; helper for node-scoped providers | `createProvider`, `createProviderForNode` | — |
| `registry.ts` | List configured providers & models for UI | `listProviders` | — |
| `cloud-ollama.ts` | Cloud Ollama with retry + empty-response detection | `CloudOllamaProvider` | api.ohmyllama.com (ollama SDK) |
| `hosted-ollama.ts` | Self-hosted Ollama with empty-response detection | `HostedOllamaProvider` | OLLAMA_HOST (ollama SDK) |
| `openai.ts` | OpenAI Chat Completions | `OpenAIProvider` | api.openai.com (openai SDK) |
| `anthropic.ts` | Anthropic Messages with extended thinking | `AnthropicProvider` | api.anthropic.com (@anthropic-ai/sdk) |
| `bedrock.ts` | **Stub** — AWS Bedrock | `BedrockProvider` | — |
| `azure-ai-foundry.ts` | **Stub** — Azure AI Foundry | `AzureAIFoundryProvider` | — |
| `langgraph-connector.ts` | **Stub** — LangGraph Connectors | `LangGraphConnectorProvider` | — |

---

## Scan Pipeline — `src/scan/`

### Core

| File | Purpose | Exports | DB/External |
|------|---------|---------|-------------|
| `worker.ts` | Main job loop — claims jobs, routes to nodes, manages scan lifecycle | `processNextJob`, `startWorker`, `stopWorker` | Job, Scan tables, fs (cleanup) |
| `queue.ts` | Pipeline definition + job queue CRUD | `NodeName`, `getPipeline`, `getNextNode`, `enqueueJob`, `claimNextJob`, `markJobComplete`, `markJobFailed`, `enqueuePipeline`, `enqueueNextJob`, `markScanCompletedIfNeeded`, `markScanFailed`, `cleanupStuckJobs` | Job, Scan tables |
| `state.ts` | ScanState interface flowing through pipeline | `ScanState`, `PrioritizedFile`, `ScanStatus` | — |
| `log.ts` | Structured scan log persistence + retrieval | `LogLevel`, `log`, `getLogs` | ScanLog table |
| `cleanup.ts` | Mark stuck scans/jobs as FAILED | `cleanupStuckScans` | Scan, Job tables |
| `graph.ts` | LangGraph StateGraph wiring 6 pipeline nodes | `ScanStateAnnotation`, `createScanGraph` | @langchain/langgraph |

### Pipeline Nodes — `src/scan/nodes/`

| File | Purpose | Exports | DB/External |
|------|---------|---------|-------------|
| `clone.ts` | Git clone --depth 1 + extract commit SHA | `cloneNode` | git (exec), fs |
| `discover.ts` | Walk repo, filter by extension, assign security priority | `discoverNode` | fs |
| `deep-scan.ts` | Per-file AI vulnerability analysis with batching, retries, singleFile rescan | `deepScanNode` | NodeOutput table, AI provider, fs, loadKnowledgeBase |
| `cross-file.ts` | Cross-file business logic inference from file summaries | `crossFileNode` | NodeOutput table, AI provider, loadKnowledgeBase |
| `aggregate.ts` | Merge + deduplicate findings, filter by severity allowlist | `aggregateNode` | — |
| `persist.ts` | Write findings (upsert), create tasks, save rules, update scan | `persistNode` | Finding, BusinessLogicRule, Scan, Task (via createTaskFromFinding) |

### AI Prompts — `src/scan/prompts/`

| File | Purpose | Exports |
|------|---------|---------|
| `deep-scan.ts` | Build discover/deep-scan/cross-file system prompts with enum constraints; export default prompts as constants; load from DB via `loadPrompts()` | `DEFAULT_DISCOVER_PROMPT`, `DEFAULT_DEEP_SCAN_PROMPT`, `DEFAULT_CROSS_FILE_PROMPT`, `buildDiscoverPrompt`, `buildDeepScanPrompt`, `buildCrossFilePrompt`, `loadPrompts` |
| `cross-file.ts` | Re-exports `buildCrossFilePrompt` from deep-scan.ts | `buildCrossFilePrompt` |
| `discover.ts` | Re-exports all 3 prompt builders from deep-scan.ts | `buildDiscoverPrompt`, `buildDeepScanPrompt`, `buildCrossFilePrompt` |

### LangChain Tools — `src/scan/tools/`

| File | Purpose | Exports | External |
|------|---------|---------|----------|
| `file-reader.ts` | Read file contents with line-range + path-traversal protection | `createFileReaderTool` | @langchain/core/tools, fs |
| `directory-lister.ts` | List directory tree with extension filter | `createDirectoryListerTool` | @langchain/core/tools, fs |
| `code-searcher.ts` | Regex search across repo files | `createCodeSearcherTool` | @langchain/core/tools, fs |
| `pattern-matcher.ts` | 7 built-in vulnerability pattern checks | `createPatternMatcherTool` | @langchain/core/tools, fs |
| `index.ts` | Barrel re-export | all 4 tools | — |

### Report Generators — `src/scan/reports/`

| File | Purpose | Exports |
|------|---------|---------|
| `types.ts` | ReportData interface | `ReportData` |
| `html.ts` | Self-contained dark-themed HTML report | `generateReportHtml` |
| `markdown.ts` | Markdown report with tables + finding sections | `generateReportMarkdown` |

---

## Findings — `src/findings/`

| File | Purpose | Exports |
|------|---------|---------|
| `types.ts` | Core types: Severity, Category, UnifiedFinding, BusinessLogicRule, FileSummary | `Severity`, `Category`, `UnifiedFinding`, `BusinessLogicRule`, `FileSummary` |
| `dedup.ts` | SHA-256 fingerprinting + duplicate check | `fingerprint`, `isDuplicate` |
| `aggregator.ts` | Flatten + deduplicate finding arrays, keep highest severity on collision | `aggregate` |

---

## Rules — `src/rules/`

| File | Purpose | Exports |
|------|---------|---------|
| `parser.ts` | Parse `.astra` rule DSL into structured objects | `ParsedRule`, `parseAstraRule`, `ruleToContext` |
| `loader.ts` | Load rule files from rules/ directory + prompt overrides | `KnowledgeBase`, `loadKnowledgeBase` |

---

## Prisma Generated — `src/generated/prisma/`

Auto-generated by Prisma. Models: `AiCallLog`, `AiConversation`, `AlertComment`, `AlertHistory`, `BusinessLogicRule`, `Config`, `Finding`, `GithubProfile`, `Job`, `NodeOutput`, `Preset`, `Scan`, `ScanLog`, `Task`, `TaskComment`, `TaskHistory`, `User`, `UserPreference`, `UserRule`.

---

## Security Notes

5 API routes currently lack authentication:

1. **`GET /api/v1/scans/[id]/stream`** — SSE endpoint, no auth check
2. **`GET /api/v1/findings/[id]/history`** — audit history, no auth check
3. **`GET /api/v1/tasks/[id]/history`** — audit history, no auth check
4. **`GET /api/v1/rules`** — business logic rules listing, no auth check
5. **`PATCH /api/v1/rules/[id]`** — rule status mutation, **no auth check** (critical)