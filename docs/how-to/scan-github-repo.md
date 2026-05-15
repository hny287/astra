# Scan a GitHub Repository

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to scan a GitHub repository with Astra, including both public and private repositories.

---

## Prerequisites

- Astra instance running and accessible
- GitHub account (for private repositories)
- GitHub Personal Access Token (PAT) for private repos

---

## Step 1: Navigate to New Scan

1. Click **Scans** in the sidebar
2. Click **New Scan** button (top-right)

---

## Step 2: Enter Repository URL

### For Public Repositories

1. Select **GitHub Repository** as the source
2. Enter the repository URL:
   ```
   https://github.com/owner/repo-name
   ```
3. Select a branch (default: `main`)

### For Private Repositories

1. First, link your GitHub account:
   - Click your avatar → **Settings**
   - Navigate to **GitHub Integration**
   - Click **Connect GitHub**
   - Enter your PAT (format: `ghp_...`)
   - Click **Save**

2. Then enter the private repository URL as above

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
```

### AI Configuration (Optional)

Click **Advanced** to configure per-node AI settings:

- Select provider per stage
- Choose models
- Adjust temperature and thinking depth

---

## Step 4: Start the Scan

Click **Start Scan**.

The scan will progress through 9 stages:

```
Clone → Discover → Git Ingest → Git Diagram → Tool Scan → Deep Scan → Cross-File → Aggregate → Persist
```

---

## Step 5: Monitor Progress

1. Click on the running scan
2. View real-time progress in the **Pipeline** tab
3. Click individual stages to see detailed logs

---

## Step 6: Review Results

Once complete:

1. Click the **Findings** tab
2. Filter by severity, category, or status
3. Click individual findings for details

---

## Troubleshooting

### Error: "Repository not found"

**Cause:** Private repo without PAT, or typo in URL

**Solution:**
1. Verify the URL is correct
2. Link your GitHub account in Settings
3. Ensure PAT has `repo` scope

### Error: "Clone failed"

**Cause:** Network issue or invalid credentials

**Solution:**
1. Check network connectivity
2. Verify PAT is still valid
3. Retry the scan

### Scan Stuck on CLONE

**Cause:** Large repository or slow network

**Solution:**
1. Wait longer (large repos can take 5+ minutes)
2. Check worker logs for errors
3. Re-run the clone node if needed

---

## See Also

- [Scan Local Directory](./scan-local-directory.md)
- [Link GitHub Account](./link-github-account.md)
- [Re-run Pipeline Node](./rerun-node.md)
