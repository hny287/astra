# Using AI Chat in Astra

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This tutorial shows you how to use Astra's AI chat feature to analyze scans, findings, and security questions. AI chat is available at three levels: global, scan, and finding.

---

## Overview

Astra's AI chat provides:

- **Context-aware conversations** tied to scans and findings
- **Multi-turn memory** for extended discussions
- **Multi-provider support** (OpenAI, Anthropic, Ollama, etc.)
- **Full observability** with logged prompts and responses
- **Model switching** mid-conversation

---

## Chat Levels

### 1. Global Chat

**Access:** Click the chat icon in the bottom-right corner (slide-out panel)

**Context:** No scan or finding context — general security questions

**Use cases:**
- "What's the difference between SQL injection and XSS?"
- "Explain OWASP Top 10 A03:2021"
- "How do I implement rate limiting in Express?"
- "What's the best way to store API keys securely?"

**Example:**
```
You: What's the OWASP Top 10?

AI: The OWASP Top 10 is a standard awareness document for web
    application security. The 2021 version includes:

    1. A01:2021 – Broken Access Control
    2. A02:2021 – Cryptographic Failures
    3. A03:2021 – Injection
    4. A04:2021 – Insecure Design
    5. A05:2021 – Security Misconfiguration
    ...

    Would you like details on any specific category?
```

---

### 2. Scan-Level Chat

**Access:** Navigate to a scan → Click **Chat** tab

**Context:** Full scan context including:
- Repository URL and branch
- All findings and their metadata
- Repo intelligence and architecture diagrams
- AI analysis from all pipeline stages

**Use cases:**
- "What's the overall security posture of this repo?"
- "Which findings should I prioritize?"
- "Are there any patterns across these vulnerabilities?"
- "Generate an executive summary for stakeholders"

**Example:**
```
You: What's the biggest security risk in this scan?

AI: Based on the 47 findings, the highest-risk issue is the
    authentication bypass in `src/api/admin.ts` (CRITICAL, CVSS 9.1).

    This allows unauthenticated access to admin endpoints, which
    could lead to:
    - Full system compromise
    - Data exfiltration
    - Privilege escalation

    I recommend addressing this before the other 3 CRITICAL findings
    because it has the highest exploitability score (0.94).
```

---

### 3. Finding-Level Chat

**Access:** Open a finding → Click **Chat** button

**Context:** Single finding with full detail:
- Code snippet and file location
- AI explanation and fix suggestions
- CWE/OWASP mappings
- Exploitation scenarios

**Use cases:**
- "Is this a true positive?"
- "Explain this vulnerability in simpler terms"
- "Generate a test case to verify this is exploitable"
- "What's the best way to fix this?"

**Example:**
```
You: Is this SQL injection a true positive?

AI: Yes, this is a true positive. The code at line 42 directly
    concatenates user input into the SQL query:

    ```typescript
    const query = `SELECT * FROM users WHERE email = '${email}'`;
    ```

    While there's client-side validation in the form, the server
    doesn't sanitize the input. An attacker could send a crafted
    POST request directly to `/api/login` with:

    ```json
    { "email": "admin' OR '1'='1' --" }
    ```

    To fix this, use parameterized queries:

    ```typescript
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    ```
```

---

## Starting a Conversation

### Step 1: Choose Your Context

- **Global:** Click chat icon anywhere
- **Scan:** Navigate to scan → Chat tab
- **Finding:** Open finding → Chat button

### Step 2: Select a Model

Click the model selector dropdown:

| Provider | Models | Best For |
|----------|--------|----------|
| **Anthropic** | Claude 4 Opus, Sonnet | Complex reasoning, code analysis |
| **OpenAI** | GPT-4o, o3, o4-mini | General security knowledge |
| **Ollama** | Llama 3.1, Mistral | Quick questions, cost-effective |

### Step 3: Ask Your Question

Type naturally. The AI understands:
- Follow-up questions ("Why?", "Can you elaborate?")
- Code references ("Look at line 42")
- Comparisons ("How does this compare to XSS?")
- Requests ("Generate a fix", "Explain like I'm 5")

---

## Conversation Features

### Multi-Turn Memory

The AI remembers context within a conversation:

```
You: What's the severity of this finding?
AI: This is rated HIGH with a CVSS score of 7.5.

You: Why is it so high?
AI: The score is driven by:
     - High confidentiality impact
     - Easy exploitability
     - No authentication required
     ...

You: Can you lower the risk with mitigation?
AI: Yes, implementing rate limiting and input validation
    would reduce the exploitability score from 0.9 to 0.4,
    bringing the CVSS down to 5.3 (MEDIUM).
```

### Model Switching

Change models mid-conversation:

