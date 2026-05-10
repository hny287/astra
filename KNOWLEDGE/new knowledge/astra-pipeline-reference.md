# Astra Security Platform — Enterprise Scan Pipeline
**Complete Technical Reference · v4.0 · 24 Nodes · Nonlinear DAG**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [System Boundaries](#2-system-boundaries)
3. [Complete Pipeline DAG](#3-complete-pipeline-dag)
4. [Phase-by-Phase Node Reference](#4-phase-by-phase-node-reference)
   - [P0 — Entry Point](#p0--entry-point)
   - [P1 — Clone](#p1--clone)
   - [P2 — Repo Intel (Diagram & Ingest)](#p2--repo-intel-diagram--ingest)
   - [P3 — Intelligence Layer](#p3--intelligence-layer)
   - [P4 — Scan Orchestrator](#p4--scan-orchestrator)
   - [P5 — Parallel Scan Tracks](#p5--parallel-scan-tracks)
   - [P6 — Deep Scan](#p6--deep-scan)
   - [P7 — Cluster Summaries](#p7--cluster-summaries)
   - [P8 — Cross File Per Cluster](#p8--cross-file-per-cluster)
   - [P9 — Cross File Global](#p9--cross-file-global)
   - [P10 — Rule Engine (Rile)](#p10--rule-engine-rile)
   - [P11 — Triage & Enrich Critical](#p11--triage--enrich-critical)
   - [P12 — Finalize](#p12--finalize)
5. [Post-Scan: Auto-Fix & MCP](#5-post-scan-auto-fix--mcp)
6. [Control Plane Nodes](#6-control-plane-nodes)
7. [Storage Architecture](#7-storage-architecture)
8. [Key Design Decisions](#8-key-design-decisions)
9. [Node Summary Table](#9-node-summary-table)

---

## 1. Architecture Overview

Astra is split into two strict execution domains:

| Domain | What runs here | Source code? |
|---|---|---|
| **Customer Environment** | Clone, Repo Intel, Intelligence Layer, All Scan Tracks, Deep Scan, Cross File, Rule Engine, Triage, Finalize, Auto-Fix, MCP | ✅ Lives here, never leaves |
| **Control Plane** | Ingest, Policy Engine, AI Triage, Biz Logic Queue, Human Review, Dashboard API, Dashboard, Storage | ❌ Never received |

**The trust boundary is enforced by design.** The data plane POSTs only normalised `UnifiedFinding[]` JSON over HTTPS to the Control Plane. Raw source code, file contents, dependency files, and git history never cross the boundary.

```
Customer CI Environment                    Control Plane
────────────────────────────────────────   ────────────────────────────
URL → Clone → Repo Intel                   Ingest → Dedup → Policy
     → [Intelligence Layer]                → AI Triage → Biz Logic Queue
     → Scan Orchestrator                   → Human Review → Confirmed Rules
     → [Parallel Tracks Fork]              → Integrations
     → Deep Scan (streaming →)  ─ HTTPS ─▶ Dashboard API → Dashboard
     → Cluster Summaries                   → Storage (PG + Redis + S3)
     → Cross File (per cluster)
     → Cross File Global
     → Rile
     → Triage ──→ Enrich Critical?
     → Finalize ──────────────────────────▶
     → Auto-Fix / MCP
```

---

## 2. System Boundaries

### Trust Boundary — What crosses and what doesn't

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER ENVIRONMENT                                        │
│  Source code ✅ · Git history ✅ · Dependencies ✅          │
│  All AI inference (Ollama/Bedrock/Cloud) ✅                 │
│                          │                                   │
│                     HTTPS POST                               │
│                   gzip-compressed                            │
│                   Bearer auth token                          │
│                          │                                   │
│  What crosses ──────────▼──────────────────────────────     │
│  UnifiedFinding[] (scanner, rule_id, file path,             │
│  line numbers, severity, code snippet excerpt,               │
│  CWE/OWASP tags, ai_explanation, ai_fix,                    │
│  exploit_score, fingerprint)                                 │
│                                                              │
│  What NEVER crosses ────────────────────────────────────    │
│  Raw source code · Full file contents · Dep files           │
│  Git history · Private keys · Env var values                │
└──────────────────────────────────────────────────────────── ┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CONTROL PLANE  (Astra SaaS / self-hosted / hybrid)         │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Modes

| Mode | Control Plane | Data Plane |
|---|---|---|
| **SaaS** | Astra-hosted (`api.astra.security`) | Customer CI runner |
| **Self-Hosted** | Customer Helm chart / Docker Compose | Customer CI runner |
| **Hybrid** | Astra-hosted | Customer CI runner |
| **Air-gapped** | Customer on-prem | Customer CI (Ollama local AI) |

---

## 3. Complete Pipeline DAG

### Full Nonlinear Graph

```mermaid
flowchart TD
    URL["⬡ URL / Repo Source\ngit URL · local path · github:org/repo"]
    CLONE["P1 · Clone\ngit clone --depth 1 · PAT decrypt · commitSHA"]
    INTEL["P2 · Repo Intel\nDiagram & Ingest · SystemIntelReport"]

    subgraph INTLAYER["P3 · Intelligence Layer — parallel, context fed to all downstream"]
        RG["A · Intelligent Rule Gen.\nAI infers custom .astra rules\nspecific to this codebase & domain"]
        CP["B · Critical Paths & Failure Points\nauth flows · payment routes · trust boundaries\nentry points · attack surface map"]
        SS["C · Scan Scope & Instruction Def.\npriority tiers P0→P4 · token budget\nAI scan instructions · depth · focus"]
    end

    ORCH["P4 · Scan Orchestrator\nconditional fork on SystemIntelReport · manages worker pool"]

    subgraph PARALLEL["P5 · Parallel Scan Tracks — fork on repo profile"]
        TS["Track A · Tool-Level Scan\nSemgrep 500+ rules · Trivy CVE\nBandit · Bearer CI · SAST · SCA"]
        IAC["Track B · IaC Scan\nCheckov · Terraform · Helm · K8s\nDockerfile · IAM · network · container\n⚠️ conditional: if IaC files found"]
        SEC["Track C · Secrets Scan\nGitleaks · TruffleHog · git history\nAPI keys · passwords · certs · tokens"]
        SCA["Track D · Supply Chain & SCA\nreachability SCA · malicious pkg · SBOM\n95% CVEs in transitive deps"]
    end

    DEEP["P6 · Deep Scan\nper-file AI analysis · context-aware (SystemIntelReport)\n→ UnifiedFinding[] + FileSummary[]\nstreaming persist per batch · concurrency 5"]

    CLUSTER["P7 · Cluster Summaries\ngroup FileSummary[] by domain\nauth · payments · API · config · data\nno AI · pure heuristic · &lt;5s"]

    subgraph XFILE["P8 · Cross File Per Cluster — parallel, one call per domain"]
        XA["Cross File · auth cluster\nmissing middleware · IDOR · privesc"]
        XB["Cross File · payments cluster\nrace conditions · price manipulation"]
        XC["Cross File · other clusters\ntrust boundaries · data flows"]
    end

    XGLOBAL["P9 · Cross File Global\nreasons across cluster summaries only\nIDOR · BOLA · broken access control\nrace conditions · workflow bypass · state machine violations"]

    RILE["P10 · Rile — Rule Engine\ninfer biz-logic rules · store as CANDIDATE\nfeedback loop → confirmed rules injected into future scans"]

    TRIAGE["P11 · Triage\ncount CRITICAL findings → conditional routing\nif CRITICAL &gt; 0 → enrich_critical"]

    ENRICH["P11b · Enrich Critical\nconditional — deep dive on CRITICAL only\nre-reads files · confirm · expand · dismiss FP\ngenerates exploit scenarios"]

    FINALIZE["P12 · Aggregate & Finalize\nnormalise · SHA-256 dedup · sort\nHTTPS POST gzip-JSON → Control Plane"]

    URL --> CLONE --> INTEL
    INTEL --> RG & CP & SS
    RG & CP & SS --> ORCH
    INTEL --> ORCH

    ORCH -->|"always"| TS
    ORCH -->|"if IaC found"| IAC
    ORCH -->|"always"| SEC
    ORCH -->|"always"| SCA

    TS & IAC & SEC & SCA -->|"JOIN"| DEEP

    DEEP -->|"streaming"| CLUSTER
    CLUSTER --> XA & XB & XC
    XA & XB & XC --> XGLOBAL
    XGLOBAL --> RILE
    RILE --> TRIAGE
    TRIAGE -->|"CRITICAL > 0"| ENRICH
    TRIAGE -->|"always"| FINALIZE
    ENRICH --> FINALIZE

    RILE -.->|"confirmed rules fed back"| ORCH

    style INTLAYER fill:#0f62fe11,stroke:#0f62fe44
    style PARALLEL fill:#33333311,stroke:#33333344
    style XFILE fill:#24a14811,stroke:#24a14844
```

### Post-Scan Flow

```mermaid
flowchart LR
    FINALIZE["P12 · Finalize\nHTTPS POST → Control Plane"]
    
    subgraph CP["Control Plane"]
        INGEST["Ingest & Dedup\nSHA-256 fingerprint · Redis cache"]
        POLICY["Policy & SLA Engine\nrouting · SLA timers · actions"]
        AITRIAGE["AI Exploit Scoring\nhybrid deterministic+LLM\norg memory · learned rules"]
        BIZQ["Biz Logic Queue\nCANDIDATE rules store"]
        HUMAN["Human Review\nConfirm · Edit · Reject"]
        RULES["Confirmed Rules Store\ndistributed via token validation"]
        INTMOD["Integrations\nJira · Slack · PagerDuty · GitHub\nWebhooks · Email · SARIF · MCP · SSO"]
        DASHAPI["Dashboard API\nREST v1 · WebSocket · GraphQL · SSE"]
        DASH["Dashboard\nExecutive · Engineering · Sec Ops"]
    end

    subgraph AUTOFIX["Auto-Fix & Agents"]
        AFX["Agentic Auto-Fix\nAI generates fix · validates · draft PR\nHuman approval gate — never auto-merge"]
        MCP["MCP Server\nAI agent policy layer\nClaude Code · Cursor · Copilot · Devin"]
    end

    FINALIZE --> INGEST
    INGEST --> POLICY
    POLICY --> AITRIAGE & INTMOD
    AITRIAGE --> BIZQ
    BIZQ --> HUMAN
    HUMAN --> RULES
    RULES -.->|"future scans"| FINALIZE
    INTMOD --> DASHAPI
    DASHAPI --> DASH
    DASH --> AFX
    DASH --> MCP
```

---

## 4. Phase-by-Phase Node Reference

---

### P0 — Entry Point

**Node:** `url`  
**Type:** Entry  
**Timing:** `< 1s`

Every scan starts here. Accepts three input modes — the source resolver auto-detects and normalises.

#### Input Modes

| Mode | Example | Notes |
|---|---|---|
| Git URL (HTTPS) | `https://github.com/org/repo` | Public or private with PAT |
| Git URL (SSH) | `git@github.com:org/repo.git` | Uses system git credentials |
| Local directory | `/repo` (volume mount) | CI/CD + local developer scans |
| Cloud API _(post-PoC)_ | `github:org/repo` | Fetches via GitHub/GitLab API |

#### Outputs
- `repoUrl` — normalised repository URL
- `branch` — target branch (default: `main`, override with `--branch`)
- `userId` — for PAT lookup on private repos

---

### P1 — Clone

**Node:** `clone`  
**Type:** Core pipeline  
**Timing:** `2–15s`

Resolves the repository to a local directory on disk. Source code never leaves the CI runner.

#### Steps

1. Create temp directory `/tmp/astra-scan-<cuid>`
2. If private repo: decrypt GitHub/GitLab PAT from org profile using **AES-256-GCM**
3. Inject decrypted token into clone URL (never logged)
4. Run `git clone --depth 1 --single-branch <url> <tmpdir>`
5. Run `git rev-parse HEAD` → resolve `commitSha`
6. Count files in cloned directory

#### Outputs
- `localDir` — absolute path to temp directory
- `commitSha` — exact git commit hash
- `status` → `RUNNING`

#### Error Handling
- Clone failure → append to `errors[]`, `status → FAILED`
- Safety check: `localDir` must contain `astra-scan-` before any cleanup
- Cleanup on failure: `cleanupScanTmpDir(localDir)`

---

### P2 — Repo Intel (Diagram & Ingest)

**Node:** `repo-intel`  
**Type:** AI · 1 call  
**Timing:** `3–8s`

> **The foundation of everything.** This single node determines the quality of every subsequent scan. Without it, every scan is generic. With it, every scan knows it's reviewing a specific system with specific risks.

Builds a `SystemIntelReport` from the cloned repo before any scanning begins. Every downstream node receives this as injected context.

#### Steps

1. Walk directory tree (max 3 levels deep)
2. Read key files: `package.json`, `go.mod`, `requirements.txt`, `README.md`, `.env.example`, main entry points
3. Detect tech stack: languages, frameworks, databases, external services (Stripe, Twilio, AWS S3, SendGrid)
4. Detect auth mechanism: JWT | sessions | OAuth2 | API keys | none
5. Build compact digest (~2K tokens) — Gitingest-style structured representation
6. **One AI call** → `SystemIntelReport` JSON

#### SystemIntelReport Schema

```typescript
interface SystemIntelReport {
  systemType: string          // "REST API" | "monolith" | "microservice" | "CLI"
  domain: string              // "fintech payments" | "healthcare SaaS" | "dev tooling"
  description: string         // "Node.js payments API handling Stripe charges"
  languages: string[]         // ["TypeScript", "SQL"]
  frameworks: string[]        // ["Express", "Fastify", "Next.js"]
  databases: string[]         // ["PostgreSQL", "Redis"]
  externalServices: string[]  // ["Stripe", "Twilio", "AWS S3"]
  authMechanism: string       // "JWT" | "sessions" | "OAuth2" | "API keys" | "none"
  entryPoints: string[]       // ["src/server.ts", "src/routes/index.ts"]
  criticalPaths: CriticalPath[]
  dataFlows: DataFlow[]
  riskProfile: RiskProfile    // HIGH | MEDIUM | LOW per category
  attackSurface: string[]     // ["public REST API", "webhooks"]
  sensitiveOperations: string[] // ["payment processing", "user auth"]
  scanFocus: string           // "Focus on payment flows and JWT handling"
  highValueTargets: string[]  // specific files to scrutinise most
}
```

#### Outputs
- `SystemIntelReport` (injected into **all** downstream node prompts)
- `fileTree`
- `techStack`
- `entryPoints[]`
- `criticalPaths[]`
- `highValueTargets[]`
- `scanFocus` (natural language focus instructions)

---

### P3 — Intelligence Layer

Three nodes run **in parallel** immediately after Repo Intel. All feed context into downstream scan nodes.

---

#### Intelligence A — Intelligent Rule Generation

**Node:** `rule-gen`  
**Type:** AI · parallel  
**Timing:** `5–10s`

Generates custom `.astra` security rules specific to this codebase and domain. Not generic OWASP rules — rules that understand the business context.

**Example generated rules:**
```
rule STRIPE_WEBHOOK_VERIFICATION {
  severity: CRITICAL
  message: "All /charge endpoints must verify Stripe webhook signature"
}

rule AMOUNT_FROM_DB_NOT_REQUEST {
  severity: CRITICAL
  message: "Amount must come from DB, not request body — price manipulation risk"
}

rule ADMIN_ROLE_DB_VERIFIED {
  severity: HIGH
  message: "Admin operations require role === ADMIN verified against DB, not JWT payload"
}
```

These rules are:
1. Injected as custom Semgrep rules into Track A (deterministic checking)
2. Injected into deep_scan and cross_file AI prompts (semantic checking)

#### Outputs
- `customRules[]` (`.astra` format)
- `ruleContext` (injected into all AI scan node system prompts)

---

#### Intelligence B — Critical Paths & Failure Points

**Node:** `critical-paths`  
**Type:** AI · parallel  
**Timing:** `5–10s`

Maps the highest-value attack paths through the codebase. Tells deep_scan which files to treat as P0 priority.

| Category | Examples |
|---|---|
| Auth flows | login → session → middleware → protected routes |
| Payment flows | price calculation → charge → webhook verification |
| Data flows | user input → DB query → response |
| Entry points | all public API routes ranked by exploitability |
| Trust boundaries | where untrusted data enters the system |
| Failure points | non-atomic operations, missing validation, shared state |

#### Outputs
- `criticalPaths[]` (ordered by risk)
- `trustBoundaries[]`
- `P0 files[]` (highest priority — full deep analysis)
- `failurePoints[]` (race conditions, non-atomic ops)

---

#### Intelligence C — Scan Scope & Instruction Definition

**Node:** `scan-scope`  
**Type:** AI · parallel  
**Timing:** `5–10s`

Determines what gets scanned, in what order, with what depth, and with what AI instructions.

**Priority tier assignment:**

| Tier | Category | Examples | Treatment |
|---|---|---|---|
| P0 | Entry points | `routes/`, `api/`, `controllers/`, `server.ts` | Full deep analysis |
| P1 | Auth & security | `auth/`, `middleware/`, `*jwt*`, `*permission*` | Full deep analysis |
| P2 | Business logic | `services/`, `models/`, `*payment*`, `*user*`, `*order*` | Full deep analysis |
| P3 | Config & data | `migrations/`, `schema.*`, `config.*`, `docker-compose.*` | Standard scan |
| P4 | Other code | `utils/`, `helpers/`, `types/`, `constants/` | Lighter or skip |

**Skip list:** `node_modules/**`, `dist/**`, `.git/**`, `*.min.js`, `*.lock`, `vendor/**`, `__pycache__/**`, `.next/**`

#### Outputs
- `PrioritizedFile[]` with tier + language
- `tokenBudgetMap` (file → token allocation)
- `scanInstructions` (injected into deep_scan prompts)
- `skipList[]`

---

### P4 — Scan Orchestrator

**Node:** `scan-orch`  
**Type:** Core pipeline  
**Timing:** `< 1s`

The central dispatcher. Receives all intelligence outputs and routes work to parallel scan tracks.

#### Routing Logic

```
SystemIntelReport.hasIaC === true  →  dispatch IaC Scan
SystemIntelReport.hasSecrets === any →  dispatch Secrets Scan (always)
always                              →  dispatch Tool Scan + Supply Chain
```

#### Outputs
- 2–4 parallel `Job` records dispatched to PostgreSQL queue
- Each job carries: `localDir` + `nodeConfig` + `SystemIntelReport`

---

### P5 — Parallel Scan Tracks

Four tracks run in parallel. The JOIN gate waits for all dispatched tracks to complete before deep_scan begins.

---

#### Track A — Tool-Level Scan (Semgrep / Trivy)

**Node:** `tool-scan`  
**Type:** Deterministic (no AI)  
**Timing:** `20–60s`  
**Color:** Blue

The fast deterministic layer. Pattern-based and CVE-database tools. The grounding layer that prevents LLM hallucination — matching the VULSOLVER hybrid architecture that achieved **96.29% F1** on the OWASP Benchmark.

| Tool | Coverage | Notes |
|---|---|---|
| Semgrep | SAST · 500+ rules · all languages | Custom .astra rules from Intelligence A injected |
| Trivy | CVE · SCA · all package managers | npm, pip, go, cargo, maven, nuget, rubygems |
| Bandit | Python SAST | Complements Semgrep for Python codebases |
| Bearer CI | Data flow · PII · OWASP API | Sensitive data tracking, privacy-aware SAST |

#### Outputs
- `UnifiedFinding[]` (`category: SAST | SCA`)
- `scanner: semgrep | trivy | bandit | bearer`

---

#### Track B — IaC Scan _(conditional)_

**Node:** `iac-scan`  
**Type:** Deterministic (conditional)  
**Timing:** `10–30s`  
**Color:** Yellow  
**Condition:** Only spawned if `SystemIntelReport.hasIaC === true`

| Category | What's checked |
|---|---|
| IAM | Overprivileged roles, `*` actions/resources, admin policies |
| Network | Security groups open to `0.0.0.0/0`, RDS `publicly_accessible = true` |
| Container | `USER root`, `privileged: true`, sensitive mounts, no resource limits |
| Kubernetes | `securityContext`, network policies, RBAC misconfigs |
| Encryption | S3 without SSE, RDS without encryption, EBS unencrypted |
| Secrets in config | `ENV DB_PASS=...` in Dockerfile, hardcoded values in Helm values |

#### Outputs
- `UnifiedFinding[]` (`category: IAC`)
- `scanner: checkov | trivy-iac`

---

#### Track C — Secrets Scan

**Node:** `secrets-scan`  
**Type:** Deterministic  
**Timing:** `10–30s`  
**Color:** Red

Dedicated secrets and credential detection across **current code AND full git history**. Finds secrets that exist anywhere in the commit history — even if they were "removed" from HEAD.

> ⚠️ **Critical:** Removing a secret from code does NOT remove it from git history. Full history scan is mandatory. Any tool that only scans HEAD is incomplete.

**Pattern coverage:**

| Pattern | Service |
|---|---|
| `sk_live_`, `sk_test_` | Stripe |
| `AKIA[0-9A-Z]{16}` | AWS Access Key |
| `ghp_`, `github_pat_` | GitHub Personal Access Token |
| `sk-`, `sk-proj-` | OpenAI API Key |
| `AC[0-9a-fA-F]{32}` | Twilio Auth Token |
| `-----BEGIN RSA PRIVATE KEY-----` | RSA Private Key |
| `SG.[a-zA-Z0-9]{22,}` | SendGrid API Key |
| `xoxb-`, `xoxp-`, `xoxa-` | Slack Token |

#### Outputs
- `UnifiedFinding[]` (`category: SECRETS`) — all findings are HIGH or CRITICAL
- `scanner: gitleaks | trufflehog`

---

#### Track D — Supply Chain & SCA

**Node:** `supply-chain`  
**Type:** Deterministic + reachability analysis  
**Timing:** `15–45s`  
**Color:** Gray

Reachability-aware software composition analysis. The critical insight from Endor Labs research: **95% of CVEs live in transitive dependencies**, and most are unreachable from application code. Reachability eliminates 80% of false-positive SCA alerts.

| Check | Description |
|---|---|
| Reachability analysis | Is this vulnerable package actually called from application code? |
| Malicious packages | Typosquatting, post-install scripts, obfuscated code, dependency confusion |
| SBOM generation | SPDX + CycloneDX format saved to S3 |
| Unpinned dependencies | `^` or `*` version ranges that allow silent malicious updates |
| GitHub Actions pinning | Detect unpinned Actions (trivy-action compromised twice March 2026) |
| Supply chain patterns | Shai-Hulud npm worm class (Sep 2025 — 500+ packages compromised) |

> ⚠️ **Market Signal (March 2026):** `trivy-action` GitHub Action was retroactively compromised across 76/77 release tags. Always pin Actions to commit SHAs, not version tags.

#### Outputs
- `UnifiedFinding[]` (`category: SCA`)
- `SBOM` artifact (S3 stored: SPDX + CycloneDX)
- `reachabilityMap`

---

### P6 — Deep Scan

**Node:** `deep-scan`  
**Type:** AI · per-file  
**Timing:** `2–10 minutes`

> **Core AI engine.** Every file in the `PrioritizedFile[]` list is sent to the AI with the full `SystemIntelReport` as context. The AI acts as a senior security engineer who already knows what this system does — not a generic scanner.

**Research validation:** VULSOLVER hybrid deterministic+LLM achieved **96.29% accuracy, 96.55% F1, 100% recall** on the OWASP Benchmark (1,023 labeled samples).

#### System Prompt Structure (cumulative layers)

```
Layer 1: Role definition
  "You are a senior security engineer with 20+ years experience..."

Layer 2: SystemIntelReport context
  "This is a Stripe payments API where isAdmin is stored in JWT payload (not verified in DB).
   The file you are reviewing is the payments route. Pay particular attention to:
   auth middleware presence, Stripe API key handling, amount validation..."

Layer 3: Security guidelines
  OWASP Top 10 · CWE Top 25 · language-specific secure coding guides

Layer 4: Custom rules (from Intelligence A)
  "All /charge endpoints must verify Stripe webhook signature"
  "Amount must come from DB, not request body"

Layer 5: Scan scope instructions (from Intelligence C)
  "Priority: CRITICAL — focus on auth middleware presence and IDOR risks"

Layer 6: Output format instruction
  "Return JSON: { findings[], file_summary }"
```

#### Processing Steps

1. Read `discoveredFiles` list from `PrioritizedFile[]`
2. Filter by `maxFileBytes` (skip files larger than configured limit)
3. Batch files by `concurrency` (default: 5 parallel)
4. Per file:
   - Read file contents from `localDir`
   - Call AI provider with cumulative system prompt
   - Parse response → `UnifiedFinding[]` + `FileSummary`
   - **Write findings to PostgreSQL immediately** (streaming persist — not at end)
5. Accumulate `tokenUsage` in `ScanState`
6. Retry with exponential backoff: `maxRetries × retryBackoffMs × 2^attempt`

#### FileSummary Schema (passed to Cluster Summaries)

```typescript
interface FileSummary {
  path: string
  language: string
  purpose: string          // AI-described purpose of this file
  exports: string[]        // Key exports/functions/routes
  dependencies: string[]   // Files this module depends on
  riskAreas: string[]      // Areas of concern identified
  summary: string          // Concise AI summary for cross-file context
}
```

#### Critical Fix Applied
> **Old behaviour:** All findings written in one transaction in `persist` node at the end. A 10-minute scan that failed on persist lost everything.  
> **New behaviour:** Streaming persist — each batch of files writes findings to PostgreSQL immediately. Users see findings appear in the dashboard in real time as the scan progresses.

#### Outputs
- `UnifiedFinding[]` (`scanner: ai-deep-scan`) — streamed to PostgreSQL per batch
- `FileSummary[]` — internal, passed to `cluster_summaries`
- `tokenUsage` accumulated in `ScanState`

---

### P7 — Cluster Summaries

**Node:** `cluster-summaries`  
**Type:** Pure data (no AI)  
**Timing:** `< 5s`

> **The context window bomb fix.** Instead of dumping all 200 file summaries into one cross_file prompt, this node groups them by domain before cross-file analysis. Each cross_file call gets focused, bounded context.

Groups `FileSummary[]` from deep_scan into domain-specific clusters using fast heuristic path matching.

| Cluster | Path patterns | Examples |
|---|---|---|
| `auth` | `/auth/`, `/middleware/`, `*jwt*`, `*permission*`, `*session*` | `middleware/rbac.ts`, `auth/jwt.ts` |
| `payments` | `/payment*/`, `/stripe*/`, `/billing*/`, `/charge*/` | `routes/payments.ts`, `services/stripe.ts` |
| `api` | `/route*/`, `/controller*/`, `/handler*/`, `server.ts`, `app.ts` | `routes/index.ts`, `controllers/user.ts` |
| `config` | `.env*`, `config.*`, `migrations/`, `schema.*` | `config/database.ts`, `migrations/001.sql` |
| `data` | `/model*/`, `/repo*/`, `/db*/`, `/service*/` | `models/user.ts`, `repos/findings.ts` |
| `remaining` | Everything else | `utils/`, `helpers/`, `types/`, `constants/` |

**Context window budget:** Each cluster is sized to stay within the cross_file node's configured token limit.

#### Outputs
- `ClusterMap` — domain → `FileSummary[]`
- N cluster jobs dispatched (one per non-empty cluster)

---

### P8 — Cross File Per Cluster

**Node:** `cross-per` (N instances, parallel)  
**Type:** AI · graph reasoning  
**Timing:** `30–60s per cluster · clusters run in parallel`

AI reasons about security invariants within a single domain cluster. Focused context — bounded by the cluster — means accurate reasoning without context overflow.

#### What Each Cluster Finds

**Auth cluster:**
- Missing auth middleware: `POST /admin/users` exists in `routes.ts` but auth middleware not applied
- Privilege escalation: `isAdmin` read from JWT payload in `auth.ts`, never verified against DB in `models/user.ts`

**Payments cluster:**
- Price manipulation: `amount` comes from `req.body` in `payments.ts`, not fetched from DB
- Race condition: balance check and deduction are non-atomic across `services/wallet.ts` and `routes/transfer.ts`

**API cluster:**
- IDOR: `GET /api/invoices/:id` in `routes/invoice.ts` has no ownership check (see `models/invoice.ts`)
- Mass assignment: `User.create(req.body)` with no field allowlist

**Config cluster:**
- Debug mode in production config
- CORS `origin: '*'` in production
- Secrets in environment variable assignments

#### Outputs
- `UnifiedFinding[]` (`scanner: business-logic` — per cluster)
- `BusinessLogicRule[]` CANDIDATES (per cluster)

---

### P9 — Cross File Global

**Node:** `cross-global`  
**Type:** AI · architectural reasoning  
**Timing:** `30–90s`

> **The highest-level analysis.** Reasons across cluster summaries — not raw code — to find system-wide architectural security flaws. This is where vulnerabilities that cross domain boundaries are caught.

**Input:** Cluster summaries (~5–15K tokens total) — compact, not raw `FileSummary[]`

#### What it finds

| Class | Example |
|---|---|
| Cross-domain race conditions | TOCTOU spanning auth cluster and payments cluster |
| Cross-service privilege escalation | User can trigger admin flow via sequence across 3 services |
| Data flow violations | User input from API cluster reaches DB query in data cluster without sanitization |
| Workflow bypass | Step 3 of a 7-step checkout reachable without completing steps 1-2 |
| State machine violations | SHIPPED order cancellable via direct API call to state cluster |
| Trust boundary violations | Stripe webhook amount trusted from payload, not re-fetched from Stripe API |
| Missing rate limits | `/register` rate-limited but `/invite` endpoint achieves same with no limit |

> **Market validation:** ZeroPath research (2026): 53% of their critical security disclosures are authorization/access-control flaws. Traditional SAST detection rate for this class: near zero. This node is where Astra beats the market.

#### Outputs
- `UnifiedFinding[]` (`scanner: business-logic-global`)
- `BusinessLogicRule[]` CANDIDATES (system-wide)

---

### P10 — Rule Engine (Rile)

**Node:** `rule-engine`  
**Type:** AI + data  
**Timing:** `20–40s`

Infers reusable business logic security rules from what was observed across all scan passes. CANDIDATE rules are stored and sent to the Sec Ops workspace. Once confirmed, they become **permanent enforcement rules** injected into all future scans.

#### Lifecycle

```
Scan N:     Rule inferred  → status: CANDIDATE
            (confidence: 0.85, evidenceFiles: [payments.ts, stripe.ts])

Human review: Security engineer confirms → status: CONFIRMED

Scan N+1:   Confirmed rule injected into scan prompt
            → rule violation → BusinessLogicFinding
            → finding references the confirmed rule that caught it

Feedback:   CONFIRMED rules distributed via token validation response
            → Scan Orchestrator has the rules before scan starts
```

#### The Data Moat

> Each org's confirmed rules make Astra smarter specifically for that org's codebase. This is the Semgrep Assistant Memories equivalent — an org-specific learning layer. Every scan adds signal. Incumbents cannot replicate this retroactively with existing customers.

#### Outputs
- `BusinessLogicRule[]` (`status: CANDIDATE`)
- Written to `biz_logic_rules` PostgreSQL table
- Notification dispatched to Sec Ops review queue
- CONFIRMED rules → distributed to future scans via token validation response

---

### P11 — Triage & Enrich Critical

---

#### Triage

**Node:** `triage`  
**Type:** Logic (no AI)  
**Timing:** `< 1s`

Pure conditional routing node. Counts CRITICAL findings and routes accordingly.

```
if (criticalCount > 0):
    dispatch enrich_critical job
    dispatch finalize job (in parallel)
else:
    dispatch finalize job only
```

The threshold is configurable (`triage.severityThreshold: CRITICAL | HIGH`).

---

#### Enrich Critical _(conditional)_

**Node:** `enrich-critical`  
**Type:** AI · targeted  
**Timing:** `1–3 minutes`  
**Condition:** Only runs if CRITICAL findings exist

> **The false positive eliminator.** Re-reads the specific files referenced in CRITICAL findings with full file content — not the summary. A second AI pass with more context dramatically reduces the 78% false-positive rate that pure-LLM IDOR detection suffers from (Semgrep Claude Code study).

#### Steps

1. Take all CRITICAL `UnifiedFinding[]` from all previous nodes
2. Re-read the specific files referenced in each finding (full file content)
3. AI evaluates with full context:
   - Is this a true positive? What is the full exploit scenario?
   - Are there additional affected files not in the original finding?
   - What is the concrete remediation?
4. True positives: enrich with CVSSv3 score, exploit steps, impact, remediation
5. False positives: drop confidence below threshold → mark `INFO`
6. Expand true positives: additional affected files, broader attack surface

#### Outputs
- Enriched `UnifiedFinding[]` (updated `ai_explanation`, `ai_fix`, `exploitScore`, `confidence`)
- `FalsePositive[]` — findings dismissed by second pass

---

### P12 — Finalize

**Node:** `finalize`  
**Type:** Data + emit  
**Timing:** `5–15s`

The final stage in the customer environment. Waits for `enrich_critical` to complete (with configurable timeout), collects all findings from all tracks, and emits to the Control Plane.

#### Steps

1. Wait for `enrich_critical` (or `maxWait` timeout)
2. Collect all findings: tool scan + IaC + secrets + supply chain + deep_scan + cross_file (per cluster) + cross_file_global + enriched findings
3. SHA-256 dedup: `fingerprint = SHA256(scanner + ruleId + file + lineStart)`
4. Severity normalisation: consistent enum across all scanner outputs
5. Sort: `CRITICAL → HIGH → MEDIUM → LOW → INFO`
6. Filter: by configured severity threshold (`--fail-on` flag)
7. HTTPS POST gzip-JSON → Control Plane `/api/v1/scans` with `Bearer <token>`
8. Set exit code

#### Exit Codes

| Code | Meaning |
|---|---|
| `0` | Scan complete, no findings at or above `--fail-on` threshold |
| `1` | Scan complete, findings found at or above threshold — **CI fails, PR blocked** |
| `2` | Scan failed to complete or emit (infrastructure error) |

#### Network Failure Handling
Exponential backoff: 1s → 2s → 4s (3 retries). If all retries fail: findings written to `--output` file, exit code `2`.

---

## 5. Post-Scan: Auto-Fix & MCP

---

### Agentic Auto-Fix Engine

**Triggered by:** Dashboard action or automatic for HIGH/CRITICAL findings  
**Model:** Pixee-class — **never auto-merges, human approval mandatory**

```mermaid
flowchart TD
    FIND["CRITICAL / HIGH Finding\nwith ai_fix suggestion"]
    CLASSIFY["Classify fix type\nsimple · complex · biz-logic"]
    FETCH["Fetch full file context\ncomplete file, not just snippet"]
    AIGEN["AI generates fix\nfull context + UnifiedFinding + ai_fix seed"]
    VALIDATE["Validate fix\nparse AST · no syntax errors\nno existing tests broken"]
    DIFF["Generate unified diff\nminimal change · preserve code style"]
    BRANCH["Create branch\nastra/fix-{fingerprint-short}"]
    COMMIT["Commit\n'security: fix {title} [{severity}]'\nco-authored-by: Astra Security"]
    PR["Open Draft PR\nAI explanation + remediation notes\ndashboard link + finding reference"]
    REVIEW["Human Review\nDeveloper reviews diff"]
    APPROVE["Approve + Merge\nfinding → FIXED\nJira → Done · SLA satisfied"]
    REVISE["Request Changes\nAI refines with feedback"]
    REJECT["Reject\nmark ACCEPTED_RISK\nor FALSE_POSITIVE"]

    FIND --> CLASSIFY
    CLASSIFY -->|"simple/complex"| FETCH
    CLASSIFY -->|"biz-logic"| REVIEW
    FETCH --> AIGEN --> VALIDATE
    VALIDATE -->|"valid"| DIFF
    VALIDATE -->|"invalid"| AIGEN
    DIFF --> BRANCH --> COMMIT --> PR --> REVIEW
    REVIEW --> APPROVE & REVISE & REJECT
    REVISE --> AIGEN
```

> **Design constraint:** Never auto-merge. The Pixee model is correct — "humans approve every change." This is especially critical for business-logic fixes where AI may not fully understand the intended application behaviour.

---

### MCP / AI Agent Integration

**Architecture:** Astra as the security policy enforcement layer for AI coding agents

```
AI Coding Agent (Claude Code / Cursor / Copilot / Codex / Devin)
        │
        │  MCP protocol
        ▼
Astra MCP Server
        │
        ├── check_policy(code)     → policy violation? | clean
        ├── scan_file(path)        → per-file findings in < 60s
        ├── get_findings(repo)     → existing open findings for context
        ├── verify_fix(diff)       → does this fix actually resolve the finding?
        └── get_business_rules(repo) → confirmed rules as agent context
```

**Agent workflow:**
```
Agent writes code
    → check_policy(code)
    → if violation: agent must revise before commit
    → if clean: agent commits
    → astra/scanner triggered by PR
    → scan_file(path) for changed files
    → verify_fix(diff) for proposed fixes
```

> **Forward moat:** As Claude Code, Cursor, and Devin become the primary code writers, Astra becomes the mandatory security gate they must pass through. Every AI-generated PR is policy-checked before merge.

---

## 6. Control Plane Nodes

---

### Ingest & Dedup

Receives the gzip-compressed findings payload from the data plane.

| Step | Action |
|---|---|
| 1 | Validate Bearer token: SHA-256 hash lookup in `scan_tokens` table |
| 2 | Org ownership check: does this token own this repo? |
| 3 | Rate limit check: per-token ingest rate |
| 4 | Decompress gzip: parse `UnifiedFinding[]` + `BusinessLogicRule[]` |
| 5 | DEDUP: fingerprint lookup in Redis cache (TTL 30 days) |
| 6 | New finding: `INSERT` with `status: NEW`, `first_seen: now()` |
| 7 | Existing finding: `UPDATE last_seen`, `occurrence_count++` |
| 8 | Create scan record: branch, commitSha, duration, `finding_counts{}` |

---

### Policy & SLA Engine

Matches each finding against configured policy rules.

**Condition fields:** `severity` · `category` · `scanner` · `file_pattern` · `language` · `exploit_score`

**Action types:** `create_jira` · `notify_slack` · `page_pagerduty` · `post_webhook` · `fail_scan` · `merge_block` · `allowlist`

**SLA defaults:**

| Severity | SLA deadline |
|---|---|
| CRITICAL | 24 hours |
| HIGH | 72 hours |
| MEDIUM | 14 days |
| LOW | 30 days |

SLA breach monitoring: background job every 15 minutes, escalate on breach.

---

### AI Exploit Scoring & Triage

Hybrid deterministic+LLM triage with org-specific learning (Semgrep Assistant Memories pattern).

| Feature | Description |
|---|---|
| exploit_score | 0.0–10.0 based on reachability, auth required, known exploit patterns |
| Hybrid architecture | Semgrep-style AST grounding + frontier model reasoning (VULSOLVER) |
| Org memory | Past triage decisions accumulate → ~20% triage automation baseline |
| Learned rules | Finding-specific models trained on org's history |
| Priority ranking | `exploit_score × severity × asset_criticality` → final order |
| Auto-dismiss | Findings below confidence threshold, justification logged |

---

### Business Logic Rule Lifecycle

```
Rule inferred by Rile → CANDIDATE (confidence: 0.85)
          ↓
Human Review (Sec Ops workspace)
    ├── Confirm → CONFIRMED (distributed to future scans)
    ├── Edit + Confirm → CONFIRMED (engineer-refined)
    └── Reject → REJECTED (no future enforcement)
          ↓
CONFIRMED rules → included in GET /api/v1/auth/validate-token response
          ↓
Data plane receives rules at scan start → injected into every AI prompt
          ↓
Future scans enforce rules automatically → BusinessLogicFinding if violated
```

---

### Integrations Module

| Integration | What it does |
|---|---|
| **Jira** | Auto-create tickets; severity→priority (CRITICAL→P1); bi-directional status sync |
| **Slack** | Blocks API messages; severity badge; AI explanation excerpt; SLA alerts; digest mode |
| **PagerDuty** | Events API v2; CRITICAL → create incident; auto-resolve when finding → FIXED |
| **GitHub/GitLab** | PR inline comments; commit status check; merge blocking (`required status check`) |
| **Webhooks** | HMAC-SHA256 signed POST; 3× retry with exponential backoff; custom payload |
| **Email** | Weekly digest; SLA breach alerts to assignee + admins; PDF executive report |
| **SARIF** | GitHub Code Scanning; Azure DevOps; other security tooling integrations |
| **MCP Server** | AI agent policy enforcement layer |
| **SSO/IdP** | Okta, Azure AD, Google — SAML + OIDC |

---

### Dashboard — Three Workspaces

#### Executive Workspace
- Org risk score 0–100 (composite, with 30-day trend)
- Compliance posture: OWASP Top 10, CWE Top 25, SOC 2, PCI-DSS, HIPAA
- Finding trend chart: CRITICAL/HIGH/MEDIUM/LOW stacked area, 90 days
- SLA breach summary by severity
- Remediation velocity: avg time-to-fix by severity
- PDF executive report (on-demand or scheduled)

#### Engineering Workspace
- Per-repo finding list with filter: severity, category, scanner, state, file, date
- Finding detail: code snippet, AI explanation, `ai_fix`, CWE/OWASP tags, history
- PR scan results: new vs existing vs resolved delta per PR
- Suppress/Override: `FALSE_POSITIVE`, `ACCEPTED_RISK` with justification
- **Real-time:** Findings appear as deep_scan batches complete (streaming persist)

#### Sec Ops Workspace
- Finding assignment to team members
- SLA tracker: sorted by deadline, breach countdown timers
- Jira lifecycle: bi-directional status sync
- Policy rule builder: no-code condition + action UI
- **Business logic rule review queue:** Confirm/Edit/Reject CANDIDATE rules with evidence files
- Scan token manager: create, rotate, revoke
- Audit log: all user actions with before/after diff

---

## 7. Storage Architecture

```
PostgreSQL 16  ────────────────────────────────────────────────
  findings         (id, fingerprint, severity, file, state...)
  scans            (id, status, branch, commitSha, duration...)
  jobs             (id, scanId, node, status, inputJson, outputJson)
  biz_logic_rules  (id, ruleText, confidence, status, evidenceFiles)
  policies         (id, conditions{}, actions{}, priority)
  scan_tokens      (id, hash, orgId, revokedAt)
  ai_call_logs     (id, provider, model, tokens, durationMs, request+response)
  audit_log        (id, userId, action, before{}, after{})
  orgs, users, repos, sessions

Redis 7  ───────────────────────────────────────────────────────
  Dedup cache      fingerprint → finding_id  (TTL: 30 days)
  Job queue        BullMQ pending/active/completed jobs
  SSE pub/sub      live finding events → WebSocket/SSE consumers
  Session store    JWT session data (TTL: 24h)
  Rate limiters    per-token, per-IP counters (TTL: 60s)

S3 / MinIO  ────────────────────────────────────────────────────
  Scan artifacts   raw scanner JSON output per scanner per scan
  Gzip payloads    original HTTPS POST body (90-day retention)
  PDF reports      executive reports generated on demand
  SBOM exports     SPDX + CycloneDX per repo per scan
```

---

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| AI architecture | Hybrid deterministic+LLM | VULSOLVER: 96.29% accuracy. Pure LLM: 78% false-positive rate on IDORs |
| Context strategy | SystemIntelReport injected everywhere | Transforms generic scan into expert domain-aware audit |
| Cross-file approach | Clustered (not one giant prompt) | Avoids context window bomb; focused reasoning per domain |
| Persist strategy | Streaming per batch | Eliminates data loss on persist failure; enables live dashboard |
| Enrich Critical | Second pass on CRITICAL only | Reduces FP on highest-impact findings without slowing overall scan |
| Rule feedback | CONFIRMED rules → future scans | Long-term org-specific data moat that compounds over time |
| Auto-fix | Never auto-merge | Pixee model — business-logic fixes especially require human judgement |
| MCP server | AI agent policy gate | Forward moat: as AI coding agents dominate, Astra becomes mandatory |
| Parallelism | 4 scan tracks + N cluster passes | ~40–60% faster than sequential; tracks are data-independent |
| Token budget | Per-file allocation by tier | P0 files get full analysis; P4 files get lighter treatment |
| Stuck jobs | Cleanup at `maxRunningTime` | Configurable per-node, not global 10-minute cutoff |
| State persistence | PostgreSQL job queue | Achieves LangGraph checkpointing durability without streaming overhead |

---

## 9. Node Summary Table

| Node | Phase | Type | Timing | Color |
|---|---|---|---|---|
| URL / Repo Source | P0 | Entry | < 1s | Blue |
| Clone | P1 | Core | 2–15s | Blue |
| Repo Intel (Diagram & Ingest) | P2 | AI · 1 call | 3–8s | Purple |
| Intelligence A — Rule Gen | P3 | AI · parallel | 5–10s | Purple |
| Intelligence B — Critical Paths | P3 | AI · parallel | 5–10s | Purple |
| Intelligence C — Scan Scope | P3 | AI · parallel | 5–10s | Purple |
| Scan Orchestrator | P4 | Logic | < 1s | Blue |
| Track A — Tool Scan (Semgrep/Trivy) | P5 | Deterministic | 20–60s | Blue |
| Track B — IaC Scan | P5 | Deterministic · conditional | 10–30s | Yellow |
| Track C — Secrets Scan | P5 | Deterministic | 10–30s | Red |
| Track D — Supply Chain & SCA | P5 | Deterministic | 15–45s | Gray |
| Deep Scan | P6 | AI · per-file | 2–10 min | Teal |
| Cluster Summaries | P7 | Data · no AI | < 5s | Teal |
| Cross File Per Cluster (×N) | P8 | AI · parallel | 30–60s/cluster | Green |
| Cross File Global | P9 | AI · reasoning | 30–90s | Green |
| Rile — Rule Engine | P10 | AI + data | 20–40s | Purple |
| Triage | P11 | Logic · no AI | < 1s | Blue |
| Enrich Critical | P11b | AI · conditional | 1–3 min | Red |
| Finalize | P12 | Data + emit | 5–15s | Gray |
| Agentic Auto-Fix | Post | AI · human-gated | 30–120s/fix | Orange |
| MCP Server | Continuous | API · real-time | < 60s/call | Orange |
| CP Ingest & Dedup | CP | Data | 2–10s | Purple |
| CP Policy & SLA Engine | CP | Logic | < 1s/finding | Purple |
| CP AI Exploit Scoring | CP | AI · hybrid | 5–30s | Blue |
| CP Biz Logic Queue | CP | Data | < 1s | Purple |
| CP Human Review | CP | Human-driven | Async | Purple |
| CP Confirmed Rules Store | CP | Data | Persistent | Green |
| CP Integrations Module | CP | API calls | 1–5s | Gray |
| CP Dashboard API | CP | REST/WS/SSE | < 50ms p99 | Blue |
| CP Dashboard (3 workspaces) | CP | React SPA | Real-time | Blue |
| CP Storage (PG + Redis + S3) | CP | Persistence | Sync writes | Gray |

**Total: 24 unique nodes (31 including parallel instances)**

---

*Astra Security Platform — Enterprise Scan Pipeline Reference*  
*v4.0 · 2026-05-09*
