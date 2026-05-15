# Use AI Chat at Finding Level

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to use AI chat to analyze individual security findings in detail.

---

## What Is Finding-Level Chat?

Finding-level chat provides AI conversation with full context of a specific vulnerability:

- Code snippet and file location
- AI explanation and fix suggestions
- CWE and OWASP mappings
- Exploitation scenarios
- CVSS scoring details

---

## Step 1: Open Finding Detail

1. Navigate to **Findings** in the sidebar
2. Click on the finding you want to discuss

---

## Step 2: Click Chat Button

Click the **Chat** button (usually near the top-right of the finding detail).

---

## Step 3: Select Model

Choose an AI model from the dropdown:

- **Claude 4 Opus/Sonnet** (Anthropic) — Best for code analysis
- **GPT-4o/o3** (OpenAI) — Good for general security knowledge
- **Llama 3.1** (Ollama) — Cost-effective for quick questions

---

## Step 4: Ask Questions

Type naturally. Examples:

### True Positive Verification

```
Is this a true positive or false positive?
```

### Simpler Explanation

```
Explain this vulnerability like I'm a junior developer.
```

### Exploitation Details

```
How would an attacker actually exploit this?
```

### Fix Verification

```
Will wrapping the input in sanitizeInput() fix this?
```

### Test Case Generation

```
Generate a test case to verify this is exploitable.
```

---

## Example Conversation

```
You: Is this SQL injection a true positive?

AI: Yes, this is a true positive. The code at line 42 directly
    concatenates user input into the SQL query:

    ```typescript
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    ```

    While there's client-side validation in the form, the server
    doesn't sanitize the input. An attacker could send a crafted
    POST request directly to /api/login with:

    ```json
    { "email": "admin' OR '1'='1' --" }
    ```

    This would return all users without authentication.

You: What's the best fix?

AI: Use parameterized queries:

    ```typescript
    // Secure version
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    ```

    This ensures the input is treated as data, not SQL code.

You: Are there any other vulnerabilities in this file?

AI: Looking at the full file, I also notice:
    1. Line 78: Password hashed with MD5 (cryptographically broken)
    2. Line 92: Session tokens logged to console (information leakage)

    Both should be addressed as part of the same security review.
```

---

## Chat Features

### Code References

The AI can reference specific lines:

```
You: What about line 55?

AI: At line 55, the `validateEmail()` function only checks for
    the presence of @ symbol. This is insufficient because:
    - It doesn't prevent SQL injection
    - It doesn't validate email format fully
    - It's client-side only (can be bypassed)
```

### Fix Suggestions

Ask for complete remediation code:

```
Show me the complete fixed version of this function.
```

### Comparison Questions

```
How does this compare to the XSS finding in line 120?
```

### Impact Assessment

```
What data could an attacker access through this vulnerability?
```

---

## Best Practices

### Share Your Analysis

```
I checked and the input is validated in the middleware. Does that fix it?
```

### Ask for Alternatives

```
Are there other ways to fix this besides parameterized queries?
```

### Request Examples

```
Show me an example of an exploit payload for this.
```

### Verify Severity

```
Why is this rated HIGH instead of CRITICAL?
```

---

## Viewing Chat History

All conversations are saved per finding:

1. Open the finding
2. Click **Chat**
3. Previous conversations appear at the top
4. Click to resume or start new

---

## Exporting Chat

To save a conversation:

1. Click **Export** in the chat panel
2. Choose format (Markdown, JSON)
3. Download the conversation

Use exports for:
- Attaching to tickets
- Sharing with team members
- Documentation

---

## Integration with Triage

Use chat findings to inform triage decisions:

### Confirm True Positive

After AI confirms:
1. Change status to **CONFIRMED**
2. Add comment: "Verified via AI chat analysis"
3. Assign to developer

### Identify False Positive

After AI indicates FP:
1. Change status to **FALSE_POSITIVE**
2. Add comment with AI's explanation
3. No assignment needed

### Accept Risk

After AI explains impact:
1. Evaluate business risk
2. If acceptable, mark **ACCEPTED_RISK**
3. Document justification in comments

---

## Troubleshooting

### AI Disagrees with Original Analysis

**Cause:** Different model or interpretation

**Solution:**
1. Ask AI to explain the discrepancy
2. Manually verify the code
3. Trust your judgment over AI if they conflict

### AI Can't Access Full File

**Cause:** Only code snippet is in context

**Solution:**
1. Provide more context in your question
2. Copy-paste relevant code sections
3. Ask about the snippet specifically

### Chat Not Loading

**Cause:** Network issue or finding not accessible

**Solution:**
1. Refresh the page
2. Verify you have access to the finding
3. Check scan ownership (non-admins see only their scans)

---

## See Also

- [AI Chat Tutorial](../tutorials/04-ai-chat.md)
- [Chat at Scan Level](./chat-scan-level.md)
- [Triaging Findings Tutorial](../tutorials/03-triaging-findings.md)
