# Business Logic Rules

**Last updated:** 2026-05-15 | **Version:** v2.23.0

How Astra infers and validates business logic security rules.

---

## What Are Business Logic Rules?

Business logic rules are security invariants derived from the codebase:

> "All admin routes must pass through authentication middleware"

> "Payment processing requires manager approval"

> "PII must never be logged"

Unlike pattern-based vulnerabilities (SQL injection, XSS), business logic flaws are specific to the application's domain.

---

## Inference Process

```
┌──────────────────────────────────────────────────────────────────┐
│              BUSINESS LOGIC INFERENCE                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CROSS-FILE ANALYSIS                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Input: All files + data flow patterns                    │   │
│  │                                                           │   │
│  │  1. Identify security-relevant operations                 │   │
│  │     - Authentication checks                               │   │
│  │     - Authorization gates                                 │   │
│  │     - Data validation                                     │   │
│  │     - Audit logging                                       │   │
│  │                                                           │   │
│  │  2. Trace data flow across modules                        │   │
│  │     - API routes → Services → Database                    │   │
│  │     - User input → Validation → Usage                     │   │
│  │                                                           │   │
│  │  3. Infer security invariants                             │   │
│  │     - "Route X requires auth middleware"                  │   │
│  │     - "Function Y validates admin role"                   │   │
│  │                                                           │   │
│  │  4. Detect violations                                     │   │
│  │     - Route Z bypasses auth                               │   │
│  │     - Function W missing validation                       │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │  BusinessLogicRule Records   │                   │
│              │  status: CANDIDATE           │                   │
│              └──────────────────────────────┘                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Rule Lifecycle

```
CANDIDATE ──► CONFIRMED ──► ENFORCED
    │              │
    │              └──► VIOLATION DETECTED
    │
    └──► REJECTED (false positive)
```

---

## Rule Status

### CANDIDATE

AI-inferred rule awaiting human review:

```json
{
  "id": "rule-abc123",
  "ruleText": "All admin routes must pass through auth middleware",
  "confidence": 0.94,
  "evidenceFiles": ["src/middleware/auth.ts", "src/api/admin.ts"],
  "status": "CANDIDATE"
}
```

### CONFIRMED

Security team has validated the rule:

```json
{
  "id": "rule-abc123",
  "ruleText": "All admin routes must pass through auth middleware",
  "confidence": 0.94,
  "status": "CONFIRMED",
  "confirmedBy": "user-security-lead",
  "confirmedAt": "2026-05-15T14:00:00Z"
}
```

### REJECTED

Rule is incorrect or not applicable:

```json
{
  "id": "rule-abc123",
  "ruleText": "All admin routes must pass through auth middleware",
  "status": "REJECTED",
  "rejectionReason": "This route is intentionally public for health checks"
}
```

---

## Violation Detection

When a rule is CONFIRMED, Astra checks for violations:

### Example Rule

> "All database queries must use parameterized queries"

### Violation Found

```json
{
  "title": "Parameterized query requirement violated",
  "ruleId": "rule-abc123",
  "file": "src/api/user.ts",
  "lineStart": 45,
  "lineEnd": 48,
  "violationDescription": "Raw SQL concatenation detected in getUserById function",
  "severity": "CRITICAL"
}
```

---

## Common Business Logic Rules

### Authentication

- "All API routes require authentication"
- "Admin routes require admin role"
- "Service accounts cannot access user endpoints"

### Authorization

- "Write operations require owner or admin"
- "Cross-tenant data access is forbidden"
- "Sensitive operations require MFA"

### Data Protection

- "PII must be encrypted at rest"
- "Credit cards must never be logged"
- "Passwords must be hashed with bcrypt"

### Audit & Compliance

- "All admin actions must be logged"
- "Failed auth attempts must be tracked"
- "Data exports require approval workflow"

---

## AI Inference Prompt

The AI uses this prompt for business logic inference:

```
Analyze this codebase for security invariants and business logic rules.

For each pattern you observe:
1. State the rule clearly
2. List evidence files
3. Assign confidence (0.0–1.0)
4. Note any apparent violations

Focus on:
- Authentication patterns
- Authorization gates
- Data validation requirements
- Audit logging expectations
- Compliance constraints

Output format:
{
  "rules": [
    {
      "ruleText": "...",
      "confidence": 0.95,
      "evidenceFiles": ["..."],
      "violations": [...]
    }
  ]
}
```

---

## Rule Management

### View Rules

1. Navigate to **Scans** → Select scan
2. Click **Business Rules** tab
3. See all CANDIDATE and CONFIRMED rules

### Confirm Rule

1. Review the rule text and evidence
2. Click **Confirm**
3. Optionally add comments

### Reject Rule

1. Click **Reject**
2. Provide rejection reason
3. Rule excluded from future scans

---

## Benefits

### 1. Custom Security

Rules are specific to your application, not generic patterns.

### 2. Documentation

Rules serve as executable security documentation.

### 3. Continuous Validation

Confirmed rules are checked on every scan.

### 4. Compliance

Rules map to regulatory requirements (SOC2, PCI-DSS, HIPAA).

---

## Limitations

### False Positives

AI may infer incorrect rules:
- Over-generalization
- Missing context
- Edge cases

**Mitigation:** Human review before CONFIRMED status

### False Negatives

Some rules may not be inferred:
- Implicit conventions
- External documentation
- Tribal knowledge

**Mitigation:** Manually add custom rules

---

## See Also

- [Cross-File Stage](../../tutorials/02-scan-pipeline.md#stage-7-cross-file)
- [Edit Security Rules How-to](../../how-to/edit-security-rules.md)
- [Business Logic Category](../../reference/schema/finding.md#category)
