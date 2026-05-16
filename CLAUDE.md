# Platform — Project Knowledge Base

## Branding Convention

**"Astra" is a working title.** All product identity is configurable via environment variables through `src/lib/branding.ts`. When writing code, NEVER hardcode "Astra" or any brand string — always import from `branding.ts`.

| Env Var | Constant | Default | Used In |
|---|---|---|---|
| `NEXT_PUBLIC_APP_NAME` | `APP_NAME` | `'Astra'` | Nav, footer, auth pages, reports |
| `NEXT_PUBLIC_APP_TITLE` | `APP_TITLE` | `'Astra Security Platform'` | Page title, SARIF metadata, report headers |
| `NEXT_PUBLIC_APP_ID` | `APP_ID` | `'astra'` | Derived prefixes (localStorage, logs, downloads) |
| `NEXT_PUBLIC_APP_DOMAIN` | `APP_DOMAIN` | `'astra.dev'` | Seed user emails |
| `NEXT_PUBLIC_SARIF_INFO_URI` | `SARIF_INFO_URI` | `'https://github.com/astra'` | SARIF driver infoUri |
| `DEFAULT_SYSTEM_PROMPT` | `DEFAULT_SYSTEM_PROMPT` | `'You are Astra…'` | AI chat fallback prompt (server-only) |

Derived constants (no env var, computed from `APP_ID`/`APP_TITLE`): `STORAGE_PREFIX`, `LOG_FILE`, `LOG_SERVICE`, `TEMP_DIR_PREFIX`, `DOWNLOAD_PREFIX`, `SARIF_TOOL_NAME`.

Internal constants (no env var, hardcoded): `SCAN_CONFIG_FILENAME`, `SCAN_CONFIG_DB_KEY`, `RULE_FILE_EXT`.

Key renames from the branding refactor: `AstraConfig` → `ScanConfig`, `astra.config.json` → `scan.config.json`, `parseAstraRule` → `parseScanRule`, `.astra` → `.rule`, `"astra.config"` → `SCAN_CONFIG_DB_KEY`.

## Overview

The platform is a closed-source, enterprise-grade application security scanning platform. It combines SAST, SCA, secret scanning, IaC scanning, and AI-augmented business logic flaw detection into a single workflow. The system is split into a **Control Plane** (stateful, Node.js/Next.js) and a **Data Plane** (stateless Python Docker container). Raw source code never leaves the customer environment — only normalized finding JSON crosses the boundary.

**Current state:** Proof-of-concept. All core components are functional: scanner engine, normalizer, AI enrichment, dashboard, API routes, Docker compose. End-to-end scan works with Trivy, Semgrep, Gitleaks, and Bearer. AI enrichment works with Ollama (local or cloud API). Chat UI with multi-provider AI support is live. Config is now DB-backed (PostgreSQL via Prisma). Streaming chat design spec is approved but not yet implemented.

## Context & Reference Files

| Path | Purpose |
|------|---------|
| `context/architecture.html` | Complete project reference: BRD/PRD/TRD, diagrams, changelog, glossary (served at localhost:8080) |
| `context/superpowers-reference.md` | Superpowers 5.1.0 skills reference — all 14 skills with rules, invocation triggers, workflow |
| `spec/2026-05-10-unified-platform-spec.html` | Unified platform spec v5.0 — 16 sections with Mermaid DFDs, scan pipeline graph, taxonomy, competitive, roadmap, financial projections |
| `KNOWLEDGE/new knowledge/astra-pipeline-reference.md` | **Enterprise scan pipeline v4.0** — 24-node DAG, phase-by-phase reference, node summary table, storage architecture, design decisions |
| `KNOWLEDGE/new knowledge/astra-core-spec.html` | Core platform spec |
| `KNOWLEDGE/new knowledge/astra-dfds.md` | Data flow diagrams |
| `KNOWLEDGE/new knowledge/astra-competitive-analysis.html` | Competitive analysis |
| `KNOWLEDGE/new knowledge/code-review-taxonomy.html` | Code review taxonomy |
| `KNOWLEDGE/new knowledge/scan-graph.html` | Scan graph visualization |
| `KNOWLEDGE/new knowledge/platform-spec-v4.html` | Platform spec v4 |
| `KNOWLEDGE/new knowledge/unified-spec-glm.html` | Unified spec (GLM version) |

## Architecture

### Control Plane (Node.js / Next.js) — `astra-app/`
- **Framework:** Next.js 15 App Router with Server Components
- **UI:** IBM Carbon Design System (@carbon/react), IBM Plex Sans weight 300/400/600
- **Database:** PostgreSQL via Prisma (migrated from SQLite)
- **API Routes:** `/api/v1/scans`, `/api/v1/findings`, `/api/v1/chat`, `/api/v1/config`, `/api/v1/providers`
- **Key files:**
  - `astra-app/src/app/page.tsx` — Main dashboard
  - `astra-app/src/scan/worker.ts` — Background job worker (clone → discover → gitIngest → gitDiagram → toolScan → deepScan → crossFile → aggregate → persist)
  - `astra-app/src/scan/queue.ts` — Job queue management
  - `astra-app/src/lib/ai-chat.ts` — Chat orchestration (multi-provider)
  - `astra-app/src/lib/config.ts` — Config schema + DB loader (`loadConfigFromDb`, `saveConfigToDb`)
  - `astra-app/src/lib/db.ts` — Prisma client singleton
  - `astra-app/src/providers/*.ts` — 7 AI providers: cloud-ollama, hosted-ollama, openai, anthropic, bedrock, azure-ai-foundry, langgraph
  - `astra-app/src/components/AiChatProvider.tsx` — Global slide-out chat panel
  - `astra-app/src/components/ScanChat.tsx` — Inline scan chat widget

