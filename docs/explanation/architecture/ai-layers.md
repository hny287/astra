# Two-Layer AI Architecture

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Astra uses a two-layer AI architecture for comprehensive vulnerability detection.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AI ANALYSIS LAYERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  LAYER 1: DEEP SCAN (Per-File Analysis)                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  File-by-file vulnerability detection                        │   │
│  │  - SAST patterns                                            │   │
│  │  - Secrets detection                                        │   │
│  │  - Data flow within file                                    │   │
│  │  - Exploit scoring                                          │   │
│  │                                                             │   │
│  │  Parallel execution (concurrency: 5–10)                     │   │
│  │  Context: Single file + imports                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              ↓                                      │
│  LAYER 2: CROSS-FILE (Business Logic Analysis)                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Cross-module vulnerability detection                        │   │
│  │  - Data flow across boundaries                              │   │
│  │  - Authentication bypasses                                  │   │
│  │  - Privilege escalation                                     │   │
│  │  - Security invariant violations                            │   │
│  │                                                             │   │
│  │  Sequential execution (concurrency: 1)                      │   │
│  │  Context: Entire codebase                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Deep Scan

### Purpose

Detect vulnerabilities within individual files using AI-powered static analysis.

### Characteristics

| Property | Value |
|----------|-------|
| **Scope** | Single file |
| **Context** | File content + import statements |
| **Concurrency** | 5–10 parallel |
| **Thinking Depth** | Medium (2048 tokens) |
| **Temperature** | 0.2 (deterministic) |
| **Output** | Per-file findings |

### Detection Categories

- **SAST:** Injection, XSS, path traversal
- **Secrets:** Hardcoded credentials, API keys
- **Data Flow:** PII/PHI leaking to logs/responses
- **Misconfigurations:** Weak crypto, insecure defaults
- **Code Quality:** Error handling, input validation

### Example Findings

```json
{
  "title": "SQL Injection via user input",
  "file": "src/auth/login.ts",
  "lineStart": 42,
  "lineEnd": 48,
  "aiExplanation": "User input is directly concatenated into SQL query...",
  "aiFix": "Use parameterized queries...",
  "cvssScore": 9.1
}
```

---

## Layer 2: Cross-File

### Purpose

Detect business logic vulnerabilities that span multiple files and modules.

### Characteristics

| Property | Value |
|----------|-------|
| **Scope** | Entire codebase |
| **Context** | All files + Layer 1 findings |
| **Concurrency** | 1 (sequential) |
| **Thinking Depth** | High (4096 tokens) |
| **Temperature** | 0.3 (creative) |
| **Output** | Cross-file findings + business rules |

### Detection Categories

- **Authentication Bypass:** Middleware not applied to routes
- **Privilege Escalation:** Role checks missing in backend
- **Data Leakage:** PII flowing across module boundaries
- **Business Logic:** Security invariants violated
- **Architecture:** Trust boundary violations

### Example Findings

```json
{
  "title": "Authentication bypass via direct API access",
  "evidenceFiles": ["src/middleware/auth.ts", "src/api/admin.ts"],
  "description": "The admin middleware checks role but the /api/admin route bypasses middleware...",
  "businessImpact": "Attackers can access admin functionality without authentication"
}
```

---

## Why Two Layers?

### Single-Layer Limitations

| Issue | Single Layer | Two Layers |
|-------|--------------|------------|
| **Cross-file bugs** | Missed | Detected |
| **Analysis depth** | Shallow | Deep where needed |
| **Cost** | High for full context | Optimized |
| **Speed** | Slow | Parallel Layer 1 |
| **False positives** | Higher | Lower (cross-validation) |

### Benefits of Separation

1. **Performance:** Layer 1 parallelizes across files
2. **Cost:** Only Layer 2 needs full context
3. **Accuracy:** Each layer optimized for its task
4. **Observability:** Clear separation of concerns

---

## Information Flow

```
┌─────────────────┐
│   Clone Repo    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Discover     │ Prioritized files
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│   Deep Scan     │────►│ Per-file findings│
│   (Layer 1)     │     └────────┬─────────┘
└─────────────────┘              │
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Cross-File      │
         └─────────────►│  (Layer 2)       │
                        │  Full context    │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Aggregate       │
                        │  Merge & dedupe  │
                        └──────────────────┘
```

---

## Configuration

### Layer 1 (Deep Scan)

```json
{
  "deepScan": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.2,
    "thinkingDepth": "medium",
    "concurrency": 5,
    "maxOutputTokens": 4096,
    "timeoutMs": 120000
  }
}
```

### Layer 2 (Cross-File)

```json
{
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.3,
    "thinkingDepth": "high",
    "concurrency": 1,
    "maxOutputTokens": 8192,
    "timeoutMs": 300000
  }
}
```

---

## When to Adjust Layers

### Increase Layer 1 Depth

- Missing common vulnerabilities
- High false negative rate
- Complex frameworks in use

### Increase Layer 2 Depth

- Missing business logic bugs
- Architecture-level issues
- Complex data flow patterns

### Reduce Both Layers

- Cost optimization needed
- Quick scans for development
- Low-risk codebases

---

## See Also

- [Pipeline Architecture](./pipeline.md)
- [Configure Provider per Node](../../how-to/configure-provider-per-node.md)
- [Enable Thinking Mode](../../how-to/enable-thinking-mode.md)
