# API Reference: Scans

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for managing security scans.

---

## Base URL

```
https://astra.example.com/api/v1/scans
```

All endpoints require authentication unless noted.

---

## POST /api/v1/scans

Create a new security scan.

### Request

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "config": {
    "severity": ["CRITICAL", "HIGH", "MEDIUM"],
    "ignore": ["node_modules/**", "*.test.ts"],
    "nodes": {
      "discover": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "temperature": 0.2,
        "thinkingDepth": "low"
      },
      "deepScan": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6",
        "temperature": 0.2,
        "thinkingDepth": "medium",
        "concurrency": 5
      },
      "crossFile": {
        "provider": "anthropic",
        "model": "claude-4-opus",
        "temperature": 0.3,
        "thinkingDepth": "high"
      }
    }
  }
}
```

### Response

**201 Created:**
```json
{
  "id": "scan-abc123",
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "status": "PENDING",
  "configJson": {...},
  "userId": "user-xyz",
  "createdAt": "2026-05-15T10:30:00Z",
  "updatedAt": "2026-05-15T10:30:00Z"
}
```

### Permissions

- **ANALYST:** Can create scans (own scans only)
- **ADMIN:** Can create scans (all scans)
- **VIEWER:** Cannot create scans

---

## GET /api/v1/scans

List all scans with optional filters.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status (PENDING, RUNNING, COMPLETED, FAILED) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `sort` | string | Sort field (createdAt, status, repoUrl) |
| `order` | string | Sort order (asc, desc) |

### Request

```
GET /api/v1/scans?status=COMPLETED&page=1&limit=20
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "scans": [
    {
      "id": "scan-abc123",
      "repoUrl": "https://github.com/owner/repo",
      "branch": "main",
      "status": "COMPLETED",
      "durationSeconds": 847,
      "toolFindingsCount": 47,
      "createdAt": "2026-05-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### Permissions

- **ADMIN:** Sees all scans
- **ANALYST/VIEWER:** Sees only own scans

---

## GET /api/v1/scans/:id

Get detailed information about a specific scan.

### Request

```
GET /api/v1/scans/scan-abc123
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "id": "scan-abc123",
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "commitSha": "f4e2d1c8b9a7...",
  "status": "COMPLETED",
  "configJson": {...},
  "durationSeconds": 847,
  "totalInputTokens": 125000,
  "totalOutputTokens": 45000,
  "repoIntel": {...},
  "architectureDiagram": "mermaid\ngraph TD...",
  "toolFindingsCount": 47,
  "userId": "user-xyz",
  "createdAt": "2026-05-15T10:30:00Z",
  "updatedAt": "2026-05-15T11:15:00Z"
}
```

### Permissions

- **ADMIN:** Can view all scans
- **ANALYST/VIEWER:** Can view only own scans

---

## POST /api/v1/scans/:id/rerun-node

Re-execute a specific pipeline stage.

### Request

**Body:**
```json
{
  "node": "deep_scan",
  "config": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "thinkingDepth": "high"
  }
}
```

### Response

**202 Accepted:**
```json
{
  "message": "Node re-run initiated",
  "node": "deep_scan",
  "jobId": "job-xyz789"
}
```

### Permissions

- **ANALYST:** Can re-run nodes on own scans
- **ADMIN:** Can re-run nodes on all scans

---

## GET /api/v1/scans/:id/logs

Get scan execution logs.

### Request

```
GET /api/v1/scans/scan-abc123/logs
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "logs": [
    {
      "id": "log-1",
      "level": "info",
      "source": "clone",
      "message": "Repository cloned successfully",
      "detail": {"localDir": "/tmp/astra-scan-abc123"},
      "createdAt": "2026-05-15T10:30:15Z"
    },
    {
      "id": "log-2",
      "level": "info",
      "source": "deep_scan",
      "message": "Analyzing file src/auth/login.ts",
      "detail": {"file": "src/auth/login.ts"},
      "createdAt": "2026-05-15T10:35:22Z"
    }
  ]
}
```

---

## GET /api/v1/scans/:id/nodes

Get pipeline node statuses.

### Request

```
GET /api/v1/scans/scan-abc123/nodes
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "nodes": [
    {
      "node": "clone",
      "status": "COMPLETED",
      "startedAt": "2026-05-15T10:30:00Z",
      "completedAt": "2026-05-15T10:30:45Z",
      "durationMs": 45000
    },
    {
      "node": "discover",
      "status": "COMPLETED",
      "startedAt": "2026-05-15T10:30:46Z",
      "completedAt": "2026-05-15T10:31:30Z",
      "durationMs": 44000
    },
    {
      "node": "deep_scan",
      "status": "RUNNING",
      "startedAt": "2026-05-15T10:32:00Z",
      "completedAt": null,
      "durationMs": null
    }
  ]
}
```

---

## GET /api/v1/scans/:id/progress

SSE stream for real-time scan progress.

### Request

```
GET /api/v1/scans/scan-abc123/progress
Authorization: Bearer <token>
```

### Response

**Server-Sent Events stream:**
```
event: progress
data: {"node": "clone", "status": "COMPLETED", "progress": 0.11}

event: progress
data: {"node": "discover", "status": "RUNNING", "progress": 0.22}

event: progress
data: {"node": "deep_scan", "status": "RUNNING", "progress": 0.65, "currentFile": "src/auth/login.ts"}
```

---

## POST /api/v1/scans/:id/cancel

Cancel a running scan.

### Request

```
POST /api/v1/scans/scan-abc123/cancel
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "message": "Scan cancelled",
  "scanId": "scan-abc123",
  "status": "CANCELLED"
}
```

---

## POST /api/v1/scans/:id/resume

Resume a failed scan.

### Request

```
POST /api/v1/scans/scan-abc123/resume
Authorization: Bearer <token>
```

### Response

**202 Accepted:**
```json
{
  "message": "Scan resumed",
  "scanId": "scan-abc123",
  "status": "RUNNING"
}
```

---

## POST /api/v1/scans/:id/chat

Send message to scan-level AI chat.

### Request

**Body:**
```json
{
  "message": "What's the overall security posture of this repository?",
  "model": "claude-sonnet-4-6"
}
```

### Response

**200 OK (streaming):**
```json
{
  "conversationId": "conv-abc123",
  "messageId": "msg-xyz789",
  "content": "Based on the 47 findings, the highest-risk issue is...",
  "tokens": {
    "input": 2500,
    "output": 850
  }
}
```

---

## GET /api/v1/scans/:id/export

Export findings in various formats.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Export format (json, csv, sarif, html, md) |

### Request

```
GET /api/v1/scans/scan-abc123/export?format=json
Authorization: Bearer <token>
```

### Response

**200 OK:**
- Returns file download with appropriate Content-Type

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
  "message": "Scan not found"
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

- [Findings API](./findings.md)
- [Tasks API](./tasks.md)
- [Chat API](./chat.md)
- [AI Calls API](./ai-calls.md)
