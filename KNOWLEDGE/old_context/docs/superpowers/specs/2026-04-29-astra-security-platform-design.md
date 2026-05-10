# Astra Security Platform — Design Specification

**Date:** 2026-04-29
**Status:** Draft — pending user approval
**Version:** 0.1

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Architecture](#3-architecture)
4. [Data Plane — Scanner Orchestration](#4-data-plane--scanner-orchestration)
5. [AI Engine](#5-ai-engine)
6. [Business Logic Flaw Engine](#6-business-logic-flaw-engine)
7. [Control Plane — Module Design](#7-control-plane--module-design)
8. [Data Models](#8-data-models)
9. [Dashboard — Component Breakdown](#9-dashboard--component-breakdown)
10. [Integration Contracts](#10-integration-contracts)
11. [Deployment & Packaging](#11-deployment--packaging)
12. [Security Model](#12-security-model)
13. [Observability](#13-observability)
14. [Licensing & Feature Gates](#14-licensing--feature-gates)
15. [Language Support Matrix](#15-language-support-matrix)

---

## 1. Overview

Astra is a closed-source, enterprise-grade application security platform that combines static analysis (SAST), software composition analysis (SCA), secret scanning, IaC scanning, sensitive data flow analysis, and AI-assisted business logic flaw extraction into a single unified workflow.

It is designed for three personas operating in concert:

- **Security engineers** — run deep audits, configure policies, manage findings
- **DevOps / platform teams** — embed Astra into existing CI pipelines with minimal friction
- **Enterprise security leadership (CISO)** — track risk posture, compliance, and remediation velocity across the entire engineering org

The system is architecturally split into a **control plane** (stateful, hosted by Astra or self-hosted) and a **data plane** (stateless Docker container, runs in the customer's CI environment). Raw source code never leaves the customer's environment. Only structured finding JSON crosses the boundary.

---

## 2. Goals & Non-Goals

### Goals

- Provide a single `astra scan` command that runs multiple security scanners in parallel and emits unified findings
- Support pluggable scanner architecture so customers can add proprietary or third-party tools
- Run AI enrichment (explanation, fix guidance, exploitability scoring) inside the data plane — no raw code sent to external AI providers unless the org explicitly opts in
- Infer business logic rules from source code via AI, present them for human confirmation, and enforce them in future scans
- Provide three role-specific dashboard workspaces (Executive, Engineering, Sec Ops)
- Integrate with Slack, Jira, PagerDuty, GitHub, GitLab, and generic webhooks
- Support three deployment models: SaaS, self-hosted, hybrid
- Be fully closed-source — the compiled binary is the product
- Gate features by license tier: Free, Pro, Enterprise

### Non-Goals (v1)

- Runtime application security (RASP, IAST) — static analysis only in v1
- Mobile application scanning (iOS/Android) — not in scope
- Fuzzing or dynamic analysis (DAST) — future roadmap
- Multi-tenant SaaS (multiple orgs on a single deployment) — single-tenant per deployment in v1
- Supporting CI platforms other than GitHub Actions, GitLab CI, Jenkins, and generic Docker in v1

---

## 3. Architecture

### 3.1 Deployment Topology

```
┌─────────────────────────────────────────────────────┐
│  CUSTOMER CI ENVIRONMENT                            │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  DATA PLANE — astra/agent Docker container   │  │
│  │  (closed-source binary, stateless)           │  │
│  │                                              │  │
│  │  Trivy · Semgrep · Bearer · Gitleaks ·       │  │
│  │  Checkov · Bandit · Plugin scanners          │  │
│  │  AI Engine (Ollama / Bedrock / Cloud)        │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │ HTTPS POST (findings JSON only)   │
└─────────────────┼───────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────┐
│  CONTROL PLANE — Go modular monolith                │
│  (Astra-hosted · self-hosted · hybrid)              │
│                                                     │
│  Auth · Findings · Policies · AI Orchestration      │
│  Integrations · Dashboard API                       │
│                                                     │
│  PostgreSQL · Redis · S3                            │
└─────────────────┬───────────────────────────────────┘
                  │ REST + WebSocket
          ┌───────▼────────┐     ┌─────────────────┐
          │  React SPA     │     │  Integrations   │
          │  Dashboard     │     │  Slack · Jira   │
          │  3 workspaces  │     │  PagerDuty etc. │
          └────────────────┘     └─────────────────┘
```

### 3.2 Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Control plane language | Node.js 22 + TypeScript | Same language as agent and dashboard, shared types via monorepo |
| Control plane framework | Fastify v5 | Fastest Node.js HTTP framework, first-class TypeScript, Zod schema validation |
| Control plane shape | Modular monolith | Fastify plugins per module; cleaner boundaries than microservices at this stage |
| Data plane shape | Stateless Docker container | No infra to manage in customer CI; version updates are image tag bumps |
| Database | PostgreSQL 16 | Relational model fits findings + policies; JSONB for raw payloads |
| ORM | Drizzle ORM | TypeScript-first, SQL-like query builder, lightweight, excellent DX |
| Migrations | Drizzle Kit | TypeScript schema files, auto-generated SQL, versioned |
| Queue/cache | Redis 7 (ioredis) | Job queues, WebSocket pub/sub, dedup cache, sessions |
| Object store | S3-compatible | Scan artifacts, PDF reports; abstracted so self-hosted can use MinIO |
| Dashboard | Next.js 15 (App Router) | Full-stack React with server components; same TS types as API |
| AI abstraction | Provider interface in TS | Swap models without changing business logic |
| Monorepo | Turborepo + pnpm | Single source of truth for types across API, agent, dashboard |
| IPC between data/control plane | HTTPS REST | Simple, auditable, firewall-friendly; no gRPC complexity at this stage |

### 3.3 Control / Data Plane Boundary

The boundary is strict and enforced by design:

- **Data plane sends:** compressed JSON array of `UnifiedFinding` objects + scan metadata
- **Data plane never sends:** raw source code, file contents, dependency files, git history
- **Control plane sends to data plane:** scan configuration (policy rules, scanner config, AI model config, scan token validation response)
- **Control plane never receives:** anything that resembles source code

AI inference runs inside the data plane container. For orgs using Ollama, all AI computation is local. For orgs using Bedrock, data stays within their AWS account. Cloud AI providers (OpenAI, Anthropic) are opt-in at the org level and require explicit administrator consent.

---

## 4. Data Plane — Scanner Orchestration

### 4.1 Entry Point

The agent is a Node.js CLI (`astra scan`) that accepts:

```
astra scan [flags]

Flags:
  --token         string   Astra scan token (required, or ASTRA_TOKEN env var)
  --control-plane string   Control plane URL (default: https://api.astra.security)
  --repo          string   Path to repo root (default: current directory)
  --diff-only              Scan only files changed in the current PR/MR
  --branch        string   Branch name (auto-detected from git)
  --commit        string   Commit SHA (auto-detected from git)
  --pr            string   Pull request number (auto-detected from CI env vars)
  --fail-on       string   Minimum severity to fail CI: CRITICAL|HIGH|MEDIUM|LOW (default: HIGH)
  --output        string   Local output file for findings JSON (fallback if control plane unreachable)
  --format        string   Output format for local file: json|sarif (default: json)
  --timeout       int      Max scan duration in seconds (default: 300)
  --config        string   Path to .astra/config.yml (default: auto-discovered)
```

### 4.2 Scan Execution Pipeline

**Phase 1 — Startup & Validation**
1. Validate scan token against control plane (`GET /api/v1/auth/validate-token`)
2. Fetch org configuration (enabled scanners, AI config, policy thresholds, custom rules)
3. Confirm license tier and enabled feature flags

**Phase 2 — Context Collection**
1. Detect languages via file extension + shebang + content heuristics
2. Collect repo metadata: name, branch, commit SHA, PR number, author, timestamp
3. If `--diff-only`: collect list of changed files from git diff
4. Locate dependency manifests: `package.json`, `go.mod`, `requirements.txt`, `Pipfile`, `pom.xml`, `build.gradle`, `Cargo.toml`, `Gemfile`, `composer.json`
5. Detect Dockerfile, Terraform, Helm, K8s manifests, CloudFormation templates

**Phase 3 — Parallel Scanner Execution**

All enabled scanners run concurrently via a bounded worker pool (default: 4 workers). Each scanner implements:

```go
type Scanner interface {
    Name()               string
    Version()            string
    SupportedLanguages() []Language
    SupportedCategories() []Category
    IsAvailable()        bool
    Run(ctx context.Context, target ScanTarget) ([]RawFinding, error)
}
```

`ScanTarget` contains:
- Root path
- Language map
- Changed files list (if diff-only)
- Manifest paths
- Scanner-specific config from org settings

**Phase 4 — Normalization**

The normalizer maps every scanner's native output to `UnifiedFinding`. Each scanner has a dedicated normalizer function. Normalization responsibilities:
- Parse native JSON/SARIF/text output
- Map severity strings to the canonical enum (`CRITICAL|HIGH|MEDIUM|LOW|INFO`)
- Compute `fingerprint`: SHA-256 of `(scanner_name + rule_id + relative_file_path + line_start + code_snippet_hash)`
- Map scanner categories to canonical `Category` enum
- Extract CWE and OWASP tags where available
- Preserve raw output in the `raw` field

**Phase 5 — AI Enrichment**

After normalization, findings are batched and sent to the AI engine (runs in-process). Each finding receives:
- `ai_explanation`: 2-3 sentence plain-English explanation of why this finding is dangerous in the context of this specific codebase
- `ai_fix`: Language-specific remediation code snippet
- `exploit_score`: 0.0–10.0 float representing likelihood of real-world exploitability, considering reachability, authentication requirements, and known exploit patterns

The AI also performs a full-repo business logic analysis pass (see Section 6).

**Phase 6 — Emission**

Findings are POST'd to the control plane:

```
POST /api/v1/scans
Authorization: Bearer <scan-token>
Content-Type: application/json
Content-Encoding: gzip

{
  "scan_metadata": { ... },
  "findings": [ ... ]
}
```

On network failure: exponential backoff (1s, 2s, 4s), 3 retries. If all retries fail, findings are written to `--output` file and the CI step exits with code 2 (distinct from security failure exit code 1).

**Exit Codes:**
- `0` — scan complete, no findings at or above `--fail-on` threshold
- `1` — scan complete, findings found at or above `--fail-on` threshold (CI fails, PR blocked)
- `2` — scan failed to complete or emit (infrastructure error)

### 4.3 Bundled Scanners

| Scanner | Version pinned | Languages | Categories | Notes |
|---|---|---|---|---|
| Trivy | pinned in image | All (dep scanning) · Dockerfile · Terraform | SCA · IaC · Container | CVE database updated weekly in image build |
| Semgrep | pinned in image | Python · JS/TS · Java · Go · Ruby · Rust · Scala · R | SAST | 500+ Astra-curated rules bundled; org custom rules supported |
| Bearer CI | pinned in image | Python · JS/TS · Java · Ruby · Go | Data Flow · OWASP API | Sensitive data flow, PII detection |
| Gitleaks | pinned in image | All (text scan) | Secrets | Scans current code + git history |
| Checkov | pinned in image | Terraform · CloudFormation · Helm · K8s · Dockerfile | IaC | 1000+ checks |
| Bandit | pinned in image | Python | SAST | Python-specific; complements Semgrep for Python |

### 4.4 Plugin Scanner Interface

Customers define additional scanners in `.astra/plugins.yml`:

```yaml
plugins:
  - name: custom-sast
    command: ./tools/custom-sast --format json --path {target}
    output_format: json          # json | sarif
    severity_field: risk_level   # field name in output JSON
    severity_map:
      high: HIGH
      medium: MEDIUM
      low: LOW
    category: SAST
    languages: [python, javascript]
```

The agent discovers this file, executes each plugin command, and passes output through the normalizer. Plugin output must be either JSON or SARIF.

---

## 5. AI Engine

### 5.1 Provider Abstraction

All AI interaction goes through a single TypeScript interface:

```go
type AIProvider interface {
    Name()    string
    Enrich(ctx context.Context, req EnrichRequest) (EnrichResponse, error)
    Analyze(ctx context.Context, req AnalyzeRequest) (AnalyzeResponse, error)
    IsAvailable() bool
}
```

Implementations:
- `OllamaProvider` — local HTTP to Ollama daemon, model configurable (default: `codellama:13b`)
- `BedrockProvider` — AWS SDK v2, model configurable (default: `meta.llama3-70b-instruct-v1`)
- `OpenAIProvider` — OpenAI API, model configurable (default: `gpt-4o`)
- `AnthropicProvider` — Anthropic API, model configurable (default: `claude-opus-4-7`)

Provider selection is determined by org configuration fetched from the control plane at scan startup. If no AI provider is configured or the provider is unreachable, the agent proceeds without AI enrichment and logs a warning — AI is additive, not blocking.

### 5.2 Enrichment Request / Response

```go
type EnrichRequest struct {
    Finding     UnifiedFinding
    CodeContext string   // ±10 lines around the finding
    Language    string
    RepoSummary string   // brief description of what the repo does (from README)
}

type EnrichResponse struct {
    Explanation  string   // plain English, 2-3 sentences
    Fix          string   // code snippet in the finding's language
    ExploitScore float64  // 0.0–10.0
    References   []string // CVE/CWE links where applicable
}
```

### 5.3 Prompt Design

Prompts are version-controlled inside the agent binary. They are not configurable by end users (proprietary logic). Each prompt includes:

- System role: experienced application security engineer
- Finding details: rule, severity, file, code snippet
- Repo context: language, framework hints from dependency manifests
- Instruction: explain the real-world risk, provide a concrete fix, score exploitability
- Output format: structured JSON (parsed from model response)

Response parsing includes a JSON extraction step with fallback regex for models that wrap JSON in markdown code blocks.

### 5.4 Token and Cost Management

- Findings are batched: max 20 findings per AI request to stay within context limits
- Code context is trimmed to ±10 lines maximum
- `exploit_score` is cached by fingerprint — if the same finding appears in a future scan, the cached score is reused without re-querying the AI
- For Ollama: no external cost; compute is bounded by the CI runner's resources
- For Bedrock/cloud: token usage is tracked per scan and exposed in the dashboard for cost visibility

---

## 6. Business Logic Flaw Engine

### 6.1 Overview

This is Astra's primary differentiator. Standard SAST tools detect known vulnerability patterns. The business logic engine detects *application-specific* flaws — violations of the rules that govern how the application is supposed to behave.

Examples of business logic flaws this engine targets:
- Payment amount can be set to zero or negative, bypassing charge logic
- Discount codes can be applied multiple times in a single order
- A user can access another user's resources by manipulating an ID parameter (IDOR)
- A rate-limited endpoint has a bypass via an alternative route
- An admin-only action is accessible without privilege check in a specific code path

### 6.2 Hybrid AI + Human Loop

```
Phase A — AI Inference (runs in data plane, per scan)
  ↓
  AI reads entry points: controllers, route handlers, API endpoints
  AI reads business entities: models, schemas, domain objects
  AI reads authorization checks: middleware, guards, decorators
  AI reads transaction logic: service layer, use cases
  ↓
  AI produces a list of candidate business rules:
    {
      "rule": "Order total must be positive before payment is processed",
      "confidence": 0.91,
      "evidence": ["src/orders/checkout.go:47", "src/payments/charge.go:12"],
      "potential_violation": "Line 47 does not validate total > 0 before calling ChargeCard()"
    }
  ↓
  Candidate rules sent to control plane as part of scan result

Phase B — Human Confirmation (control plane + dashboard)
  ↓
  Security team reviews candidate rules in Sec Ops workspace
  Each rule: Confirm | Edit | Reject
  Confirmed rules stored in org policy database with:
    - rule text
    - evidence file paths
    - confirming user + timestamp
    - rule ID (stable)

Phase C — Enforcement (data plane, future scans)
  ↓
  Agent fetches confirmed rules from control plane at scan startup
  AI checks each confirmed rule against current codebase
  Violations emitted as findings with category=BUSINESS_LOGIC
  Severity defaults to HIGH; overridable per rule
```

### 6.3 Rule Storage Schema

```
BusinessLogicRule
  id             UUID (stable, deterministic from rule text hash)
  org_id         UUID
  repo_id        UUID (null = org-wide rule)
  rule_text      string
  evidence_paths []string
  status         enum: CANDIDATE | CONFIRMED | REJECTED | ARCHIVED
  confidence     float (AI-assigned, 0.0–1.0)
  severity       enum: CRITICAL | HIGH | MEDIUM | LOW
  created_by     string (user ID or "ai")
  confirmed_by   string (user ID, null if unconfirmed)
  created_at     timestamp
  confirmed_at   timestamp
  last_violated  timestamp
  violation_count int
```

### 6.4 Enforcement Prompt Design

For each confirmed rule, the agent sends a targeted prompt:

```
Given this business rule: "{rule_text}"
And this evidence it was identified from: {evidence_paths}
Review the current version of these files and determine:
1. Is the rule still present/enforced in the code?
2. If not, describe the specific violation and which lines are involved.
Output JSON: { "violated": bool, "description": string, "file": string, "line": int }
```

---

## 7. Control Plane — Module Design

The control plane is a Fastify v5 application in Node.js with six internal modules. Packages communicate through exported interfaces, never by importing each other's internal types. The HTTP layer is a thin router (Chi) that calls into package-level service functions.

### 7.1 Auth Module (`internal/auth`)

Responsibilities:
- User registration, login, session management
- SSO: SAML 2.0 SP, OIDC client (Okta, Azure AD, Google Workspace)
- RBAC: roles are `ORG_ADMIN | SECURITY_ENGINEER | DEVELOPER | VIEWER` per org
- Scan token lifecycle: create, rotate, revoke, validate
- API key management for programmatic access

Token validation endpoint (`GET /api/v1/auth/validate-token`) is the only endpoint called by the data plane. It returns:
```json
{
  "valid": true,
  "org_id": "...",
  "repo_id": "...",
  "config": { "scanners": [...], "ai_provider": {...}, "thresholds": {...} }
}
```

### 7.2 Findings Module (`internal/findings`)

Responsibilities:
- Receive and store findings from data plane
- Deduplicate by fingerprint: if finding exists, update `last_seen` and `occurrence_count`; do not create duplicate
- Compute finding state transitions: `NEW → TRIAGED → FIXED | ACCEPTED_RISK | FALSE_POSITIVE`
- Expose findings query API with filters: severity, category, scanner, repo, date range, state, assignee
- Track finding trends over time (aggregated per day, per repo, per org)

Ingest endpoint:
```
POST /api/v1/scans
Body: { scan_metadata, findings[] }
Response: { scan_id, ingested_count, deduplicated_count, new_count }
```

### 7.3 Policies Module (`internal/policies`)

Responsibilities:
- Store and evaluate routing rules: if `severity=CRITICAL AND category=SECRETS`, then `create_jira(project=SEC, priority=P1) AND notify_slack(channel=#sec-critical)`
- Store per-repo and org-wide fail thresholds
- Store allowlists: suppress specific rule IDs for specific files or repos
- Store SLA definitions: `CRITICAL → 24h | HIGH → 72h | MEDIUM → 2w | LOW → 30d`
- Trigger SLA breach alerts when deadlines are missed

Policy rules are evaluated in the control plane immediately after findings are ingested. Evaluation is synchronous for routing; SLA timers run as background jobs.

### 7.4 AI Orchestration Module (`internal/aiorchestration`)

Responsibilities:
- Store candidate business logic rules received from data plane scans
- Expose the rule review queue API for the Sec Ops workspace
- Accept human confirm/edit/reject actions and persist rule status changes
- Distribute confirmed rules to the data plane via the token validation response
- Track rule violation history
- Manage AI provider configuration per org (which provider, which model, API keys encrypted at rest)

### 7.5 Integrations Module (`internal/integrations`)

Each integration is a Go interface implementation:

```go
type Integration interface {
    Name()    string
    Send(ctx context.Context, event IntegrationEvent) error
    Validate(ctx context.Context, config IntegrationConfig) error
}
```

**Jira:**
- Creates issues via Jira REST API v3
- Maps Astra severity → Jira priority (`CRITICAL→P1, HIGH→P2, MEDIUM→P3, LOW→P4`)
- Stores Jira issue key on the finding for bi-directional status sync
- Transitions Jira issue to Done when finding is marked FIXED

**Slack:**
- Posts to configured channel(s) via Slack Blocks API
- Message includes: finding title, severity badge, repo, file+line, AI explanation excerpt, link to dashboard
- Digest mode: batch findings into a single message per scan (configurable)

**PagerDuty:**
- Creates incident for CRITICAL findings via Events API v2
- Auto-resolves incident when finding is marked FIXED

**GitHub / GitLab:**
- Posts PR/MR comments with inline finding annotations
- Updates commit status check (pass/fail) based on threshold evaluation
- Uses repo's native token (stored in org config, encrypted)

**Webhooks:**
- Outbound POST to customer-configured URL
- Payload: `IntegrationEvent` JSON (standardized schema)
- HMAC-SHA256 signature header for authenticity verification
- Retry: 3 attempts with exponential backoff

**Email:**
- Weekly digest (configurable: daily/weekly/off)
- SLA breach notifications to finding assignee + org admins
- Executive report delivery (PDF attached, generated from dashboard data)

### 7.6 Dashboard API Module (`internal/dashboardapi`)

- REST API v1: all dashboard data operations
- WebSocket: live scan progress, real-time finding ingest notifications
- GraphQL (Enterprise): flexible querying for reports and custom dashboards
- OpenAPI 3.0 spec auto-generated and published at `/api/docs`

---

## 8. Data Models

### 8.1 UnifiedFinding

```
id                  UUID (generated on first ingest)
fingerprint         string (SHA-256, computed by data plane, stable across scans)
org_id              UUID
repo_id             UUID
scan_id             UUID
scanner             string
rule_id             string
title               string
description         string
severity            enum: CRITICAL | HIGH | MEDIUM | LOW | INFO
cvss_score          float (nullable)
exploit_score       float (AI-assigned, 0.0–10.0, nullable)
category            enum: SAST | SCA | SECRETS | IAC | DATA_FLOW | BUSINESS_LOGIC
file                string (relative path)
line_start          int
line_end            int
code_snippet        string
language            string
cwe                 string[] (e.g. ["CWE-89"])
owasp               string[] (e.g. ["A03:2021"])
ai_explanation      string (nullable)
ai_fix              string (nullable)
ai_references       string[] (nullable)
remediation         string (scanner-provided)
state               enum: NEW | TRIAGED | FIXED | ACCEPTED_RISK | FALSE_POSITIVE
assignee_id         UUID (nullable)
jira_issue_key      string (nullable)
sla_deadline        timestamp (nullable, set by policy on ingest)
sla_breached        bool
first_seen          timestamp
last_seen           timestamp
occurrence_count    int
raw                 jsonb (original scanner output)
```

### 8.2 Scan

```
id                  UUID
org_id              UUID
repo_id             UUID
branch              string
commit_sha          string
pr_number           string (nullable)
triggered_by        string (CI system: "github_actions" | "gitlab_ci" | "jenkins" | "cli")
started_at          timestamp
completed_at        timestamp (nullable)
status              enum: RUNNING | COMPLETED | FAILED | PARTIAL
duration_seconds    int
scanners_run        string[]
finding_counts      jsonb { CRITICAL: int, HIGH: int, MEDIUM: int, LOW: int, INFO: int }
new_finding_count   int
ai_provider_used    string (nullable)
agent_version       string
```

### 8.3 Org

```
id                  UUID
name                string
slug                string (unique, URL-safe)
plan                enum: FREE | PRO | ENTERPRISE
ai_provider_config  jsonb (encrypted fields for API keys)
sso_config          jsonb (SAML/OIDC metadata)
created_at          timestamp
seat_count          int
```

### 8.4 PolicyRule

```
id                  UUID
org_id              UUID
repo_id             UUID (nullable, null = org-wide)
name                string
conditions          jsonb: { severity, category, scanner, language, file_pattern }
actions             jsonb: { create_jira, notify_slack, page_pagerduty, webhook, fail_scan }
priority            int (lower = evaluated first)
enabled             bool
created_by          UUID
created_at          timestamp
```

### 8.5 Repo

```
id                  UUID
org_id              UUID
name                string
provider            enum: GITHUB | GITLAB | BITBUCKET | GENERIC
provider_repo_id    string (platform-native ID)
default_branch      string
languages           string[]
last_scanned_at     timestamp
risk_score          int (0–100, computed)
scan_token_id       UUID
```

---

## 9. Dashboard — Component Breakdown

### 9.1 Navigation Shell

The top-level shell renders:
- Org logo + name (top-left)
- Workspace switcher: `Executive | Engineering | Sec Ops` (tab bar, role-gated)
- Org/repo context switcher (top-right dropdown)
- User menu + logout
- Global search (findings, repos, rules)
- Notification bell (SLA breaches, new critical findings)

### 9.2 Executive Workspace

| Component | Data source | Description |
|---|---|---|
| Org Risk Score | `GET /api/v1/orgs/{id}/risk-score` | 0–100 composite score; trend arrow vs. 30 days ago |
| Compliance Posture | `GET /api/v1/orgs/{id}/compliance` | Coverage across OWASP Top 10, CWE Top 25, SOC 2 |
| Finding Trend Chart | `GET /api/v1/findings/trends` | Stacked area chart: CRITICAL/HIGH/MEDIUM/LOW over 90 days |
| Top Vulnerable Repos | `GET /api/v1/repos?sort=risk_score&limit=10` | Table with repo name, risk score, critical count, last scan |
| SLA Breach Summary | `GET /api/v1/findings?sla_breached=true` | Count by severity; link to Sec Ops workspace |
| Remediation Velocity | `GET /api/v1/orgs/{id}/velocity` | Avg time to fix by severity over 30 days |
| Executive PDF Report | `POST /api/v1/reports/executive` | Generated on demand or scheduled; emailed as PDF |

### 9.3 Engineering Workspace

| Component | Data source | Description |
|---|---|---|
| Repo Finder | `GET /api/v1/repos` | Searchable repo list with risk badges |
| Finding List | `GET /api/v1/findings` | Filterable by severity, category, scanner, state, file, date |
| Finding Detail Panel | `GET /api/v1/findings/{id}` | Code snippet, AI explanation, AI fix, CWE/OWASP tags, history |
| PR Scan Results | `GET /api/v1/scans?pr={pr_number}` | Per-PR finding delta: new vs. existing vs. resolved |
| Suppress / Override | `PATCH /api/v1/findings/{id}` | Mark as FALSE_POSITIVE, ACCEPTED_RISK with justification |
| Scanner Breakdown | `GET /api/v1/scans/{id}/breakdown` | Which scanner found what; per-scanner finding counts |

### 9.4 Sec Ops Workspace

| Component | Data source | Description |
|---|---|---|
| Finding Assignment | `PATCH /api/v1/findings/{id}/assign` | Assign findings to team members |
| SLA Tracker | `GET /api/v1/findings?sort=sla_deadline` | Findings sorted by SLA deadline; breach countdown timers |
| Jira Ticket View | `GET /api/v1/findings?has_jira=true` | Findings with linked Jira tickets; status synced bi-directionally |
| Policy Rule Builder | `GET/POST /api/v1/policies` | No-code UI to create routing rules with condition + action builder |
| Integration Config | `GET/PUT /api/v1/orgs/{id}/integrations` | Configure Slack channels, Jira projects, webhook URLs |
| Business Logic Rule Queue | `GET /api/v1/biz-logic-rules?status=CANDIDATE` | Review AI-proposed rules: confirm/edit/reject (security team only) |
| Scan Token Manager | `GET/POST /api/v1/tokens` | Create, rotate, revoke scan tokens per repo |
| Audit Log | `GET /api/v1/audit` | All user actions: who changed what, when |

---

## 10. Integration Contracts

### 10.1 Inbound: Scan Result

```
POST /api/v1/scans
Authorization: Bearer <scan-token>
Content-Type: application/json
Content-Encoding: gzip

{
  "scan_metadata": {
    "agent_version": "1.2.3",
    "repo": "acme/payments-service",
    "branch": "main",
    "commit_sha": "abc123",
    "pr_number": "847",
    "triggered_by": "github_actions",
    "scanners_run": ["trivy", "semgrep", "bearer", "gitleaks"],
    "ai_provider": "ollama",
    "duration_seconds": 87,
    "diff_only": false
  },
  "findings": [ /* UnifiedFinding[] */ ],
  "biz_logic_candidates": [ /* BusinessLogicRule[] with status=CANDIDATE */ ]
}
```

### 10.2 Outbound: Jira Ticket

```json
{
  "fields": {
    "project": { "key": "SEC" },
    "summary": "[ASTRA][CRITICAL] SQL Injection in payments-service/user_repository.go:47",
    "description": "...(AI explanation + code snippet + remediation)...",
    "priority": { "name": "Highest" },
    "labels": ["astra", "sast", "cwe-89"],
    "customfield_astra_finding_id": "uuid"
  }
}
```

### 10.3 Outbound: Slack Message (Blocks API)

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "🔴 Critical Finding — payments-service" } },
    { "type": "section", "fields": [
      { "type": "mrkdwn", "text": "*Rule:* SQL Injection\n*File:* user_repository.go:47" },
      { "type": "mrkdwn", "text": "*Scanner:* Semgrep\n*OWASP:* A03:2021" }
    ]},
    { "type": "section", "text": { "type": "mrkdwn", "text": "_AI Summary:_ User input flows unsanitized into a raw SQL query..." } },
    { "type": "actions", "elements": [
      { "type": "button", "text": { "type": "plain_text", "text": "View in Astra" }, "url": "https://app.astra.security/findings/uuid" },
      { "type": "button", "text": { "type": "plain_text", "text": "Create Jira Ticket" }, "action_id": "create_jira" }
    ]}
  ]
}
```

### 10.4 Outbound: Webhook Payload

```json
{
  "event": "finding.created",
  "timestamp": "2026-04-29T12:00:00Z",
  "org_id": "...",
  "finding": { /* UnifiedFinding */ },
  "scan": { /* Scan metadata */ }
}
```

Header: `X-Astra-Signature: sha256=<hmac>`

### 10.5 GitHub PR Comment (Check Run)

On every scan tied to a PR, Astra:
1. Creates a GitHub Check Run (`astra/security-scan`) with pass/fail based on threshold
2. Posts a PR comment with a collapsible findings summary table
3. For inline findings, posts review comments on the specific file+line

---

## 11. Deployment & Packaging

### 11.1 Data Plane Docker Image

```dockerfile
# Multi-stage build: agent is Node.js, scanners are pre-built binaries + Python tools.
# Final image: node:22-slim with Python runtime for Checkov and Bandit.

# Stage 1: build agent
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY . .
RUN npm run build:agent

# Stage 2: install Python-based scanners
FROM python:3.12-slim AS py-build
RUN pip install --no-cache-dir checkov bandit

# Stage 3: final image
FROM node:22-slim

# Install Python runtime for Checkov and Bandit
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Scanner binaries (pinned versions, verified checksums)
COPY --from=build /usr/local/bin/trivy    /usr/local/bin/
COPY --from=build /usr/local/bin/semgrep  /usr/local/bin/
COPY --from=build /usr/local/bin/bearer   /usr/local/bin/
COPY --from=build /usr/local/bin/gitleaks /usr/local/bin/

# Python-based scanner binaries
COPY --from=py-build /usr/local/bin/checkov  /usr/local/bin/
COPY --from=py-build /usr/local/bin/bandit   /usr/local/bin/
COPY --from=py-build /usr/local/lib/python3.12 /usr/local/lib/python3.12

# Astra agent (Node.js)
COPY --from=build /app/dist/agent.js /usr/local/bin/astra
RUN chmod +x /usr/local/bin/astra

ENTRYPOINT ["/usr/local/bin/astra"]
```

Image is pushed to a private registry (`ghcr.io/astra-security/agent`). Customers authenticate with their Astra license key to pull.

Image versioning: `ghcr.io/astra-security/agent:1.2.3` (pinned) and `:latest` (rolling).

### 11.2 GitHub Actions Wrapper

```yaml
# action.yml (public, minimal — zero business logic)
name: Astra Security Scan
description: Run Astra security analysis on your codebase
inputs:
  token:
    description: Astra scan token
    required: true
  fail-on:
    description: Minimum severity to fail the action (CRITICAL|HIGH|MEDIUM|LOW)
    default: HIGH
runs:
  using: docker
  image: docker://ghcr.io/astra-security/agent:latest
  args:
    - scan
    - --token=${{ inputs.token }}
    - --fail-on=${{ inputs.fail-on }}
```

Customer usage:
```yaml
- name: Astra Security Scan
  uses: astra-security/scan-action@v1
  with:
    token: ${{ secrets.ASTRA_TOKEN }}
```

### 11.3 GitLab CI Wrapper

```yaml
# .gitlab-ci.yml snippet
astra-scan:
  image: ghcr.io/astra-security/agent:latest
  script:
    - astra scan --token $ASTRA_TOKEN --fail-on HIGH
  only:
    - merge_requests
    - main
```

### 11.4 Jenkins Wrapper

```groovy
// Jenkinsfile snippet
pipeline {
  agent {
    docker { image 'ghcr.io/astra-security/agent:latest' }
  }
  stages {
    stage('Astra Security Scan') {
      steps {
        sh 'astra scan --token ${ASTRA_TOKEN} --fail-on HIGH'
      }
    }
  }
}
```

### 11.5 Control Plane — Self-Hosted Helm Chart

```
astra/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml        # control plane app
    service.yaml
    ingress.yaml
    postgres.yaml          # or external DB config
    redis.yaml             # or external Redis config
    s3.yaml                # or MinIO for air-gapped
    configmap.yaml
    secret.yaml            # license key, DB creds
    hpa.yaml               # horizontal pod autoscaler
```

### 11.6 Control Plane — Self-Hosted Docker Compose

For smaller self-hosted deployments:

```yaml
services:
  astra:
    image: ghcr.io/astra-security/control-plane:latest
    env_file: .env
    depends_on: [postgres, redis]
    ports: ["8080:8080"]
  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
  redis:
    image: redis:7-alpine
  minio:
    image: minio/minio
    command: server /data
    volumes: ["miniodata:/data"]
```

---

## 12. Security Model

### 12.1 Authentication

- Dashboard users: session cookie (HttpOnly, Secure, SameSite=Strict) + CSRF token
- API access: Bearer token (API key), scoped to org
- Data plane: scan token, scoped to org + repo, rotatable, expirable
- SSO sessions: SAML assertions / OIDC tokens validated server-side, mapped to internal user records

### 12.2 Authorization (RBAC)

| Role | Capabilities |
|---|---|
| `ORG_ADMIN` | All capabilities: manage users, integrations, billing, tokens, policies |
| `SECURITY_ENGINEER` | All finding operations, policy management, integration config, business logic rule confirmation |
| `DEVELOPER` | View findings for repos they have access to, suppress with justification |
| `VIEWER` | Read-only: findings, dashboard, reports |

Repo-level access follows the principle of least privilege: developers only see findings for repos they are members of (synced from GitHub/GitLab org membership where applicable).

### 12.3 Secrets Management

- All integration credentials (Jira API keys, Slack tokens, SSO client secrets) stored encrypted at rest using AES-256-GCM
- Encryption key managed by Astra KMS (cloud) or customer-provided KMS (self-hosted via env var or Vault integration)
- Scan tokens are hashed (bcrypt) before storage — not recoverable, must be rotated if lost
- AI provider API keys encrypted with org-specific key

### 12.4 Network Security

- All external communication: TLS 1.3 minimum
- Data plane → control plane: mutual TLS optional (Enterprise tier)
- Control plane → integrations: egress via configured allow-list in self-hosted deployments
- Dashboard: HSTS, CSP headers, no inline scripts

### 12.5 Audit Log

Every state-changing action is written to the audit log:
- Who (user ID + email)
- What (action type + resource type + resource ID)
- Result (success/failure)
- When (timestamp)
- From where (IP address)

Audit log is append-only (no deletes), exportable as CSV/JSON, queryable via API.

---

## 13. Observability

### 13.1 Control Plane Metrics (Prometheus)

- `astra_scan_ingested_total` — counter, labels: org_id, status
- `astra_findings_total` — gauge, labels: org_id, severity, category
- `astra_api_request_duration_seconds` — histogram, labels: method, path, status
- `astra_integration_dispatch_total` — counter, labels: integration, status
- `astra_sla_breached_total` — counter, labels: org_id, severity

### 13.2 Data Plane Logs

Structured JSON logs emitted to stdout (captured by CI log):
```json
{ "level": "info", "phase": "scanner", "scanner": "semgrep", "duration_ms": 3420, "finding_count": 14 }
{ "level": "info", "phase": "ai", "provider": "ollama", "model": "codellama:13b", "findings_enriched": 14, "duration_ms": 8100 }
{ "level": "info", "phase": "emit", "findings_sent": 14, "scan_id": "uuid", "status": "ok" }
```

### 13.3 Control Plane Logs

Structured JSON, shipped to customer's log aggregator (Datadog, CloudWatch, Loki) via standard stdout capture. Log levels: DEBUG (dev), INFO (default), WARN, ERROR.

### 13.4 Health Endpoints

```
GET /healthz        → 200 OK (liveness)
GET /readyz         → 200 OK (readiness: DB + Redis connected)
GET /api/v1/version → { "version": "1.2.3", "build": "abcdef" }
```

**Fastify conventions:**
- Health endpoints are Fastify routes (`fastify.get('/healthz', ...)`)
- All API routes use `@fastify/rate-limit` per org
- `@fastify/swagger` auto-generates OpenAPI spec from Zod schemas

---

## 14. Licensing & Feature Gates

| Feature | FREE | PRO | ENTERPRISE |
|---|---|---|---|
| CLI (`astra scan`) | ✓ | ✓ | ✓ |
| Semgrep SAST (community rules) | ✓ | ✓ | ✓ |
| Trivy SCA | ✓ | ✓ | ✓ |
| Gitleaks secrets | ✓ | ✓ | ✓ |
| Bearer CI data flow | — | ✓ | ✓ |
| Checkov IaC | — | ✓ | ✓ |
| Bandit Python SAST | — | ✓ | ✓ |
| Astra-curated Semgrep rules | — | ✓ | ✓ |
| Dashboard (all 3 workspaces) | — | ✓ | ✓ |
| Slack + Jira integrations | — | ✓ | ✓ |
| PR comments + merge blocking | — | ✓ | ✓ |
| AI enrichment (explanation + fix) | — | ✓ | ✓ |
| Webhooks + Email | — | ✓ | ✓ |
| Business logic flaw engine | — | — | ✓ |
| AI exploitability scoring | — | — | ✓ |
| Custom Semgrep rules | — | — | ✓ |
| Plugin scanner interface | — | — | ✓ |
| SSO (SAML / OIDC) | — | — | ✓ |
| Self-hosted deployment | — | — | ✓ |
| mTLS (data plane ↔ control plane) | — | — | ✓ |
| PagerDuty integration | — | — | ✓ |
| GraphQL API | — | — | ✓ |
| Executive PDF reports | — | — | ✓ |
| Audit log export | — | — | ✓ |
| SLA management | — | — | ✓ |
| RBAC (full role management) | basic | basic | ✓ |

Feature gates are checked at the control plane API layer. The data plane queries its enabled features from the token validation response at startup — no license logic runs in the data plane binary itself.

---

## 15. Language Support Matrix

| Language | Semgrep | Trivy (deps) | Bearer | Bandit | Gitleaks | Checkov |
|---|---|---|---|---|---|---|
| Python | ✓ | ✓ (`requirements.txt`, `Pipfile`, `pyproject.toml`) | ✓ | ✓ | ✓ | — |
| JavaScript | ✓ | ✓ (`package.json`) | ✓ | — | ✓ | — |
| TypeScript | ✓ | ✓ (`package.json`) | ✓ | — | ✓ | — |
| Java | ✓ | ✓ (`pom.xml`, `build.gradle`) | ✓ | — | ✓ | — |
| Go | ✓ | ✓ (`go.mod`) | ✓ | — | ✓ | — |
| Ruby | ✓ | ✓ (`Gemfile`) | ✓ | — | ✓ | — |
| Rust | ✓ | ✓ (`Cargo.toml`) | — | — | ✓ | — |
| Scala | ✓ | ✓ (`build.sbt`) | — | — | ✓ | — |
| R | ✓ | — | — | — | ✓ | — |
| Terraform | ✓ | ✓ | — | — | ✓ | ✓ |
| Dockerfile | ✓ | ✓ (image CVEs) | — | — | ✓ | ✓ |
| YAML (K8s/Helm) | ✓ | — | — | — | ✓ | ✓ |
| CloudFormation | — | — | — | — | ✓ | ✓ |

---

*End of specification v0.1*
