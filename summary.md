# Platform — Summary

**Last updated:** 2026-05-16

---

## What This Is

An AI-native application security scanning platform. Combines SAST, SCA, secret scanning, IaC scanning, and AI-augmented business logic flaw detection into a single workflow. Split into a **Control Plane** (stateful Node.js/Next.js) and a **Data Plane** (stateless Python container). Raw source code never leaves the customer environment.

**Current version:** v2.24.0

---

## Completed Work

### v2.24.0 — Parallel deep-scan, incremental persist, AI-enriched tool findings
- Deep-scan runs all files concurrently via p-limit (no more sequential batches)
- Findings appear in the UI as they're discovered (incremental DB upsert per file)
- Tool findings (Trivy/Gitleaks) are enriched by AI before storage
- Persist node only creates Tasks, BusinessRules, and updates scan metadata
- Shared `findings/persist.ts` and `findings/normalize.ts` modules
- Structured logging on all queue/worker state transitions
- Scans scoped to logged-in user (non-admin sees only own scans)

### v2.23.2 — Fix AI JSON parse crash + markdown chat rendering
- `parseAiJson()` sanitizer strips invalid Unicode escapes and trailing commas
- Assistant messages render as markdown via react-markdown + remark-gfm

### v2.23.1 — Fix deep-scan crash on undefined file path
- Trivy IAC misconfigs had no Filename — null guards in deep-scan, cross-file, tool-scan
- Architecture diagram visible during in-progress scans (NodeOutput fallback)

### v2.23.0 — DeepWiki-style code intelligence via @optave/codegraph
- AST-derived CodeIntel: per-file exports/imports/roles, import edges, API routes, data models, call chains, dead exports
- git_diagram uses real Mermaid export from codegraph
- Deep-scan, cross-file, and chat prompts inject structured CodeIntel context

### v2.22.0 — Full pipeline visibility
- ScanProgress shows all 9 pipeline nodes (was 6)
- Deep-scan AI prompt now includes repoIntel + architectureDiagram
- Architecture tab renders Mermaid diagram visually

### v2.21.0 — Pipeline expansion: git_ingest, git_diagram, tool_scan
- 9-node pipeline: clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
- RepoIntel (commits, contributors, hotspots, languages)
- Trivy + Gitleaks as pipeline nodes with normalized output
- Fingerprint dedup includes title

### v2.20.0 — Bidirectional field sync (Tasks ↔ Alerts)
- All rich fields sync bidirectionally between Findings and Tasks
- CvssScore component with CVSS v3.1 vector string parsing

### v2.19.0 — Unified Tasks & Alerts
- ItemStatus replaces AlertStatus/TaskStatus
- Task.severity replaces TaskPriority
- Rich scanner fields on Task model
- Finding.scanId nullable for manual alerts

### v2.17.0 — Branding refactor
- All product identity configurable via env vars through `branding.ts`
- AstraConfig → ScanConfig, astra.config.json → scan.config.json

### v2.16.0 — Homepage v2 redesign (IBM Carbon)
### v2.15.0 — DB schema routing, seed script, auth fixes
### v2.14.0 — Browser-side data store (AppDataProvider + browser-store.ts)
### v2.13.0 — Glossary page redesign
### v2.12.0 — Model selector in AI chat
### v2.11.0 — Tasks ↔ Alerts integration overhaul
### v2.10.0 — File glossary, GitHub branches fix
### v2.9.0 — Chat memory, DB-backed prompts, multi-turn AI
### v2.8.0 — Auth coverage, middleware fix
### v2.7.0 — Alert-Task linking, per-file rescan, AI observability
### v2.5.0 — Security hardening, event-driven worker
### v2.4.0 — Scan lifecycle fixes, manual task creation
### v2.3.0 — Observability and Tasks
### v2.2.0 — Real AI chat, configurable chat AI
### v2.1.0 — RBAC, per-finding chat, export enhancements
### v2.0.0 — Platform redesign (IBM Carbon, auth, alert triage, landing page)
### v1.5.0 — AI chat and rules engine
### v1.4.0 — Reporting and export pipeline
### v1.3.0 — Job queue and scan lifecycle
### v1.2.0 — AI provider architecture
### v1.1.0 — Findings dashboard and file explorer
### v1.0.0 — Initial release

---

## Key Features (Current)

| Feature | Status |
|---------|--------|
| 9-node scan pipeline (clone → persist) | Live |
| Trivy (SCA/IaC/Secrets) + Gitleaks (Secrets) | Live |
| AI deep-scan (per-file, parallel) | Live |
| AI cross-file (business logic inference) | Live |
| AI tool-findings enrichment | Live |
| Incremental persist (findings appear as discovered) | Live |
| Multi-provider AI chat (7 providers) | Live |
| Markdown rendering in chat | Live |
| Alert triage with status workflow | Live |
| Task management (auto from findings) | Live |
| Bidirectional Finding ↔ Task sync | Live |
| Observability (AI call logs, retry, stats) | Live |
| GitHub integration (PAT, repos, branches) | Live |
| Export (JSON, CSV, SARIF, HTML, Markdown) | Live |
| Configuration (DB-backed, pipeline editor) | Live |
| RBAC (ADMIN/ANALYST/VIEWER) | Live |
| Scan ownership (non-admin sees own scans) | Live |
| Knowledge page (changelog, roadmap, docs, specs, plans, how-to) | Live |
| Dark/light theme | Live |
| Code intelligence (AST-based via @optave/codegraph) | Live |
| Architecture diagram (Mermaid from codegraph) | Live |
| Streaming chat | Design spec approved, not yet implemented |
| Semgrep, Bearer, Bandit, Checkov | Installed but not wired |

