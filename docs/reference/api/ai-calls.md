# API Reference: AI Calls

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for AI call observability.

---

## Base URL

```
https://astra.example.com/api/v1/ai-calls
```

All endpoints require authentication.

---

## GET /api/v1/ai-calls

List AI call logs with optional filters.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `scanId` | string | Filter by scan ID |
| `provider` | string | Filter by provider |
| `model` | string | Filter by model |
| `status` | string | Filter by status (SUCCESS, ERROR, TIMEOUT, RATE_LIMITED) |
| `source` | string | Filter by source (chat, deep_scan, cross_file, etc.) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

### Request

```
GET /api/v1/ai-calls?status=ERROR&page=1&limit=20
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "aiCalls": [
    {
      "id": "aicall-abc123",
      "scanId": "scan-xyz789",
      "jobId": "job-deep-scan-456",
      "source": "deep_scan",
      "node": "deep_scan",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6",
      "endpoint": "https://api.anthropic.com/v1/messages",
      "sdk": "@anthropic-ai/sdk",
      "sdkVersion": "0.30.1",
      "systemPrompt": "You are a security expert analyzing code...",
      "userPrompt": "Analyze this file for vulnerabilities: src/auth/login.ts",
      "response": "I found 3 vulnerabilities...",
      "inputTokens": 2500,
      "outputTokens": 850,
      "thinkingTokens": 512,
      "latencyMs": 1250,
      "temperature": 0.2,
      "thinkingDepth": "medium",
      "status": "SUCCESS",
      "error": null,
      "createdAt": "2026-05-15T10:35:22Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 342,
    "totalPages": 18
  }
}
```

---

## GET /api/v1/ai-calls/stats

Get AI call statistics.

### Request

```
GET /api/v1/ai-calls/stats
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "totalCalls": 1247,
  "successRate": 0.94,
  "totalTokens": {
    "input": 2450000,
    "output": 890000,
    "thinking": 340000
  },
  "totalCost": {
    "amount": 45.67,
    "currency": "USD"
  },
  "averageLatencyMs": 1450,
  "byProvider": [
    {
      "provider": "anthropic",
      "calls": 856,
      "successRate": 0.96,
      "tokens": {"input": 1800000, "output": 650000, "thinking": 280000}
    },
    {
      "provider": "openai",
      "calls": 234,
      "successRate": 0.92,
      "tokens": {"input": 450000, "output": 180000, "thinking": 45000}
    },
    {
      "provider": "cloud-ollama",
      "calls": 157,
      "successRate": 0.89,
      "tokens": {"input": 200000, "output": 60000, "thinking": 15000}
    }
  ],
  "byNode": [
    {
      "node": "deep_scan",
      "calls": 623,
      "averageLatencyMs": 1850
    },
    {
      "node": "cross_file",
      "calls": 89,
      "averageLatencyMs": 3200
    },
    {
      "node": "discover",
      "calls": 156,
      "averageLatencyMs": 950
    }
  ]
}
```

---

## GET /api/v1/ai-calls/:id

Get detailed information about a specific AI call.

### Request

```
GET /api/v1/ai-calls/aicall-abc123
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "id": "aicall-abc123",
  "scanId": "scan-xyz789",
  "jobId": "job-deep-scan-456",
  "findingId": null,
  "userId": "user-xyz",
  "source": "deep_scan",
  "node": "deep_scan",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "endpoint": "https://api.anthropic.com/v1/messages",
  "sdk": "@anthropic-ai/sdk",
  "sdkVersion": "0.30.1",
  "rawRequest": {
    "model": "claude-sonnet-4-6",
    "max_tokens": 4096,
    "messages": [
      {
        "role": "user",
        "content": "Analyze this file for vulnerabilities..."
      }
    ]
  },
  "rawResponse": {
    "id": "msg-abc123",
    "type": "message",
    "content": [
      {
        "type": "text",
        "text": "I found 3 vulnerabilities..."
      }
    ]
  },
  "systemPrompt": "You are a security expert analyzing code for vulnerabilities...",
  "userPrompt": "Analyze this file for vulnerabilities: src/auth/login.ts\n\n[File content...]",
  "response": "I found 3 vulnerabilities in this file:\n\n1. SQL Injection (line 42)\n2. Weak password hashing (line 78)\n3. Session token logging (line 92)",
  "inputTokens": 2500,
  "outputTokens": 850,
  "thinkingTokens": 512,
  "latencyMs": 1250,
  "temperature": 0.2,
  "thinkingDepth": "medium",
  "thinkingBudget": 2048,
  "topP": 0.9,
  "topK": null,
  "maxOutputTokens": 4096,
  "nodeConfig": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.2,
    "thinkingDepth": "medium"
  },
  "status": "SUCCESS",
  "error": null,
  "createdAt": "2026-05-15T10:35:22Z"
}
```

---

## POST /api/v1/ai-calls/:id/retry

Retry a failed AI call.

### Permissions

- **ADMIN:** Can retry any AI call
- **ANALYST:** Can retry AI calls on own scans

### Request

```
POST /api/v1/ai-calls/aicall-abc123/retry
Authorization: Bearer <token>
```

### Response

**202 Accepted:**
```json
{
  "message": "AI call retry initiated",
  "aiCallId": "aicall-abc123",
  "newAiCallId": "aicall-def456"
}
```

---

## AI Call Statuses

| Status | Description |
|--------|-------------|
| **SUCCESS** | Call completed successfully |
| **ERROR** | API returned an error |
| **TIMEOUT** | Request timed out |
| **RATE_LIMITED** | Provider rate limit exceeded |
| **CANCELLED** | Call was cancelled by user |

---

## Filtering Examples

### Failed Calls Only

```
GET /api/v1/ai-calls?status=ERROR
```

### By Provider

```
GET /api/v1/ai-calls?provider=anthropic
```

### By Scan

```
GET /api/v1/ai-calls?scanId=scan-abc123
```

### High Latency Calls

```
GET /api/v1/ai-calls?minLatencyMs=5000
```

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
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "Not Found",
  "message": "AI call not found"
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

- [Retry AI Calls How-to](../../how-to/retry-ai-calls.md)
- [AI Chat API](./chat.md)
- [Observability Guide](../../explanation/architecture/observability.md)