### Data Plane (Python / Scanner Binaries) — `astra-poc/`
- **Scanner engine:** `astra-poc/lib/scanners.ts` — runs Trivy, Semgrep, Gitleaks, Bearer as subprocesses
- **Normalizer:** `astra-poc/lib/normalize.ts` — maps raw findings to UnifiedFinding schema with SHA-256 fingerprinting
- **AI integration:** `astra-poc/lib/ai.ts` — Ollama client for finding enrichment and business logic inference
- **Database:** `astra-poc/lib/db.ts` — SQLite schema with scans, findings, biz_logic_rules tables

### Frontend Components (IBM Carbon)
- `components/RepoInput.tsx` — URL input + Scan button
- `components/FindingsTable.tsx` — Carbon DataTable with modal detail view
- `components/ScannerBreakdown.tsx` — Per-scanner finding count tiles
- `components/BusinessLogicPanel.tsx` — Carbon Accordion for inferred rules
- `components/SeverityBadge.tsx` — Carbon Tag with severity color mapping
- `components/MermaidDiagram.tsx` — Client-side Mermaid renderer (dynamic import)

## Unified Finding Schema

```typescript
interface UnifiedFinding {
  id: number;
  fingerprint: string;        // SHA-256 of (scanner + ruleId + file + line)
  scanner: string;            // 'trivy' | 'semgrep' | 'gitleaks' | 'bearer' | 'ai-layer-1'
  ruleId: string;             // scanner-specific rule identifier
  title: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: 'SAST' | 'SCA' | 'SECRETS' | 'IAC' | 'DATA_FLOW' | 'BUSINESS_LOGIC' | 'CLOUD_MISCONFIG' | 'COMPLIANCE' | 'VULNERABILITY' | 'RUNTIME' | 'LICENSE';
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];              // e.g., ['CWE-89']
  owasp: string[];            // e.g., ['A03:2021']
  aiExplanation: string | null;
  aiFix: string | null;
  exploitScore: number | null; // 0-10
  remediation: string;
  raw: string;                // JSON string of original scanner output
  createdAt: string;
}

interface BusinessLogicRule {
  id: number;
  ruleText: string;            // Natural language rule description
  confidence: number;         // 0.0-1.0
  evidenceFiles: string[];    // Files that support this rule
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
  createdAt: string;
}
```

## Database Schema (PostgreSQL via Prisma)

Key models:
- `Scan` — repo URL, branch, commit SHA, status (`PENDING` | `RUNNING` | `COMPLETED` | `FAILED`), config JSON
- `Finding` — fingerprint, scanner, ruleId, title, severity, category, file, line range, code snippet, CWE, OWASP, AI explanation/fix
- `Job` — pipeline node jobs (clone, discover, git_ingest, git_diagram, tool_scan, deep_scan, cross_file, aggregate, persist) with status/attempts/error
- `AiConversation` — chat messages (user/assistant) with scan/finding/user context
- `AiCallLog` — observability: every AI call logged with provider, model, tokens, latency, status, request/response
- `Config` — DB-backed key-value config (`key` → JSON `value`). Uses `scan.config` key (see `SCAN_CONFIG_DB_KEY` in branding.ts)
- `Preset` — named config presets (builtin + custom)
- `ProviderModel` — per-provider model registry with token limits, context window, thinking support
- `User`, `Org`, `ApiKey` — RBAC/auth scaffolding

SQLite schema in `astra-poc/lib/db.ts` is still used for the Python Data Plane PoC.

## Scanner Implementations

### Trivy
- Command: `trivy fs --scanners vuln,misconfig,secret --format json -o /tmp/trivy.json <repoDir>`
- Timeout: 120s
- Parses: Vulnerabilities, Misconfigurations, Secrets
- Maps to categories: SCA (vulns), IAC (misconfigs), SECRETS (secrets)

### Semgrep
- Command: `semgrep --config=auto --json -o /tmp/semgrep.json <repoDir>`
- Timeout: 120s
- Parses: results array with check_id, path, start.line, extra.severity/message
- Maps to category: SAST

### Gitleaks
- Command: `gitleaks detect --source <repoDir> --report-format json --report-path /tmp/gitleaks.json -v`
- Timeout: 60s
- Note: exits with code 1 when findings found — treated as success
- Parses: RuleID, Description, File, StartLine
- Maps to category: SECRETS, severity always HIGH

### Bearer
- Command: `bearer scan <repoDir> --format json --output /tmp/bearer.json`
- Timeout: 120s
- Parses: data array with rule_id, title, severity, file, line_number
- Maps to category: DATA_FLOW

### Checkov (installed, not yet wired)
- Category: IaC (Terraform, Helm, K8s, CloudFormation)
- Installed in Dockerfile but not called from `runAllScanners()`

### Bandit (installed, not yet wired)
- Category: SAST (Python-specific)
- Installed in Dockerfile but not called from `runAllScanners()`

## AI Integration

### Provider Registry (`astra-app/src/providers/`)
7 providers implement `AIProvider` interface: `send()`, `sendStream()` (streaming — design spec approved, not yet implemented), `testConnection()`, `estimateTokens()`.

| Provider | File | SDK |
|---|---|---|
| cloud-ollama | `cloud-ollama.ts` | `ollama` npm package → `https://api.ohmyllama.com` |
| hosted-ollama | `hosted-ollama.ts` | `ollama` npm package → local `OLLAMA_HOST` |
| openai | `openai.ts` | `openai` npm package |
| anthropic | `anthropic.ts` | `@anthropic-ai/sdk` |
| bedrock | `bedrock.ts` | Stub — calls AWS SDK |
| azure-ai-foundry | `azure-ai-foundry.ts` | Stub — calls Azure SDK |
| langgraph | `langgraph.ts` | Stub — calls LangGraph API |