---

## Roadmap

### Phase 1 — Stability & Queue Foundation (Current)
| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 102 | Priority + scheduled scans | — | Add `priority`/`scheduledAt` to Scan model |
| 103 | Worker pool (concurrent scans) | 102 | Replace single worker with `MAX_CONCURRENT_SCANS` workers |
| 104 | Cancellation awareness | 102 | Check scan status between every pipeline node |
| 105 | Stuck job recovery | — | Timeout RUNNING jobs after 10 min; retry with backoff |
| 24 | Fix `Finding` PATCH userId | — | Use real user ID, not `'system'` |
| 22 | Fix cross-file context window bomb | — | Summarize instead of concatenating all file summaries |

### Phase 2 — Queue Abstraction & Config
| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 106 | Queue backend abstraction (ScanQueue interface + PostgresQueue) | 102–105 | Interface: enqueue/dequeue/cancel/getStats |
| 10 | User-scoped config architecture | — | 4-layer: Credentials → Defaults → Presets → Per-Scan |
| 11–14 | Provider registry + user credentials + user config + user presets | 10 | Per-user API keys (encrypted), defaults, saved presets |
| 16 | Editable system prompts per node | 10 | Store prompts in Config table, fall back to hardcoded |
| 78 | DB-backed prompt management UI | 16 | Edit/version/restore prompts per node |

### Phase 3 — Streaming Chat & Real-time
| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 34 | Streaming chat (SSE) | — | Design spec done; implement `sendStream()` on all providers |
| 50 | Streaming findings via SSE | 103 | Push findings as they arrive, not just at persist |
| 67 | Toast notifications | — | Real-time feedback for scan events, config saves |
| 110 | Queue stats API | 106 | `/api/v1/queue/stats` for depth, active, waiting |

### Phase 4 — Multi-backend Queue & Recurring Scans
| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 107 | Redis/BullMQ backend | 106 | For multi-server, high-volume deployments |
| 108 | External MQ backend | 107 | Redis state + RabbitMQ/NATS/SQS for enterprise |
| 109 | Recurring scans (cron) | 102 | Cron on Scan model; auto-create scans on schedule |
| 111 | Cancel/resume/progress APIs | 104 | POST cancel, resume; GET progress |

### Phase 5 — Pipeline Performance
| # | Task | Depends on | Notes |
|---|------|------------|-------|
| 46 | Parallelize independent nodes | 103 | discover can start before clone finishes |
| 47 | File content caching | — | Cache reads between discover and deepScan |
| 48 | Dynamic AI call concurrency | 103 | Auto-scale based on provider rate limits |
| 49 | Incremental/resumable scans | 105 | Resume from last completed node on failure |
| 23 | Better token estimation | — | Replace `length/4` with real tokenizer |

### Phase 6 — New Pipeline Nodes
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

### Backlog
| # | Task | Notes |
|---|------|-------|
| 15 | Wire Scan.configJson to UI | Per-scan override exists in schema |
| 18 | Provider factory uses user creds instead of env vars | |
| 19 | Remove/hide 3 stub providers (bedrock, azure, langgraph) | |
| 20 | Fix Cloud Ollama URL mismatch | |
| 21 | Fix provider caching hash (include all config fields) | |
| 28 | Hidden ConfigEditor fields (instructions, tools, etc.) | |
| 30 | Merge ScanChat + AiChatProvider into shared component | |
| 31 | Remove/document dead LangGraph code | |
| 32 | ConfigEditor input validation (model exists for provider) | |
| 66 | Keyboard shortcuts | |
| 80 | DB-first context loading for all AI calls | |

---

## Known Issues

- **Worker queue fairness** — `claimNextJob` picks oldest PENDING job globally, not per-scan. Stale jobs from FAILED scans can block new scans.
- **Cloud Ollama timeouts (Error 524)** — Cloudflare 524 errors from `api.ohmyllama.com` cause deep_scan failures. Retry logic exists (3 retries) but 125s timeout still fails on large files.
- **Streaming chat** — Design spec approved, not yet implemented. Needs `sendStream()` on all providers, 3 SSE endpoints, UI `ReadableStream` consumer.
- **Semgrep installation** fails on Ubuntu with `externally-managed-environment` error.
- **Scanner Bandit and Checkov** are installed in Dockerfile but not called from `runAllScanners()`.
- **Control Plane modules** (auth, policies, integrations, WebSocket) are designed but not fully implemented.
- **End-to-end Docker test** not yet verified.