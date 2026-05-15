# Database Schema: Job

**Last updated:** 2026-05-15 | **Version:** v2.23.0

The `Job` model represents a pipeline stage execution.

---

## Schema Definition

```prisma
model Job {
  id          String    @id @default(cuid())
  scanId      String
  node        String
  status      JobStatus @default(PENDING)
  attempts    Int       @default(0)
  maxAttempts Int       @default(3)
  inputJson   Json      @default("{}")
  outputJson  Json?
  error       String?
  createdAt   DateTime  @default(now())
  startedAt   DateTime?
  completedAt DateTime?

  scan Scan @relation(fields: [scanId], references: [id], onDelete: Cascade)
  aiCallLogs AiCallLog[]

  @@index([scanId])
  @@index([status])
  @@index([scanId, node])
}
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (cuid) |
| `scanId` | String | Parent scan ID |
| `node` | String | Pipeline stage name |
| `status` | JobStatus | PENDING, RUNNING, COMPLETED, FAILED |
| `attempts` | Int | Execution attempt count |
| `maxAttempts` | Int | Maximum retry attempts |
| `inputJson` | Json | Input state for the node |
| `outputJson` | Json | Output state from the node |
| `error` | String | Error message (if failed) |
| `createdAt` | DateTime | Creation timestamp |
| `startedAt` | DateTime | Execution start timestamp |
| `completedAt` | DateTime | Execution end timestamp |

---

## Status Enum

```prisma
enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

---

## Pipeline Nodes

| Node | Description |
|------|-------------|
| `clone` | Git clone repository |
| `discover` | AI file prioritization |
| `git_ingest` | Git history analysis |
| `git_diagram` | Architecture diagram generation |
| `tool_scan` | Trivy/Semgrep/Gitleaks/Bearer |
| `deep_scan` | Per-file AI analysis |
| `cross_file` | Cross-module business logic |
| `aggregate` | Deduplication and fingerprinting |
| `persist` | Save findings to database |

---

## Example Record

```json
{
  "id": "job-abc123",
  "scanId": "scan-xyz789",
  "node": "deep_scan",
  "status": "COMPLETED",
  "attempts": 1,
  "maxAttempts": 3,
  "inputJson": {
    "discoveredFiles": [...],
    "localDir": "/tmp/astra-scan-xyz"
  },
  "outputJson": {
    "findingsPerFile": {...},
    "fileSummaries": [...],
    "tokenUsage": {"input": 45230, "output": 12450}
  },
  "error": null,
  "createdAt": "2026-05-15T10:32:00Z",
  "startedAt": "2026-05-15T10:32:05Z",
  "completedAt": "2026-05-15T10:45:30Z"
}
```

---

## Job Lifecycle

```
PENDING → RUNNING → COMPLETED
              ↓
            FAILED (retry up to maxAttempts)
```

---

## See Also

- [Scan Schema](./scan.md)
- [Pipeline Architecture](../../explanation/architecture/pipeline.md)
- [Worker Implementation](../../reference/worker.md)
