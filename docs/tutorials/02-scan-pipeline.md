# Understanding the Astra Scan Pipeline

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This tutorial explains Astra's 9-stage scan pipeline in detail. You'll learn what each stage does, how they work together, and how to configure them for optimal results.

---

## Pipeline Overview

Astra processes repositories through a directed acyclic graph (DAG) of nine stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ASTRA SCAN PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  clone → discover → git_ingest → git_diagram → tool_scan → deep_scan →     │
│  cross_file → aggregate → persist                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

Each stage:
- Runs as an independent job with its own AI model and configuration
- Produces output that becomes input for subsequent stages
- Can be re-run independently without restarting the entire pipeline
- Logs all AI calls for observability and debugging

---

## Stage 1: Clone

**Purpose:** Securely clone the target repository and map its structure.

**What it does:**
- Performs a shallow git clone to a secure temporary directory
- Injects GitHub PAT for private repository access
- Detects repository languages and framework patterns
- Records commit metadata (SHA, branch, author, timestamp)
- Cleans up temporary directories after scan completion

**Output:**
```json
{
  "localDir": "/tmp/astra-scan-abc123",
  "commitSha": "f4e2d1c8b9a7...",
  "branch": "main",
  "languages": ["TypeScript", "JavaScript", "Python"],
  "totalFiles": 342,
  "repoSize": 15728640
}
```

**Configuration:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "timeoutMs": 60000,
  "maxRetries": 2
}
```

---

## Stage 2: Discover

**Purpose:** AI-guided file prioritization before scanning begins.

**What it does:**
- Analyzes file paths, extensions, and directory structure
- Ranks files by security relevance using AI
- Identifies high-value targets (auth, crypto, API routes, config files)
- Creates a prioritized queue for downstream stages

**Why it matters:** Traditional scanners treat all files equally. Discover ensures security-critical files are analyzed first with more AI budget.

**Output:**
```json
{
  "discoveredFiles": [
    { "path": "src/auth/login.ts", "priority": 0.95, "reason": "Authentication logic" },
    { "path": "src/api/payment/route.ts", "priority": 0.92, "reason": "Payment processing" },
    { "path": "src/lib/crypto.ts", "priority": 0.89, "reason": "Cryptographic operations" }
  ],
  "skippedFiles": ["*.test.ts", "*.spec.ts", "node_modules/**"],
  "totalFiles": 342
}
```

**Configuration:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "low",
  "scanDepth": "standard",
  "concurrency": 1
}
```

---

## Stage 3: Git Ingest

**Purpose:** Extract repository intelligence from git history.

**What it does:**
- Analyzes commit history for security-relevant patterns
- Identifies code hotspots (frequently changed files)
- Maps contributor activity and ownership
- Detects suspicious commit patterns (large secrets commits, etc.)

**Output:**
```json
{
  "repoIntel": {
    "totalCommits": 1247,
    "contributors": 23,
    "hotspots": [
      { "file": "src/auth/login.ts", "changeFrequency": 0.87, "riskScore": 0.72 }
    ],
    "suspiciousCommits": [
      { "sha": "abc123", "reason": "Large file addition with high entropy" }
    ]
  }
}
```

---

## Stage 4: Git Diagram

**Purpose:** Generate architecture documentation from code structure.

**What it does:**
- Parses import/export statements across the codebase
- Builds a module dependency graph
- Generates Mermaid diagrams showing system architecture
- Identifies API routes, data models, and service layers

**Output:**
```json
{
  "architectureDiagram": "mermaid\ngraph TD\n  A[API Routes] --> B[Services]\n  B --> C[Database]\n  ..."
}
```

**Use case:** Understanding system architecture helps identify trust boundaries and data flow vulnerabilities.

---

## Stage 5: Tool Scan

**Purpose:** Run industry-standard scanner engines.

**What it does:**
- Executes Trivy for SCA, IaC, and secrets detection
- Runs Semgrep for SAST with 3,000+ rules
- Executes Gitleaks for secrets in git history
- Runs Bearer for data flow analysis

