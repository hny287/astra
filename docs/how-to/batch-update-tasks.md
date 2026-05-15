# Batch Update Tasks

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to apply bulk updates to multiple tasks at once.

---

## When to Use Batch Updates

Common scenarios:

- Sprint planning: assign multiple tasks to a developer
- End of sprint: mark multiple tasks as COMPLETED
- Triage session: update status for multiple findings
- Workload redistribution: reassign tasks between team members

---

## Step 1: Navigate to Tasks

1. Click **Tasks** in the sidebar
2. Optionally apply filters (status, severity, assignee, etc.)

---

## Step 2: Select Tasks

Use checkboxes to select multiple tasks:

- Click individual checkboxes for specific tasks
- Click the header checkbox to select all visible tasks
- Use **Shift+Click** to select a range

---

## Step 3: Click Bulk Update

Click the **Bulk Update** button that appears after selecting tasks.

---

## Step 4: Choose Updates

Select which fields to update:

### Status

Change status for all selected tasks:
- OPEN
- IN_PROGRESS
- IN_REVIEW
- COMPLETED
- FALSE_POSITIVE
- ACCEPTED_RISK
- BLOCKED
- CANCELLED

### Assignee

Reassign all selected tasks to a team member.

### Severity

Adjust severity level (use cautiously):
- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFO

### Due Date

Set a common due date for all selected tasks.

---

## Step 5: Apply Updates

Click **Apply** to execute the batch update.

All selected tasks are updated atomically.

---

## Batch Update Results

### Success

- All tasks updated successfully
- Confirmation message shows count
- History logged for each task

### Partial Failure

- Some tasks updated, some failed
- Error message indicates which failed
- Successful updates are not rolled back

### Complete Failure

- No tasks updated
- Error message explains the issue
- Retry after resolving the cause

---

## Common Batch Operations

### Sprint Assignment

1. Filter: Status = OPEN, Severity = HIGH or CRITICAL
2. Select all
3. Bulk Update → Assignee = [Developer Name]
4. Due Date = [Sprint End Date]

### End-of-Sprint Cleanup

1. Filter: Assignee = Me
2. Select all completed work
3. Bulk Update → Status = COMPLETED

### Triage Session

1. Filter: Status = OPEN, Scan = [Latest Scan]
2. Select all CRITICAL/HIGH
3. Bulk Update → Status = CONFIRMED
4. Assign to appropriate team members

---

## Undo Batch Updates

There's no undo button, but you can:

1. View **History** for each task
2. See what changed and who made the change
3. Manually revert if needed

For large-scale reversions, contact an admin.

---

## Batch Update via API

For programmatic batch updates:

```bash
curl -X POST "https://astra.example.com/api/v1/tasks/batch" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskIds": ["task-1", "task-2", "task-3"],
    "updates": {
      "status": "IN_PROGRESS",
      "assignedToId": "user-abc123"
    }
  }'
```

---

## Troubleshooting

### Some Tasks Not Selected

**Cause:** Filters hiding some tasks

**Solution:**
1. Clear filters to see all tasks
2. Use "Select All" to include filtered-out tasks
3. Verify selection count matches expectation

### Bulk Update Button Disabled

**Cause:** No tasks selected

**Solution:**
1. Select at least one task
2. Check that checkboxes are actually checked

### Permission Denied

**Cause:** VIEWER role cannot update tasks

**Solution:**
1. Request ANALYST or ADMIN role
2. Ask someone with write permissions to make the update

---

## See Also

- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Assign Findings](./assign-findings.md)
- [Create Task from Finding](./create-task-from-finding.md)
