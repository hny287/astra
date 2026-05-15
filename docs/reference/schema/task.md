# Database Schema: Task

**Last updated:** 2026-05-15 | **Version:** v2.23.0

The `Task` model represents a remediation work item linked to a finding.

---

## Schema Definition

```prisma
model Task {
  id           String      @id @default(cuid())
  title        String
  description  String      @default("")
  type         TaskType    @default(MANUAL)
  severity     Severity    @default(MEDIUM)
  status       ItemStatus  @default(OPEN)
  findingId    String?     @unique
  scanId       String?
  assignedToId String?
  createdById  String?
  dueDate      DateTime?
  closedAt     DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  // Rich scanner fields (shared with Finding)
  scanner              String    @default("")
  ruleId               String    @default("")
  file                 String    @default("")
  lineStart            Int       @default(0)
  lineEnd              Int       @default(0)
  codeSnippet          String    @default("")
  language             String    @default("")
  category             Category?
  cwe                  String[]  @default([])
  owasp                String[]  @default([])
  aiExplanation        String?
  aiFix                String?
  exploitationScenario String?
  exploitScore         Float?
  cvssScore            Float?
  cvssVector           String?
  confidence           Float     @default(0.5)
  remediation          String    @default("")

  finding     Finding?    @relation(fields: [findingId], references: [id], onDelete: SetNull)
  scan       Scan?        @relation(fields: [scanId], references: [id], onDelete: SetNull)
  assignedTo User?        @relation("TaskAssignedTo", fields: [assignedToId], references: [id], onDelete: SetNull)
  createdBy  User?        @relation("TaskCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  comments    TaskComment[]
  history     TaskHistory[]

  @@index([status])
  @@index([type])
  @@index([severity])
  @@index([assignedToId])
  @@index([scanId])
  @@index([findingId])
  @@index([createdAt])
}
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (cuid) |
| `title` | String | Task title |
| `description` | String | Detailed description |
| `type` | TaskType | Task type |
| `severity` | Severity | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| `status` | ItemStatus | OPEN, IN_PROGRESS, COMPLETED, etc. |
| `findingId` | String | Linked finding (unique) |
| `scanId` | String | Parent scan |
| `assignedToId` | String | Assigned user |
| `createdById` | String | Creator user |
| `dueDate` | DateTime | Deadline |
| `closedAt` | DateTime | Completion timestamp |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

### Scanner Fields (Inherited from Finding)

Tasks copy relevant fields from their linked finding for standalone reporting.

---

## Enums

### Task Type

```prisma
enum TaskType {
  FINDING_TRIAGE
  REMEDIATION
  MANUAL_REVIEW
  MANUAL
  AI_GENERATED
}
```

### Status

```prisma
enum ItemStatus {
  OPEN
  IN_PROGRESS
  IN_REVIEW
  COMPLETED
  FALSE_POSITIVE
  ACCEPTED_RISK
  BLOCKED
  CANCELLED
}
```

---

## Relations

| Relation | Model | Description |
|----------|-------|-------------|
| `finding` | Finding | Linked finding (one-to-one) |
| `scan` | Scan | Parent scan |
| `assignedTo` | User | Assigned user |
| `createdBy` | User | Creator user |
| `comments` | TaskComment | User comments |
| `history` | TaskHistory | Status change history |

---

## Example Record

```json
{
  "id": "task-abc123",
  "title": "Fix SQL injection in login.ts",
  "description": "Implement parameterized queries for user authentication",
  "type": "REMEDIATION",
  "severity": "CRITICAL",
  "status": "IN_PROGRESS",
  "findingId": "finding-xyz789",
  "scanId": "scan-abc123",
  "assignedToId": "user-dev1",
  "createdById": "user-analyst1",
  "dueDate": "2026-05-20T00:00:00Z",
  "closedAt": null,
  "file": "src/auth/login.ts",
  "lineStart": 42,
  "lineEnd": 48,
  "cwe": ["CWE-89"],
  "owasp": ["A03:2021-Injection"],
  "aiFix": "Use parameterized queries: const query = 'SELECT * FROM users WHERE email = $1';",
  "createdAt": "2026-05-15T11:00:00Z",
  "updatedAt": "2026-05-15T14:30:00Z"
}
```

---

## Task Workflow

```
OPEN → IN_PROGRESS → IN_REVIEW → COMPLETED
```

---

## See Also

- [Finding Schema](./finding.md)
- [Scan Schema](./scan.md)
- [Tasks API](../api/tasks.md)
