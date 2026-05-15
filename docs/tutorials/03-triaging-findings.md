# Triaging Findings

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This tutorial teaches you how to triage security findings in Astra. You'll learn the complete workflow from initial review to remediation tracking.

---

## The Triage Workflow

```
OPEN → [Analysis] → CONFIRMED → [Assignment] → IN_PROGRESS → [Review] → REMEDIATED
                         ↓
                   FALSE_POSITIVE
                         ↓
                    ACCEPTED_RISK
```

---

## Step 1: Access Your Findings

### From Scan Detail

1. Navigate to **Scans** in the sidebar
2. Click on a completed scan
3. Click the **Findings** tab
4. View all findings for that scan

### From Global Findings List

1. Click **Findings** in the sidebar
2. Filter by scan, severity, status, or assignee
3. Sort by severity, date, or confidence score

---

## Step 2: Review Finding Details

Click on any finding to see the full detail view:

### Information Panel

| Field | Description |
|-------|-------------|
| **Title** | Human-readable vulnerability description |
| **Severity** | CRITICAL, HIGH, MEDIUM, LOW, INFO |
| **Category** | SAST, SCA, SECRETS, IAC, DATA_FLOW, BUSINESS_LOGIC |
| **Scanner** | Source (Trivy, Semgrep, AI Deep Scan, etc.) |
| **File** | Location in the codebase |
| **Line Range** | Exact lines where the issue occurs |
| **CWE** | Common Weakness Enumeration IDs |
| **OWASP** | OWASP Top 10 mapping |

### AI Analysis

- **AI Explanation:** Context-aware description of the vulnerability
- **AI Fix:** Suggested remediation with code examples
- **Exploitation Scenario:** How an attacker could exploit this
- **CVSS Score:** Risk scoring (0.0–10.0)

### Code Snippet

The relevant code section with syntax highlighting:

```typescript
// src/auth/login.ts:42-48
const query = `SELECT * FROM users WHERE email = '${email}'`;  // Vulnerable
const result = await db.query(query);
```

---

## Step 3: Analyze the Finding

### Use AI Chat

Click **Chat** to discuss the finding with AI:

```
You: Is this a true positive? The input is validated upstream.

AI: Looking at the code flow, the `email` parameter is validated in the
    form handler but the validation is client-side only. The server-side
    route at line 42 directly uses the parameter without sanitization.
    This is a true positive SQL injection vulnerability.
```

### Review Evidence

1. Check the file path and line numbers
2. Review the code snippet in context
3. Navigate to the file in your IDE to verify
4. Check if the vulnerability is reachable (not dead code)

### Assess Business Impact

Consider:
- Is this code in production?
- What data/systems does it affect?
- How easy is it to exploit?
- What's the potential damage?

---

## Step 4: Change Status

Click the status dropdown to update:

### Status Options

| Status | When to Use |
|--------|-------------|
| **OPEN** | Initial state; awaiting review |
| **IN_PROGRESS** | Actively being remediated |
| **IN_REVIEW** | Fix implemented; awaiting verification |
| **COMPLETED** | Remediated and verified |
| **FALSE_POSITIVE** | Not a real vulnerability |
| **ACCEPTED_RISK** | Known risk; business decision to accept |
| **BLOCKED** | Cannot fix due to dependencies |
| **CANCELLED** | No longer applicable |

### Marking False Positives

When a finding is incorrect:

1. Select **FALSE_POSITIVE** status
2. Add a comment explaining why
3. The finding is excluded from metrics

Example comment:
> This is a false positive. The `sanitizeInput()` function at line 38
> properly escapes all SQL special characters before the query is
> executed. The AI analysis missed this validation.

### Accepting Risk

When a vulnerability is real but won't be fixed:

1. Select **ACCEPTED_RISK** status
2. Document the business justification
3. Assign to a manager for approval

Example:
> This legacy endpoint is scheduled for deprecation in Q3. The cost
> of remediation exceeds the risk given low traffic (10 requests/day)
> and internal-only access. Approved by security team 2026-05-10.

---

## Step 5: Assign to Team Member

Click the **Assignee** dropdown:

1. Select a team member
2. Optionally set a due date
3. The assignee receives a notification

### Assignment Best Practices

- **CRITICAL/HIGH:** Assign immediately to a developer
- **MEDIUM:** Assign within 24 hours
- **LOW/INFO:** Batch assign weekly

---

## Step 6: Add Comments

Use comments to document analysis and track progress:

1. Click **Add Comment**
2. Write your analysis
3. Tag team members with `@username`
4. Comments are timestamped and attributed