1. Click the model selector
2. Choose a different model
3. The conversation continues with the new model

Use case: Start with Claude for analysis, switch to GPT-4o for remediation advice.

### Code References

The AI can reference specific code:

```
You: Look at the code snippet. What's wrong here?

AI: The vulnerability is in the `createUser` function:

    ```typescript
    // Line 15-18
    const hash = crypto.createHash('md5').update(password).digest('hex');
    ```

    MD5 is cryptographically broken for security purposes. An attacker
    can generate collisions, allowing them to:
    1. Compute the hash of a known password
    2. Find a different password with the same hash
    3. Authenticate as any user

    Fix: Use bcrypt or argon2 for password hashing.
```

---

## Advanced Usage

### Thinking Mode

For complex questions, enable thinking mode:

1. Click the thinking toggle
2. Choose depth: None, Low, Medium, High, Max
3. The AI will "think" before responding

Use thinking mode for:
- Cross-file vulnerability analysis
- Architecture review questions
- Complex remediation planning

### Token Budget

Control AI response length:

- **Quick questions:** 512–1024 tokens
- **Code analysis:** 2048–4096 tokens
- **Architecture review:** 4096–8192 tokens

### System Prompts

Advanced users can customize the system prompt:

1. Navigate to **Settings** → **AI Configuration**
2. Edit the system prompt
3. Save and continue chatting

Example custom prompt:
```
You are a senior security engineer specializing in Node.js applications.
Focus on practical, actionable advice. Cite OWASP and CWE references.
When suggesting fixes, provide complete code examples.
```

---

## Observability

Every AI call is logged:

### View AI Call Logs

1. Navigate to **Observability** → **AI Calls**
2. Filter by scan, finding, provider, or status
3. Click a log entry to see:
   - Full request payload
   - Full response
   - Token usage (input, output, thinking)
   - Latency
   - Model and temperature settings

### Retry Failed Calls

If an AI call fails:

1. Find the failed call in the logs
2. Click **Retry**
3. The call is re-executed with the same parameters

### Cost Tracking

Monitor token usage:

- **Per-scan:** See total tokens consumed
- **Per-finding:** Track analysis costs
- **Per-provider:** Compare costs across providers

---

## Best Practices

### Ask Specific Questions

**Vague:** "Is this secure?"

**Specific:** "Does this code properly validate user input before using it in a SQL query?"

### Provide Context

**Poor:** "Fix this"

**Better:** "This is an Express.js API endpoint. Suggest a fix that validates the user ID parameter and returns 400 for invalid input."

### Use Follow-Ups

Don't hesitate to ask for clarification:

- "Can you explain that in simpler terms?"
- "What's the CVE for this vulnerability?"
- "Show me an example exploit"
- "How would I test for this?"

### Verify AI Advice

AI suggestions are recommendations, not authoritative truth:

1. Review the suggested fix
2. Test in a development environment
3. Verify the fix doesn't break functionality
4. Have a teammate review before deploying

---

## Common Questions

### Q: Can the AI access my source code?

**A:** Only the code that was analyzed during the scan. The AI sees:
- File paths and line numbers
- Code snippets (not full files)
- AI-generated summaries from the pipeline

Raw source code never leaves your environment.

### Q: Is my data used to train AI models?

**A:** No. Astra configures AI providers with:
- Zero data retention policies
- No training on customer data
- Enterprise privacy agreements

### Q: Can I use AI chat without running scans?

**A:** Yes! Global chat is available for general security questions.

### Q: How accurate is the AI analysis?

**A:** AI analysis is highly accurate for common vulnerabilities but should always be verified by a human. Treat AI as a knowledgeable assistant, not an oracle.

---

## Troubleshooting

### AI Not Responding

**Cause:** Provider API timeout or rate limit

**Solution:**
1. Check your API key is valid
2. Verify network connectivity
3. Try a different provider
4. Reduce `maxOutputTokens` for faster responses

### Wrong Context

**Cause:** Chat opened from wrong scan/finding

**Solution:**
1. Close the chat panel
2. Navigate to the correct context
3. Re-open chat

### Inaccurate Analysis

**Cause:** AI misinterpretation

**Solution:**
1. Provide more context in your question
2. Ask for clarification
3. Switch to a different model
4. Manually verify with code review

---

## Next Steps

- **[Configure AI Providers](./05-provider-config.md)** — Set up multiple providers
- **[Chat at Scan Level](../how-to/chat-scan-level.md)** — Detailed scan chat guide
- **[Chat at Finding Level](../how-to/chat-finding-level.md)** — Detailed finding chat guide
- **[Retry AI Calls](../how-to/retry-ai-calls.md)** — Handling failed AI calls