**Scanners:**

| Scanner | Category | Languages |
|---------|----------|-----------|
| Trivy | SCA · IaC · Secrets | Multi-language, Docker, K8s |
| Semgrep | SAST | 30+ languages |
| Gitleaks | Secrets | Git history |
| Bearer | Data Flow | Ruby, JavaScript, Go, Java |

**Output:**
```json
{
  "toolFindings": [
    {
      "scanner": "trivy",
      "ruleId": "CVE-2024-1234",
      "severity": "HIGH",
      "file": "package.json",
      "description": "Vulnerable dependency detected"
    }
  ],
  "toolFindingsCount": 47
}
```

**Configuration:**
```json
{
  "timeoutMs": 180000,
  "maxRetries": 2
}
```

---

## Stage 6: Deep Scan

**Purpose:** Per-file AI vulnerability analysis.

**What it does:**
- Analyzes each file with AI using context-aware prompts
- Detects SAST issues, secrets, and data flow problems
- Generates AI explanations and remediation suggestions
- Exploits scenario modeling and CVSS scoring

**Key features:**
- **Context-aware:** Understands framework patterns (Express, Django, etc.)
- **Multi-language:** Handles TypeScript, Python, Go, Java, etc.
- **Configurable depth:** Quick, standard, deep, or exhaustive modes
- **Parallel execution:** Configurable concurrency (default: 5)

**Output:**
```json
{
  "findingsPerFile": {
    "src/auth/login.ts": [
      {
        "title": "SQL Injection via user input",
        "severity": "CRITICAL",
        "lineStart": 42,
        "lineEnd": 48,
        "aiExplanation": "User input is directly concatenated into SQL query...",
        "aiFix": "Use parameterized queries with prepared statements...",
        "cwe": ["CWE-89"],
        "owasp": ["A03:2021-Injection"]
      }
    ]
  },
  "fileSummaries": [...],
  "tokenUsage": { "input": 45230, "output": 12450, "thinking": 8920 }
}
```

**Configuration:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "medium",
  "scanDepth": "standard",
  "maxOutputTokens": 4096,
  "concurrency": 5,
  "timeoutMs": 120000
}
```

---

## Stage 7: Cross-File

**Purpose:** Infer business logic vulnerabilities across module boundaries.

**What it does:**
- Analyzes data flow across files and modules
- Identifies security invariants that span the codebase
- Detects business logic flaws that single-file analysis misses
- Generates business logic rules from observed patterns

**Example findings:**
- "Authentication bypass: admin check in `middleware.ts` is bypassed by direct route access in `api/admin.ts`"
- "Privilege escalation: user role is checked in UI but not in backend API"
- "Data leakage: PII logged in debug mode across 3 modules"

**Output:**
```json
{
  "crossFileFindings": [
    {
      "title": "Authentication bypass via direct API access",
      "severity": "CRITICAL",
      "evidenceFiles": ["src/middleware/auth.ts", "src/api/admin.ts"],
      "description": "The admin middleware checks role but the /api/admin route bypasses middleware...",
      "businessImpact": "Attackers can access admin functionality without authentication"
    }
  ],
  "businessRules": [
    {
      "ruleText": "All admin routes must pass through auth middleware",
      "confidence": 0.94,
      "status": "CANDIDATE"
    }
  ]
}
```

**Configuration:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.3,
  "thinkingDepth": "medium",
  "timeoutMs": 180000,
  "concurrency": 1
}
```

---

## Stage 8: Aggregate

**Purpose:** Deduplicate and fingerprint findings across all sources.

**What it does:**
- Combines findings from tool_scan, deep_scan, and cross_file
- Applies SHA-256 fingerprinting for deduplication
- Merges duplicate findings with enriched metadata
- Calculates final severity scores

**Fingerprinting algorithm:**
```
fingerprint = SHA-256(scanner + ruleId + file + lineStart + lineEnd)
```

