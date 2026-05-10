# Astra Security Platform — Scanner Architecture & Design Decisions
# (Session summary — May 2026)

---

## What Astra Is

Astra is an AI-augmented application security scanning platform. It integrates
into CI/CD pipelines and scans codebases for vulnerabilities, secrets, IaC
misconfigs, and business logic flaws. The core design principle is that raw
source code NEVER leaves the customer's environment — only normalized findings
are transmitted to the control plane.

---

## The Two Core Components

### 1. Scanner Container (Data Plane)
- A single Docker image that does all the actual scanning work
- Runs entirely on the customer's infrastructure (CI runner, local machine, etc.)
- Contains all scanner tools + the Python orchestrator app
- Connects to PostgreSQL and S3/object storage to store findings

### 2. Control Plane
- A separate backend (Node.js, previously designed as Go modular monolith)
- Receives findings from the scanner container
- Handles dashboard, policies, integrations (Jira, Slack, etc.)
- Can be SaaS (Astra-hosted) or self-hosted

---

## Scanner Container — Two Operating Modes

The Docker container supports two modes, selected via the MODE environment variable.

### Mode 1 — CLI / Passive (MODE=cli)
Spin up when needed. Mount a local repo as a volume. It scans and exits.

```bash
docker run --rm \
  -v /path/to/repo:/repo \
  -e MODE=cli \
  -e POSTGRES_URL=postgres://... \
  -e S3_BUCKET=astra-findings \
  -e OLLAMA_API_KEY=your-key \
  astra/scanner:latest
```

Use case: CI pipelines (GitHub Actions, GitLab CI, Jenkins), local developer scans.

### Mode 2 — API / Active (MODE=server)
Container runs as a long-lived HTTP server. Accepts scan requests via API.
Clones the repo itself, scans, stores findings, returns results.

```bash
POST http://scanner-host:8080/scan
{
  "repo_url": "https://github.com/org/my-app",
  "branch": "main",
  "token": "github-pat-optional"
}
```

Use case: On-demand scans triggered from the dashboard, webhooks, or external systems.

Both modes run the exact same scanner pipeline internally. Only the trigger
and code source differ (volume mount vs git clone).

---

## Scanner Container — Internal Architecture

The scanner is a Python application. Python was chosen because:
- Semgrep, Bandit, Checkov are Python-native (importable as libraries, not just CLI)
- Better subprocess handling for other tools
- Ollama has a first-class Python SDK
- Most security tooling is Python-native

### Execution Pipeline (sequential with parallelism where possible)

```
Step 1 — Traditional scanners (run in parallel via asyncio)
  ├── Semgrep      → SAST, 500+ rules, all languages
  ├── Trivy        → CVEs, container vulns, IaC
  ├── Gitleaks     → secrets, API keys, git history
  ├── Checkov      → Terraform, Helm, K8s misconfigs
  └── Bandit       → Python-specific SAST

Step 2 — AI Scanner — Layer 1: Per-file deep scan (sequential)
  For each code file in the repo:
    → Send file contents to AI model
    → Get back: findings (vulns, logic bugs) + a file_summary
    → Collect all file_summaries into a codebase_map

Step 3 — AI Scanner — Layer 2: Cross-file business logic analysis
  → Send the codebase_map (summaries only, not raw code) to AI model
  → Ask it to reason about cross-file attack paths, missing auth middleware,
    privilege escalation, broken access control, data flow issues
  → Get back: business logic findings with affected files

Step 4 — Normalize all findings into unified schema
Step 5 — Save to PostgreSQL + S3
```

### Unified Finding Schema
Every finding from every scanner is normalized to:
```json
{
  "id": "uuid",
  "scanner": "semgrep|trivy|gitleaks|bandit|checkov|ai_deep|ai_bizlogic",
  "rule_id": "...",
  "title": "...",
  "severity": "critical|high|medium|low|info",
  "cvss_score": 0.0,
  "category": "injection|secrets|iac|sast|business_logic|...",
  "file": "src/routes/payments.js",
  "line_start": 42,
  "line_end": 48,
  "code_snippet": "...",
  "cwe": "CWE-89",
  "owasp": "A03:2021",
  "ai_explanation": "...",
  "ai_fix": "...",
  "exploit_score": 0.0,
  "fingerprint": "sha256-hash-for-dedup",
  "raw": {}
}
```

---

## AI Scanner — Design Decisions

### The Core Problem
You cannot dump an entire codebase into an LLM. Context windows overflow.
Solution: Two-layer approach — per-file scan + cross-file summary reasoning.

### AI Provider Strategy (three tiers, configurable)

**Tier 1 — Ollama local (air-gapped, free)**
- Install Ollama as a sidecar container
- Use deepseek-coder:6.7b for per-file code scanning
- Use llama3:8b for business logic reasoning
- Code never leaves the machine
- Slower, requires GPU or good CPU

**Tier 2 — Ollama Cloud API (decided in this session)**
- Use Ollama's cloud API with an API key
- Same models but hosted — faster, no GPU needed
- API key set via OLLAMA_API_KEY env var
- Slightly relaxed privacy (code sent to Ollama cloud)
- Best for most self-hosted deployments

**Tier 3 — AI Coding Assistant / Deep Scanner (decided in this session)**
- Use Claude API (Anthropic), OpenAI, or a wrapper like Claude Code
- Specifically for DEEP scanning passes — when you want the most thorough,
  context-aware analysis
