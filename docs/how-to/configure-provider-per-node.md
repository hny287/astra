# Configure AI Provider per Pipeline Stage

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to assign different AI providers and models to each pipeline stage.

---

## Why Configure Per-Node Providers

Different stages have different needs:

- **Discover:** Fast, cheap analysis for file prioritization
- **Deep Scan:** Balanced cost/accuracy for per-file analysis
- **Cross-File:** Maximum accuracy for complex reasoning

Using different providers lets you optimize for:
- **Cost:** Use cheaper models for simple tasks
- **Speed:** Use faster providers for time-sensitive stages
- **Accuracy:** Use best models for critical analysis
- **Availability:** Fallback providers if one is down

---

## Step 1: Navigate to Scan Configuration

1. Click **Settings** in the sidebar
2. Navigate to **Scan Configuration**
3. Click **Pipeline Nodes** tab

---

## Step 2: Configure Each Node

For each stage, set:

### Provider

Select from configured providers:
- Cloud Ollama
- Hosted Ollama
- OpenAI
- Anthropic
- AWS Bedrock
- Azure AI Foundry
- LangGraph

### Model

Choose a model from the provider's catalog:
- Llama 3.1 70B (Ollama)
- GPT-4o (OpenAI)
- Claude 4 Sonnet (Anthropic)
- etc.

### Temperature

Adjust creativity (0.0–2.0):
- **0.0–0.3:** Deterministic, focused (recommended for security)
- **0.4–0.7:** Balanced
- **0.8+:** Creative (not recommended for security analysis)

### Thinking Depth

Enable reasoning budget:
- **None:** No thinking tokens
- **Low:** 1024 tokens
- **Medium:** 2048 tokens
- **High:** 4096 tokens
- **Max:** 8192 tokens

### Concurrency

Parallel execution (Deep Scan only):
- **1–3:** Conservative, lower API costs
- **4–10:** Balanced (default: 5)
- **11+:** Aggressive, faster scans

### Timeout

Maximum execution time:
- **30000ms:** Quick stages (Discover)
- **60000ms:** Standard stages
- **120000ms+:** Complex stages (Cross-File)

---

## Recommended Configurations

### Budget-Conscious

```json
{
  "discover": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "temperature": 0.2,
    "thinkingDepth": "none"
  },
  "deepScan": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "temperature": 0.2,
    "thinkingDepth": "low",
    "concurrency": 10
  },
  "crossFile": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "temperature": 0.3,
    "thinkingDepth": "medium"
  }
}
```

**Estimated cost per scan:** $0.50–$2.00

---

### Balanced (Recommended)

```json
{
  "discover": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.2,
    "thinkingDepth": "low"
  },
  "deepScan": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6",
    "temperature": 0.2,
    "thinkingDepth": "medium",
    "concurrency": 5
  },
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.3,
    "thinkingDepth": "high"
  }
}
```

**Estimated cost per scan:** $5.00–$15.00

---

### Maximum Accuracy

```json
{
  "discover": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.2,
    "thinkingDepth": "medium"
  },
  "deepScan": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.1,
    "thinkingDepth": "high",
    "concurrency": 3
  },
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.3,
    "thinkingDepth": "max"
  }
}
```

**Estimated cost per scan:** $20.00–$50.00

---

### Hybrid Approach

```json
{
  "discover": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b",
    "temperature": 0.2,
    "thinkingDepth": "none"
  },
  "deepScan": {
    "provider": "openai",
    "model": "gpt-4o",
    "temperature": 0.2,
    "thinkingDepth": "medium",
    "concurrency": 5
  },
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus",
    "temperature": 0.3,
    "thinkingDepth": "high"
  }
}
```

**Estimated cost per scan:** $10.00–$25.00

---

## Step 3: Save Configuration

Click **Save Configuration** to apply changes.

New scans will use the updated configuration.

---

## Override Per-Scan

You can override the default configuration for individual scans:

1. Click **New Scan**
2. Click **Advanced Configuration**
3. Adjust per-node settings
4. Start the scan

---

## Monitoring Per-Node Usage

Track provider usage per stage:

1. Navigate to **Observability** → **AI Calls**
2. Filter by **Node** (discover, deep_scan, cross_file)
3. View:
   - Provider distribution
   - Token consumption
   - Cost breakdown
   - Error rates

---

## Troubleshooting

### Provider Not Available

**Cause:** API key invalid or provider down

**Solution:**
1. Check API key in Settings → AI Providers
2. Test connection from provider settings
3. Switch to a different provider temporarily

### Model Not Found

**Cause:** Model name mismatch or not accessible

**Solution:**
1. Verify model name matches provider's catalog
2. Check if you have access to the model
3. Select a different model

### Stage Timing Out

**Cause:** Model too slow or file too large

**Solution:**
1. Increase `timeoutMs` for that stage
2. Reduce `maxOutputTokens`
3. Switch to a faster provider

---

## See Also

- [Configuring AI Providers Tutorial](../tutorials/05-provider-config.md)
- [Provider Registry](../reference/config/providers.md)
- [Node Configuration Reference](../reference/config/nodes.md)
