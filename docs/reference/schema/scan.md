# Database Schema: Scan

**Last updated:** 2026-05-15 | **Version:** v2.23.0

The `Scan` model represents a security scan execution.

---

## Schema Definition

```prisma
model Scan {
  id                String            @id @default(cuid())
  repoUrl           String
  branch            String            @default("main")
  commitSha         String?
  status            ScanStatus        @default(PENDING)
  configJson        Json
  durationSeconds   Int?
  totalInputTokens  Int               @default(0)
  totalOutputTokens Int               @default(0)
  repoIntel         Json?
  architectureDiagram String?
  toolFindingsCount Int               @default(0)
  userId            String?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  findings        Finding[]
  businessRules   BusinessLogicRule[]
  nodeOutputs     NodeOutput[]
  jobs            Job[]
  logs            ScanLog[]
  rules           UserRule[]
  conversations   AiConversation[]
  aiCallLogs      AiCallLog[]
  tasks           Task[]
  user            User?              @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([createdAt])
  @@index([userId])
}
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (cuid) |
| `repoUrl` | String | Git repository URL |
| `branch` | String | Branch to scan (default: main) |
| `commitSha` | String | Commit hash (populated after clone) |
| `status` | ScanStatus | Current scan status |
| `configJson` | Json | Full scan configuration |
| `durationSeconds` | Int | Total execution time |
| `totalInputTokens` | Int | Cumulative input tokens |
| `totalOutputTokens` | Int | Cumulative output tokens |
| `repoIntel` | Json | Repository intelligence data |
| `architectureDiagram` | String | Mermaid diagram source |
| `toolFindingsCount` | Int | Count of tool-generated findings |
| `userId` | String | Owner's user ID |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

---

## Status Enum

```prisma
enum ScanStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### Status Transitions

```
PENDING → RUNNING → COMPLETED
              ↓
            FAILED
```

---

## Relations

| Relation | Model | Description |
|----------|-------|-------------|
| `findings` | Finding | All findings from this scan |
| `businessRules` | BusinessLogicRule | Inferred business logic rules |
| `nodeOutputs` | NodeOutput | AI outputs per pipeline stage |
| `jobs` | Job | Pipeline job executions |
| `logs` | ScanLog | Execution logs |
| `rules` | UserRule | Scan-specific security rules |
| `conversations` | AiConversation | AI chat conversations |
| `aiCallLogs` | AiCallLog | All AI calls for this scan |
| `tasks` | Task | Remediation tasks |
| `user` | User | Scan owner |

---

## Example Record

```json
{
  "id": "scan-abc123",
  "repoUrl": "https://github.com/owner/repo",
  "branch": "main",
  "commitSha": "f4e2d1c8b9a7...",
  "status": "COMPLETED",
  "configJson": {
    "providers": {...},
    "scan": {
      "nodes": {...},
      "severity": ["CRITICAL", "HIGH", "MEDIUM"]
    }
  },
  "durationSeconds": 847,
  "totalInputTokens": 125000,
  "totalOutputTokens": 45000,
  "repoIntel": {
    "totalCommits": 1247,
    "contributors": 23,
    "hotspots": [...]
  },
  "architectureDiagram": "mermaid\ngraph TD...",
  "toolFindingsCount": 47,
  "userId": "user-xyz",
  "createdAt": "2026-05-15T10:30:00Z",
  "updatedAt": "2026-05-15T11:15:00Z"
}
```

---

## Queries

### Find Completed Scans

```typescript
const completed = await prisma.scan.findMany({
  where: { status: 'COMPLETED' },
  orderBy: { createdAt: 'desc' }
});
```

### Find User's Scans

```typescript
const userScans = await prisma.scan.findMany({
  where: { userId: 'user-xyz' }
});
```

### Find Running Scans

```typescript
const running = await prisma.scan.findMany({
  where: { status: 'RUNNING' }
});
```

---

## See Also

- [Finding Schema](./finding.md)
- [Job Schema](./job.md)
- [Scans API](../api/scans.md)
