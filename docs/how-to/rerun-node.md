# Re-run a Pipeline Node

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to re-execute a specific pipeline stage without restarting the entire scan.

---

## When to Re-run a Node

Common scenarios:

- A stage failed due to a transient error
- You want to re-analyze with different AI settings
- The AI produced poor results and needs a retry
- You've updated provider configuration

---

## Step 1: Navigate to Scan Detail

1. Click **Scans** in the sidebar
2. Click on the scan you want to modify

---

## Step 2: Open Pipeline Tab

Click the **Pipeline** tab to see all 9 stages:

```
Clone → Discover → Git Ingest → Git Diagram → Tool Scan → Deep Scan → Cross-File → Aggregate → Persist
```

Each stage shows:
- Status (PENDING, RUNNING, COMPLETED, FAILED)
- Start/end timestamps
- AI model used
- Token consumption

---

## Step 3: Select Node to Re-run

Find the stage you want to re-execute and click the **Re-run** button.

---

## Step 4: (Optional) Modify Configuration

Before re-running, you can adjust settings:

1. Click **Edit Configuration**
2. Change provider, model, temperature, etc.
3. Click **Save**

---

## Step 5: Execute Re-run

Click **Re-run Node**.

The stage will:
1. Reset its status to PENDING
2. Enqueue a new job
3. Execute with fresh AI calls
4. Update downstream stages

---

## What Happens Next

### If Re-run Succeeds

- The node status changes to COMPLETED
- Downstream nodes continue from the new output
- Findings are updated if the output changed

### If Re-run Fails

- The node status changes to FAILED
- Retry count increments (max 3 attempts)
- You can re-run again or troubleshoot the error

---

## Node-Specific Notes

### Clone

Re-running clone will:
- Re-clone the repository
- Clean up the previous temp directory
- Reset all downstream stages

### Discover

Re-running discover will:
- Re-analyze file priorities
- Update the file queue
- Affect which files are scanned downstream

### Deep Scan

Re-running deep scan will:
- Re-analyze all files with AI
- Generate new findings
- Replace previous AI explanations

### Cross-File

Re-running cross-file will:
- Re-analyze cross-module data flow
- Generate new business logic rules
- Update cross-file findings

### Aggregate

Re-running aggregate will:
- Re-deduplicate all findings
- Recalculate fingerprints
- Merge findings from all sources

### Persist

Re-running persist will:
- Re-save findings to the database
- Re-create tasks for HIGH/CRITICAL findings
- Update scan status

---

## Troubleshooting

### Error: "Cannot re-run completed scan"

**Cause:** Scan is already in COMPLETED status

**Solution:**
1. Re-running nodes on completed scans is allowed
2. If the error persists, the scan may be locked
3. Contact an admin to unlock

### Error: "Node not found"

**Cause:** Invalid node name or scan corruption

**Solution:**
1. Refresh the page
2. Verify the scan exists
3. Check scan logs for errors

### Re-run Hangs Indefinitely

**Cause:** Worker not processing jobs

**Solution:**
1. Restart the Astra worker process
2. Check worker logs for errors
3. Verify database connectivity

---

## See Also

- [Cancel Running Scan](./cancel-scan.md)
- [Scan Pipeline Tutorial](../tutorials/02-scan-pipeline.md)
- [Pipeline Architecture](../explanation/architecture/pipeline.md)
