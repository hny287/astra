# Scan a Local Directory

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to scan code on your local filesystem with Astra.

---

## Prerequisites

- Astra instance running and accessible
- Access to the local directory you want to scan

---

## Step 1: Navigate to New Scan

1. Click **Scans** in the sidebar
2. Click **New Scan** button (top-right)

---

## Step 2: Select Local Directory

1. Choose **Local Directory** as the source
2. Click **Browse** to select a folder
3. Alternatively, drag and drop a folder onto the upload area

---

## Step 3: Configure Scan Settings

### Severity Filters

Select which severity levels to include:

- ☑️ CRITICAL
- ☑️ HIGH
- ☑️ MEDIUM
- ☐ LOW (optional)
- ☐ INFO (optional)

### Ignore Patterns

Exclude files or directories:

```
node_modules/**
*.test.ts
*.spec.ts
**/__tests__/**
dist/**
build/**
.git/**
```

### AI Configuration (Optional)

Click **Advanced** to configure per-node AI settings.

---

## Step 4: Start the Scan

Click **Start Scan**.

The scan runs through the same 9-stage pipeline as GitHub repositories.

---

## Step 5: Monitor Progress

1. Click on the running scan
2. View real-time progress in the **Pipeline** tab

---

## Step 6: Review Results

Once complete:

1. Click the **Findings** tab
2. Filter and triage findings as needed

---

## Notes

### Temporary Storage

Local directories are copied to a secure temporary location during scanning. The temp directory is automatically cleaned up after the scan completes.

### Path References

Findings will show paths relative to the scanned directory root:

```
src/auth/login.ts
api/payment/route.ts
```

### Git History

Local directory scans skip git-specific stages (Git Ingest, Git Diagram) if the directory is not a git repository.

---

## Troubleshooting

### Error: "Directory not found"

**Cause:** Selected path doesn't exist or isn't accessible

**Solution:**
1. Verify the directory exists
2. Check file permissions
3. Re-select the directory

### Error: "No files found"

**Cause:** Directory is empty or all files are ignored

**Solution:**
1. Check that the directory contains code files
2. Review ignore patterns
3. Ensure files aren't excluded by severity filters

---

## See Also

- [Scan GitHub Repository](./scan-github-repo.md)
- [Re-run Pipeline Node](./rerun-node.md)
- [Cancel Running Scan](./cancel-scan.md)
