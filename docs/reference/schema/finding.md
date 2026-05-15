# Database Schema: Finding

**Last updated:** 2026-05-15 | **Version:** v2.23.0

The `Finding` model represents a security vulnerability detected during a scan.

---

## Schema Definition

```prisma
model Finding {
  id              String      @id @default(cuid())
  fingerprint     String
  scanId          String?
  scanner         String      @default("")
  ruleId          String      @default("")
  title           String
  description     String      @default("")
  severity        Severity
  category        Category
  file            String      @default("")
  lineStart       Int         @default(0)
  lineEnd         Int         @default(0)
  codeSnippet     String      @default("")
  language        String      @default("")
  cwe             String[]    @default([])
  owasp           String[]    @default([])
  aiExplanation   String?
  aiFix           String?
  exploitationScenario String?
  exploitScore    Float?
  cvssScore       Float?
  cvssVector      String?
  confidence      Float       @default(0.5)
  remediation     String      @default("")
  rawJson         Json        @default("{}")
  status          ItemStatus  @default(OPEN)
  assignedToId    String?
  createdAt       DateTime    @default(now())

  scan        Finding?          @relation(fields: [scanId], references: [id], onDelete: Cascade)
  assignedTo  User?             @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
  comments    AlertComment[]
  history     AlertHistory[]
  chatMessages AiConversation[]
  aiCallLogs   AiCallLog[]
  task         Task?

  @@index([scanId])
  @@index([severity])
  @@index([category])
  @@index([status])
  @@index([assignedToId])
}
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (cuid) |
| `fingerprint` | String | SHA-256 hash for deduplication |
| `scanId` | String | Parent scan ID |
| `scanner` | String | Source (Trivy, Semgrep, AI, etc.) |
| `ruleId` | String | Rule that triggered finding |
| `title` | String | Human-readable title |
| `description` | String | Detailed description |
| `severity` | Severity | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| `category` | Category | SAST, SCA, SECRETS, etc. |
| `file` | String | File path |
| `lineStart` | Int | Starting line number |
| `lineEnd` | Int | Ending line number |
| `codeSnippet` | String | Relevant code excerpt |
| `language` | String | Programming language |
| `cwe` | String[] | CWE IDs |
| `owasp` | String[] | OWASP Top 10 mapping |
| `aiExplanation` | String | AI-generated explanation |
| `aiFix` | String | AI-suggested fix |
| `exploitationScenario` | String | How attackers could exploit |
| `exploitScore` | Float | 0.0–1.0 exploitability |
| `cvssScore` | Float | CVSS v3.1 score |
| `cvssVector` | String | CVSS vector string |
| `confidence` | Float | 0.0–1.0 confidence |
| `remediation` | String | Remediation guidance |
| `rawJson` | Json | Original scanner output |
| `status` | ItemStatus | Triage status |
| `assignedToId` | String | Assignee user ID |
| `createdAt` | DateTime | Creation timestamp |

---

## Enums

### Severity

```prisma
enum Severity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}
```

### Category

```prisma
enum Category {
  SAST
  SCA
  SECRETS
  IAC
  DATA_FLOW
  BUSINESS_LOGIC
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

## Fingerprint Algorithm

Findings are deduplicated using SHA-256:

```
fingerprint = SHA-256(scanner + ruleId + file + lineStart + lineEnd)
```

This ensures the same vulnerability found by multiple scanners is reported once.

---

## Relations

| Relation | Model | Description |
|----------|-------|-------------|
| `scan` | Scan | Parent scan |
| `assignedTo` | User | Assigned user |
| `comments` | AlertComment | User comments |
| `history` | AlertHistory | Status change history |
| `chatMessages` | AiConversation | AI chat conversations |
| `aiCallLogs` | AiCallLog | AI calls for analysis |
| `task` | Task | Linked remediation task |

---

## Example Record

```json
{
  "id": "finding-abc123",
  "fingerprint": "sha256:abc123...",
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
  "aiExplanation": "User input is directly concatenated...",
  "aiFix": "Use parameterized queries...",
  "exploitationScenario": "An attacker could send...",
  "exploitScore": 0.94,
  "cvssScore": 9.1,
  "cvssVector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
  "confidence": 0.95,
  "remediation": "Implement parameterized queries",
  "status": "OPEN",
  "assignedToId": null,
  "createdAt": "2026-05-15T10:45:00Z"
}
```

---

## See Also

- [Scan Schema](./scan.md)
- [Task Schema](./task.md)
- [Findings API](../api/findings.md)
