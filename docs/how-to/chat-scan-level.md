# Use AI Chat at Scan Level

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to use AI chat to discuss overall scan results and security posture.

---

## What Is Scan-Level Chat?

Scan-level chat provides AI conversation with full context of a specific scan:

- All findings and their metadata
- Repository structure and architecture
- AI analysis from all pipeline stages
- Repo intelligence (git history, hotspots)

---

## Step 1: Navigate to Scan

1. Click **Scans** in the sidebar
2. Click on the scan you want to discuss

---

## Step 2: Open Chat Tab

Click the **Chat** tab in the scan detail view.

---

## Step 3: Select Model

Choose an AI model from the dropdown:

- **Claude 4 Opus/Sonnet** (Anthropic) — Recommended for code analysis
- **GPT-4o/o3** (OpenAI) — Good for general security questions
- **Llama 3.1** (Ollama) — Cost-effective for quick questions

---

## Step 4: Ask Questions

Type naturally. Examples:

### Security Posture

```
What's the overall security posture of this repository?
```

### Prioritization

```
Which findings should I prioritize first and why?
```

### Pattern Analysis

```
Are there any patterns across these vulnerabilities?
```

### Executive Summary

```
Generate an executive summary for stakeholders.
```

### Architecture Questions

```
Based on the code structure, what are the main trust boundaries?
```

---

## Example Conversation

```
You: What's the biggest risk in this scan?

AI: Based on the 47 findings, the highest-risk issue is the
    authentication bypass in src/api/admin.ts (CRITICAL, CVSS 9.1).

    This allows unauthenticated access to admin endpoints because:
    - The auth middleware is not applied to /api/admin routes
    - No role verification is performed
    - Direct database access bypasses authorization

    I recommend addressing this before the other 3 CRITICAL findings
    because it has the highest exploitability score (0.94).

You: What's the fix?

AI: Apply the auth middleware to all admin routes:

    ```typescript
    // Before
    router.use('/api/admin', adminRoutes);

    // After
    router.use('/api/admin', authMiddleware, requireAdmin, adminRoutes);
    ```

    Also add role verification in each admin handler:
    ```typescript
    if (user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    ```

You: How many files are affected?

AI: I found 4 routes that bypass auth middleware:
    - /api/admin/users
    - /api/admin/settings
    - /api/admin/logs
    - /api/admin/export

    All should be protected with the middleware pattern above.
```

---

## Chat Features

### Context Awareness

The AI knows:
- Repository URL and branch
- All findings (severity, category, location)
- Code snippets from findings
- AI explanations and fix suggestions
- Architecture diagrams

### Multi-Turn Memory

The AI remembers the conversation:
- Follow-up questions work naturally
- References to "this finding" or "that file" are understood
- Context persists within the conversation

### Model Switching

Change models mid-conversation:
1. Click the model selector
2. Choose a different model
3. Continue the conversation

---

## Best Practices

### Ask Specific Questions

**Vague:** "Is this secure?"

**Specific:** "What authentication vulnerabilities exist in the API routes?"

### Use for Prioritization

```
Rank these findings by actual exploitability, not just severity.
```

### Request Summaries

```
Summarize the top 5 risks for a non-technical audience.
```

### Explore Remediation

```
What's the least invasive fix for the SQL injection issues?
```

### Verify Understanding

```
Did I understand correctly that the XSS is reflected, not stored?
```

---

## Viewing Chat History

All conversations are saved:

1. Navigate to the scan
2. Click the **Chat** tab
3. Previous conversations appear at the top
4. Click to resume or start new

---

## Exporting Chat

To save a conversation:

1. Click **Export** in the chat panel
2. Choose format (Markdown, JSON)
3. Download the conversation

Use exports for:
- Documentation
- Sharing with team members
- Compliance records

---

## Troubleshooting

### AI Not Responding

**Cause:** Provider timeout or rate limit

**Solution:**
1. Wait a moment and retry
2. Switch to a different provider
3. Check provider status page

### Wrong Context

**Cause:** Chat opened from wrong scan

**Solution:**
1. Close the chat panel
2. Navigate to the correct scan
3. Re-open chat

### Inaccurate Analysis

**Cause:** AI misinterpretation

**Solution:**
1. Provide more context in your question
2. Ask for clarification
3. Switch to a different model
4. Manually verify with code review

---

## See Also

- [AI Chat Tutorial](../tutorials/04-ai-chat.md)
- [Chat at Finding Level](./chat-finding-level.md)
- [Retry AI Calls](./retry-ai-calls.md)