Example thread:
```
@analyst (2026-05-15 10:23):
  Confirmed SQL injection. Exploitable via the /api/user endpoint.

@developer (2026-05-15 14:45):
  Working on a fix using parameterized queries. ETA: EOD.

@analyst (2026-05-16 09:12):
  Verified the fix. Closing as REMEDIATED.
```

---

## Step 7: Create a Task

For HIGH and CRITICAL findings, create a linked remediation task:

1. Click **Create Task**
2. The task inherits finding metadata
3. Track remediation progress separately

### Task vs. Finding

| Finding | Task |
|---------|------|
| Security issue detected | Remediation work item |
| Created by scanner | Created by human |
| Status: OPEN, CONFIRMED, etc. | Status: OPEN, IN_PROGRESS, COMPLETED |
| One per vulnerability | Can have subtasks |

---

## Step 8: Track History

Every change is logged:

1. Click **History** tab
2. View timeline of status changes, assignments, comments
3. See who made each change and when

This provides an audit trail for compliance and retrospectives.

---

## Batch Operations

### Bulk Status Update

1. Go to **Findings** list
2. Select multiple findings (checkboxes)
3. Click **Bulk Update**
4. Choose new status and/or assignee
5. Apply to all selected

### Bulk Assignment

1. Filter findings (e.g., all CRITICAL)
2. Select all
3. Assign to a team member
4. Set a common due date

---

## Finding Metrics

Track your triage progress:

### Dashboard Widgets

- **Total Findings:** All findings across scans
- **By Severity:** CRITICAL, HIGH, MEDIUM, LOW, INFO
- **By Status:** OPEN, CONFIRMED, REMEDIATED, etc.
- **By Category:** SAST, SCA, SECRETS, etc.
- **Mean Time to Triage:** Average time from detection to review
- **Mean Time to Remediate:** Average time from assignment to fix

### SLA Tracking

| Severity | SLA | Target |
|----------|-----|--------|
| CRITICAL | 4 hours | 95% |
| HIGH | 24 hours | 90% |
| MEDIUM | 72 hours | 85% |
| LOW | 7 days | 80% |

---

## Rescanning Files

If code has changed since the scan:

1. Click **Rescan File** on the finding
2. Astra re-analyzes that specific file
3. New findings replace outdated ones

Use this when:
- A fix has been merged
- The code has been refactored
- You want to verify remediation

---

## Exporting Findings

Share findings with your team:

1. Click **Export** on the findings list
2. Choose format: JSON, CSV, SARIF, HTML, Markdown
3. Download or share the file

### Export Formats

| Format | Use Case |
|--------|----------|
| **JSON** | Programmatic access, integrations |
| **CSV** | Spreadsheet analysis, reporting |
| **SARIF** | Import into other security tools |
| **HTML** | Shareable report with stakeholders |
| **Markdown** | Documentation, wikis |

---

## Tips for Effective Triage

### Prioritize by Risk

1. **CRITICAL + Exploitable:** Fix immediately
2. **HIGH + Reachable:** Fix within 24 hours
3. **MEDIUM + Uncertain:** Investigate further
4. **LOW + Theoretical:** Accept or defer

### Use AI Wisely

- AI explanations are suggestions, not truth
- Always verify with manual review
- Use chat to explore edge cases
- Ask AI to generate test cases for verification

### Document Decisions

Every finding should have:
- Clear status
- Assigned owner (if applicable)
- Comments explaining the decision
- Links to related tasks or PRs

### Close the Loop

- Verify fixes before marking COMPLETED
- Update findings when code changes
- Re-scan to confirm remediation
- Celebrate progress with your team

---

## Common Scenarios

### Scenario 1: Duplicate Findings

**Problem:** The same vulnerability appears multiple times.

**Solution:** Astra deduplicates by fingerprint. If you see duplicates:
- Check if they're in different files (not duplicates)
- Check if they're from different scanners (merged)
- Report as a bug if truly duplicated

### Scenario 2: Legacy Code

**Problem:** Vulnerability in code scheduled for removal.

**Solution:** Mark as **ACCEPTED_RISK** with justification:
> This module is deprecated and will be removed in v3.0 (Q4 2026).
> No new features are being added. Risk accepted by product team.

### Scenario 3: Third-Party Dependency

**Problem:** Vulnerability in a library you don't control.

**Solution:**
1. Check if a patched version exists
2. If yes: upgrade and mark **COMPLETED**
3. If no: mark **BLOCKED** and track upstream issue

---

## Next Steps

- **[Create Tasks from Findings](../how-to/create-task-from-finding.md)** — Detailed task creation guide
- **[AI Chat for Findings](../how-to/chat-finding-level.md)** — Using AI to analyze findings
- **[Export Findings](../how-to/export-findings.md)** — Exporting for reporting
