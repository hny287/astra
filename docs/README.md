# Astra Security Platform — Documentation Index

**Version:** v2.23.0 | **Last Updated:** 2026-05-15

AI-native application security scanning platform. Combines industry-standard scanner engines (Trivy, Semgrep, Gitleaks, Bearer) with a multi-stage AI pipeline to surface vulnerabilities and business logic flaws.

---

## Documentation Structure (Diátaxis Framework)

This documentation is organized into four distinct types, each serving a different purpose:

| Type | Purpose | For When You Want To... |
|------|---------|------------------------|
| **[Tutorials](#tutorials)** | Learning-oriented lessons | Learn the platform through guided, hands-on examples |
| **[How-to Guides](#how-to-guides)** | Problem-oriented recipes | Solve a specific problem or complete a task |
| **[Reference](#reference)** | Information-oriented descriptions | Look up technical details, APIs, schemas |
| **[Explanation](#explanation)** | Understanding-oriented discussions | Understand concepts, architecture, and design decisions |

---

## Tutorials

*Step-by-step lessons for learning the platform.*

| Tutorial | Description | Prerequisites |
|----------|-------------|---------------|
| [Getting Started](tutorials/01-getting-started.md) | Set up Astra and run your first scan | Node.js 20+, PostgreSQL |
| [Understanding the Scan Pipeline](tutorials/02-scan-pipeline.md) | Walk through all 9 pipeline stages | Completed Getting Started |
| [Triaging Findings](tutorials/03-triaging-findings.md) | Learn the OPEN → CONFIRMED → REMEDIATED workflow | Basic familiarity with findings |
| [Using AI Chat](tutorials/04-ai-chat.md) | Chat with scans and findings using multi-provider AI | Have at least one completed scan |
| [Configuring AI Providers](tutorials/05-provider-config.md) | Set up OpenAI, Anthropic, Ollama, and other providers | Admin access |

---

## How-to Guides

*Recipes for solving specific problems.*

### Scanning

| Guide | Description |
|-------|-------------|
| [Scan a GitHub Repository](how-to/scan-github-repo.md) | Scan a public or private GitHub repo with PAT injection |
| [Scan a Local Directory](how-to/scan-local-directory.md) | Run Astra against code on your local filesystem |
| [Re-run a Pipeline Node](how-to/rerun-node.md) | Re-execute a specific pipeline stage (git_ingest, deep_scan, etc.) |
| [Cancel a Running Scan](how-to/cancel-scan.md) | Stop an in-progress scan and clean up temp directories |
| [Export Findings](how-to/export-findings.md) | Export findings as JSON, CSV, SARIF, HTML, or Markdown |

### Findings & Tasks

| Guide | Description |
|-------|-------------|
| [Create a Task from a Finding](how-to/create-task-from-finding.md) | Link a remediation task to a specific finding |
| [Assign Findings to Team Members](how-to/assign-findings.md) | Change assignment and track ownership |
| [Batch Update Tasks](how-to/batch-update-tasks.md) | Apply status/severity changes to multiple tasks at once |
| [Add Comments to Findings](how-to/add-finding-comments.md) | Document analysis and remediation progress |
| [Rescan a Single File](how-to/rescan-file.md) | Re-analyze one file without re-running the entire scan |

### AI & Chat

| Guide | Description |
|-------|-------------|
| [Configure AI Provider per Pipeline Stage](how-to/configure-provider-per-node.md) | Use different models for discover, deep_scan, cross_file |
| [Use AI Chat at Scan Level](how-to/chat-scan-level.md) | Discuss overall scan results with AI |
| [Use AI Chat at Finding Level](how-to/chat-finding-level.md) | Get detailed remediation advice for a specific finding |
| [Retry Failed AI Calls](how-to/retry-ai-calls.md) | Re-execute failed AI calls from the Observability UI |
| [Enable Thinking Mode](how-to/enable-thinking-mode.md) | Configure model thinking depth and budget for complex analyses |

### Administration

| Guide | Description |
|-------|-------------|
| [Add a New User](how-to/add-user.md) | Create user accounts with ADMIN, ANALYST, or VIEWER roles |
| [Configure RBAC Permissions](how-to/configure-rbac.md) | Set up role-based access control |
| [Link GitHub Account](how-to/link-github-account.md) | Connect a GitHub PAT for private repo access |
| [Create a Config Preset](how-to/create-preset.md) | Save named configurations for reuse |
| [Edit Security Rules](how-to/edit-security-rules.md) | Add organization-specific rules to the scan |

---

## Reference

*Technical descriptions of the platform's machinery.*

### API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| [`POST /api/v1/scans`](reference/api/scans.md#post) | Create new scan |
| [`GET /api/v1/scans`](reference/api/scans.md#get) | List scans with filters |
| [`GET /api/v1/scans/:id`](reference/api/scans.md#get-id) | Get scan detail |
| [`POST /api/v1/scans/:id/rerun-node`](reference/api/scans.md#rerun-node) | Re-run pipeline node |
| [`GET /api/v1/findings`](reference/api/findings.md) | List findings |
| [`PATCH /api/v1/findings/:id`](reference/api/findings.md#patch) | Update finding |
| [`POST /api/v1/findings/:id/rescan`](reference/api/findings.md#rescan) | Rescan file |
| [`POST /api/v1/chat`](reference/api/chat.md) | Send AI chat message |
| [`GET /api/v1/config`](reference/api/config.md) | Get system config |
| [`PUT /api/v1/config`](reference/api/config.md#put) | Update system config |
| [`GET /api/v1/providers`](reference/api/providers.md) | List providers |
| [`GET /api/v1/ai-calls`](reference/api/ai-calls.md) | List AI call logs |

### Database Schema

| Model | Description |
|-------|-------------|
| [`Scan`](reference/schema/scan.md) | Scan runs with repo URL, status, config |
| [`Finding`](reference/schema/finding.md) | Security findings with severity, CWE, OWASP |
| [`Task`](reference/schema/task.md) | Remediation tasks linked to findings |
| [`Job`](reference/schema/job.md) | Pipeline node executions |
| [`AiConversation`](reference/schema/ai-conversation.md) | Chat messages |
| [`AiCallLog`](reference/schema/ai-call-log.md) | AI call observability |
| [`Config`](reference/schema/config.md) | DB-backed key-value config |
| [`User`](reference/schema/user.md) | Auth users with roles |

### Configuration

| Topic | Description |
|-------|-------------|
| [Config Schema (Zod)](reference/config/schema.md) | Full Zod schema for scan, chat, and provider config |
| [Provider Registry](reference/config/providers.md) | Available AI providers and their models |
| [Node Configuration](reference/config/nodes.md) | Per-node AI settings (temperature, thinking, timeout) |
| [Branding Constants](reference/config/branding.md) | Environment-driven product identity |

### Components

| Component | Description |
|-----------|-------------|
| [`ScanProgress`](reference/components/scan-progress.md) | Pipeline stage visualization |
| [`FindingsTable`](reference/components/findings-table.md) | DataTable with filters and pagination |
| [`TaskDataTable`](reference/components/task-data-table.md) | Task listing with assignment |
| [`AiChatProvider`](reference/components/ai-chat-provider.md) | Global slide-out chat panel |
| [`MermaidDiagram`](reference/components/mermaid-diagram.md) | Client-side Mermaid renderer |

---

## Explanation

*Understanding-oriented discussions of concepts and architecture.*

### Architecture

| Topic | Description |
|-------|-------------|
| [System Overview](explanation/architecture/overview.md) | High-level Control Plane / Data Plane split |
| [Scan Pipeline DAG](explanation/architecture/pipeline.md) | 9-node pipeline: clone → persist |
| [Two-Layer AI Architecture](explanation/architecture/ai-layers.md) | Layer 1: Per-file deep scan, Layer 2: Cross-file business logic |
| [Job Queue Fairness](explanation/architecture/job-queue.md) | How jobs are claimed and prioritized per scan |
| [State Reconstruction](explanation/architecture/state-reconstruction.md) | How worker rebuilds state from completed jobs |

### Concepts

| Topic | Description |
|-------|-------------|
| [Finding Fingerprinting](explanation/concepts/fingerprinting.md) | SHA-256 deduplication across scanner sources |
| [CVSS Scoring](explanation/concepts/cvss.md) | How CVSS v3.1 vectors are generated |
| [Business Logic Rules](explanation/concepts/business-logic.md) | CANDIDATE → CONFIRMED workflow for inferred rules |
| [Repo Intelligence](explanation/concepts/repo-intel.md) | Git metadata: commits, contributors, hotspots, languages |
| [Code Intelligence](explanation/concepts/code-intel.md) | AST-derived exports, imports, API routes, data models |

### Security

| Topic | Description |
|-------|-------------|
| [RBAC Model](explanation/security/rbac.md) | ADMIN / ANALYST / VIEWER permissions |
| [Scan Ownership](explanation/security/ownership.md) | Non-admin users see only their own scans |
| [Token Encryption](explanation/security/encryption.md) | AES-256-GCM for GitHub PATs at rest |
| [Rate Limiting](explanation/security/rate-limiting.md) | IP-based sliding window on auth endpoints |
| [Middleware Auth](explanation/security/middleware.md) | Route protection and public route allowlist |

### Design Decisions

| Topic | Description |
|-------|-------------|
| [Why PostgreSQL over SQLite?](explanation/decisions/postgresql.md) | Migration rationale and PrismaPg adapter |
| [Why Event-Driven Worker?](explanation/decisions/event-driven-worker.md) | Replacing setInterval with job-driven execution |
| [Why DB-Backed Config?](explanation/decisions/db-config.md) | Runtime config changes without file edits |
| [Why IBM Carbon?](explanation/decisions/ibm-carbon.md) | Design system choice for enterprise UI |
| [Why Multi-Provider AI?](explanation/decisions/multi-provider.md) | Avoiding vendor lock-in for AI backends |

---

## Quick Reference

### Scanner Coverage

| Scanner | Category | Languages |
|---------|----------|-----------|
| Trivy | SCA · IaC · Secrets | Multi-language, Docker, K8s |
| Semgrep | SAST | 30+ languages |
| Gitleaks | Secrets | Git history |
| Bearer | Data Flow | Ruby, JavaScript, Go, Java |
| AI Deep Scan | SAST · Logic | All (per-file analysis) |
| AI Cross-File | Business Logic | All (cross-module inference) |

### AI Providers

| Provider | Models | SDK |
|----------|--------|-----|
| Cloud Ollama | Llama, Mistral, Qwen | `ollama` npm |
| Hosted Ollama | Self-hosted | `ollama` npm |
| OpenAI | GPT-4o, o3, o4-mini | `openai` npm |
| Anthropic | Claude 4 Opus/Sonnet | `@anthropic-ai/sdk` |
| AWS Bedrock | Claude via Bedrock | AWS SDK (stub) |
| Azure AI Foundry | Various | Azure SDK (stub) |
| LangGraph | Graph workflows | `@langchain/langgraph` |

### Severity Levels

| Level | SLA | Color |
|-------|-----|-------|
| CRITICAL | 4 hours | Red |
| HIGH | 24 hours | Orange |
| MEDIUM | 72 hours | Yellow |
| LOW | 7 days | Blue |
| INFO | N/A | Gray |

---

## See Also

| Document | Description |
|----------|-------------|
| [`CLAUDE.md`](../CLAUDE.md) | Project knowledge base |
| [`README.md`](../README.md) | Setup and deployment guide |
| [`context/architecture.html`](../context/architecture.html) | Full architecture reference |
| [`spec/`](../spec/) | Unified platform spec v5.0 |
| [`graphify-out/GRAPH_REPORT.md`](../graphify-out/GRAPH_REPORT.md) | Code knowledge graph |
