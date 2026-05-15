# Node Configuration Reference

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Detailed configuration options for each pipeline node.

---

## All Nodes

Each node accepts the following configuration fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | enum | - | AI provider ID |
| `model` | string | - | Model ID |
| `temperature` | number | 0.2 | 0.0–2.0 |
| `thinkingDepth` | enum | medium | none, low, medium, high, max |
| `thinkingBudget` | number | null | Token budget |
| `topP` | number | 0.9 | 0.0–1.0 |
| `topK` | number | null | Optional |
| `frequencyPenalty` | number | 0 | 0.0–2.0 |
| `presencePenalty` | number | 0 | 0.0–2.0 |
| `stopSequences` | array | [] | Custom stops |
| `scanDepth` | enum | standard | quick, standard, deep, exhaustive |
| `maxFileBytes` | number | 204800 | Max file size (200KB) |
| `maxOutputTokens` | number | 4096 | Max response tokens |
| `contextWindowOverride` | number | null | Override context |
| `instructions` | string | "" | Custom instructions |
| `tools` | array | [] | Enabled tools |
| `knowledge` | array | [] | Knowledge references |
| `maxRetries` | number | 3 | 0–5 |
| `retryBackoffMs` | number | 2000 | Backoff ms |
| `timeoutMs` | number | 120000 | Timeout ms |
| `concurrency` | number | 1 | Parallel execution |

---

## Node-Specific Defaults

### Discover

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "low",
  "thinkingBudget": null,
  "topP": 0.9,
  "topK": null,
  "frequencyPenalty": 0,
  "presencePenalty": 0,
  "stopSequences": [],
  "scanDepth": "standard",
  "maxFileBytes": 204800,
  "maxOutputTokens": 2048,
  "contextWindowOverride": null,
  "instructions": "",
  "tools": [],
  "knowledge": [],
  "maxRetries": 3,
  "retryBackoffMs": 2000,
  "timeoutMs": 60000,
  "concurrency": 1
}
```

**Purpose:** AI-guided file prioritization

**Recommended:**
- Low thinking depth (fast prioritization)
- Standard temperature (0.2)
- Single concurrency

---

### Git Ingest

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "none",
  "maxOutputTokens": 1024,
  "timeoutMs": 30000,
  "maxRetries": 2
}
```

**Purpose:** Git history analysis

**Recommended:**
- No thinking needed (structured data)
- Low output tokens (metadata only)
- Short timeout

---

### Git Diagram

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.3,
  "thinkingDepth": "low",
  "maxOutputTokens": 2048,
  "timeoutMs": 60000
}
```

**Purpose:** Architecture diagram generation

**Recommended:**
- Slightly higher temperature (creative output)
- Low thinking for structure analysis

---

### Tool Scan

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "none",
  "maxOutputTokens": 1024,
  "timeoutMs": 180000
}
```

**Purpose:** Trivy/Semgrep/Gitleaks/Bearer execution

**Recommended:**
- No thinking (tool output is deterministic)
- Long timeout (tools can be slow)

---

### Deep Scan

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.2,
  "thinkingDepth": "medium",
  "maxOutputTokens": 4096,
  "timeoutMs": 120000,
  "concurrency": 5
}
```

**Purpose:** Per-file AI vulnerability analysis

**Recommended:**
- Medium thinking for analysis
- Higher concurrency (5–10) for parallelism
- Standard temperature (0.2)

---

### Cross-File

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "temperature": 0.3,
  "thinkingDepth": "medium",
  "maxOutputTokens": 4096,
  "timeoutMs": 180000,
  "concurrency": 1
}
```

**Purpose:** Cross-module business logic inference

**Recommended:**
- Medium to high thinking
- Single concurrency (complex analysis)
- Higher temperature (0.3) for creativity

---

## Configuration Examples

### Budget Configuration

```json
{
  "discover": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "thinkingDepth": "none"
  },
  "deepScan": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "thinkingDepth": "low",
    "concurrency": 10
  },
  "crossFile": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "thinkingDepth": "medium"
  }
}
```

### Accuracy Configuration

```json
{
  "discover": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "thinkingDepth": "medium"
  },
  "deepScan": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "thinkingDepth": "high",
    "concurrency": 3
  },
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "thinkingDepth": "max"
  }
}
```

---

## See Also

- [Config Schema](./schema.md)
- [Provider Registry](./providers.md)
- [Pipeline Tutorial](../../tutorials/02-scan-pipeline.md)
