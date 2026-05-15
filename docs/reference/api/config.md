# API Reference: Config

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for system configuration.

---

## Base URL

```
https://astra.example.com/api/v1/config
```

All endpoints require authentication. ADMIN role required for writes.

---

## GET /api/v1/config

Get system configuration.

### Request

```
GET /api/v1/config
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "providers": {
    "cloud-ollama": {
      "baseURL": "https://api.ohmyllama.com",
      "apiKeyEnv": "OLLAMA_API_KEY",
      "models": {
        "llama-3.1-70b": {
          "inputTokenLimit": 128000,
          "outputTokenLimit": 4096,
          "contextWindow": 128000,
          "temperature": 0.2,
          "supportsThinking": false
        }
      }
    },
    "anthropic": {
      "baseURL": "https://api.anthropic.com",
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "models": {
        "claude-4-opus": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 4096
        }
      }
    }
  },
  "scan": {
    "nodes": {
      "discover": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "temperature": 0.2,
        "thinkingDepth": "low",
        "timeoutMs": 60000,
        "maxRetries": 2
      },
      "deepScan": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "temperature": 0.2,
        "thinkingDepth": "medium",
        "concurrency": 5,
        "timeoutMs": 120000
      },
      "crossFile": {
        "provider": "anthropic",
        "model": "claude-4-opus",
        "temperature": 0.3,
        "thinkingDepth": "high",
        "timeoutMs": 180000
      }
    },
    "severity": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
    "ignore": ["node_modules/**", "*.test.ts"]
  },
  "chat": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.3,
    "thinkingDepth": "low",
    "maxOutputTokens": 2048
  }
}
```

---

## PUT /api/v1/config

Update system configuration.

### Permissions

- **ADMIN:** Can update configuration
- **ANALYST/VIEWER:** Cannot update configuration

### Request

**Body:**
```json
{
  "scan": {
    "nodes": {
      "deepScan": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.2,
        "thinkingDepth": "medium",
        "concurrency": 10
      }
    }
  }
}
```

### Response

**200 OK:**
```json
{
  "message": "Configuration updated successfully",
  "updatedAt": "2026-05-15T15:00:00Z"
}
```

---

## Configuration Schema

### Providers

| Field | Type | Description |
|-------|------|-------------|
| `baseURL` | string | API endpoint URL |
| `apiKeyEnv` | string | Environment variable name for API key |
| `models` | object | Available models for this provider |

### Node Configuration

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider ID |
| `model` | string | Model ID |
| `temperature` | number | 0.0–2.0 |
| `thinkingDepth` | string | none, low, medium, high, max |
| `thinkingBudget` | number | Token budget for thinking |
| `topP` | number | 0.0–1.0 |
| `topK` | number | Optional |
| `frequencyPenalty` | number | 0.0–2.0 |
| `presencePenalty` | number | 0.0–2.0 |
| `stopSequences` | array | Custom stop sequences |
| `scanDepth` | string | quick, standard, deep, exhaustive |
| `maxFileBytes` | number | Maximum file size to analyze |
| `maxOutputTokens` | number | Maximum response tokens |
| `contextWindowOverride` | number | Override context window |
| `instructions` | string | Custom instructions |
| `tools` | array | Enabled tools |
| `knowledge` | array | Knowledge base references |
| `maxRetries` | number | 0–5 |
| `retryBackoffMs` | number | Backoff in milliseconds |
| `timeoutMs` | number | Request timeout |
| `concurrency` | number | Parallel execution count |

### Chat Configuration

| Field | Type | Description |
|-------|------|-------------|
| `provider` | string | Provider ID |
| `model` | string | Model ID |
| `temperature` | number | 0.0–2.0 |
| `thinkingDepth` | string | none, low, medium, high, max |
| `maxOutputTokens` | number | Maximum response tokens |
| `systemPrompt` | string | Custom system prompt |

---

## Configuration Storage

Configuration is stored in the database (`Config` table) with key `astra.scan.config`.

On first boot, if no DB config exists, the file `scan.config.json` is loaded and saved to the database.

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden",
  "message": "ADMIN role required"
}
```

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid configuration schema"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## See Also

- [Configuring AI Providers Tutorial](../../tutorials/05-provider-config.md)
- [Provider Registry](../config/providers.md)
- [Node Configuration Reference](../config/nodes.md)
