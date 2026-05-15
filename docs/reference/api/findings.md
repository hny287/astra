# API Reference: Findings

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for managing security findings.

---

## Base URL

```
https://astra.example.com/api/v1/findings
```

All endpoints require authentication.

---

## GET /api/v1/findings

List findings with optional filters.

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `scanId` | string | Filter by scan ID |
| `severity` | string | Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO) |
| `status` | string | Filter by status (OPEN, CONFIRMED, REMEDIATED, etc.) |
| `category` | string | Filter by category (SAST, SCA, SECRETS, etc.) |
| `assignedToId` | string | Filter by assignee |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

### Request

```
GET /api/v1/findings?severity=CRITICAL&status=OPEN&page=1&limit=20
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "findings": [
    {
      "id": "finding-abc123",
      "fingerprint": "sha256:...",
      "scanId": "scan-xyz789",
      "scanner": "deep_scan",
      "title": "SQL Injection via user input",
      "severity": "CRITICAL",
      "category": "SAST",
      "file": "src/auth/login.ts",
      "lineStart": 42,
      "lineEnd": 48,
      "cwe": ["CWE-89"],
      "owasp": ["A03:2021-Injection"],
      "status": "OPEN",
      "assignedToId": null,
      "createdAt": "2026-05-15T10:45:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

---

## GET /api/v1/findings/:id

Get detailed information about a specific finding.

### Request

```
GET /api/v1/findings/finding-abc123
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "id": "finding-abc123",
  "fingerprint": "sha256:...",
  "scanId": "scan-xyz789",
  "scanner": "deep_scan",
  "ruleId": "sql-injection-001",
  "title": "SQL Injection via user input",
  "description": "User input is directly concatenated into SQL query",
  "severity": "CRITICAL",
  "category": "SAST",
  "file": "src/auth/login.ts",
  "lineStart": 42,
  "lineEnd": 48,
  "codeSnippet": "const query = `SELECT * FROM users WHERE email = '${email}'`;",
  "language": "typescript",
  "cwe": ["CWE-89"],
  "owasp": ["A03:2021-Injection"],
  "aiExplanation": "User input is directly concatenated into the SQL query without sanitization...",
  "aiFix": "Use parameterized queries: const query = 'SELECT * FROM users WHERE email = $1';",
  "exploitationScenario": "An attacker could send a POST request with email=admin' OR '1'='1' --",
  "exploitScore": 0.94,
  "cvssScore": 9.1,
  "cvssVector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  "confidence": 0.95,
  "remediation": "Implement parameterized queries using prepared statements",
  "status": "OPEN",
  "assignedToId": null,
  "createdAt": "2026-05-15T10:45:00Z",
  "rawJson": {...}
}
```

---

## PATCH /api/v1/findings/:id

Update a finding.

### Request

**Body:**
```json
{
  "status": "CONFIRMED",
  "assignedToId": "user-xyz123"
}
```

### Response

**200 OK:**
```json
{
  "id": "finding-abc123",
  "status": "CONFIRMED",
  "assignedToId": "user-xyz123",
  "updatedAt": "2026-05-15T11:00:00Z"
}
```

### Permissions

- **ANALYST:** Can update findings
- **VIEWER:** Cannot update findings

---

## POST /api/v1/findings/:id/rescan

Rescan the file associated with a finding.

### Request

**Body (optional):**
```json
{
  "provider": "anthropic",
  "model": "claude-4-opus",
  "thinkingDepth": "high"
}
```

### Response

**202 Accepted:**
```json
{
  "message": "File rescan initiated",
  "findingId": "finding-abc123",
  "jobId": "job-rescan-123"
}
```

---

## POST /api/v1/findings/:id/task

Create a task from a finding.

### Request

**Body:**
```json
{
  "title": "Fix SQL injection in login.ts",
  "type": "REMEDIATION",
  "assignedToId": "user-xyz123",
  "dueDate": "2026-05-20T00:00:00Z"
}
```

### Response

**201 Created:**
```json
{
  "id": "task-abc123",
  "title": "Fix SQL injection in login.ts",
  "type": "REMEDIATION",
  "severity": "CRITICAL",
  "status": "OPEN",
  "findingId": "finding-abc123",
  "assignedToId": "user-xyz123",
  "createdAt": "2026-05-15T11:00:00Z"
}
```

---

## GET /api/v1/findings/:id/chat

Send message to finding-level AI chat.

### Request

**Body:**
```json
{
  "message": "Is this a true positive or false positive?",
  "model": "claude-sonnet-4-6"
}
```

### Response

**200 OK:**
```json
{
  "conversationId": "conv-finding-123",
  "messageId": "msg-xyz789",
  "content": "This is a true positive. The code at line 42 directly concatenates...",
  "tokens": {
    "input": 1500,
    "output": 450
  }
}
```

---

## GET /api/v1/findings/:id/comments

Get comments on a finding.

### Request

```
GET /api/v1/findings/finding-abc123/comments
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "comments": [
    {
      "id": "comment-1",
      "findingId": "finding-abc123",
      "userId": "user-xyz",
      "text": "After reviewing the code flow, this is a true positive.",
      "createdAt": "2026-05-15T11:30:00Z"
    }
  ]
}
```

---

## POST /api/v1/findings/:id/comments

Add a comment to a finding.

### Request

**Body:**
```json
{
  "text": "After reviewing the code flow, this is a true positive. Assigning to @backend-team."
}
```

### Response

**201 Created:**
```json
{
  "id": "comment-abc123",
  "findingId": "finding-abc123",
  "userId": "user-xyz",
  "text": "After reviewing the code flow, this is a true positive. Assigning to @backend-team.",
  "createdAt": "2026-05-15T11:30:00Z"
}
```

---

## GET /api/v1/findings/:id/history

Get status history for a finding.

### Request

```
GET /api/v1/findings/finding-abc123/history
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "history": [
    {
      "id": "history-1",
      "findingId": "finding-abc123",
      "userId": "user-xyz",
      "action": "status_change",
      "oldValue": "OPEN",
      "newValue": "CONFIRMED",
      "createdAt": "2026-05-15T11:00:00Z"
    },
    {
      "id": "history-2",
      "findingId": "finding-abc123",
      "userId": "user-xyz",
      "action": "assignment",
      "oldValue": null,
      "newValue": "user-abc",
      "createdAt": "2026-05-15T11:00:05Z"
    }
  ]
}
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
  "message": "Finding not found"
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

- [Scans API](./scans.md)
- [Tasks API](./tasks.md)
- [Chat API](./chat.md)