### Chat System
- `sendChatMessage()` in `lib/ai-chat.ts` — non-streaming, resolves provider from config, builds system prompt with finding context
- `streamChatMessage()` — **design spec approved** (2026-05-07), implements SSE streaming via `sendStream()` + `instrumentedSendStream()`
- 3 chat contexts: global (`/api/v1/chat`), scan-level (`/api/v1/scans/[id]/chat`), finding-level (`/api/v1/findings/[id]/chat`)
- `AiChatProvider.tsx` — global slide-out chat panel
- `ScanChat.tsx` — inline scan detail chat

### Pipeline AI Nodes
- **discover** — AI-guided file discovery
- **deepScan** — per-file vulnerability analysis (parallel, batched)
- **crossFile** — cross-file business logic inference
- Each node has per-node provider/model/temperature/concurrency overrides in config

### Important: DO NOT pull models locally
The user explicitly requested using cloud models via API key, NOT pulling models locally.

## Two-Layer AI Architecture

### Layer 1: Per-File Deep Scan
- Each source file sent individually to AI for vulnerability analysis
- Returns findings[] + file_summary per file
- Parallel via batching

### Layer 2: Cross-File Business Logic
- Aggregated file summaries form a codebase map
- AI identifies cross-file issues: missing auth middleware, privilege escalation, broken access control, data flow violations
- Returns biz_logic_findings[]
- Serial after Layer 1, confidence-scored, CANDIDATE until human confirmed

## Docker Configuration

### Dockerfile (`astra-poc/Dockerfile`)
- Multi-stage build based on `node:22-slim`
- Installs: git, python3, python3-pip, curl, ca-certificates
- Scanner binaries: Trivy, Semgrep, Bearer, Gitleaks, Checkov, Bandit
- Builds Next.js app with `npm run build`
- Exposes port 3000
- Environment: `OLLAMA_HOST=http://ollama:11434`

### docker-compose.yml
- **ollama** service: `ollama/ollama:latest`, port 11435→11434, persistent volume
- **app** service: built from Dockerfile, port 3000, depends on ollama, passes OLLAMA_HOST and OLLAMA_API_KEY

## Deployment Models

| Aspect | SaaS | Self-Hosted | Hybrid |
|---|---|---|---|
| Control Plane | Astra Cloud | Customer K8s | Astra Cloud |
| Data Plane | Customer CI/CD | Customer K8s | Customer infra |
| Database | Astra-managed (RDS) | Customer-managed | Astra-managed |
| Data sovereignty | Findings only leave | Full control | Findings only leave |
| Air-gapped | No | Yes | No |
| Onboarding time | Minutes | Hours | Hours |
| Maintenance | Astra handles all | Customer handles all | Astra handles CP only |
| Cost model | Per-seat / per-scan | License + support | Per-seat + infra |

## Security Requirements

| Requirement | Implementation |
|---|---|
| Encryption at rest | PostgreSQL AES-256, S3 SSE-S3 |
| Encryption in transit | TLS 1.3 for all connections |
| Auth methods | SAML 2.0, OpenID Connect, API Keys, Short-lived JWT scan tokens |
| RBAC roles | Admin / SecOps / Engineer / Viewer |
| Multi-tenancy | PostgreSQL row-level security per org |
| Audit logging | Structured JSON (timestamp, actor, action, resource, before/after, IP, user_agent) |
| Data retention | Hot: 30 days (PostgreSQL) → Cold: 7 years (S3 Glacier) |
| Source code protection | Data Plane isolation — raw code never transmitted |

## SLA Enforcement

| Severity | SLA |
|---|---|
| CRITICAL | 4 hours |
| HIGH | 24 hours |
| MEDIUM | 72 hours |
| LOW | 7 days |

## Control Plane Modules (Designed, Not Yet Implemented)