- These models have much larger context windows and better reasoning
- Can do whole-file + cross-file analysis more accurately than smaller models
- Configured per-org, requires explicit opt-in (code sent to cloud)
- API key set via ANTHROPIC_API_KEY or OPENAI_API_KEY env vars

### Which AI Does What

| Task | Model | Why |
|---|---|---|
| Per-file vuln scan | deepseek-coder via Ollama | Code-trained, fast, cheap |
| Business logic cross-file | llama3 via Ollama cloud | Good reasoning on summaries |
| Deep scan / thorough pass | Claude API or OpenAI | Largest context, best accuracy |

### Environment Variables for AI

```bash
# Ollama (local or cloud)
OLLAMA_URL=http://ollama:11434         # local sidecar
OLLAMA_API_KEY=ollama-cloud-key        # cloud mode
OLLAMA_MODEL_CODE=deepseek-coder:6.7b
OLLAMA_MODEL_REASON=llama3:8b

# Deep scan (opt-in cloud AI)
AI_DEEP_SCAN_PROVIDER=anthropic        # or: openai, none
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

---

## Dockerfile Structure

```dockerfile
FROM python:3.12-slim

# System tools
RUN apt-get update && apt-get install -y curl wget git

# Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh

# Gitleaks
RUN wget https://github.com/gitleaks/gitleaks/releases/.../gitleaks_linux_x64.tar.gz \
    && tar -xzf gitleaks*.tar.gz && mv gitleaks /usr/local/bin/

# Python scanner tools
RUN pip install semgrep bandit checkov ollama anthropic openai boto3 psycopg2-binary

# App
COPY scanner/ /app/
WORKDIR /app

ENV MODE=cli

ENTRYPOINT ["python", "main.py"]
```

---

## docker-compose Setup

```yaml
services:
  scanner:
    build: ./scanner
    environment:
      MODE: server
      OLLAMA_URL: http://ollama:11434
      OLLAMA_API_KEY: ${OLLAMA_API_KEY}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      POSTGRES_URL: postgres://astra:pass@postgres:5432/astra
      S3_BUCKET: astra-findings
      S3_ENDPOINT: http://minio:9000
    volumes:
      - /path/to/repo:/repo   # CLI mode only
    depends_on:
      - ollama
      - postgres
      - minio

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: astra
      POSTGRES_USER: astra
      POSTGRES_PASSWORD: pass
    volumes:
      - pg_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data
    volumes:
      - minio_data:/data

volumes:
  ollama_data:
  pg_data:
  minio_data:
```

---

## Project File Structure (to be built)

```
astra-scanner/
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── scanner/
│   ├── main.py                  # entrypoint, orchestrator
│   ├── server.py                # HTTP server for API mode
│   ├── scanners/
│   │   ├── __init__.py
│   │   ├── semgrep.py           # semgrep runner + parser
│   │   ├── trivy.py             # trivy runner + parser
│   │   ├── gitleaks.py          # gitleaks runner + parser
│   │   ├── bandit.py            # bandit runner + parser
│   │   ├── checkov.py           # checkov runner + parser
│   │   └── ai/
│   │       ├── __init__.py
│   │       ├── file_scanner.py  # per-file AI scan via Ollama
│   │       ├── biz_logic.py     # cross-file business logic via Ollama
│   │       └── deep_scan.py     # deep scan via Claude/OpenAI
│   ├── normalizer.py            # unified finding schema
│   ├── storage/
│   │   ├── postgres.py          # save findings to DB
│   │   └── s3.py                # save artifacts to object storage
│   └── utils/
│       ├── file_walker.py       # walk repo, filter code files
│       └── chunker.py           # split large files for AI
```

---

## Key Design Decisions Made in This Session

1. Scanner is a Python application, not a Go binary — better ecosystem fit
2. Single Docker image, two modes (cli + server) via MODE env var
3. AI scanning uses two layers: per-file (Ollama) + cross-file business logic (Ollama)
4. Ollama runs as sidecar container OR via cloud API key (OLLAMA_API_KEY)
5. Deep scan uses Claude API or OpenAI as a third optional AI tier
6. Raw source code never sent to control plane — only normalized findings JSON
7. Storage: PostgreSQL for findings, S3/MinIO for raw scanner artifacts
8. AI models: deepseek-coder:6.7b for code, llama3:8b for reasoning,
   claude-sonnet / gpt-4o for deep scan pass
9. Traditional scanners run in parallel, AI scanner runs after them
10. All findings normalized to unified schema before storage

---

## What Still Needs to Be Built

- [ ] Python scanner app (main.py + all scanner modules)
- [ ] Dockerfile and docker-compose
- [ ] PostgreSQL schema (findings table)
- [ ] S3 integration for raw artifacts
- [ ] HTTP server for API mode (server.py)
- [ ] AI scanner: per-file scan (file_scanner.py)
- [ ] AI scanner: business logic pass (biz_logic.py)
- [ ] AI scanner: deep scan via Claude/OpenAI (deep_scan.py)
- [ ] Normalizer: unified schema across all scanners
- [ ] File walker: smart repo traversal, skip node_modules/.git/etc
- [ ] Integration with control plane /v1/ingest endpoint
