# Cancel a Running Scan

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to stop an in-progress scan and clean up resources.

---

## When to Cancel a Scan

Common scenarios:

- Wrong repository was scanned
- Configuration needs to change
- Scan is taking too long
- Resource constraints require stopping

---

## Step 1: Navigate to Running Scan

1. Click **Scans** in the sidebar
2. Find the scan with status **RUNNING** or **PENDING**

---

## Step 2: Click Cancel

1. Click the **Cancel Scan** button (top-right)
2. Confirm the cancellation in the dialog

---

## What Happens on Cancel

### Immediate Actions

1. **Scan status** changes to `CANCELLED`
2. **Running jobs** are marked as FAILED
3. **Pending jobs** are not enqueued
4. **Temp directories** are cleaned up

### Database Updates

- Scan record is preserved
- Completed findings remain in the database
- Partial results are retained for review

### Resource Cleanup

- Temporary clone directories are deleted
- Worker resources are released
- AI API calls are not made for remaining stages

---

## Step 3: Review Partial Results (Optional)

Even cancelled scans may have partial results:

1. Click on the cancelled scan
2. Click the **Findings** tab
3. View any findings from completed stages

---

## Restarting After Cancel

To scan again with different settings:

1. Click **New Scan**
2. Enter the same repository
3. Adjust configuration as needed
4. Start the new scan

---

## Troubleshooting

### Cancel Button Not Visible

**Cause:** Scan is already in terminal state (COMPLETED, FAILED, CANCELLED)

**Solution:**
1. Check the scan status
2. If already terminal, no action needed
3. Refresh the page if status seems incorrect

### Scan Won't Cancel

**Cause:** Worker is stuck processing a long-running job

**Solution:**
1. Wait a few moments for the worker to respond
2. Restart the worker process if needed
3. Check worker logs for stuck jobs

### Temp Directory Not Cleaned Up

**Cause:** Worker crashed before cleanup

**Solution:**
```bash
# Manually clean temp directories
rm -rf /tmp/astra-scan-*
```

---

## See Also

- [Re-run Pipeline Node](./rerun-node.md)
- [Resume Failed Scan](./resume-scan.md)
- [Scan Pipeline Tutorial](../tutorials/02-scan-pipeline.md)
