# Security Platform

**AI-native application security scanning. v2.24.0**

Combines industry-standard scanner engines (Trivy, Semgrep, Gitleaks, Bearer) with a multi-stage AI pipeline to surface vulnerabilities, business logic flaws, and misconfigurations that pattern-matching alone will never find. Raw source code never leaves your environment.

---

## What it does

```
Clone → Discover → Git Ingest → Git Diagram → Tool Scan → Deep Scan → Cross-File → Aggregate → Persist
```

Each stage runs independently with its own AI model, concurrency, and timeout:

| Stage | What it does |
|-------|-------------|
| **Clone** | Git clone to secure temp dir, maps repo structure and languages |
| **Discover** | AI ranks files by security relevance before scanning begins |
| **Git Ingest** | Extracts commit history, contributors, hotspots, languages, dependencies; builds AST-derived code intelligence |
| **Git Diagram** | Generates Mermaid architecture diagram from codegraph |
| **Tool Scan** | Runs Trivy (SCA/IaC/Secrets) and Gitleaks (Secrets); normalizes and AI-enriches findings |
| **Deep Scan** | Per-file parallel AI analysis — SAST, secrets, data flow, exploit scoring (p-limit concurrency) |
| **Cross-File** | Business logic inference across module boundaries |
| **Aggregate** | SHA-256 deduplication and fingerprinting across all scanner sources |
| **Persist** | Creates triage tasks, stores business rules, updates scan metadata |

---

## Scanner integrations

| Scanner | Category | Coverage |
|---------|----------|----------|
| **Trivy** | SCA · IaC · Secrets | CVEs, Dockerfile misconfigs, exposed secrets |
| **Gitleaks** | Secrets | API keys, tokens, credentials across git history |
| **AI Deep Scan** | SAST · Logic | Context-aware per-file vulnerability analysis (parallel, p-limit) |
| **AI Cross-File** | Business Logic | Cross-module security invariant detection |
| **AI Tool Enrichment** | All | Trivy/Gitleaks findings enriched with AI explanations, fixes, exploit scores |
| **@optave/codegraph** | Code Intel | AST-derived exports, imports, call chains, dead exports, API routes |
| **Semgrep** | SAST | OWASP Top 10, injection flaws (installed, not yet wired) |
| **Bearer** | Data Flow | PII/PHI leaking (installed, not yet wired) |

---

## AI providers

Configure each pipeline stage with its own backend:

- **Cloud Ollama** — `api.ohmyllama.com`
- **Hosted Ollama** — self-hosted instance
- **OpenAI** — GPT-4o, o3, o4-mini
- **Anthropic** — Claude 4 Opus / Sonnet
- **AWS Bedrock** — configured, stub
- **Azure AI Foundry** — configured, stub
- **LangGraph** — graph-based workflows

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 App Router |
| UI | IBM Carbon Design System — IBM Plex Sans, 0px radius, IBM Blue |
| Database | PostgreSQL via Prisma 7 (PrismaPg adapter) |
| Auth | NextAuth v5 — email/password, JWT sessions, RBAC |
| AI | 7 provider backends — common `AIProvider` interface |
| Scanner runtime | Trivy, Semgrep, Gitleaks, Bearer as child processes |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env.local
# Required: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL
# Optional: OPENAI_API_KEY, ANTHROPIC_API_KEY, OLLAMA_HOST, OLLAMA_API_KEY

# 3. Database setup
npx prisma migrate deploy
npx prisma db seed

# 4. Start development server
npm run dev

# 5. Start production server
npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000) — sign in to begin.

Default seeded credentials:
- **admin@astra.dev** / admin123 (ADMIN role)
- **analyst@astra.dev** / analyst123 (ANALYST role)
- **viewer@astra.dev** / viewer123 (VIEWER role)

---

## Deployment

```bash
# Build and start on port 2306
npm run build
npm start -- -p 2306

# Or with custom domain (ensure NEXTAUTH_URL is set)
NEXTAUTH_URL=https://astra.example.com npm start -- -p 2306
```

