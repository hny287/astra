# Assign Findings to Team Members

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to assign findings to team members for remediation tracking.

---

## Prerequisites

- ADMIN or ANALYST role
- Team members must have user accounts in Astra

---

## Step 1: Navigate to Findings

1. Click **Findings** in the sidebar
2. Optionally filter by severity, status, or scan

---

## Step 2: Select Finding(s)

### Single Finding

Click on the finding to open detail view.

### Multiple Findings

Use checkboxes to select multiple findings for batch assignment.

---

## Step 3: Assign

### Single Finding Assignment

1. Open the finding detail
2. Click the **Assignee** dropdown
3. Select a team member
4. Optionally set a due date
5. Click **Save**

### Batch Assignment

1. Select multiple findings (checkboxes)
2. Click **Bulk Update**
3. Choose **Assignee** from the dropdown
4. Select team member
5. Optionally set due date
6. Click **Apply**

---

## Assignment Notifications

When you assign a finding:

- Assignee receives an in-app notification
- Email notification (if configured)
- Finding appears in assignee's **My Tasks** view

---

## Assignment Best Practices

### By Severity

| Severity | Assignment Timeline | Suggested Assignee |
|----------|---------------------|-------------------|
| **CRITICAL** | Immediately | Senior developer / Security lead |
| **HIGH** | Within 4 hours | Team member with relevant expertise |
| **MEDIUM** | Within 24 hours | Any available developer |
| **LOW** | Weekly batch | Junior developers (learning opportunity) |
| **INFO** | As capacity allows | Optional assignment |

### By Category

| Category | Suggested Assignee |
|----------|-------------------|
| **SAST** | Backend/Frontend developers |
| **SCA** | DevOps / Dependency owner |
| **SECRETS** | Security team immediately |
| **IAC** | Infrastructure/DevOps team |
| **DATA_FLOW** | Data engineering / Privacy team |
| **BUSINESS_LOGIC** | Domain experts / Architects |

---

## Reassign Findings

To change assignment:

1. Open the finding
2. Click the **Assignee** dropdown
3. Select a different team member
4. Add a comment explaining the reassignment
5. Click **Save**

The assignment history is logged and visible in the **History** tab.

---

## Unassign Findings

To remove assignment:

1. Open the finding
2. Click the **Assignee** dropdown
3. Select **Unassigned**
4. Click **Save**

Use this when:
- Team member left the company
- Workload redistribution needed
- Finding was misassigned

---

## View Assigned Findings

### As Assignee

1. Click **Findings** in sidebar
2. Click **Assigned to Me** filter
3. View all your assigned findings

### As Admin

1. Click **Findings** in sidebar
2. Click **Assignee** filter
3. Select a team member
4. View their assigned findings

---

## Track Assignment Metrics

### Dashboard Widgets

- **Findings per Assignee:** Workload distribution
- **Average Assignment Duration:** Time from assign to remediate
- **Overdue Assignments:** Past due date
- **Assignment by Severity:** Ensure CRITICAL/HIGH get priority

### SLA Tracking

| Severity | SLA | Metric |
|----------|-----|--------|
| CRITICAL | 4 hours | % assigned within SLA |
| HIGH | 24 hours | % assigned within SLA |
| MEDIUM | 72 hours | % assigned within SLA |
| LOW | 7 days | % assigned within SLA |

---

## Troubleshooting

### User Not in Assignee List

**Cause:** User account doesn't exist or is inactive

**Solution:**
1. Admin: Navigate to **Settings** → **Users**
2. Verify user exists and is active
3. Create user account if needed

### Cannot Assign (Permission Denied)

**Cause:** VIEWER role cannot assign

**Solution:**
1. Request ADMIN or ANALYST role
2. Ask admin to make the assignment

### Assignment Not Saved

**Cause:** Network error or concurrent modification

**Solution:**
1. Refresh the page
2. Re-apply the assignment
3. Check network connectivity

---

## See Also

- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Batch Update Tasks](./batch-update-tasks.md)
- [Create Task from Finding](./create-task-from-finding.md)
