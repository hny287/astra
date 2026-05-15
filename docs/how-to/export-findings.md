# Export Findings

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to export findings from Astra in various formats for reporting, analysis, or integration with other tools.

---

## Supported Export Formats

| Format | Use Case | File Extension |
|--------|----------|----------------|
| **JSON** | Programmatic access, integrations | `.json` |
| **CSV** | Spreadsheet analysis, reporting | `.csv` |
| **SARIF** | Import into other security tools | `.sarif` |
| **HTML** | Shareable reports with stakeholders | `.html` |
| **Markdown** | Documentation, wikis, GitHub | `.md` |

---

## Step 1: Navigate to Findings

### Export All Findings

1. Click **Findings** in the sidebar
2. Apply any filters (severity, status, assignee, etc.)

### Export Scan-Specific Findings

1. Click **Scans** → Select a scan
2. Click the **Findings** tab
3. Apply any filters

---

## Step 2: Click Export

Click the **Export** button (top-right).

---

## Step 3: Select Format

Choose your desired format from the dropdown:

- JSON
- CSV
- SARIF
- HTML
- Markdown

---

## Step 4: Download

Click **Export** and the file will download to your computer.

---

## Export Format Details

### JSON Export

**Structure:**
```json
{
  "exportedAt": "2026-05-15T10:30:00Z",
  "scanId": "abc123",
  "totalFindings": 47,
  "findings": [
    {
      "id": "finding-1",
      "fingerprint": "sha256:...",
      "title": "SQL Injection via user input",
      "severity": "CRITICAL",
      "category": "SAST",
      "file": "src/auth/login.ts",
      "lineStart": 42,
      "lineEnd": 48,
      "codeSnippet": "...",
      "cwe": ["CWE-89"],
      "owasp": ["A03:2021-Injection"],
      "aiExplanation": "...",
      "aiFix": "...",
      "status": "OPEN",
      "assignedTo": null,
      "createdAt": "2026-05-15T09:00:00Z"
    }
  ]
}
```

**Use for:**
- Custom integrations
- Data analysis scripts
- Backup and archival

---

### CSV Export

**Columns:**
```
ID,Title,Severity,Category,File,LineStart,LineEnd,Status,AssignedTo,CreatedAt
finding-1,SQL Injection via user input,CRITICAL,SAST,src/auth/login.ts,42,48,OPEN,,2026-05-15T09:00:00Z
```

**Use for:**
- Excel/Google Sheets analysis
- Pivot tables and charts
- Email attachments

---

### SARIF Export

**Structure:** (Standard SARIF 2.1.0)
```json
{
  "$schema": "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "Astra Security Platform",
          "version": "2.23.0"
        }
      },
      "results": [...]
    }
  ]
}
```

**Use for:**
- GitHub Security tab integration
- Import into CodeQL, Semgrep, etc.
- Compliance reporting

---

### HTML Export

**Features:**
- Formatted report with Astra branding
- Severity color coding
- Interactive tables
- Executive summary section
- Printable layout

**Use for:**
- Stakeholder presentations
- Email reports
- Printing and distribution

---

### Markdown Export

**Structure:**
```markdown
# Astra Security Scan Report

**Scan ID:** abc123  
**Repository:** https://github.com/owner/repo  
**Exported:** 2026-05-15

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 3 |
| HIGH | 8 |
| MEDIUM | 15 |
| LOW | 12 |
| INFO | 9 |

## Findings

### CRITICAL

#### SQL Injection via user input

- **File:** `src/auth/login.ts:42-48`
- **CWE:** CWE-89
- **OWASP:** A03:2021-Injection

**Code:**
```typescript
const query = `SELECT * FROM users WHERE email = '${email}'`;
```

**Fix:**
```typescript
const query = 'SELECT * FROM users WHERE email = $1';
```

...
```

**Use for:**
- GitHub READMEs
- Internal wikis
- Documentation

---

## Filtering Before Export

Apply filters to export only relevant findings:

### By Severity

1. Click the **Severity** filter
2. Select CRITICAL, HIGH, etc.
3. Export

### By Status

1. Click the **Status** filter
2. Select OPEN, CONFIRMED, etc.
3. Export

### By Category

1. Click the **Category** filter
2. Select SAST, SCA, SECRETS, etc.
3. Export

### By Assignee

1. Click the **Assignee** filter
2. Select a team member
3. Export their assigned findings

---

## Automated Exports (API)

For programmatic exports, use the API:

```bash
# Export findings as JSON
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://astra.example.com/api/v1/scans/abc123/export?format=json" \
  -o findings.json

# Export as CSV
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://astra.example.com/api/v1/scans/abc123/export?format=csv" \
  -o findings.csv
```

---

## Troubleshooting

### Export Fails with "No findings"

**Cause:** Filters excluded all findings

**Solution:**
1. Clear filters
2. Verify findings exist
3. Retry export

### Large Export Times Out

**Cause:** Too many findings (>1000)

**Solution:**
1. Apply filters to reduce scope
2. Export in batches by severity
3. Use API with increased timeout

### SARIF Import Fails

**Cause:** Invalid SARIF structure

**Solution:**
1. Validate SARIF with online validator
2. Check Astra version supports SARIF
3. Report bug if export is malformed

---

## See Also

- [API Reference: Scans](../reference/api/scans.md)
- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
- [Create Task from Finding](./create-task-from-finding.md)
