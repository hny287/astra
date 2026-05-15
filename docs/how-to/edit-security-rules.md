# Edit Security Rules

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to add organization-specific security rules to Astra scans.

---

## What Are Security Rules?

Security rules are custom patterns Astra looks for during scans:

- Organization-specific vulnerabilities
- Custom framework patterns
- Proprietary API misuse
- Internal compliance requirements

---

## Step 1: Navigate to Security Rules

1. Click **Settings** in the sidebar
2. Navigate to **Security Rules** tab

---

## Step 2: View Existing Rules

The rules list shows:

| Name | Category | Severity | Status |
|------|----------|----------|--------|
| No raw SQL in queries | SAST | HIGH | Active |
| Use bcrypt for passwords | SAST | CRITICAL | Active |
| No console.log in production | Best Practice | LOW | Active |

---

## Step 3: Create New Rule

Click **Add Rule** and fill in:

### Name
Short identifier for the rule

### Description
Explain what the rule checks for

### Category
Select from:
- SAST
- SCA
- SECRETS
- IAC
- DATA_FLOW
- BUSINESS_LOGIC
- Best Practice

### Severity
- CRITICAL
- HIGH
- MEDIUM
- LOW
- INFO

### Rule Text
Pattern or description the AI should look for

### CWE (Optional)
Relevant CWE IDs (e.g., CWE-89 for SQL Injection)

### Active
☑️ Enable rule immediately
☐ Save as draft

---

## Step 4: Save Rule

Click **Create Rule**.

The rule is now included in all future scans.

---

## Edit Rule

To modify an existing rule:

1. Navigate to **Settings** → **Security Rules**
2. Click on the rule
3. Edit fields
4. Click **Save**

---

## Delete Rule

To remove a rule:

1. Navigate to **Settings** → **Security Rules**
2. Click on the rule
3. Click **Delete**
4. Confirm

**Note:** Existing findings from the rule are preserved.

---

## Rule Examples

### SQL Injection Prevention

```json
{
  "name": "No raw SQL concatenation",
  "description": "All SQL queries must use parameterized queries",
  "category": "SAST",
  "severity": "CRITICAL",
  "ruleText": "Look for string concatenation in SQL queries. Flag any query that directly incorporates user input without parameterization.",
  "cwe": ["CWE-89"],
  "isActive": true
}
```

### Password Hashing

```json
{
  "name": "Use bcrypt for passwords",
  "description": "Passwords must be hashed with bcrypt or argon2, never MD5/SHA1",
  "category": "SAST",
  "severity": "CRITICAL",
  "ruleText": "Check password hashing implementations. MD5, SHA1, and unsalted hashes are forbidden. Require bcrypt, argon2, or PBKDF2.",
  "cwe": ["CWE-328"],
  "isActive": true
}
```

### Secrets Management

```json
{
  "name": "No hardcoded API keys",
  "description": "API keys and secrets must come from environment variables",
  "category": "SECRETS",
  "severity": "HIGH",
  "ruleText": "Scan for hardcoded secrets: API keys, passwords, tokens. These should be loaded from environment variables or secret management systems.",
  "cwe": ["CWE-798"],
  "isActive": true
}
```

### Logging Security

```json
{
  "name": "No PII in logs",
  "description": "Personal information must not be written to logs",
  "category": "DATA_FLOW",
  "severity": "MEDIUM",
  "ruleText": "Check logging statements for PII: emails, phone numbers, addresses, credit cards, SSNs. These should be redacted or excluded.",
  "cwe": ["CWE-532"],
  "isActive": true
}
```

---

## Built-in vs Custom Rules

### Built-in Rules

Provided by Astra:
- OWASP Top 10 coverage
- Common vulnerability patterns
- Industry best practices

### Custom Rules

Defined by your organization:
- Internal frameworks
- Proprietary patterns
- Compliance requirements

Both types run in every scan.

---

## Rule Scope

### Global Rules

Apply to all scans:
- Created in Settings → Security Rules
- Visible to all users (ADMIN manages)

### Scan-Specific Rules

Apply to individual scans:
- Created during scan setup
- Visible only for that scan

---

## Testing Rules

To verify a rule works:

1. Create the rule
2. Run a scan on a test repository
3. Check if the rule triggers expected findings
4. Adjust rule text if needed

---

## Troubleshooting

### Rule Not Triggering

**Cause:** Rule text too specific or pattern not found

**Solution:**
1. Broaden the rule description
2. Check file types being scanned
3. Verify rule is active

### Too Many False Positives

**Cause:** Rule text too broad

**Solution:**
1. Add more specific criteria
2. Include exceptions in rule text
3. Lower severity to reduce noise

### Cannot Create Rule (Permission Denied)

**Cause:** Non-ADMIN trying to create global rules

**Solution:**
1. Request ADMIN role
2. Ask admin to create the rule
3. Create scan-specific rule instead

---

## See Also

- [Scan Configuration Reference](../reference/config/scan.md)
- [Business Logic Rules](../explanation/concepts/business-logic.md)
- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
