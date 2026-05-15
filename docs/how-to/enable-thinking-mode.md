# Enable Thinking Mode

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to configure AI thinking depth and budget for complex analyses.

---

## What Is Thinking Mode?

Thinking mode enables AI models to "think" before responding:

- The AI generates internal reasoning tokens
- These tokens are not shown in the response
- The thinking process improves answer quality
- Thinking tokens are billed separately

---

## When to Use Thinking Mode

### Recommended For

- **Cross-file analysis:** Understanding data flow across modules
- **Business logic inference:** Identifying security invariants
- **Architecture review:** Analyzing system design
- **Complex vulnerabilities:** Multi-step exploitation scenarios
- **Remediation planning:** Comprehensive fix strategies

### Not Needed For

- **Simple questions:** Factual queries
- **Code lookup:** Finding specific patterns
- **Basic classification:** Severity categorization
- **Quick scans:** Initial discovery

---

## Step 1: Navigate to Scan Configuration

1. Click **Settings** in the sidebar
2. Navigate to **Scan Configuration**
3. Click **Pipeline Nodes** tab

---

## Step 2: Configure Thinking Depth

For each stage, select thinking depth:

| Depth | Budget | Use Case |
|-------|--------|----------|
| **None** | 0 tokens | Simple tasks, quick scans |
| **Low** | 1024 tokens | Basic code analysis |
| **Medium** | 2048 tokens | Standard vulnerability analysis |
| **High** | 4096 tokens | Complex cross-file reasoning |
| **Max** | 8192 tokens | Architecture review, business logic |

---

## Step 3: Set Thinking Budget (Optional)

Override the default budget:

1. Click **Advanced** for a stage
2. Enter custom `thinkingBudget` in tokens
3. Save configuration

Example:
```json
{
  "crossFile": {
    "thinkingDepth": "high",
    "thinkingBudget": 6144
  }
}
```

---

## Recommended Configurations

### Standard Scan

```json
{
  "discover": {
    "thinkingDepth": "low"
  },
  "deepScan": {
    "thinkingDepth": "medium"
  },
  "crossFile": {
    "thinkingDepth": "high"
  }
}
```

### Deep Analysis

```json
{
  "discover": {
    "thinkingDepth": "medium"
  },
  "deepScan": {
    "thinkingDepth": "high"
  },
  "crossFile": {
    "thinkingDepth": "max"
  }
}
```

### Quick Scan

```json
{
  "discover": {
    "thinkingDepth": "none"
  },
  "deepScan": {
    "thinkingDepth": "low"
  },
  "crossFile": {
    "thinkingDepth": "medium"
  }
}
```

---

## Thinking Mode in Chat

You can also enable thinking for AI chat:

1. Open chat (global, scan, or finding level)
2. Click the **Thinking** toggle
3. Select depth
4. Send your message

---

## Monitoring Thinking Usage

Track thinking token consumption:

1. Navigate to **Observability** → **AI Calls**
2. View the **Thinking Tokens** column
3. Filter by stage or provider

### Cost Impact

Thinking tokens are billed at the same rate as output tokens:

```
Total Cost = (Input + Output + Thinking) × Rate
```

Example (Claude Sonnet):
- Input: 50,000 tokens @ $3/1M = $0.15
- Output: 5,000 tokens @ $15/1M = $0.075
- Thinking: 4,096 tokens @ $15/1M = $0.061
- **Total:** $0.286

---

## Thinking Mode Support

Not all models support thinking:

| Provider | Models with Thinking |
|----------|---------------------|
| **Anthropic** | Claude 4 Opus, Claude 4 Sonnet |
| **OpenAI** | o3, o4-mini |
| **Ollama** | Varies by model |
| **AWS Bedrock** | Claude models |
| **Azure AI Foundry** | Select models |

Check the provider configuration for `supportsThinking: true`.

---

## Thinking Quality Indicators

Signs thinking mode is working well:

- More detailed explanations
- Better cross-file reasoning
- Fewer false positives
- More nuanced severity assessments

Signs to reduce thinking depth:

- Overly verbose responses
- Diminishing returns on accuracy
- Excessive token costs
- No improvement in answer quality

---

## Troubleshooting

### Thinking Not Available

**Cause:** Model doesn't support thinking

**Solution:**
1. Check if model has `supportsThinking: true`
2. Switch to a model that supports thinking
3. Use standard mode without thinking

### Thinking Budget Exceeded

**Cause:** Response exceeded thinking budget

**Solution:**
1. Increase `thinkingBudget`
2. Reduce complexity of the question
3. Accept the truncated response

### Thinking Not Improving Results

**Cause:** Task doesn't benefit from thinking

**Solution:**
1. Reduce thinking depth for simple tasks
2. Reserve thinking for complex analysis
3. Compare results with/without thinking

---

## See Also

- [Configuring AI Providers Tutorial](../tutorials/05-provider-config.md)
- [Configure Provider per Node](./configure-provider-per-node.md)
- [Node Configuration Reference](../reference/config/nodes.md)
