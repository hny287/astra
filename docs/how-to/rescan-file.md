# Rescan a Single File

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to re-analyze a specific file without re-running the entire scan.

---

## When to Rescan a File

Common scenarios:

- A fix has been merged and you want to verify remediation
- Code has been refactored since the original scan
- You believe the AI analysis was incorrect
- New vulnerability patterns have been discovered

---

## Step 1: Open Finding Detail

1. Navigate to **Findings** in the sidebar
2. Click on the finding associated with the file

---

## Step 2: Click Rescan File

Click the **Rescan File** button (near the file path).

---

## Step 3: Configure Rescan (Optional)

You can adjust AI settings for the rescan:

- **Provider:** Choose a different AI provider
- **Model:** Select a different model
- **Temperature:** Adjust creativity vs. determinism
- **Thinking Depth:** Enable deeper analysis

---

## Step 4: Execute Rescan

Click **Rescan** to begin.

The file is re-analyzed with:
- Current code state (if repo has been updated)
- Fresh AI calls
- Updated vulnerability patterns

---

## What Happens Next

### If Vulnerability Is Fixed

- New analysis shows no vulnerability
- Original finding is marked as **REMEDIATED**
- A verification comment is added

### If Vulnerability Persists

- Finding is updated with new analysis
- AI explanation is refreshed
- Status remains **OPEN** or **CONFIRMED**

### If Analysis Changed

- AI may provide different explanation
- Severity might be adjusted
- Fix suggestions may improve

---

## Rescan vs. Full Scan

| Rescan File | Full Scan |
|-------------|-----------|
| Single file only | Entire repository |
| Fast (seconds to minutes) | Slow (minutes to hours) |
| Low cost (few tokens) | Higher cost |
| Good for verification | Good for comprehensive analysis |

---

## Rescan from Task View

You can also rescan from a task:

1. Navigate to **Tasks**
2. Open the task
3. Click **Linked Finding**
4. Click **Rescan File**

---

## Rescan from Scan Detail

To rescan a file from the scan view:

1. Navigate to **Scans** → Select scan
2. Click the **Findings** tab
3. Find the finding for the file
4. Click **Rescan File**

---

## Troubleshooting

### Error: "File not found"

**Cause:** File was deleted or moved

**Solution:**
1. Verify the file still exists at the path
2. Check if the file was renamed
3. Run a full scan to discover new file structure

### Error: "Scan not accessible"

**Cause:** Permission issue or scan deleted

**Solution:**
1. Verify you have access to the scan
2. Check scan ownership (non-admins see only their scans)
3. Contact admin if needed

### Rescan Takes Too Long

**Cause:** Large file or AI provider latency

**Solution:**
1. Wait for completion (large files can take 2-3 minutes)
2. Check AI provider status
3. Retry with a different provider

---

## See Also

- [Re-run Pipeline Node](./rerun-node.md)
- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Export Findings](./export-findings.md)
