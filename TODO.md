# Platform — Task Tracker

**Created:** 2026-05-07
**Updated:** 2026-05-16

---

## Legend

| Status | Meaning |
|--------|---------|
| 🔴 BLOCKED | Cannot proceed until another task completes |
| 🟡 IN_PROGRESS | Currently being worked on |
| 🟢 COMPLETED | Done and verified |
| ⚪ PENDING | Not started yet |

---

## 🔴 P0 — Critical Security & Stability

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 1 | Fix `/api/v1/config` — add `requireAuth()` to GET/PUT | 🟢 | 5m | | ADMIN-only config read/write |
| 2 | Fix `/api/v1/providers/test` — add `requireAuth()` | 🟢 | 5m | | Auth-required provider test |
| 3 | Fix `/api/v1/findings` (GET list) — add `requireAuth()` + userId filter | 🟢 | 10m | | Non-admin scoped to own scans |
| 4 | Fix `/api/v1/scans/:id` (GET detail) — add `requireAuth()` + ownership check | 🟢 | 15m | | All 8 scan sub-routes secured |
| 5 | Fix `middleware.ts` — remove blanket `/api/*` public bypass | 🟢 | 5m | | Only /api/v1/auth/* and /api/v1/health public |
| 6 | Fix `/api/v1/presets` — add `requireAuth()` + user scoping | 🟢 | 10m | | Preset.userId added, non-admin sees own + built-in |
| 7 | Fix `/api/v1/user-rules` — add `requireAuth()` + user scoping | 🟢 | 5m | | DELETE restricted to admins |
| 8 | Add rate limiting to auth endpoints (sign-in, verify) | 🟢 | 10m | | 10/min verify, 5/min signup per IP |
| 9 | Encrypt `GithubProfile.accessToken` at rest | 🟢 | 15m | | AES-256-GCM with backward-compat for plaintext tokens |

---

## 🟠 P1 — Architecture & Core Features

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 10 | **Design user-scoped config architecture** | 🟡 | 45m | | 4-layer: Credentials → Defaults → Presets → Per-Scan |
| 11 | Implement `ProviderDefinition` + `ProviderModel` tables (system registry) | ⚪ | 0m | | Admin-managed: what providers/models exist |
| 12 | Implement `UserProviderCredential` table (per-user API keys, encrypted) | ⚪ | 0m | | Ollama URL+key, OpenAI key, Bedrock AWS creds |
| 13 | Implement `UserConfig` table (per-user defaults: chat + scan nodes) | ⚪ | 0m | | Chat provider/model, per-node config |
| 14 | Implement `UserPreset` table (saved named configs) | ⚪ | 0m | | "Quick Scan", "Deep Audit", etc. |
| 15 | Wire `Scan.configJson` to UI (per-scan override already exists in schema) | ⚪ | 0m | | DB field exists, not exposed in create-scan flow |
| 16 | Add editable system prompts per node (discover, deepScan, crossFile, chat) | ⚪ | 0m | | Currently hardcoded in `ai-chat.ts` / nodes |
| 17 | **Fix chat conversation memory** — send history to AI | 🟢 | 15m | | Chat routes load history from AiConversation; sendChatMessage accepts messages[] | 0m | | `ai-chat.ts` only sends current message |
| 18 | Fix provider factory to use user credentials instead of env vars | ⚪ | 0m | | `factory.ts` reads `process.env[config.apiKeyEnv]` |
| 19 | Remove or hide 3 stub providers (bedrock, azure-ai-foundry, langgraph) | ⚪ | 0m | | They throw `not yet implemented` |
| 20 | Fix Cloud Ollama URL mismatch (`api.ohmyllama.com` vs `ollama.com`) | ⚪ | 0m | | Factory fallback overrides user config |
| 21 | Fix provider caching hash to include all config fields | ⚪ | 0m | | Only hashes provider:model:temperature |
| 22 | Fix cross-file node context window bomb | ⚪ | 0m | | Concatenates ALL file summaries into one prompt |
| 23 | Fix deep-scan token estimation (`Math.ceil(text.length / 4)` is inaccurate) | ⚪ | 0m | | Use actual tokenizer or better heuristic |
| 24 | Fix `Finding` PATCH to use real userId instead of `'system'` | ⚪ | 0m | | Breaks audit trail |

---

## 🟡 P2 — Performance, Quality, Polish

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 25 | Replace `setInterval` worker with event-driven queue | 🟢 | 10m | | `startWorker()`/`stopWorker()`, processes immediately when jobs exist |
| 26 | Replace synchronous `execSync`/`readFileSync` in scan nodes with async equivalents | 🟢 | 15m | | clone, discover, deep-scan all use fs/promises now |
| 27 | Add temp directory cleanup on all failure paths | 🟢 | 5m | | `cleanupScanTmpDir()` in worker removes astra-scan-* dirs on failure |
| 28 | Add hidden fields to ConfigEditor: `instructions`, `tools`, `knowledge`, `stopSequences`, `contextWindowOverride` | ⚪ | 0m | | Exist in schema, invisible in UI |
| 29 | Add pagination to chat history (limit 50 messages, infinite scroll) | 🟢 | 5m | | `parsePagination(request, 50)` with limit/offset |
| 30 | Merge `ScanChat.tsx` and `AiChatProvider.tsx` into shared chat component | ⚪ | 0m | | Duplicated UI logic |
| 31 | Remove or document dead LangGraph code (`src/scan/graph.ts`, `langgraph-connector.ts`) | ⚪ | 0m | | Never used in production |
| 32 | Add input validation to ConfigEditor (verify model exists in provider before save) | ⚪ | 0m | | Can save invalid provider/model combos |
| 33 | Add shared pagination helper for API routes | 🟢 | 5m | | `parsePagination()` in lib/pagination.ts, used in 4 routes |
| 46 | **Pipeline performance: parallelize independent nodes** | ⚪ | 0m | | `discover` can start before `clone` fully returns? Async job spawning |
| 47 | **Pipeline performance: add file content caching** | ⚪ | 0m | | Cache file reads between `discover` and `deepScan` to avoid double I/O |
| 48 | **Pipeline performance: batch AI calls with dynamic concurrency** | ⚪ | 0m | | Auto-scale concurrency based on provider rate limits and queue depth |
| 49 | **Pipeline performance: incremental/resumable scans** | ⚪ | 0m | | If scan fails at `cross_file`, resume from there without re-running `deep_scan` |
| 50 | **Pipeline performance: streaming findings** | ⚪ | 0m | | Emit findings to WebSocket/SSE as they're found, not just at `persist` |
| 102 | **Scan queue: priority + scheduled scans** | ⚪ | 0m | | Add `priority` (critical/high/normal/low) and `scheduledAt` to Scan model; update `claimNextJob` to respect them; update API |
| 103 | **Scan queue: worker pool** | ⚪ | 0m | | Replace single worker loop with `MAX_CONCURRENT_SCANS` workers running in parallel |
| 104 | **Scan queue: cancellation awareness** | ⚪ | 0m | | Check scan status between all pipeline nodes, not just deep-scan batches |
| 105 | **Scan queue: stuck job recovery** | ⚪ | 0m | | Time out RUNNING jobs after 10 min; retry with backoff or fail the scan |
| 106 | **Scan queue: backend abstraction** | ⚪ | 0m | | `ScanQueue` interface (enqueue/dequeue/markRunning/markComplete/markFailed/cancel/getStats); implement `PostgresQueue` |
| 107 | **Scan queue: Redis/BullMQ backend** | ⚪ | 0m | | Implement `RedisQueue` for multi-server/high-volume deployments |
| 108 | **Scan queue: external MQ backend** | ⚪ | 0m | | Implement `MQQueue` with Redis state + RabbitMQ/NATS/SQS for enterprise |
| 109 | **Scan queue: recurring scans** | ⚪ | 0m | | Cron expressions on Scan records; auto-create new scans on schedule; `recurrenceId` linking |
| 110 | **Scan queue: queue stats API** | ⚪ | 0m | | `/api/v1/queue/stats` for queue depth, active/waiting/completed counts |
| 111 | **Scan queue: cancel/resume/progress APIs** | ⚪ | 0m | | POST `/scans/:id/cancel`, `/scans/:id/resume`, GET `/scans/:id/progress` |

---

## 🔵 New Scan Pipeline Nodes

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 51 | **`sbom` node** — Software Bill of Materials generation | ⚪ | 0m | | Generate SBOM from repo dependencies (package.json, requirements.txt, Cargo.toml) |
| 52 | **`dependency_vuln` node** — Dependency vulnerability scanning | ⚪ | 0m | | Check SBOM against vulnerability DBs (OSV, GitHub Advisory, Snyk) |
| 53 | **`secret_scan` node** — Dedicated secret/credential detection | ⚪ | 0m | | Beyond basic regex: entropy analysis, git history scanning, custom patterns |
| 54 | **`iac_scan` node** — Infrastructure-as-Code scanning | ⚪ | 0m | | Terraform, CloudFormation, K8s YAML misconfigurations |
| 55 | **`compliance` node** — Policy/compliance rule enforcement | ⚪ | 0m | | Check against custom rules (SOC2, PCI-DSS, GDPR patterns) |
| 56 | **`correlation` node** — Finding correlation and deduplication | ⚪ | 0m | | Merge findings from different nodes that point to same issue |
| 57 | **`risk_score` node** — Risk scoring and prioritization | ⚪ | 0m | | Compute risk scores based on severity, exploitability, asset exposure |
| 58 | **`report` node** — Generate formatted reports | ⚪ | 0m | | SARIF, PDF, HTML reports with findings, remediation, metrics |
| 59 | **`notify` node** — Alert dispatch | ⚪ | 0m | | Send Slack, email, PagerDuty, webhook notifications for critical findings |

---

## 🔵 P1.5 — AI Debuggability & Context

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 71 | **Fix empty AI responses** — deep_scan calls with kimi-k2.6:cloud return `text: ""` despite `outputTokens: 4096` | 🟢 | 15m | | Added empty-response retry in providers + validation in deep-scan/cross-file nodes |
| 72 | **Ensure AI receives full context** — send all enums, schema info, and required context before AI calls | 🟢 | 15m | | Added explicit enum constraints to prompts, full finding context to chat, severity/category/status enums |
| 73 | **AI call debug dashboard** — observability page with filters, retry, and re-run actions | 🟢 | 20m | | Retry button, POST /api/v1/ai-calls/[id]/retry, inline retry response display |
| 74 | **Alert ↔ Task full linking** — bidirectional Finding→Task link; every field (severity, file, snippet, AI explanation, fix, CWE, OWASP, history, comments) mirrored in both UI views | 🟢 | 30m | | Task column in table, Create Task in AlertDetail, task include in finding/scan APIs |
| 75 | **AI Graph workflow management UI** — configure/enable/disable pipeline nodes, reorder execution, set per-node provider/model/prompt/tools/concurrency, view live graph | 🟢 | 30m | | /pipeline page with visual graph, node config editor, save to DB, nav link added |
| 76 | **Per-alert / per-task Rescan** — rescan ONLY the specific file tied to that alert/task; include all comments, history, prior findings as context | 🟢 | 15m | | POST /api/v1/findings/[id]/rescan, deep-scan singleFile param, Rescan File button in AlertDetail |
| 77 | **AI Assist per alert and per task** — inline AI chat scoped to one alert or task with full context (code snippet, history, prior AI calls, comments) | 🟢 | 10m | | AI Assist button exists in AlertDetail and findings table; full finding context sent to chat |
| 78 | **DB-backed prompt management** — retrieve all system prompts (discover, deepScan, crossFile, chat) from DB; UI to edit/version/restore prompts per node | ⚪ | 0m | | Store prompts in Config table under `prompts.*` keys; fall back to hardcoded defaults; every AI call reads from DB, not code |
| 79 | **Astra-app file system glossary** — complete catalogue of every file in `astra-app/src/`: purpose, exported functions/types, API routes mapped, DB tables touched, providers used | 🟢 | 0m | | Auto-generated + hand-curated; rendered as searchable page in UI and as `docs/glossary/astra-app-files.md`; updated on each code change |
| 80 | **DB-first context loading for all AI calls** — every AI call (chat, deepScan, crossFile) must load its context (finding, scan, conversation history, config, prompts) from DB; no in-memory shortcuts | ⚪ | 0m | | Audit all `sendChatMessage`/node calls; replace any in-memory state with fresh DB queries; fixes chat memory (task 17) |
| 112 | **Wire DB rules into AI prompts** — `UserRule` (active) + `BusinessLogicRule` (confirmed) + `guidelines/*.md` never reach AI; only filesystem `patterns/*.json` does | 🟢 | 0m | | COMPLETED v2.26.0: loadRulesForContext() loads UserRule + BusinessLogicRule + patterns + guidelines, injects into deepScan/crossFile/chat with token budget |

---

## 🟣 Visualization & UX

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 60 | **Enhanced workflow graph** — Interactive pipeline visualization | ⚪ | 0m | | Mermaid/flowchart showing live scan progress: nodes light up, show timing, status |
| 61 | **Scan timeline view** — Gantt-style node execution timeline | ⚪ | 0m | | Visual timeline: clone → discover → deepScan → crossFile → aggregate → persist |
| 62 | **Finding dependency graph** — How findings relate to each other | ⚪ | 0m | | Graph view: cross-file vulnerabilities, shared files, cascading issues |
| 63 | **Dashboard metrics cards** — KPI cards (findings by severity, scan duration, token usage) | ⚪ | 0m | | IBM Carbon tiles with sparklines, trend indicators |
| 64 | **Dark mode support** | ⚪ | 0m | | System prefers-color-scheme + manual toggle, full Carbon dark theme |
| 65 | **Command palette** — Cmd+K global search and action launcher | ⚪ | 0m | | Search scans, findings, navigate pages, trigger actions |
| 66 | **Keyboard shortcuts** — Full keyboard navigation | ⚪ | 0m | | Shortcuts for scan trigger, chat open, config save, navigation |
| 67 | **Toast notifications** — Real-time feedback for actions | ⚪ | 0m | | Scan started, config saved, provider connected, error alerts |
| 68 | **Loading skeletons** — Replace generic spinners with content-aware skeletons | ⚪ | 0m | | Shimmer placeholders matching the actual UI layout |
| 69 | **Empty states** — Beautiful illustrations for empty lists/pages | ⚪ | 0m | | No scans yet, no findings, no chat history — with CTA buttons |
| 70 | **Onboarding wizard** — First-time user setup flow | ⚪ | 0m | | Step-by-step: add provider credentials → set preferences → run first scan |

---

## 🟣 Design & Spec

| # | Task | Status | Time | Owner | Notes |
|---|------|--------|------|-------|-------|
| 34 | **Streaming chat design spec** | 🟢 | 60m | | Committed: `docs/superpowers/specs/2026-05-07-streaming-chat-design.md` |
| 35 | **User-scoped config architecture design** | 🟡 | 45m | | Plan written, not yet executed — pending pluggable provider decision |
| 36 | Write implementation plan for user-scoped config | ⚪ | 0m | | After design is approved |
| 37 | Write implementation plan for streaming chat | ⚪ | 0m | | After config work is done |

---

## 🔵 Completed

| # | Task | Completed | Time | Notes |
|---|------|-----------|------|-------|
| 1 | Fix `/api/v1/config` — add `requireAuth()` to GET/PUT | ✅ 2026-05-08 | 5m | ADMIN-only config read/write |
| 2 | Fix `/api/v1/providers/test` — add `requireAuth()` | ✅ 2026-05-08 | 5m | Auth-required provider test |
| 3 | Fix `/api/v1/findings` — add `requireAuth()` + userId filter | ✅ 2026-05-08 | 10m | Non-admin scoped to own scans |
| 4 | Fix `/api/v1/scans/:id` — add `requireAuth()` + ownership | ✅ 2026-05-08 | 15m | All 8 scan sub-routes secured |
| 5 | Fix `middleware.ts` — remove blanket `/api/*` bypass | ✅ 2026-05-08 | 5m | Only auth + health routes public |
| 6 | Fix `/api/v1/presets` — add `requireAuth()` + user scoping | ✅ 2026-05-08 | 10m | Preset.userId, migration applied |
| 7 | Fix `/api/v1/user-rules` — add `requireAuth()` + admin-only DELETE | ✅ 2026-05-08 | 5m | Auth on all routes |
| 8 | Rate limiting on auth endpoints | ✅ 2026-05-08 | 10m | 10/min verify, 5/min signup per IP |
| 9 | Encrypt `GithubProfile.accessToken` at rest | ✅ 2026-05-08 | 15m | AES-256-GCM, backward-compat with plaintext |
| 25 | Replace `setInterval` worker with event-driven queue | ✅ 2026-05-08 | 10m | `startWorker()`/`stopWorker()` with immediate processing |
| 26 | Replace sync I/O in scan nodes with async | ✅ 2026-05-08 | 15m | clone, discover, deep-scan use fs/promises |
| 27 | Temp directory cleanup on failure paths | ✅ 2026-05-08 | 5m | `cleanupScanTmpDir()` in worker |
| 29 | Chat history pagination | ✅ 2026-05-08 | 5m | `parsePagination(request, 50)` |
| 33 | Shared pagination helper for API routes | ✅ 2026-05-08 | 5m | `lib/pagination.ts`, used in 4 routes |
| 38 | Move config from file to DB | ✅ 2026-05-07 | 20m | Config table + all API routes updated |
| 39 | Fix Cloud Ollama baseURL | ✅ 2026-05-07 | 5m | Fixed `api/api/generate` double-prefix bug |
| 40 | Fix chat model | ✅ 2026-05-07 | 5m | `gemma4:31b-cloud` → `glm-5.1:cloud` |
| 41 | Fix worker `processing` mutex bug | ✅ 2026-05-07 | 10m | `processNextJob` resets `processing = false` |
| 42 | Add `Config` table migration | ✅ 2026-05-07 | 5m | `20260507192118_add_config_table` |
| 43 | Build multi-provider AI chat UI | ✅ 2026-05-07 | ~2h | `AiChatProvider`, `ScanChat`, provider registry |
| 44 | Update Graphify knowledge graph | ✅ 2026-05-08 | 5m | 2328 nodes, 2988 edges |
| 45 | Update CLAUDE.md with current state | ✅ 2026-05-08 | 15m | Architecture, DB schema, changelog, file paths |
| 81 | Fix dark mode footer (inverse token flips white) | ✅ 2026-05-08 | 10m | Added `--ibm-footer-bg/ink` tokens that never flip; applied in AppShell.tsx |
| 82 | Fix React border shorthand warning in /pipeline | ✅ 2026-05-08 | 5m | Replaced `border` shorthand with explicit `borderTop/Right/Bottom/Left` per side |
| 83 | Browser-side data store — AppDataProvider + browser-store.ts | ✅ 2026-05-08 | 30m | localStorage TTL cache; stale-while-revalidate; ThemeProvider/TaskDataTable/AlertDetail/AiChatProvider all migrated |
| 84 | v1.0 Initial Release changelog milestone | ✅ 2026-05-08 | 15m | Added to changelog.ts and CLAUDE.md; captures full product scope |
| 85 | Landing page full rewrite (IBM Carbon, animations) | ✅ 2026-05-08 | 60m | Hero, pipeline, scanners, capabilities, AI providers, security, CTA, 5-col footer; scroll animations via IntersectionObserver |
| 93 | Homepage v2 redesign — strict IBM Carbon compliance, geometric hero, fixed layout | ✅ 2026-05-08 | 30m | v2/page.tsx → replaced root page.tsx; abstract SVG mesh hero, sentence-case eyebrows, 4-up grid, utility/nav/menu fixes |
| 86 | README full rewrite | ✅ 2026-05-08 | 15m | Pipeline table, scanner matrix, AI providers, stack table, setup guide, security model, project structure |
| 87 | Prisma seed script | ✅ 2026-05-08 | 20m | prisma/seed.ts — 3 users, astra.config, theme pref, 3 presets, 5 builtin rules; idempotent upsert |
| 88 | Fix Prisma seed not finding DATABASE_URL | ✅ 2026-05-08 | 10m | Added `import 'dotenv/config'`; configured `migrations.seed` in prisma.config.ts (Prisma 7 reads from there, not package.json) |
| 89 | Fix PrismaPg writing to wrong schema | ✅ 2026-05-08 | 20m | Schema must be second arg: `new PrismaPg(config, { schema })`; parses `?schema=` from DATABASE_URL in both db.ts and seed.ts |
| 90 | Fix NextAuth UntrustedHost on custom domain | ✅ 2026-05-08 | 5m | Added `trustHost: true` to auth.ts — required for reverse-proxy / astra.nerdlogics.cloud deployments |
| 91 | Fix login failures from corrupted password hashes | ✅ 2026-05-08 | 10m | Earlier seeds wrote to wrong schema; repaired hashes in public.User; rebuilt app so db.ts now targets correct schema |
| 92 | Sync db-related files local ↔ deployed | ✅ 2026-05-08 | 5m | db.ts, seed.ts, prisma.config.ts identical across /root/astra/astra-app and /var/www/astra-app; deployed app rebuilt |
| 94 | Branding refactor — centralize all product identity into `branding.ts` with env vars | ✅ 2026-05-09 | 60m | All brand strings (APP_NAME, APP_TITLE, APP_ID, APP_DOMAIN, etc.) read from process.env with defaults; `AstraConfig` → `ScanConfig`; `astra.config.json` → `scan.config.json`; `parseAstraRule` → `parseScanRule`; `.astra` → `.rule` |
| 95 | Fix deep-scan crash on undefined file path (Trivy IAC misconfigs) | ✅ 2026-05-15 | 15m | f.file.endsWith() crashed on undefined; null guards in deep-scan, cross-file, tool-scan |
| 96 | Architecture diagram visibility during in-progress scans | ✅ 2026-05-15 | 10m | Read diagram from NodeOutput fallback; Pipeline tab renders Mermaid inline |
| 97 | GitHub branch pagination (was capped at 100) | ✅ 2026-05-15 | 10m | Follow Link headers; mark default branch |
| 98 | Deep-scan cancellation check between batches | ✅ 2026-05-15 | 5m | Check scan status === FAILED between batches |
| 99 | Codegraph file iteration fix (discoveredFiles vs structureData) | ✅ 2026-05-15 | 5m | Was only surfacing 25/71 files |
| 100 | Fix AI response JSON parsing crash | ✅ 2026-05-15 | 10m | parseAiJson() sanitizer strips invalid \u escapes + trailing commas; deep-scan & cross-file |
| 101 | Markdown rendering in AI chat | ✅ 2026-05-15 | 5m | react-markdown + remark-gfm; assistant messages render md, user messages stay plain text |
| 102t | Pipeline logging (queue + worker state transitions) | ✅ 2026-05-15 | 15m | All queue.ts state transitions now logged; worker logs scan PENDING→RUNNING, temp cleanup, start/stop |
| 103t | Parallel deep-scan with p-limit | ✅ 2026-05-15 | 15m | Replaced sequential batch loop with p-limit concurrency; all files run concurrently gated by config |
| 104t | Incremental persist (per-file upsert) | ✅ 2026-05-15 | 20m | Findings upserted to DB per-file in deep-scan, per-finding in tool-scan and cross-file |
| 105t | AI-enriched tool findings | ✅ 2026-05-15 | 20m | Trivy/Gitleaks findings sent to AI for enrichment (aiExplanation, aiFix, exploitScore, etc.) before storage |
| 106t | Shared findings/persist.ts + findings/normalize.ts | ✅ 2026-05-15 | 10m | Shared upsertFinding() helper and normalizeSeverity/normalizeCategory extracted from persist.ts |
| 107t | Persist node refactored | ✅ 2026-05-15 | 10m | No longer creates Finding records; only creates Tasks, BusinessRules, and updates scan metadata |
| 112 | Wire DB rules into AI prompts | ✅ 2026-05-16 | 0m | loadRulesForContext() + formatter.ts; injected into deepScan/crossFile/chat with token budget; Rules page UI |
| 108t | Rules page UI redesign — card layout, fix category/SLA/modal bugs | ✅ 2026-05-16 | 30m | Type filter chips, search, colored type badges, left-border cards, section headers, widened modal |
| 109t | Password management — self-service change + admin reset | ✅ 2026-05-16 | 20m | PATCH /auth/me (self-service), PATCH /users/[id] (admin reset), Change Password card, Reset PW modal |
| 110t | Knowledge page — unified spec link on Specs tab | ✅ 2026-05-16 | 5m | LinkCard component in FileBrowserSection sidebar; opens /unified-spec.html in new tab |

---

## Roadmap

### Phase 1 — Stability & Queue Foundation (Current)
**Goal:** Make scans reliable, concurrent, and cancellable.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 102 | Priority + scheduled scans | — | Add `priority`/`scheduledAt` to Scan model |
| 103 | Worker pool (concurrent scans) | 102 | Replace single worker with `MAX_CONCURRENT_SCANS` workers |
| 104 | Cancellation awareness | 102 | Check scan status between every pipeline node |
| 105 | Stuck job recovery | — | Timeout RUNNING jobs after 10 min; retry with backoff |
| 24 | Fix `Finding` PATCH userId | — | Use real user ID, not `'system''` |
| 22 | Fix cross-file context window bomb | — | Summarize instead of concatenating all file summaries |

### Phase 2 — Queue Abstraction & Config
**Goal:** Decouple queue from PostgreSQL; give users control over providers and prompts.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 106 | Queue backend abstraction (ScanQueue interface + PostgresQueue) | 102–105 | Interface: enqueue/dequeue/cancel/getStats |
| 10 | User-scoped config architecture | — | 4-layer: Credentials → Defaults → Presets → Per-Scan |
| 11–14 | Provider registry + user credentials + user config + user presets | 10 | Per-user API keys (encrypted), defaults, saved presets |
| 16 | Editable system prompts per node | 10 | Store prompts in Config table, fall back to hardcoded |
| 78 | DB-backed prompt management UI | 16 | Edit/version/restore prompts per node |

### Phase 3 — Streaming Chat & Real-time
**Goal:** SSE streaming for chat; real-time scan progress.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 34 | Streaming chat (SSE) | — | Design spec done; implement `sendStream()` on all providers |
| 50 | Streaming findings via SSE | 103 | Push findings as they arrive, not just at persist |
| 67 | Toast notifications | — | Real-time feedback for scan events, config saves |
| 110 | Queue stats API | 106 | `/api/v1/queue/stats` for depth, active, waiting |

### Phase 4 — Multi-backend Queue & Recurring Scans
**Goal:** Scale beyond single-server; enable scheduled/recurring scans.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 107 | Redis/BullMQ backend | 106 | For multi-server, high-volume deployments |
| 108 | External MQ backend | 107 | Redis state + RabbitMQ/NATS/SQS for enterprise |
| 109 | Recurring scans (cron) | 102 | Cron on Scan model; auto-create scans on schedule |
| 111 | Cancel/resume/progress APIs | 104 | POST cancel, resume; GET progress |

### Phase 5 — Pipeline Performance
**Goal:** Faster scans, less I/O, smarter batching.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 46 | Parallelize independent nodes | 103 | discover can start before clone finishes |
| 47 | File content caching | — | Cache reads between discover and deepScan |
| 48 | Dynamic AI call concurrency | 103 | Auto-scale based on provider rate limits |
| 49 | Incremental/resumable scans | 105 | Resume from last completed node on failure |
| 23 | Better token estimation | — | Replace `length/4` with real tokenizer |

### Phase 6 — New Pipeline Nodes
**Goal:** Expand scanner coverage and post-processing.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 51 | SBOM generation | — | Parse package.json, requirements.txt, Cargo.toml |
| 52 | Dependency vulnerability scanning | 51 | Check SBOM against OSV, GitHub Advisory |
| 53 | Dedicated secret scanning | — | Entropy analysis, git history, custom patterns |
| 54 | IaC scanning | — | Terraform, CloudFormation, K8s YAML |
| 55 | Compliance rules | — | SOC2, PCI-DSS, GDPR pattern checks |
| 56 | Finding correlation | — | Merge findings across scanners |
| 57 | Risk scoring | — | Severity × exploitability × exposure |
| 58 | Report generation | 57 | SARIF, PDF, HTML reports |
| 59 | Alert dispatch | 57 | Slack, email, PagerDuty, webhooks |

### Phase 7 — Visualization & UX Polish
**Goal:** Make the dashboard informative and pleasant to use.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 60 | Interactive pipeline graph | — | Live node status, timing |
| 61 | Scan timeline (Gantt) | — | Node-by-node execution view |
| 62 | Finding dependency graph | 56 | Cross-file vulnerability connections |
| 63 | Dashboard KPI cards | — | Severity counts, scan duration, token usage |
| 64 | Dark mode | — | System preference + manual toggle |
| 65 | Command palette (Cmd+K) | — | Search scans, findings, actions |
| 68 | Loading skeletons | — | Content-aware shimmer placeholders |
| 69 | Empty states | — | Illustrations + CTAs for empty lists |
| 70 | Onboarding wizard | 10–14 | Step-by-step: credentials → prefs → first scan |

---

### Phase 9 — Cloud Scan Pipeline
**Goal:** Multi-cloud infrastructure security scanning (AWS, Azure, GCP).

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 200 | **CloudScan pipeline DAG** | 128, 130 | New pipeline: auth → discover → connect → scan → normalize → compliance_map → enrich → persist. Separate from code-scan pipeline. |
| 201 | **CloudAccount model + credentials** | 200 | Store cloud account credentials (AWS Access Key, Azure SPN, GCP Service Account) encrypted in DB. Validate connectivity. Status: pending/connected/error/scanning. |
| 202 | **Prowler integration (AWS)** | 200 | Run Prowler AWS as subprocess in `astra-cloud-scan` Docker. Parse JSON output. Map to UnifiedFinding with category CLOUD_MISCONFIG / COMPLIANCE. |
| 203 | **Prowler integration (Azure)** | 200 | Prowler Azure. Same normalize path. |
| 204 | **Prowler integration (GCP)** | 200 | Prowler GCP. Same normalize path. |
| 205 | **ScoutSuite integration (AWS)** | 200 | Run ScoutSuite AWS. Parse JSON. Map findings. |
| 206 | **ScoutSuite integration (Azure)** | 200 | ScoutSuite Azure. |
| 207 | **ScoutSuite integration (GCP)** | 200 | ScoutSuite GCP. |
| 208 | **kube-bench integration** | 200 | CIS Kubernetes Benchmark scanning. |
| 209 | **Cloud scan API routes** | 200 | `/v1/cloud-accounts` CRUD, `/v1/cloud-scans` trigger+list, `/v1/cloud-resources` inventory |
| 210 | **Cloud scan UI** | 200 | Cloud accounts list, add/edit account, scan trigger, scan results, findings by cloud provider |
| 211 | **Compliance mapping pipeline** | 200 | Ingest → map → score → report → persist. Map findings to 43 compliance frameworks. |
| 212 | **Compliance framework seeding** | 211 | Seed ComplianceFramework + ComplianceControl tables with CIS, PCI-DSS, NIST, SOC2, HIPAA, ISO 27001, GDPR controls |
| 213 | **Compliance report generation** | 211 | PDF, HTML, SARIF report generation per framework per project |
| 214 | **Compliance API + UI** | 211 | `/v1/compliance` framework listing, control mapping, score dashboard, report download |

### Phase 10 — Network Scan Pipeline
**Goal:** Network vulnerability scanning (port audit, service detection, CVE identification).

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 220 | **NetworkScan pipeline DAG** | 128 | target_discover → port_scan → vuln_scan → service_detect → normalize → enrich → persist |
| 221 | **NetworkScanTarget model** | 220 | Store scan targets (IPs, CIDRs, hostnames, excluded ranges). Per-project. |
| 222 | **Nmap integration** | 220 | Port scanning, service detection, OS fingerprinting. XML/JSON output. |
| 223 | **OpenVAS integration** | 220 | Vulnerability scanning (open-source Nessus fork). XML output. |
| 224 | **Network scan API routes** | 220 | `/v1/network-targets` CRUD, `/v1/network-scans` trigger+list, `/v1/network-hosts` results |
| 225 | **Network scan UI** | 220 | Target management, scan trigger, host results, port/service table |

### Phase 11 — SBOM Pipeline
**Goal:** Software Bill of Materials generation, vulnerability correlation, license scanning.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 230 | **SBOM pipeline DAG** | 128 | discover → inventory → vulnerability → license → enrich → persist |
| 231 | **Syft integration** | 230 | Generate SBOM from package manifests (all languages). CycloneDX + SPDX output. |
| 232 | **Grype integration** | 230 | Vulnerability scanning from SBOM. Match CVEs to dependencies. |
| 233 | **License conflict detection** | 230 | Scan dependency licenses (SPDX). Flag GPL/copyleft conflicts in proprietary projects. |
| 234 | **SBOM API routes** | 230 | `/v1/sbom` list/generate, `/v1/sbom/:id/export?format=`, `/v1/sbom/:id/vulnerabilities`, `/v1/sbom/:id/licenses` |
| 235 | **SBOM UI** | 230 | Dependency inventory table, vulnerability list, license conflict warnings, export buttons |

### Phase 12 — PCI DSS / ASV Module
**Goal:** Internal PCI compliance + external ASV report import + attestation workflow.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 240 | **PCI DSS internal scanning** | 211, 214 | Prowler PCI-DSS profile + OpenSCAP for OS-level compliance. Continuous, not quarterly. |
| 241 | **ASV report import API** | — | Import external ASV scan results from Qualys, Rapid7, Tenable. Parse XML/CSV. Map to UnifiedFinding. |
| 242 | **ASV report merge + dedup** | 240, 241 | Merge internal findings with ASV findings by fingerprint. Track internal-only / ASV-only / both. |
| 243 | **Attestation workflow** | 242 | Quarterly attestation tracking. Remediation status per finding. Rescan workflow. Generate attestation-ready reports. |
| 244 | **PCI DSS dashboard + API** | 240, 243 | `/v1/pci-dss/scans`, `/v1/pci-dss/attestations`, `/v1/pci-dss/asv-imports`. Dashboard: compliance score, requirement status, remediation tracking. |

### Phase 13 — Runtime Security
**Goal:** Container/K8s runtime threat detection via Falco agents.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 250 | **Falco agent deployment** | — | Helm chart for Falco + falcosidekick. Config management per project. |
| 251 | **Event collection webhook** | 250 | falcosidekick webhook endpoint in Control Plane. Parse Falco JSON events. Store as UnifiedFinding (category: RUNTIME). |
| 252 | **Runtime event correlation** | 251 | Correlate Falco events with code-scan/cloud-scan findings. Link to existing vulnerabilities. |
| 253 | **Runtime rule management** | 250 | Custom Falco rules per project. UI rule editor. Push rules to agents. |
| 254 | **Alert dispatch** | 251 | Real-time alerts for high-severity runtime events (Slack, PagerDuty, webhook). |

### Phase 14 — IaC Scan Pipeline (Separate from Code Scan)
**Goal:** Standalone IaC policy scanning pipeline with custom Rego support.

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 260 | **IaC scan pipeline DAG** | 128 | discover → validate → policy_check → enrich → persist. Separate from code-scan. |
| 261 | **Checkov standalone integration** | 260 | Run Checkov as standalone scanner (not in code-scan tool_scan node). |
| 262 | **Custom Rego policy support** | 260 | User-defined Rego policies (OPA). Per-project policy files. Run as policy_check node. |
| 263 | **IaC scan API + UI** | 260 | `/v1/iac-scans`, `/v1/policies/rules`. Scan trigger, results, policy editor. |

### Phase 8 — Enterprise Architecture: RBAC, Multitenancy & Modular Platform

**Goal:** Enterprise-grade RBAC, org-level isolation with deployment-model-aware separation, modular feature gates that respect Control Plane / Data Plane / Cloud boundaries, and billing.

---

#### 8A — RBAC: Role-Based Access Control

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 120 | **RBAC: Permission model & roles** | — | 4 roles per deployment model: **SuperAdmin** (platform-wide, SaaS only), **OrgAdmin** (org-level, all models), **SecOps** (scan/findings r/w), **Engineer** (scan r/w, findings r), **Viewer** (read-only). Permission matrix: 40+ granular permissions (scans:trigger, scans:cancel, findings:edit, config:write, users:invite, billing:manage, etc.). Stored in `RolePermission` table. Roles are composable — orgs can create custom roles from permission set |
| 121 | **RBAC: Middleware & enforcement** | 120 | `requirePermission('scans:trigger')` middleware on every API route; permission checked before data access; `requireRole()` as shorthand for role-level checks; permissions derived from role + org overrides; audit trail on every denied access |
| 122 | **RBAC: UI gating** | 120 | `<RequirePermission scans:trigger>` component; nav items filtered by permission; action buttons hidden/disabled per role; Admin-only pages (user management, org settings, billing); Viewer sees read-only dashboard; role-aware sidebar, breadcrumbs, CTAs |
| 123 | **RBAC: API key scopes** | 120 | API keys with scoped permissions (granular, not just r/w/admin); `ApiKey.scope` = JSON array of permissions; separate from user auth; keys belong to org, not user; rotate without downtime; enforce on all API routes alongside user auth |
| 124 | **RBAC: Audit logging** | 121 | `AuditLog` table: actor (user or API key), action, resource type+id, before/after JSON diff, IP, user_agent, org_id; append-only, immutable; queryable via REST API with filters; 7-year retention policy; real-time streaming to SIEM via webhook; RLS ensures orgs see only their own logs |
| 125 | **RBAC: Cross-model role mapping** | 120 | Role definitions differ by deployment model: SaaS (SuperAdmin exists), Self-Hosted (no SuperAdmin — OrgAdmin is top), Hybrid (SuperAdmin in cloud CP only). `resolvePermissions(userId, orgId, deploymentModel)` returns effective permissions accounting for model constraints |

#### 8B — Project-Based Scanning & Per-Project/Per-Scan Configuration

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 126 | **Project model & hierarchy** | 130 | `Project` model: id, name, slug, description, orgId, ownerId, defaultBranch, repoUrl, configJson (project-level scan defaults), rulesJson (project-level AI/business-logic rules), features (JSONB — per-project feature overrides), createdAt, updatedAt. Hierarchy: **Org → Project → Scan → Findings**. Users can be members of multiple projects. Project-level RBAC (owner, admin, member, viewer) independent of org-level roles. `/v1/projects` CRUD API. Projects list view in UI with create/edit modal. |
| 127 | **Project-scanned repos & branch management** | 126 | `ProjectRepo` join table: projectId, repoUrl, defaultBranch, lastScanCommitSha, lastScanAt, scanCount. A project can track 1+ repos (monorepo support). Branch picker per project (persisted). Auto-scan on push (webhook integration). Repo URL + branch defaults inherited by scans. |
| 128 | **Project-level configuration** | 126 | `Project.configJson` stores project-level scan defaults: which scanners to enable, AI provider/model/temperature per node, concurrency limits, custom system prompts, ignore patterns, severity thresholds, custom rules (UserRule[] scoped to project). Scan creation inherits project config as baseline, per-scan config overrides project defaults. Resolution: **scan.configJson → project.configJson → org defaults → system defaults** (4-layer cascade). |
| 129 | **Project-level rules (business logic + patterns)** | 126 | `UserRule` gains `projectId` FK. Rules scoped to project (inherited by scans in that project). `BusinessLogicRule` gains `projectId` FK. Project rules page: create/edit/activate/deactivate rules per project. Rules injected into deepScan/crossFile AI prompts per-project. Confirmed rules persist across scans within the project. |
| 130p | **Per-scan configuration overrides** | 126, 128 | `Scan.configJson` already exists; wire it as a **merge-over-project-config**: scan config deep-merged onto project config, project config deep-merged onto org defaults. Scan creation UI shows project defaults with per-scan override toggles. Scan detail shows effective config (merged). API: `GET /v1/projects/:id/scans/:scanId/config` returns merged config with source annotations. |
| 131p | **Project dashboard & navigation** | 126 | New `/projects/:id` page: project overview (last scan, total findings by severity, active rules, repo info), scan history list, project settings tab (config, rules, members), findings across all scans (deduplicated by fingerprint). Sidebar shows project switcher. Breadcrumbs: Org > Project > Scan. |
| 132p | **Project-scoped findings aggregation** | 126 | Findings deduplicated across scans within a project (same fingerprint = same finding, new scan updates it). `Finding.projectId` FK. Project findings view: aggregated across all project scans, filterable by scan, severity, category, scanner. Trend view: new vs. resolved findings over time per project. |

#### 8C — Multitenancy: Org Isolation with Deployment-Model Awareness

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 140 | **Multi-tenant: Org & Tenant models** | — | `Org` model (name, slug, logo, settings JSON, deploymentModel: `saas`/`self_hosted`/`hybrid`); `Tenant` model (sub-group within org — e.g., teams, business units); `OrgMember` join table (userId, orgId, roleId, invitedAt, acceptedAt); `TenantMember` join table; org-level feature flags; tenant-level feature overrides |
| 141 | **Multi-tenant: PostgreSQL RLS policies** | 140 | Row-level security on every table (Scan, Finding, Task, Config, AiConversation, AuditLog, etc.); `SET app.current_org_id` on every connection/session; RLS policy: ` USING (org_id = current_setting('app.current_org_id')::uuid)` ; super-admin bypasses RLS with `app.bypass_rls = true`; migration tool applies policies automatically; test suite proves cross-org data leakage impossible |
| 142 | **Multi-tenant: Org provisioning API** | 140 | `POST /v1/orgs` (SaaS SuperAdmin creates org); `PUT /v1/orgs/:id` (OrgAdmin updates settings); org onboarding: create org → set plan → invite users → configure scanners; org-level config overrides (scanner defaults, AI provider, custom prompts); org slug-based routing (`/org/:slug/...`); org switcher in UI header |
| 143 | **Multi-tenant: Deployment-model-aware architecture** | 140 | **SaaS:** Control Plane in Astra Cloud, Data Plane in customer CI/CD; findings-only cross boundary; SuperAdmin sees all orgs. **Self-Hosted:** Both planes in customer K8s; no SuperAdmin; OrgAdmin is top role; air-gapped mode (no external calls). **Hybrid:** Control Plane in Astra Cloud, Data Plane in customer infra; SuperAdmin in cloud only; data sovereignty enforced at API level — raw code never leaves customer env |
| 144 | **Multi-tenant: Data boundary enforcement** | 140, 143 | Control Plane ↔ Data Plane contract: only normalized `UnifiedFinding[]` JSON crosses boundary (no raw source code, no file contents after normalize); Data Plane API signed with org-scoped JWT; Control Plane validates org ownership before accepting findings; network egress controls per deployment model; air-gapped mode: Data Plane runs fully offline, findings written to local store |
| 145 | **Multi-tenant: Org-scoped data** | 140 | All models gain `orgId` FK; cascading queries scoped to `orgId`; org-level defaults for scan config, AI provider, prompts; cross-org admin dashboard (SaaS SuperAdmin only) with org-list, aggregate stats; per-org rate limits and scan quotas |
| 146 | **Multi-tenant: Tenant isolation (teams/BUs)** | 140 | Within an org, `Tenant` partitions data further (e.g., Team A sees only their scans); optional — orgs can operate flat without tenants; `TenantMember` controls visibility; tenant-scoped API routes (`/org/:slug/tenant/:id/...`); tenant-level config overrides (AI provider, scanner selection) |
| 147 | **Multi-tenant: Data isolation verification** | 141 | Integration test suite: (1) RLS policy tests — user A cannot read org B data; (2) API response scoping tests — every endpoint returns only org-scoped data; (3) Data Plane egress tests — no raw code in any network call; (4) Tenant isolation tests — within org, tenant A cannot see tenant B data; (5) Deployment model tests — Hybrid mode rejects Data Plane calls from wrong org |
| 148 | **Multi-tenant: Migration path for existing data** | 140 | Migration: add `orgId` to all tables with DEFAULT org; assign existing rows to default org; remove DEFAULT after migration; RLS policies activated; API routes updated to require org context; backward-compatible during migration (missing orgId → default org) |

#### 8D — Modular Feature System (Env-Level + Org-Level)

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 150 | **Feature flags: core system** | — | `features.ts`: reads `NEXT_PUBLIC_FEATURES` env var (comma-separated or JSON); merges with org-level `Org.features` (JSONB); resolution: env var sets platform ceiling, org flags set org ceiling, plan sets plan ceiling — effective = min(env, org, plan); `<FeatureGate feature="rbac">` React component; `requireFeature('rbac')` API middleware; `isFeatureEnabled('rbac')` server helper |
| 151 | **Feature flags: module registry** | 150 | Each module (`rbac`, `multitenancy`, `payments`, `compliance`, `sbom`, `report`, `ai_chat`, `business_logic`, etc.) exports `manifest.ts` with: `{ id, name, routes[], navItems[], permissions[], dependencies[], migrations[], envRequired[] }`. App boot reads enabled features → loads only matching routes, nav, DB migrations. Disabled modules excluded from bundle, nav, API routes, and migrations |
| 152 | **Feature flags: Control Plane modules** | 150, 143 | Modules segmented by Control Plane responsibilities: **Auth** (`/v1/auth/*`), **Findings** (`/v1/findings/*`), **Scans** (`/v1/scans/*`), **Policies** (`/v1/policies/*`), **AI Orchestration** (`/v1/biz-logic/*`), **Integrations** (`/v1/integrations/*`), **Dashboard** (`/v1/dashboard/*`). Each independently enableable. Self-Hosted may disable Auth (uses internal SSO), Cloud enables all. |
| 153 | **Feature flags: Data Plane modules** | 150, 144 | Data Plane features toggleable: **scanner nodes** (trivy, semgrep, gitleaks, bearer, checkov, bandit), **AI enrichment** (deepScan, crossFile), **SBOM generation**, **compliance rules**. Data Plane feature config passed as env vars to Docker container; Control Plane sends feature mask with each scan request; Data Plane skips disabled nodes |
| 154 | **Feature flags: Cloud isolation gating** | 150, 143 | In **Hybrid** mode: Control Plane features (dashboard, org management, billing) run in Astra Cloud; Data Plane features (all scanner binaries, AI enrichment, raw code processing) run in customer infra. Feature system ensures: (1) CP routes don't expose DP-only data, (2) DP never calls home with code, (3) SaaS mode enables everything in single deployment. `deploymentModel` flag determines which module subset is active |
| 155 | **Feature flags: UI module loader** | 151 | Dynamic `import()` for disabled modules — code-split per feature; nav sidebar shows only enabled modules; settings page shows per-module config only if enabled; module enable/disable triggers DB migration rollback/forward; admin UI for toggling org-level features (plan-gated) |

#### 8E — Payments & Billing

| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 160 | **Billing: Plan & subscription models** | 140 | `Plan` model: Free (3 scanners, no AI, 5 scans/mo, 1 user), Pro ($49/user/mo: all scanners + AI, unlimited scans, 10 users), Enterprise ($custom: business logic + compliance + SSO, unlimited everything). `Subscription` linked to Org with billing cycle, status, trial dates. Plan limits enforced at scan-pipeline + API level. Self-Hosted: license key unlocks plan. |
| 161 | **Billing: Stripe integration** | 160 | Stripe Checkout for new subscriptions; Customer Portal for plan changes, invoices, payment methods; Webhook handlers: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`; org plan state synced from Stripe to DB; SaaS-only — self-hosted uses license keys |
| 162 | **Billing: Usage metering & enforcement** | 160 | `Usage` table: monthly counters per org (scans, findings, AI tokens, storage GB); metering middleware increments on each action; `/v1/usage` API with current period totals + limits; soft wall at 80% (warning), hard wall at 100% (upgrade CTA); org settings dashboard shows usage; Self-Hosted: local counters, warn in logs |
| 163 | **Billing: License key system (Self-Hosted)** | 160 | Signed JWT license key: includes plan, expiry, max users, features, orgId; validated on app boot + periodic re-check (24h); offline grace period (7 days without re-validation); feature flags derived from license claims; no phone-home — key validated locally with embedded public key; `/v1/license` API for renewal/upgrade; key rotation without downtime |
| 164 | **Billing: Deployment-model billing differences** | 160, 143 | **SaaS:** Stripe recurring — per-seat + per-scan overage; billing in Astra Cloud. **Self-Hosted:** License key — annual/perpetual; offline validation; no Stripe. **Hybrid:** Stripe for Control Plane (seat licenses) + license key for Data Plane (scanner entitlements); separate billing surfaces. `BillingService` resolved per `deploymentModel` |
| 165 | **Billing: Invoice & reporting** | 161 | Invoice generation (PDF); org-level billing history; payment failure handling (grace period → suspension); tax calculation per jurisdiction; cost center allocation for multi-tenant orgs

### Backlog (no phase yet)

| # | Task | Notes |
|---|------|-------|
| 15 | Wire Scan.configJson to UI — per-scan override exists in schema |
| 18 | Provider factory uses user creds instead of env vars |
| 19 | Remove/hide 3 stub providers (bedrock, azure, langgraph) |
| 20 | Fix Cloud Ollama URL mismatch |
| 21 | Fix provider caching hash (include all config fields) |
| 28 | Hidden ConfigEditor fields (instructions, tools, etc.) |
| 30 | Merge ScanChat + AiChatProvider into shared component |
| 31 | Remove/document dead LangGraph code |
| 32 | ConfigEditor input validation (model exists for provider) |
| 66 | Keyboard shortcuts |
| 80 | DB-first context loading for all AI calls |

---

## How to Update This File

When starting a task:
1. Change status to `🟡 IN_PROGRESS`
2. Note the start time

When completing a task:
1. Change status to `🟢 COMPLETED`
2. Calculate elapsed time and update the Time column
3. Move to **Completed** section with date

When blocked:
1. Change status to `🔴 BLOCKED`
2. Note what task is blocking it