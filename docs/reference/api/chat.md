# API Reference: Chat

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for AI chat functionality.

---

## Base URL

```
https://astra.example.com/api/v1/chat
```

All endpoints require authentication.

---

## POST /api/v1/chat

Send a message to the global AI chat.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "message": "What's the difference between SQL injection and XSS?",
  "model": "claude-sonnet-4-6",
  "provider": "anthropic",
  "temperature": 0.3,
  "thinkingDepth": "low",
  "maxOutputTokens": 2048
}
```

### Response

**200 OK:**
```json
{
  "conversationId": "conv-abc123",
  "messageId": "msg-xyz789",
  "role": "assistant",
  "content": "SQL Injection and XSS (Cross-Site Scripting) are both injection vulnerabilities...\n\n## SQL Injection\n- Occurs in database queries\n- Attacker injects SQL code\n- Can lead to data breach, data loss, authentication bypass\n\n## XSS\n- Occurs in web pages\n- Attacker injects JavaScript\n- Can lead to session hijacking, defacement, malware distribution",
  "tokens": {
    "input": 150,
    "output": 850,
    "thinking": 512
  },
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "latencyMs": 1250,
  "createdAt": "2026-05-15T14:30:00Z"
}
```

### Streaming Response

For streaming responses, use SSE:

**Request:**
```json
{
  "message": "Explain OWASP Top 10",
  "stream": true
}
```

**Response (SSE):**
```
event: token
data: {"content": "The", "tokens": {"output": 1}}

event: token
data: {"content": " OWASP", "tokens": {"output": 2}}

event: token
data: {"content": " Top", "tokens": {"output": 3}}

event: done
data: {"conversationId": "conv-abc123", "messageId": "msg-xyz789", "totalTokens": {"input": 150, "output": 850}}
```

---

## GET /api/v1/chat/config

Get chat configuration (current provider, available models).

### Request

```
GET /api/v1/chat/config
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "currentProvider": "anthropic",
  "currentModel": "claude-sonnet-4-6",
  "availableProviders": [
    {
      "id": "cloud-ollama",
      "name": "Cloud Ollama",
      "models": [
        {"id": "llama-3.1-70b", "name": "Llama 3.1 70B", "contextWindow": 128000},
        {"id": "mistral-large", "name": "Mistral Large", "contextWindow": 32000}
      ]
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "models": [
        {"id": "claude-4-opus", "name": "Claude 4 Opus", "contextWindow": 200000, "supportsThinking": true},
        {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4", "contextWindow": 200000, "supportsThinking": true}
      ]
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "models": [
        {"id": "gpt-4o", "name": "GPT-4o", "contextWindow": 128000},
        {"id": "o4-mini", "name": "o4-mini", "contextWindow": 200000, "supportsThinking": true}
      ]
    }
  ]
}
```

---

## Conversation Context

### Scan-Level Chat

For scan-specific conversations, use the scans API:

```
POST /api/v1/scans/:id/chat
```

See [Scans API](./scans.md) for details.

### Finding-Level Chat

For finding-specific conversations, use the findings API:

```
POST /api/v1/findings/:id/chat
```

See [Findings API](./findings.md) for details.

---

## Conversation History

To retrieve conversation history:

### Request

```
GET /api/v1/chat/conversations?scanId=scan-abc123&limit=10
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "conversations": [
    {
      "id": "conv-abc123",
      "scanId": "scan-abc123",
      "findingId": null,
      "userId": "user-xyz",
      "messages": [
        {
          "id": "msg-1",
          "role": "user",
          "content": "What's the biggest risk in this scan?",
          "createdAt": "2026-05-15T14:00:00Z"
        },
        {
          "id": "msg-2",
          "role": "assistant",
          "content": "Based on the 47 findings, the highest-risk issue is...",
          "createdAt": "2026-05-15T14:00:05Z"
        }
      ],
      "createdAt": "2026-05-15T14:00:00Z"
    }
  ]
}
```

---

## Delete Conversation

To delete a conversation:

### Request

```
DELETE /api/v1/chat/conversations/conv-abc123
Authorization: Bearer <token>
```

### Response

**204 No Content**

---

## Model Parameters

### Temperature

Controls randomness in responses:

- `0.0–0.3`: Deterministic, focused (recommended for security)
- `0.4–0.7`: Balanced
- `0.8–2.0`: Creative (not recommended for security)

### Thinking Depth

Enables AI reasoning:

| Depth | Budget | Use Case |
|-------|--------|----------|
| `none` | 0 | Simple questions |
| `low` | 1024 | Basic analysis |
| `medium` | 2048 | Standard analysis |
| `high` | 4096 | Complex reasoning |
| `max` | 8192 | Architecture review |

### Max Output Tokens

Limit response length:

- `512–1024`: Quick answers
- `2048–4096`: Detailed explanations
- `4096+`: Comprehensive analysis

---

## Error Responses

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid model specified"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 429 Rate Limited

```json
{
  "error": "Rate Limited",
  "message": "Too many requests. Try again in 60 seconds.",
  "retryAfter": 60
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "AI provider unavailable"
}
```

---

## See Also

- [Scans API](./scans.md)
- [Findings API](./findings.md)
- [AI Calls API](./ai-calls.md)
- [AI Chat Tutorial](../../tutorials/04-ai-chat.md)