**Production notes:**
- `auth.ts` uses `trustHost: true` — required for reverse-proxy / custom domain deployments
- `DATABASE_URL` must include `?schema=astra01` for production (or `?schema=public` for local dev)
- PrismaPg requires schema as second argument: `new PrismaPg(config, { schema })`
- Seed script reads `DATABASE_URL` via `dotenv/config` — works with `npx prisma db seed`

---

## Features

- **9-node scan pipeline** — clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
- **Parallel deep-scan** — p-limit concurrency replaces sequential batches; all files run concurrently
- **Incremental persist** — findings appear in DB as each file completes, not just at the end
- **AI-enriched tool findings** — Trivy/Gitleaks findings get AI explanations, fixes, exploit scores before storage
- **Code intelligence** — AST-derived CodeIntel via @optave/codegraph (imports, exports, call chains, dead exports)
- **Alert triage** — unified status workflow (OPEN → IN_PROGRESS → IN_REVIEW → COMPLETED / FALSE_POSITIVE / ACCEPTED_RISK), assignment, comments, history
- **Task management** — auto-generated tasks from HIGH/CRITICAL findings, bidirectional Finding ↔ Task sync, AI assist
- **AI chat** — context-aware chat at global, scan, and per-finding level; multi-turn memory; model selector; markdown rendering
- **Observability** — every AI call logged with tokens, latency, full prompt/response, per-call retry from UI
- **Knowledge page** — unified changelog, roadmap, docs, specs, plans, how-to with file browser and markdown rendering
- **GitHub integration** — connect via PAT, browse repos and branches directly in UI; tokens encrypted at rest
- **Export** — JSON, CSV, SARIF, HTML, Markdown; executive summary report page
- **Custom rules** — organization-specific rules blended with AI inference
- **Visual pipeline editor** — configure each stage's provider, model, temperature, concurrency, timeout
- **Browser data store** — localStorage TTL cache for shared data; stale-while-revalidate across navigation
- **Glossary** — interactive file tree with directory descriptions, exports, DB tables, API call docs

---

## Security model

- **RBAC** — ADMIN / ANALYST / VIEWER enforced on every API route
- **Data sovereignty** — raw source code never transmitted; only normalized finding JSON stored
- **Encryption** — GitHub tokens encrypted at rest with AES-256-GCM
- **Scan ownership** — non-admin users see only their own scans and findings (scoped by userId)
- **Audit trail** — every status change, assignment, and comment logged with actor and timestamp
- **Rate limiting** — 10/min login, 5/min signup (IP-based sliding window)
- **Auth middleware** — all routes require authentication except `/`, `/auth/*`, `/api/auth/*`, `/api/v1/health`

---

## Project structure