| Module | API Prefix | Responsibility |
|---|---|---|
| Auth | /v1/auth/* | SSO/SAML/OIDC login, API key exchange, RBAC enforcement |
| Findings | /v1/findings/* | Ingest, deduplicate, fingerprint, trend analysis |
| Scans | /v1/scans/* | Trigger scans, list history, real-time status |
| Policies | /v1/policies/* | Rule routing, SLA assignment, thresholds, allowlists |
| AI Orchestration | /v1/biz-logic/* | Business logic rule store, human confirmation, model config |
| Integrations | /v1/integrations/* | Jira, Slack, PagerDuty, webhook dispatch |
| Dashboard | /v1/dashboard/* | REST + WebSocket, real-time push |

## Scan Pipeline Modules

Each module is an independent pipeline with its own DAG, Data Plane image, feature gate, and API routes. Modules are enabled/disabled via `NEXT_PUBLIC_FEATURES` env var + org plan + project config.

### Code Scan (existing)
- **Feature gate:** `code_scan`
- **DAG:** clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
- **Data Plane:** `astra-code-scan` (Trivy, Semgrep, Gitleaks, Bearer, Checkov, Bandit)
- **Categories:** SAST, SCA, SECRETS, IAC, DATA_FLOW, BUSINESS_LOGIC

### Cloud Scan
- **Feature gate:** `cloud_scan`
- **DAG:** auth → discover → connect → scan → normalize → compliance_map → enrich → persist
- **Data Plane:** `astra-cloud-scan` (Prowler AWS/Azure/GCP, ScoutSuite AWS/Azure/GCP, kube-bench)
- **API prefix:** `/v1/cloud-scans`, `/v1/cloud-accounts`
- **Categories:** CLOUD_MISCONFIG, COMPLIANCE
- **Auth:** API key / access token per cloud account (AWS Access Key, Azure SPN, GCP Service Account)

### Compliance
- **Feature gate:** `compliance`
- **DAG:** ingest → map → score → report → persist
- **Data Plane:** Control Plane only (reads existing findings)
- **API prefix:** `/v1/compliance`
- **Frameworks:** CIS, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP (43 frameworks via Prowler)
- **Depends on:** cloud_scan OR iac_scan OR code_scan (needs findings from at least one scan source)

### PCI DSS / ASV
- **Feature gate:** `pci_dss`
- **DAG:** internal_scan → asv_import → merge → attest → persist
- **Data Plane:** `astra-pci-dss` (Prowler PCI profile, OpenSCAP)
- **API prefix:** `/v1/pci-dss`
- **ASV integrations:** Qualys, Rapid7, Tenable (import external ASV reports)
- **Depends on:** compliance module

### Network Scan
- **Feature gate:** `network_scan`
- **DAG:** target_discover → port_scan → vuln_scan → service_detect → normalize → enrich → persist
- **Data Plane:** `astra-network-scan` (Nmap, OpenVAS)
- **API prefix:** `/v1/network-scans`, `/v1/network-targets`
- **Categories:** VULNERABILITY

### SBOM
- **Feature gate:** `sbom`
- **DAG:** discover → inventory → vulnerability → license → enrich → persist
- **Data Plane:** `astra-sbom` (Syft, Grype, Trivy)
- **API prefix:** `/v1/sbom`
- **Categories:** SCA, LICENSE

### Runtime Security
- **Feature gate:** `runtime_scan`
- **DAG:** deploy_agent → collect → detect → correlate → alert → persist
- **Data Plane:** `astra-runtime` (Falco, falcosidekick)
- **API prefix:** `/v1/runtime`
- **Categories:** RUNTIME
- **Note:** Event-driven (continuous stream), not scan-based

### IaC Scan
- **Feature gate:** `iac_scan`
- **DAG:** discover → validate → policy_check → enrich → persist
- **Data Plane:** `astra-code-scan` (shared — Checkov, Trivy IaC)
- **API prefix:** `/v1/iac-scans`
- **Categories:** IAC

### Service Modules (not pipelines)

| Module | Feature Gate | Purpose |
|---|---|---|
| ai-chat | `ai_chat` | Multi-provider AI chat |
| rbac | `rbac` | Role-based access control with composable permissions |
| multitenancy | `multitenancy` | Org/tenant isolation with PostgreSQL RLS |
| payments | `payments` | Stripe (SaaS) + license keys (Self-Hosted) billing |

### Module Dependency Graph
```
code-scan ──────────────────────────────┐
cloud-scan ──────┐                     │
iac-scan ─────────┼──→ compliance ──→ pci-dss
sbom ──────────────────────────────────────┤
network-scan ───────────────────────────┤
runtime-scan ──────────────────────────┤
                                        │
               findings store (UnifiedFinding)
                                        │
                   rbac / multitenancy / payments
                                        │
                                  project model
```

### Plan Tier Gating

| Module | Free | Pro | Enterprise |
|--------|------|-----|------------|
| code-scan | 3 scanners, no AI | All + AI | All + AI + custom rules |
| cloud-scan | — | AWS only | AWS + Azure + GCP |
| compliance | — | CIS only | All 43 frameworks |
| pci-dss | — | — | Full ASV + attestation |
| network-scan | — | — | Full |
| sbom | — | Generate only | Full (license + vuln correlation) |
| runtime-scan | — | — | Full |
| iac-scan | — | Terraform + K8s | All IaC + custom policies |
| ai-chat | — | 100 msg/mo | Unlimited |
| rbac | Viewer only | 3 roles | Custom roles + permissions |
| projects | 1 project | 10 projects | Unlimited |

## Business Rules

- Raw source code must NEVER leave the customer environment
- All findings must be deduplicated before storage (SHA-256 fingerprinting)
- CRITICAL findings must trigger alerts within 5 minutes of ingestion
- SLA timers must start immediately upon finding ingestion
- AI-generated rules must be CANDIDATE status until human confirmed
- Audit events must be retained for minimum 7 years
- Org data isolation must be enforced at database level (row-level security)
- Feature gates: Free (3 scanners, no AI), Pro (all scanners + AI), Enterprise (business logic + compliance)

## Superpowers Skills Workflow

**Skill order:** brainstorming → writing-plans → subagent-driven-development → test-driven-development → requesting-code-review → finishing-a-development-branch

**Key skills for this project:**
- **brainstorming**: Before any new feature or creative work — HARD GATE: no code until design approved
- **writing-plans**: After spec approved — bite-sized tasks, no placeholders, save to `docs/superpowers/plans/`
- **subagent-driven-development**: Execute plans — fresh subagent per task, two-stage review (spec then quality)
- **test-driven-development**: RED-GREEN-REFACTOR — no production code without a failing test first
- **systematic-debugging**: 4-phase process for any bug — no fixes without root cause investigation first
- **verification-before-completion**: No completion claims without fresh verification evidence
- **dispatching-parallel-agents**: For 2+ independent tasks that can run concurrently
- **finishing-a-development-branch**: Verify tests, present options (merge/PR/keep/discard), cleanup

**Full skills reference:** `context/superpowers-reference.md`

## Changelog

| Date | Change |
|------|--------|
| 2026-05-16 | v2.28.0: **Frontpage redesign** — 14-section dark-themed landing page with interactive demo, AI advantage comparison, 8 scan modules, BYO model messaging, competition section, pricing tiers, RBAC/enterprise features; independent visual identity (no IBM Carbon); component-based architecture in `src/components/landing/`; all brand strings from `branding.ts`; deleted v2/page.tsx |
| 2026-05-16 | v2.28.1: **Frontpage Carbon redesign** — All 14 landing page components reworked to IBM Carbon design tokens (--ibm-* vars, ibm-* classes); @carbon/charts added (severity donut, category bars, remediation comparison, false positive rate); Competition section replaced narrative cards with feature comparison table; landingStyles.ts deleted; theme-aware light/dark support |
| 2026-05-16 | v2.27.0: **Password management** — Self-service password change (PATCH /api/v1/auth/me with current+new password, bcrypt verify+hash); admin password reset (PATCH /api/v1/users/[id] accepts password field); Change Password card on Profile page; Reset PW modal on User Management page; Knowledge page unified spec link on Specs tab |
| 2026-05-16 | v2.26.0: **Rule Engine** — Extended UserRule with 4 types (SECURITY/COMPLIANCE/SLA/BUSINESS_LOGIC), project scoping (GLOBAL/PROJECT), language/path filtering, SLA enforcement fields, lifecycle status; unified rule loader (loadRulesForContext) injects into deep-scan, cross-file, chat AI prompts with token budget; persist node sets SLA deadlines; Rules page UI with type badges and SLA config; additive migration safe for production |
| 2026-05-16 | v2.25.0: **Modular scan architecture design** — 8 pipeline modules (code-scan, cloud-scan, compliance, pci-dss, network-scan, sbom, runtime-scan, iac-scan) + 4 service modules (ai-chat, rbac, multitenancy, payments); each module has independent DAG, Data Plane image, feature gate, API routes; new categories (CLOUD_MISCONFIG, COMPLIANCE, VULNERABILITY, RUNTIME, LICENSE); CloudAccount model for AWS/Azure/GCP credentials; compliance framework mapping (43 frameworks); PCI DSS ASV import; SBOM pipeline with license conflict detection; spec at `docs/superpowers/specs/2026-05-16-modular-scan-architecture-design.md` |
| 2026-05-16 | v2.24.1: **User-scoped scan listing + Knowledge page + markdown formatting** — Non-admin users now see only their own scans (GET /api/v1/scans filtered by userId); unified Knowledge page at /knowledge with 6 tabs (Changelog, Roadmap, Docs, Specs, Plans, How-to); Knowledge API serves filesystem content with section-based path resolution; full-width layout; IBM Carbon markdown styling for rendered docs/roadmap; `--ibm-*` CSS variables for all markdown elements (tables, headings, code, blockquotes) |
| 2026-05-15 | v2.24.0: **Parallel deep-scan, incremental persist, AI-enriched tool findings** — p-limit replaces sequential batches; findings upserted to DB per-file; Trivy/Gitleaks findings enriched by AI; persist node only creates tasks + metadata; shared `findings/persist.ts` and `findings/normalize.ts` |
| 2026-05-15 | v2.23.2: **Fix AI JSON parse crash + markdown chat rendering** — AI models can return JSON with invalid `\u` escapes that crash `JSON.parse()`, killing deep_scan; shared `parseAiJson()` sanitizer strips bad escapes; AiChatProvider + ScanChat now render assistant messages as markdown via react-markdown + remark-gfm |
| 2026-05-15 | v2.23.1: **Fix deep-scan crash on findings with undefined file path + architecture diagram visibility** — Trivy IAC misconfig findings had no Filename, producing file=undefined; deep-scan f.file.endsWith() crashed on every file, producing 0 AI findings; fixed null guards in deep-scan, cross-file, and tool-scan (fallback to Target when Filename is absent); Architecture tab now reads diagram from NodeOutput during in-progress scans; Pipeline tab renders Mermaid diagram inline for git_diagram node |
| 2026-05-14 | v2.23.0: **DeepWiki-style code intelligence via @optave/codegraph** — git_ingest runs codegraph buildGraph() for AST-derived CodeIntel (per-file exports/imports/roles, import edges, API routes, data models, call chains, dead exports); git_diagram uses real codegraph Mermaid export; deep-scan/cross-file/chat prompts inject structured CodeIntel; Architecture tab shows Code Structure card; graceful fallback to git-only on failure; @optave/codegraph Apache-2.0 dependency added |
| 2026-05-14 | v2.22.0: **Full pipeline visibility and AI context enrichment** — ScanProgress shows all 9 nodes (was 6); rerun-node API accepts git_ingest/git_diagram/tool_scan; deep-scan AI prompt now includes repoIntel + architectureDiagram (matches cross-file); scan-level AI chat injects repo context in system prompt; git_ingest/git_diagram/tool_scan create NodeOutput records (visible in Pipeline tab); Architecture tab renders Mermaid diagram visually; landing pages show all 9 pipeline steps |
| 2026-05-14 | v2.21.0: **Pipeline expansion: git_ingest, git_diagram, tool_scan** — 9-node pipeline (clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist); Trivy (SCA/IAC/Secrets) and Gitleaks (Secrets) run as subprocess nodes; repo metadata (commits, contributors, hotspots, languages) stored as repoIntel on Scan; Mermaid architecture diagram generated from repo structure; tool findings injected into deep_scan AI context; repoIntel + diagram injected into cross_file AI context; Architecture tab on scan detail page; fingerprint dedup now includes title |
| 2026-05-14 | v2.20.0: **Bidirectional field sync + CVSS vector** — syncFindingFieldsToTask()/syncTaskFieldsToFinding() sync all rich fields bidirectionally; TaskDataTable matches AlertDetail; cvssVector field on Finding/Task stores CVSS v3.1 vector string; CvssScore component parses and displays vector metrics; AI pipeline generates cvssVector |
| 2026-05-14 | v2.19.0: **Unified Tasks & Alerts** — ItemStatus enum replaces AlertStatus/TaskStatus; TaskPriority replaced by Severity; Task model gains rich scanner fields (codeSnippet, aiExplanation, aiFix, exploitationScenario, exploitScore, cvssScore, confidence, remediation, etc.); Finding.cvssScore added; Finding.scanId nullable for manual alerts; bidirectional status sync between linked Findings and Tasks; batch action changePriority → changeSeverity |
| 2026-05-10 | v2.18.0: **Unified spec v5.0** — scan-graph section rebuilt as static Mermaid flowcharts (Data Plane + Control Plane) with 34-node reference table, replacing broken interactive SVG/JS; all 19 DFDs now render via Mermaid v11 CDN; spec/ directory added to file-tree glossary; changelog updated |
| 2026-05-09 | v2.17.0: **Branding refactor** — all product identity configurable via env vars through `src/lib/branding.ts`; AstraConfig → ScanConfig; astra.config.json → scan.config.json; parseAstraRule → parseScanRule; .astra → .rule; all hardcoded brand strings replaced with imports from branding.ts |
| 2026-05-08 | v2.16.0: Homepage v2 — strict IBM Carbon redesign with abstract geometric hero SVG, sentence-case eyebrows, 4-up capabilities grid, fixed utility bar/nav/mobile menu layout |
| 2026-05-08 | **DB + seed fixes** — PrismaPg now receives schema as second arg `(config, { schema })`; seed loads dotenv and parses `?schema=` from DATABASE_URL; prisma.config.ts wired with `migrations.seed`; auth.ts `trustHost: true` for reverse-proxy deployments |
| 2026-05-08 | **Landing page + README rewrite** — full IBM Carbon public landing page (hero, pipeline, scanners, capabilities, AI providers, security, CTA, footer); complete README rewrite with scanner matrix, stack table, setup guide |
| 2026-05-08 | **v1.0 Initial Release milestone** — comprehensive release entry added to changelog capturing full product scope: scan pipeline, 4 scanner integrations, AI enrichment, multi-provider AI chat, alert triage, tasks, observability, RBAC security, GitHub integration, export, and IBM Carbon UI |
| 2026-05-08 | v2.14.0: Browser-side data store — AppDataProvider + browser-store.ts, localStorage TTL cache for users/preferences/chatConfig/currentUser, stale-while-revalidate, removes redundant per-component fetches |
| 2026-05-08 | v2.13.0: Glossary page redesign — full-width layout, prominent folder-level descriptions (blue-accented panels), nested accordion tree, IBM Carbon compliance (0px radius, Plex Sans, surface hierarchy), labeled tag groups for exports/db/api, file+directory count in header |
| 2026-05-08 | v2.12.0: AI chat model selector — chip in header shows active provider·model, searchable dropdown to switch mid-conversation, all 3 chat endpoints accept per-request model override, new GET /api/v1/chat/config endpoint |
| 2026-05-08 | v2.11.0: Tasks ↔ Alerts overhaul — fixed sort params, missing assignedTo join in scan findings, userId-in-comments bug, per-task rescan state, Alert→Task deep link, Task→Alert AlertDetail inline, AI Assist wired up, overflow menu Edit/Duplicate/Link Finding implemented; scan/repo context in task rows and expanded panel; all action buttons always visible (dim when inapplicable); Reassign opens IBM-style user picker modal |
| 2026-05-08 | v2.9.0: Chat conversation memory (all 3 chat endpoints send history to AI), DB-backed prompt management (prompts stored in Config table, runtime load with fallback), multi-turn messages in AI providers (OpenAI/Anthropic/Ollama), prompts API + editing UI in Configuration |
| 2026-05-08 | v2.8.0: Fixed 5 unauthenticated API routes (PATCH /rules, GET /rules, GET /stream, GET findings/history, GET tasks/history); AuthJS redirect loop fix (middleware now allows /api/auth/*); file system glossary (docs/glossary/astra-app-files.md) |
| 2026-05-08 | v2.7.0: Alert-Task linking (task column in findings table, Create Task in AlertDetail), per-file rescan API, AI call retry from observability, empty AI response detection+retry, explicit enum constraints in AI prompts, pipeline management page (/pipeline) |
| 2026-05-08 | Security hardening v2.5.0: all API routes require auth, middleware bypass fixed, rate limiting on auth endpoints, GitHub tokens encrypted at rest, scan ownership checks, presets user-scoping |
| 2026-05-08 | Performance: event-driven worker (replaces setInterval), async I/O in scan nodes, temp dir cleanup, chat pagination, shared parsePagination helper |
| 2026-05-08 | New helpers: `requireScanOwnership()` (rbac.ts), `parsePagination()` (pagination.ts), `rateLimit()` (rate-limit.ts), `encrypt()/decrypt()` (encryption.ts) |
| 2026-05-07 | Config moved from `astra.config.json` file to DB-backed `Config` table (`loadConfigFromDb`, `saveConfigToDb`). All API routes updated. |
| 2026-05-07 | Streaming chat design spec approved (`docs/superpowers/specs/2026-05-07-streaming-chat-design.md`) — Approach A: `sendStream()` + SSE + ReadableStream |
| 2026-05-07 | Fixed worker `processing` mutex bug (`processNextJob` now resets `processing = false` when no job found) |
| 2026-05-07 | Added `Config` table migration, `ProviderModel` registry, multi-provider AI chat UI |
| 2026-05-06 | Migrated from SQLite to PostgreSQL + Prisma (`astra-app/prisma/schema.prisma`) |
| 2026-05-06 | Built `astra-app` Next.js 16 + IBM Carbon control plane with full API routes, scan pipeline, chat, observability |
| 2026-05-05 | Created context/ folder with architecture.html and superpowers-reference.md |
| 2026-05-05 | Updated CLAUDE.md with superpowers workflow, deployment models, security requirements, business rules, AI provider table |
| 2026-05-05 | Built comprehensive architecture visualization HTML at `context/architecture.html` with 4 tabs: BRD/PRD/TRD, Changelog, Diagrams, Glossary |
| 2026-05-05 | Added Ollama API key support (OLLAMA_API_KEY env var, Bearer token auth) |
| 2026-05-05 | Dockerized entire PoC (Dockerfile + docker-compose.yml with Ollama service) |
| 2026-05-05 | Added Carbon-styled dashboard with FindingsTable, ScannerBreakdown, BusinessLogicPanel, SeverityBadge, RepoInput |
| 2026-05-05 | Built scanner engine (Trivy, Semgrep, Gitleaks, Bearer), normalizer, AI enrichment |
| 2026-05-05 | Created SQLite schema and query functions for scans, findings, biz_logic_rules |
| 2026-05-05 | Scaffolded Next.js + Carbon PoC project |
| 2026-04-29 | Wrote comprehensive design specification (1000+ lines) |

## Deployment Notes

- **Deployed app:** `/var/www/astra-app` — production build (`next start -p 2306`), custom domain `astra.nerdlogics.cloud`
- **NEVER touch production** (`/var/www/astra-app`, port 2306, `astra.nerdlogics.cloud`) unless the user explicitly asks. No builds, no file copies, no curl, no deploys — even if changes seem ready.
- **DB schema:** Deployed env uses `?schema=astra01` in `DATABASE_URL`; local dev uses `?schema=public`. `db.ts` and `seed.ts` both parse the schema from the URL and pass it as the second arg to `PrismaPg`.
- **PrismaPg schema quirk:** `new PrismaPg(config, { schema })` — schema MUST be the second argument. Passing it inside the first config object has no effect.
- **Seed:** `npx prisma db seed` in either env. Reads env via `import 'dotenv/config'`. Config registered in `prisma.config.ts` under `migrations.seed`.
- **After code changes in source:** `cp` changed files to `/var/www/astra-app/src/...`, then `cd /var/www/astra-app && npm run build`, then restart `next start`.
- **Auth:** `trustHost: true` in `src/lib/auth.ts` — required for deployments behind reverse proxy or custom domain.

## Known Issues & Pending Work

- **Worker queue fairness** — `claimNextJob` picks oldest PENDING job globally, not per-scan. Stale jobs from FAILED scans can block new scans. Fix: filter by scan status in `claimNextJob` or add per-scan priority queue.
- **Cloud Ollama timeouts (Error 524)** — Cloudflare 524 errors from `api.ohmyllama.com` cause deep_scan failures. Retry logic exists (3 retries) but 125s timeout still fails on large files.
- **Streaming chat** — Design spec approved (`docs/superpowers/specs/2026-05-07-streaming-chat-design.md`), not yet implemented. Needs: `sendStream()` on all providers, 3 SSE endpoints, UI `ReadableStream` consumer.
- **Semgrep installation** fails on Ubuntu with `externally-managed-environment` error. Trivy and Gitleaks are installed and integrated as pipeline nodes.
- **Scanner Bandit and Checkov** are installed in Dockerfile but not yet called from `runAllScanners()`.
- **Control Plane modules** (auth, policies, integrations, WebSocket) are designed but not fully implemented.
- **End-to-end Docker test** not yet verified.
- **MermaidDiagram component** created but not integrated into visualization page.
- **public schema leftover data** — earlier failed seed runs wrote 3 User rows + 1 Config row to `public` schema. Not harmful but can be cleaned up: `DELETE FROM public."User"; DELETE FROM public."Config";`
- **Separate /changelog route** — still exists as standalone page; could redirect to `/knowledge` or remove

## How-To Guides

| Guide | Location | Purpose |
|-------|----------|---------|
| **Pipeline Nodes & Scanners** | [`docs/how-to/add-or-update-node-or-tool.md`](../docs/how-to/add-or-update-node-or-tool.md) | Step-by-step process for adding/updating pipeline nodes (16 steps) or scanner tools (10 steps), with full file change matrix and 38-item verification checklist |
| **Pipeline Quick Ref** | [`KNOWLEDGE/docs/how-to-add-or-update-pipeline-nodes.md`](KNOWLEDGE/docs/how-to-add-or-update-pipeline-nodes.md) | Summary reference for the above guide |

**When adding or updating any pipeline node or scanner tool, follow the guide at `docs/how-to/add-or-update-node-or-tool.md`.**

## Key File Paths

### Active Control Plane (`astra-app/`)
| Path | Purpose |
|------|---------|
| `astra-app/src/app/page.tsx` | Main dashboard page |
| `astra-app/src/app/api/v1/scans/route.ts` | Scan trigger + list API |
| `astra-app/src/app/api/v1/config/route.ts` | Config GET/PUT (DB-backed) |
| `astra-app/src/app/api/v1/providers/route.ts` | Provider registry listing |
| `astra-app/src/app/api/v1/chat/route.ts` | Global chat API |
| `astra-app/src/scan/worker.ts` | Background job worker (9-node pipeline) |
| `astra-app/src/scan/nodes/git-ingest.ts` | Git metadata extraction (commits, contributors, hotspots, languages) |
| `astra-app/src/scan/nodes/git-diagram.ts` | Mermaid architecture diagram generation |
| `astra-app/src/scan/nodes/tool-scan.ts` | Trivy + Gitleaks runner, normalizer, AI enrichment |
| `astra-app/src/scan/nodes/parse-ai-json.ts` | Shared AI JSON sanitizer (handles invalid unicode escapes, trailing commas) |
| `astra-app/src/findings/normalize.ts` | Shared `normalizeSeverity()` and `normalizeCategory()` |
| `astra-app/src/findings/persist.ts` | Shared `upsertFinding()` and `upsertFindings()` for incremental DB writes |
| `astra-app/src/scan/queue.ts` | Job queue (claimNextJob, markJobFailed, etc.) — structured logging on all transitions |
| `astra-app/src/lib/config.ts` | Zod config schema, `loadConfigFromDb`, `saveConfigToDb` |
| `astra-app/src/lib/ai-chat.ts` | Chat orchestration (provider resolution, system prompt building) |
| `astra-app/src/lib/ai-instrumentation.ts` | AI call observability (`instrumentedSend`) |
| `astra-app/src/lib/rbac.ts` | Auth helpers (`requireAuth`, `canWrite`, `canAdmin`, `requireScanOwnership`) |
| `astra-app/src/lib/pagination.ts` | Shared `parsePagination()` for API routes |
| `astra-app/src/lib/rate-limit.ts` | In-memory rate limiter |
| `astra-app/src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt for sensitive data |
| `astra-app/src/lib/db.ts` | Prisma client singleton |
| `astra-app/src/providers/base.ts` | `AIProvider` interface + `StreamChunk` types |
| `astra-app/src/providers/cloud-ollama.ts` | Cloud Ollama provider |
| `astra-app/src/providers/factory.ts` | Provider factory (`createProvider`) |
| `astra-app/src/app/(app)/glossary/page.tsx` | File glossary page (full-width accordion tree) |
| `astra-app/src/app/(app)/knowledge/page.tsx` | Knowledge page — 6 tabs: Changelog, Roadmap, Docs, Specs, Plans, How-to |
| `astra-app/src/app/api/v1/knowledge/route.ts` | Knowledge API — serves filesystem content for docs/specs/plans/how-to; section-based path resolution |
| `astra-app/src/lib/file-tree.ts` | File tree data for glossary (FileEntry interface + FILE_TREE) |
| `astra-app/src/components/AiChatProvider.tsx` | Global slide-out chat panel |
| `astra-app/src/components/ScanChat.tsx` | Inline scan chat widget |
| `astra-app/prisma/schema.prisma` | PostgreSQL schema (Scan, Finding, Job, AiConversation, AiCallLog, Config, Preset, ProviderModel) |
| `astra-app/prisma/seed.ts` | DB seed — 3 users (emails via `APP_DOMAIN` from branding.ts), `scan.config`, theme pref, 3 presets, 5 builtin rules; idempotent via upsert |
| `astra-app/prisma.config.ts` | Prisma 7 config — schema path, migrations path, seed command |
| `astra-app/src/lib/auth.ts` | NextAuth v5 config — Credentials provider, JWT, RBAC callbacks, `trustHost: true` |
| `astra-app/src/lib/browser-store.ts` | localStorage TTL cache — `bsGet/bsSet/bsDel/bsClear` with `astra:v1:` namespace |
| `astra-app/src/components/AppDataProvider.tsx` | React context — shared users, preferences, chatConfig, currentUser; stale-while-revalidate |
| `astra-app/src/components/landing/*.tsx` | 14-section landing page components (Hero, InteractiveDemo, AiAdvantage, etc.) — independent visual identity, no IBM Carbon |
| `astra-app/src/components/landing/landingStyles.ts` | Landing page design tokens (dark theme colors, typography, spacing) |
| `astra-app/src/components/landing/landingAnimations.ts` | Shared animation hooks (useVisible, useCountUp) and CSS keyframes |
| `astra-app/src/components/landing/landingData.ts` | All landing page content data (sections, modules, features, pricing) |
| `astra-app/src/components/landing/demoData.ts` | Mock findings and raw/enriched output for interactive demo |
| `astra-app/src/components/AppShell.tsx` | App shell — wraps all authenticated pages; mounts AppDataProvider + AiChatProvider |

### Data Plane PoC (`astra-poc/`)
| Path | Purpose |
|------|---------|
| `astra-poc/app/page.tsx` | Main dashboard page |
| `astra-poc/app/scan/route.ts` | POST /api/scan endpoint |
| `astra-poc/lib/scanners.ts` | Scanner execution engine |
| `astra-poc/lib/normalize.ts` | Finding normalizer |
| `astra-poc/lib/ai.ts` | Ollama AI client |
| `astra-poc/lib/db.ts` | SQLite database |

### Documentation
| Path | Purpose |
|------|---------|
| `spec/2026-05-10-unified-platform-spec.html` | Unified platform spec v5.0 — 16 sections, Mermaid DFDs, pipeline graph, taxonomy, competitive, roadmap |
| `context/architecture.html` | Complete project reference (BRD/PRD/TRD, diagrams, changelog, glossary) |
| `context/superpowers-reference.md` | Superpowers 5.1.0 all 14 skills |
| `docs/superpowers/specs/2026-05-07-streaming-chat-design.md` | Streaming chat design spec |
| `docs/superpowers/specs/2026-05-16-modular-scan-architecture-design.md` | Modular scan architecture — 8 pipeline modules, feature gates, plan tiers, cloud/PCI/network/SBOM/runtime/IaC |
| `docs/superpowers/specs/2026-04-29-astra-security-platform-design.md` | Full design specification |
| `docs/diagrams/01-architecture-overview.md` through `08-security-model.md` | Architecture diagram sources |
| `astra-scanner-design.md` | Scanner architecture summary |

## graphify

This project has a graphify knowledge graph at graphify-out/. **Use it — do not grep raw files when graphify can answer the question faster and with more cross-module context.**

### When to use graphify (REQUIRED)
- **Before any code exploration** — run `graphify query "<topic>"` instead of find/grep to locate relevant nodes
- **Architecture & relationships** — `graphify path "<A>" "<B>"` to trace how two modules connect
- **Concept explanations** — `graphify explain "<concept>"` to understand a subsystem before touching it
- **Before planning** — query the graph to surface related specs, components, and design decisions you might miss

### Commands
```
graphify query "tasks alerts findings"     # BFS traversal, returns nodes + edges
graphify path "TaskDataTable" "ai-chat"    # shortest path between two nodes
graphify explain "scan pipeline"           # narrative explanation of a concept
graphify update .                          # rebuild after code changes (AST-only, no API cost)
```

### Other rules
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current
- **For any knowledge/reference question**, use these three sources IN ORDER:
  1. `graphify query` / `graphify explain` — fastest, has cross-module context
  2. `KNOWLEDGE/` directory — specs, design docs, competitive analysis, pipeline reference
  3. `docs/` directory — how-to guides, tutorials, reference docs, superpowers specs/plans
  Do NOT grep raw source files when one of these can answer the question.

## Housekeeping

- **When making changes**, always update `astra-app/src/lib/changelog.ts` with a version entry
- **After updating changelog**, update the Changelog table in `CLAUDE.md` with a one-line summary
- **After code changes**, run `graphify update .` to refresh the knowledge graph