This ensures the same vulnerability found by multiple scanners is reported once.

**Output:**
```json
{
  "allFindings": [...],
  "deduplicatedFindings": [
    {
      "fingerprint": "sha256:abc123...",
      "sources": ["trivy", "deep_scan"],
      "severity": "CRITICAL",
      "mergedFrom": ["finding-1", "finding-2"]
    }
  ],
  "totalUniqueFindings": 23
}
```

---

## Stage 9: Persist

**Purpose:** Save findings to database and create triage tasks.

**What it does:**
- Creates Finding records with full metadata
- Links findings to scans and users
- Auto-generates Tasks for HIGH/CRITICAL findings
- Stores AI conversation context for future chat
- Updates scan status to COMPLETED

**Output:**
```json
{
  "status": "COMPLETED",
  "findingsCreated": 23,
  "tasksCreated": 8,
  "durationSeconds": 847
}
```

---

## Pipeline Execution Model

### Event-Driven Worker

Astra uses an event-driven worker instead of polling:

1. Scan creation enqueues the first job (clone)
2. Each completed job enqueues the next stage
3. Worker claims jobs from the queue and executes them
4. Failed jobs retry up to 3 times with backoff

### Job Queue Fairness

When multiple scans are running:
- Jobs are prioritized by scan creation time
- Each scan gets fair scheduling (no starvation)
- Failed jobs don't block other scans

### State Reconstruction

If the worker restarts mid-scan:
- Completed jobs are replayed to reconstruct state
- The current job resumes from its input JSON
- No data is lost

---

## Configuring Pipeline Stages

Each stage has independent configuration:

```json
{
  "nodes": {
    "discover": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "temperature": 0.2,
      "thinkingDepth": "low",
      "timeoutMs": 60000
    },
    "deepScan": {
      "provider": "openai",
      "model": "gpt-4o",
      "temperature": 0.1,
      "thinkingDepth": "medium",
      "concurrency": 10,
      "timeoutMs": 120000
    },
    "crossFile": {
      "provider": "anthropic",
      "model": "claude-4-opus",
      "temperature": 0.3,
      "thinkingDepth": "high",
      "timeoutMs": 300000
    }
  }
}
```

### Best Practices

**For speed:**
- Use Cloud Ollama with Llama 3.1 70B
- Set `scanDepth: "quick"` for deepScan
- Reduce `concurrency` to avoid rate limits
- Set lower `thinkingDepth` for simple codebases

**For accuracy:**
- Use Claude 4 Opus for crossFile
- Set `scanDepth: "exhaustive"` for deepScan
- Enable `thinkingDepth: "high"` for complex logic
- Increase `maxOutputTokens` for detailed explanations

---

## Monitoring Pipeline Execution

### Real-Time Progress

1. Navigate to **Scans** → [Your Scan]
2. View the **Pipeline Progress** visualization
3. Click individual stages to see:
   - Start/end timestamps
   - AI model used
   - Token consumption
   - Error messages (if any)

### Observability Logs

Every AI call is logged:

1. Navigate to **Observability** → **AI Calls**
2. Filter by scan, provider, or status
3. View full request/response payloads
4. Retry failed calls from the UI

### Worker Logs

```bash
# Development
npm run dev  # Worker runs in-process

# Production
npm start
# Worker logs to stdout/stderr
```

---

## Re-Running Pipeline Stages

If a stage fails or you want to re-analyze with different settings:

1. Navigate to the scan detail page
2. Click **Pipeline** tab
3. Find the stage you want to re-run
4. Click **Re-run Node**
5. Optionally modify configuration before re-running

The stage will execute with fresh AI calls while preserving downstream results.

---

## Next Steps

- **[Triaging Findings](./03-triaging-findings.md)** — Learn to review and assign findings
- **[AI Chat](./04-ai-chat.md)** — Chat with your scan results
- **[Pipeline Architecture](../explanation/architecture/pipeline.md)** — Deep dive into DAG execution
