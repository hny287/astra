# Configuring AI Providers

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This tutorial walks you through configuring AI providers in Astra. You'll learn how to set up multiple providers, choose models, and optimize for cost and performance.

---

## Supported Providers

Astra supports seven AI providers:

| Provider | Models | SDK | Best For |
|----------|--------|-----|----------|
| **Cloud Ollama** | Llama 3.1, Mistral, Qwen | `ollama` npm | Cost-effective, fast inference |
| **Hosted Ollama** | Self-hosted models | `ollama` npm | Full control, air-gapped deployments |
| **OpenAI** | GPT-4o, o3, o4-mini | `openai` npm | General-purpose, well-documented |
| **Anthropic** | Claude 4 Opus/Sonnet | `@anthropic-ai/sdk` | Code analysis, complex reasoning |
| **AWS Bedrock** | Claude via Bedrock | AWS SDK | Enterprise AWS environments |
| **Azure AI Foundry** | Various models | Azure SDK | Azure enterprise deployments |
| **LangGraph** | Graph workflows | `@langchain/langgraph` | Multi-step reasoning pipelines |

---

## Step 1: Obtain API Credentials

### Cloud Ollama

1. Visit [https://api.ohmyllama.com](https://api.ohmyllama.com)
2. Create an account
3. Generate an API key
4. Copy the key (format: `ollama-...`)

### Hosted Ollama

1. Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
2. Pull models: `ollama pull llama3.1`, `ollama pull mistral`
3. Start server: `ollama serve`
4. Base URL: `http://localhost:11434` (no API key needed)

### OpenAI

1. Visit [https://platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Click **Create new secret key**
4. Copy the key (format: `sk-...`)

### Anthropic

1. Visit [https://console.anthropic.com](https://console.anthropic.com)
2. Navigate to **Get API Keys**
3. Click **Create Key**
4. Copy the key (format: `sk-ant-...`)

### AWS Bedrock

1. Open AWS Console → **Bedrock**
2. Request model access (Claude, Llama, etc.)
3. Create an IAM user with Bedrock permissions
4. Generate access key and secret key

### Azure AI Foundry

1. Visit [Azure Portal](https://portal.azure.com)
2. Create an **AI Foundry** resource
3. Deploy a model (e.g., Phi, Llama)
4. Copy endpoint URL and API key

### LangGraph

1. Visit [https://langchain.com](https://langchain.com)
2. Create a LangGraph account
3. Generate an API key
4. Configure your graph workflows

---

## Step 2: Configure Providers in Astra

### Via Settings UI

1. Click your avatar → **Settings**
2. Navigate to **AI Providers**
3. Click **Add Provider**
4. Select provider type
5. Enter credentials:
   - **Base URL** (if applicable)
   - **API Key**
6. Click **Test Connection**
7. Click **Save**

### Via Configuration File

Edit `scan.config.json`:

```json
{
  "providers": {
    "cloud-ollama": {
      "baseURL": "https://api.ohmyllama.com",
      "apiKeyEnv": "OLLAMA_API_KEY",
      "models": {
        "llama-3.1-70b": {
          "inputTokenLimit": 128000,
          "outputTokenLimit": 4096,
          "contextWindow": 128000,
          "temperature": 0.2,
          "supportsThinking": false
        },
        "mistral-large": {
          "inputTokenLimit": 32000,
          "outputTokenLimit": 8192,
          "contextWindow": 32000,
          "temperature": 0.3,
          "supportsThinking": false
        }
      }
    },
    "anthropic": {
      "baseURL": "https://api.anthropic.com",
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "models": {
        "claude-4-opus": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 4096
        },
        "claude-sonnet-4-6": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.2,
          "supportsThinking": true
        }
      }
    },
    "openai": {
      "baseURL": "https://api.openai.com/v1",
      "apiKeyEnv": "OPENAI_API_KEY",
      "models": {
        "gpt-4o": {
          "inputTokenLimit": 128000,
          "outputTokenLimit": 4096,
          "contextWindow": 128000,
          "temperature": 0.2,
          "supportsThinking": false
        },
        "o4-mini": {
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "contextWindow": 200000,
          "temperature": 0.1,
          "supportsThinking": true
        }
      }
    }
  }
}
```

---

## Step 3: Set Environment Variables

Add provider API keys to `.env.local`:

```bash
# Cloud Ollama
OLLAMA_API_KEY="ollama-..."

# Hosted Ollama (no key needed)
OLLAMA_HOST="http://localhost:11434"

# OpenAI
OPENAI_API_KEY="sk-..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# AWS Bedrock
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-1"

# Azure AI Foundry
AZURE_AI_ENDPOINT="https://..."
AZURE_AI_API_KEY="..."

# LangGraph
LANGGRAPH_API_KEY="..."
```

---

## Step 4: Assign Providers to Pipeline Stages

Each pipeline stage can use a different provider:

1. Navigate to **Settings** → **Scan Configuration**
2. Click **Pipeline Nodes**
3. For each stage, select:
   - **Provider**
   - **Model**
   - **Temperature**
   - **Thinking Depth**
   - **Timeout**
   - **Concurrency**

### Recommended Configurations

#### Budget-Conscious

```json
{
  "nodes": {
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
}
```

#### Balanced (Recommended)

```json
{
  "nodes": {
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
}
```

#### Maximum Accuracy

```json
{
  "nodes": {
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
}
```

---

## Step 5: Test Provider Connections

Before running scans, verify each provider:

1. Navigate to **Settings** → **AI Providers**
2. Click **Test Connection** next to each provider
3. Verify the response:
   - ✅ **Connected:** Provider is reachable
   - ❌ **Failed:** Check API key and network

### Troubleshooting Connection Tests

**Error: "Invalid API key"**
- Double-check the key in `.env.local`
- Ensure no extra spaces or quotes
- Regenerate the key if needed

**Error: "Timeout"**
- Check network connectivity
- For self-hosted, ensure the service is running
- Increase `timeoutMs` in configuration

**Error: "Model not found"**
- Verify the model name matches exactly
- Check if the model is available in your region
- Pull the model (for Ollama: `ollama pull <model>`)

---

## Step 6: Configure Thinking Mode

Thinking mode enables AI models to "think" before responding:

### Thinking Depth Options

| Depth | Budget | Use Case |
|-------|--------|----------|
| **None** | 0 tokens | Simple questions, quick scans |
| **Low** | 1024 tokens | Basic code analysis |
| **Medium** | 2048 tokens | Standard vulnerability analysis |
| **High** | 4096 tokens | Complex cross-file reasoning |
| **Max** | 8192 tokens | Architecture review, business logic |

### Configure Per Stage

```json
{
  "nodes": {
    "deepScan": {
      "thinkingDepth": "medium",
      "thinkingBudget": 2048
    },
    "crossFile": {
      "thinkingDepth": "high",
      "thinkingBudget": 4096
    }
  }
}
```

---

## Step 7: Monitor Usage and Costs

### Token Tracking

Every AI call logs token usage:

1. Navigate to **Observability** → **AI Calls**
2. View columns:
   - **Input Tokens:** Prompt size
   - **Output Tokens:** Response size
   - **Thinking Tokens:** Reasoning budget (if enabled)
   - **Total Cost:** Calculated from provider rates

### Cost Optimization Tips

**Reduce token usage:**
- Lower `maxOutputTokens` for simple tasks
- Use `scanDepth: "quick"` for initial scans
- Disable thinking for routine analysis

**Choose cost-effective models:**
- Cloud Ollama: ~$0.10 / 1M tokens
- GPT-4o: ~$5.00 / 1M tokens (input)
- Claude Sonnet: ~$3.00 / 1M tokens (input)
- Claude Opus: ~$15.00 / 1M tokens (input)

**Use concurrency wisely:**
- Higher concurrency = faster scans
- But more parallel API calls = higher burst costs

---

## Provider-Specific Notes

### Cloud Ollama

**Pros:**
- Cost-effective for high-volume scanning
- Wide model selection
- No self-hosting required

**Cons:**
- Shared infrastructure (rate limits)
- Models may have lower quality than premium providers

**Configuration:**
```json
{
  "provider": "cloud-ollama",
  "baseURL": "https://api.ohmyllama.com",
  "apiKeyEnv": "OLLAMA_API_KEY"
}
```

### Hosted Ollama

**Pros:**
- Full control over models
- Air-gapped deployments possible
- No API costs

**Cons:**
- Requires self-hosting
- GPU recommended for large models

**Configuration:**
```json
{
  "provider": "hosted-ollama",
  "baseURL": "http://localhost:11434"
}
```

### OpenAI

**Pros:**
- Well-documented API
- Reliable and fast
- Good general-purpose models

**Cons:**
- Higher cost for premium models
- Rate limits on free tier

**Configuration:**
```json
{
  "provider": "openai",
  "baseURL": "https://api.openai.com/v1",
  "apiKeyEnv": "OPENAI_API_KEY"
}
```

### Anthropic

**Pros:**
- Excellent code analysis
- Claude excels at reasoning
- Large context windows (200K tokens)

**Cons:**
- Premium pricing for Opus
- Thinking mode increases costs

**Configuration:**
```json
{
  "provider": "anthropic",
  "baseURL": "https://api.anthropic.com",
  "apiKeyEnv": "ANTHROPIC_API_KEY"
}
```

---

## Switching Providers Mid-Scan

You can change providers between scans without restarting:

1. Update configuration in UI or file
2. Save changes
3. New scans use the updated config
4. Running scans continue with their original config

---

## Next Steps

- **[Node Configuration Reference](../reference/config/nodes.md)** — Detailed node settings
- **[Provider Registry](../reference/config/providers.md)** — Full provider documentation
- **[Multi-Provider Strategy](../explanation/decisions/multi-provider.md)** — Why Astra supports multiple providers