```
astra-app/
├── src/
│   ├── app/
│   │   ├── (app)/              # Authenticated app pages (scans, tasks, settings, etc.)
│   │   ├── api/v1/             # REST API routes
│   │   │   ├── scans/          # Scan CRUD, chat, export, logs, nodes, progress, stream
│   │   │   ├── findings/       # Finding CRUD, chat, comments, history, rescan, task
│   │   │   ├── tasks/          # Task CRUD, comments, history, rescan, AI suggest, batch
│   │   │   ├── chat/            # Global AI chat + config endpoint
│   │   │   ├── config/         # DB-backed config GET/PUT
│   │   │   ├── providers/      # Provider registry + test connection
│   │   │   ├── ai-calls/       # AI call observability + stats + retry
│   │   │   ├── auth/           # NextAuth routes (signin, signup, verify, me)
│   │   │   ├── preferences/    # User preferences (theme, etc.)
│   │   │   ├── presets/        # Named config presets
│   │   │   ├── prompts/        # System prompt management
│   │   │   ├── rules/          # Security rules CRUD
│   │   │   ├── user-rules/     # User-scoped rules
│   │   │   ├── users/          # User management
│   │   │   └── health/        # Health check
│   │   ├── auth/               # Sign-in and sign-up pages
│   │   ├── page.tsx            # Public landing page (IBM Carbon Design System)
│   │   └── globals.css         # Global styles + IBM Carbon tokens
│   ├── components/
│   │   ├── AppDataProvider.tsx # Shared data context (users, prefs, chatConfig, currentUser)
│   │   ├── AppShell.tsx        # Authenticated layout shell
│   │   ├── AiChatProvider.tsx  # Global slide-out chat panel
│   │   ├── ScanChat.tsx        # Inline scan detail chat widget
│   │   ├── ThemeProvider.tsx   # Dark/light theme toggle with localStorage persistence
│   │   ├── TaskDataTable.tsx   # Task listing with filters, sort, pagination
│   │   ├── AlertDetail.tsx    # Finding detail with AI chat, history, comments, rescan
│   │   └── ...                 # Other shared components
│   ├── lib/
│   │   ├── auth.ts             # NextAuth v5 config (Credentials, JWT, RBAC callbacks, trustHost)
│   │   ├── db.ts               # Prisma client singleton with schema-aware PrismaPg
│   │   ├── config.ts           # Zod config schema + loadConfigFromDb/saveConfigToDb
│   │   ├── ai-chat.ts          # Chat orchestration (provider resolution, system prompts)
│   │   ├── ai-instrumentation.ts # AI call observability (instrumentedSend)
│   │   ├── rbac.ts             # Auth helpers (requireAuth, canWrite, canAdmin, requireScanOwnership)
│   │   ├── pagination.ts       # Shared parsePagination for API routes
│   │   ├── rate-limit.ts       # In-memory rate limiter
│   │   ├── encryption.ts      # AES-256-GCM encrypt/decrypt for sensitive data
│   │   ├── browser-store.ts    # localStorage TTL cache (bsGet/bsSet/bsDel/bsClear)
│   │   └── changelog.ts        # Versioned changelog entries for /changelog page
│   ├── providers/
│   │   ├── base.ts             # AIProvider interface + StreamChunk types
│   │   ├── cloud-ollama.ts     # Cloud Ollama provider (api.ohmyllama.com)
│   │   ├── hosted-ollama.ts    # Self-hosted Ollama provider
│   │   ├── openai.ts           # OpenAI provider (GPT-4o, o3, o4-mini)
│   │   ├── anthropic.ts        # Anthropic provider (Claude 4 Opus/Sonnet)
│   │   ├── bedrock.ts          # AWS Bedrock (stub)
│   │   ├── azure-ai-foundry.ts # Azure AI Foundry (stub)
│   │   ├── langgraph.ts        # LangGraph (stub)
│   │   └── factory.ts          # Provider factory (createProvider)
│   ├── scan/
│   │   ├── worker.ts           # Background job worker (event-driven)
│   │   ├── queue.ts            # Job queue management (claimNextJob, markJobFailed, etc.)
│   │   └── nodes/              # Pipeline node implementations
│   │       ├── clone.ts        # Git clone with PAT injection for private repos
│   │       ├── discover.ts     # AI-guided file prioritization
│   │       ├── git-ingest.ts   # Repo metadata + codegraph AST intelligence
│   │       ├── git-diagram.ts  # Mermaid architecture diagram generation
│   │       ├── tool-scan.ts    # Trivy + Gitleaks runner, normalizer, AI enrichment
│   │       ├── deep-scan.ts    # Per-file parallel AI analysis (p-limit concurrency)
│   │       ├── cross-file.ts   # Cross-file business logic inference
│   │       ├── aggregate.ts    # SHA-256 deduplication and fingerprinting
│   │       ├── persist.ts      # Create tasks, business rules, update scan metadata
│   │       └── parse-ai-json.ts # Shared AI JSON sanitizer
│   ├── findings/
│   │   ├── normalize.ts        # Shared severity/category normalization
│   │   └── persist.ts           # Shared upsertFinding for incremental DB writes
├── prisma/
│   ├── schema.prisma          # PostgreSQL schema (Scan, Finding, Job, AiConversation, Config, etc.)
│   └── seed.ts                # Idempotent seed: 3 users, config, presets, rules
├── prisma.config.ts            # Prisma 7 config (schema path, migrations, seed command)
└── middleware.ts               # Auth middleware (public routes: /, /auth/*, /api/auth/*, /api/v1/health)
```

