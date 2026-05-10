# Platform — Task Tracker

**Created:** 2026-05-07
**Updated:** 2026-05-08 (session 2)

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