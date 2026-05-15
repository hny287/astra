# Create a Task from a Finding

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to create a remediation task linked to a security finding.

---

## When to Create a Task

Create tasks for:
- HIGH and CRITICAL findings requiring remediation
- Findings needing cross-team coordination
- Vulnerabilities with complex fix requirements
- Any finding requiring tracked work

---

## Step 1: Open Finding Detail

1. Navigate to **Findings** in the sidebar
2. Click on the finding you want to create a task for

---

## Step 2: Click Create Task

Click the **Create Task** button (top-right of finding detail).

---

## Step 3: Configure Task Details

The task form pre-populates with finding metadata:

### Title
Auto-generated from finding title (editable)

### Description
Pre-filled with:
- Finding explanation
- AI-suggested fix
- Code snippet

### Type
Select task type:
- **REMEDIATION** (default for findings)
- **MANUAL_REVIEW**
- **MANUAL**

### Severity
Inherited from finding (editable)

### Assignee
Select who will own the remediation

### Due Date
Set a deadline for completion

---

## Step 4: Create Task

Click **Create Task**.

The task is now linked to the finding and appears in:
- Task list view
- Assignee's task dashboard
- Finding detail page (linked task section)

---

## Task vs. Finding Relationship

| Finding | Task |
|---------|------|
| Security issue detected | Work item to fix it |
| Created by scanner/AI | Created by human |
| One per vulnerability | Can have subtasks |
| Status: OPEN, CONFIRMED, etc. | Status: OPEN, IN_PROGRESS, COMPLETED |

---

## Viewing Linked Tasks

### From Finding Detail

1. Open the finding
2. Scroll to **Linked Tasks** section
3. Click to view task details

### From Task Detail

1. Open the task
2. See **Linked Finding** section at top
3. Click to navigate back to finding

---

## Task Workflow

Once created, the task follows this workflow:

```
OPEN → IN_PROGRESS → IN_REVIEW → COMPLETED
```

When the task is marked COMPLETED:
- The linked finding status updates to REMEDIATED
- A rescan is suggested to verify the fix

---

## AI Task Suggestions

Astra can auto-generate task suggestions:

1. Open a HIGH/CRITICAL finding
2. Click **AI Suggest Task**
3. AI generates:
   - Task title
   - Detailed description
   - Suggested assignee
   - Estimated effort

Review and edit before creating.

---

## Troubleshooting

### Error: "Task already exists"

**Cause:** Finding already has a linked task

**Solution:**
1. Check the **Linked Tasks** section
2. Navigate to the existing task
3. Update the existing task instead

### Cannot Create Task for LOW Severity

**Cause:** Policy restriction (configurable)

**Solution:**
1. Admins can configure minimum severity for task creation
2. Manually create a task from the Tasks page if needed

---

## See Also

- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Batch Update Tasks](./batch-update-tasks.md)
- [Assign Findings](./assign-findings.md)