---

## API routes

All routes require authentication unless noted. RBAC enforced: ADMIN gets full access, ANALYST can write, VIEWER is read-only.

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/v1/scans` | Create new scan (repo URL, branch, config overrides) |
| `GET` | `/api/v1/scans` | List scans (with status filter, pagination) |
| `GET` | `/api/v1/scans/:id` | Get scan detail |
| `GET` | `/api/v1/scans/:id/logs` | Get scan logs |
| `GET` | `/api/v1/scans/:id/nodes` | Get pipeline node statuses |
| `GET` | `/api/v1/scans/:id/progress` | SSE stream for scan progress |
| `POST` | `/api/v1/scans/:id/cancel` | Cancel running scan |
| `POST` | `/api/v1/scans/:id/resume` | Resume failed scan |
| `POST` | `/api/v1/scans/:id/rerun-node` | Re-run a specific pipeline node |
| `POST` | `/api/v1/scans/:id/chat` | Send message to scan-level AI chat |
| `GET` | `/api/v1/scans/:id/export` | Export findings (json/csv/sarif/html/md) |
| `GET` | `/api/v1/findings` | List findings (with filters, pagination) |
| `GET` | `/api/v1/findings/:id` | Get finding detail |
| `PATCH` | `/api/v1/findings/:id` | Update finding (status, assignee, etc.) |
| `GET` | `/api/v1/findings/:id/chat` | Send message to finding-level AI chat |
| `POST` | `/api/v1/findings/:id/rescan` | Rescan single file |
| `POST` | `/api/v1/findings/:id/task` | Create task from finding |
| `GET` | `/api/v1/findings/:id/comments` | Get finding comments |
| `POST` | `/api/v1/findings/:id/comments` | Add comment to finding |
| `GET` | `/api/v1/findings/:id/history` | Get finding status history |
| `GET` | `/api/v1/tasks` | List tasks (with filters, pagination) |
| `GET` | `/api/v1/tasks/:id` | Get task detail |
| `PATCH` | `/api/v1/tasks/:id` | Update task |
| `POST` | `/api/v1/tasks/:id/comments` | Add comment to task |
| `GET` | `/api/v1/tasks/:id/history` | Get task history |
| `POST` | `/api/v1/tasks/:id/rescan` | Rescan file linked to task |
| `POST` | `/api/v1/tasks/batch` | Batch update tasks |
| `POST` | `/api/v1/tasks/ai-suggest` | AI suggestion for task |
| `POST` | `/api/v1/chat` | Send message to global AI chat |
| `GET` | `/api/v1/chat/config` | Get chat config (current provider, available models) |
| `GET` | `/api/v1/config` | Get system config |
| `PUT` | `/api/v1/config` | Update system config (ADMIN only) |
| `GET` | `/api/v1/providers` | List provider definitions |
| `POST` | `/api/v1/providers/test` | Test provider connection |
| `GET` | `/api/v1/ai-calls` | List AI call logs (with filters, pagination) |
| `GET` | `/api/v1/ai-calls/stats` | AI call statistics |
| `GET` | `/api/v1/ai-calls/:id` | Get AI call detail |
| `POST` | `/api/v1/ai-calls/:id/retry` | Retry failed AI call |
| `POST` | `/api/v1/auth/signup` | Create account |
| `POST` | `/api/v1/auth/verify` | Verify credentials |
| `GET` | `/api/v1/auth/me` | Get current user |
| `GET` | `/api/v1/preferences` | Get user preferences |
| `POST` | `/api/v1/preferences` | Set user preference |
| `GET` | `/api/v1/presets` | List config presets |
| `POST` | `/api/v1/presets` | Create preset |
| `GET` | `/api/v1/prompts` | List system prompts |
| `PUT` | `/api/v1/prompts` | Update system prompt |
| `GET` | `/api/v1/rules` | List security rules |
| `POST` | `/api/v1/rules` | Create security rule |
| `PATCH` | `/api/v1/rules/:id` | Update security rule |
| `GET` | `/api/v1/user-rules` | List user-scoped rules |
| `POST` | `/api/v1/user-rules` | Create user-scoped rule |
| `DELETE` | `/api/v1/user-rules/:id` | Delete user-scoped rule (ADMIN only) |
| `GET` | `/api/v1/users` | List users (ADMIN only) |
| `GET` | `/api/v1/users/:id` | Get user detail (ADMIN only) |
| `GET` | `/api/v1/health` | Health check (public, no auth) |
| `GET` | `/api/v1/github/repos` | List linked GitHub repos |
| `GET` | `/api/v1/github/branches` | List repo branches |
| `POST` | `/api/v1/github/link` | Link GitHub PAT |
| `DELETE` | `/api/v1/github/unlink` | Unlink GitHub PAT |

---

## Database schema (PostgreSQL via Prisma)

Key models:

| Model | Purpose |
|-------|---------|
| `Scan` | Repo URL, branch, commit SHA, status, config JSON, userId |
| `Finding` | Fingerprint, scanner, ruleId, title, severity, category, file, line range, code snippet, CWE, OWASP, AI explanation/fix |
| `Job` | Pipeline node jobs (clone, discover, deep_scan, cross_file, aggregate, persist) with status/attempts/error |
| `AiConversation` | Chat messages (user/assistant) with scan/finding/user context |
| `AiCallLog` | Observability: every AI call logged with provider, model, tokens, latency, status, request/response |
| `Config` | DB-backed key-value config (`key` → JSON `value`) |
| `Preset` | Named config presets (builtin + custom) |
| `ProviderModel` | Per-provider model registry with token limits, context window, thinking support |
| `Task` | Remediation tasks linked to findings, with priority, status, assignee |
| `User` | Auth users with role (ADMIN/ANALYST/VIEWER) |
| `GithubProfile` | Linked GitHub accounts with encrypted access tokens |
| `ApiKey` | API key authentication |
| `UserRule` | Per-scan custom security rules |

---

## Changelog

See [/knowledge](/knowledge) in the app (Changelog tab), or [`src/lib/changelog.ts`](src/lib/changelog.ts).

Current: **v2.24.0** — Parallel deep-scan, incremental persist, AI-enriched tool findings (May 2026)

Key versions:
- **v2.24.0** — Parallel deep-scan (p-limit), incremental persist per-file, AI-enriched tool findings, structured logging, user-scoped scan listing
- **v2.23.2** — Fix AI JSON parse crash, markdown rendering in chat
- **v2.23.1** — Fix deep-scan crash on undefined file path, architecture diagram visibility
- **v2.23.0** — DeepWiki-style code intelligence via @optave/codegraph
- **v2.22.0** — Full pipeline visibility (9 nodes), AI context enrichment
- **v2.21.0** — Pipeline expansion: git_ingest, git_diagram, tool_scan nodes
- **v2.20.0** — Bidirectional field sync between Tasks & Alerts
- **v2.19.0** — Unified Tasks & Alerts (ItemStatus, severity, rich scanner fields)
- **v2.17.0** — Branding refactor (env-driven product identity)
- **v2.5.0** — Security hardening, event-driven worker, rate limiting
- **v2.0.0** — Platform redesign (IBM Carbon, auth, alert triage, landing page)
- **v1.0.0** — Initial release

---

## Internal reference

| Document | Description |
|----------|-------------|
| [Architecture reference](../context/architecture.html) | Full BRD/PRD/TRD, diagrams, changelog, glossary |
| [Design spec](../docs/superpowers/specs/2026-04-29-astra-security-platform-design.md) | Full system design |
| [Streaming chat spec](../docs/superpowers/specs/2026-05-07-streaming-chat-design.md) | SSE streaming design (approved, pending impl) |
| [Project knowledge base](../CLAUDE.md) | Complete project documentation |
| [Graphify knowledge graph](../graphify-out/) | AST-based code knowledge graph |