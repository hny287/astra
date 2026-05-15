# Why Multi-Provider AI?

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Rationale for supporting multiple AI providers instead of a single backend.

---

## The Problem: Vendor Lock-in

Choosing a single AI provider creates risks:

1. **Price Changes:** Provider raises prices, you're stuck
2. **Outages:** Provider goes down, scans stop
3. **Rate Limits:** Hit limits, no fallback
4. **Model Deprecation:** Favorite model discontinued
5. **Performance:** Provider quality degrades over time

---

## The Solution: Provider Abstraction

Astra implements a common `AIProvider` interface:

```typescript
// src/providers/base.ts
export interface AIProvider {
  send(prompt: string, options: AIOptions): Promise<AIResponse>;
  stream(prompt: string, options: AIOptions): AsyncIterable<StreamChunk>;
  testConnection(): Promise<boolean>;
}
```

All providers implement this interface:

```typescript
// src/providers/anthropic.ts
export class AnthropicProvider implements AIProvider {
  async send(prompt: string, options: AIOptions): Promise<AIResponse> {
    // Anthropic SDK calls
  }
}

// src/providers/openai.ts
export class OpenAIProvider implements AIProvider {
  async send(prompt: string, options: AIOptions): Promise<AIResponse> {
    // OpenAI SDK calls
  }
}

// src/providers/ollama.ts
export class OllamaProvider implements AIProvider {
  async send(prompt: string, options: AIOptions): Promise<AIResponse> {
    // Ollama SDK calls
  }
}
```

---

## Provider Factory

Runtime provider selection:

```typescript
// src/providers/factory.ts
export function createProvider(providerId: string, config: ProviderConfig): AIProvider {
  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'cloud-ollama':
      return new OllamaProvider(config, 'https://api.ohmyllama.com');
    case 'hosted-ollama':
      return new OllamaProvider(config, 'http://localhost:11434');
    // ...
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}
```

---

## Usage in Pipeline

Each node selects its provider:

```typescript
// src/scan/nodes/deep-scan.ts
const provider = createProvider(nodeConfig.provider, providerConfig);
const response = await provider.send(prompt, {
  model: nodeConfig.model,
  temperature: nodeConfig.temperature,
  thinkingDepth: nodeConfig.thinkingDepth
});
```

---

## Benefits

### 1. Cost Optimization

Use different providers for different tasks:

```json
{
  "discover": {
    "provider": "cloud-ollama",
    "model": "llama-3.1-70b"
  },
  "deepScan": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-6"
  },
  "crossFile": {
    "provider": "anthropic",
    "model": "claude-4-opus"
  }
}
```

**Cost per scan:**
- All Claude Opus: ~$50
- Mixed approach: ~$15
- Savings: 70%

---

### 2. High Availability

Provider fails? Switch to another:

```
Anthropic down ──► Switch to OpenAI ──► Scans continue
```

No single point of failure.

---

### 3. Model Selection

Choose best model for each task:

| Task | Best Model | Why |
|------|------------|-----|
| File prioritization | Llama 3.1 70B | Fast, cheap, good enough |
| Per-file analysis | Claude Sonnet 4 | Balanced cost/accuracy |
| Cross-file reasoning | Claude 4 Opus | Best for complex logic |
| Chat | GPT-4o | Conversational strength |

---

### 4. Negotiation Leverage

Can threaten to switch providers:

```
Provider: "We're raising prices 50%"
You: "We'll migrate to a different provider"
```

---

### 5. Compliance

Some organizations require:
- Specific providers (AWS Bedrock for AWS customers)
- Data residency (Azure for EU data)
- No external APIs (self-hosted Ollama)

Multi-provider supports all scenarios.

---

## Supported Providers

| Provider | Models | Use Case |
|----------|--------|----------|
| **Cloud Ollama** | Llama, Mistral, Qwen | Cost-effective |
| **Hosted Ollama** | Self-hosted | Air-gapped, free |
| **OpenAI** | GPT-4o, o3, o4-mini | General purpose |
| **Anthropic** | Claude 4 Opus/Sonnet | Code analysis |
| **AWS Bedrock** | Claude via AWS | Enterprise AWS |
| **Azure AI Foundry** | Various | Enterprise Azure |
| **LangGraph** | Graph workflows | Multi-step reasoning |

---

## Configuration

### Provider Registry

```json
{
  "providers": {
    "anthropic": {
      "baseURL": "https://api.anthropic.com",
      "apiKeyEnv": "ANTHROPIC_API_KEY",
      "models": {
        "claude-4-opus": {
          "contextWindow": 200000,
          "supportsThinking": true
        }
      }
    },
    "openai": {
      "baseURL": "https://api.openai.com/v1",
      "apiKeyEnv": "OPENAI_API_KEY",
      "models": {
        "gpt-4o": {
          "contextWindow": 128000,
          "supportsThinking": false
        }
      }
    }
  }
}
```

### Per-Node Selection

```json
{
  "nodes": {
    "discover": {
      "provider": "cloud-ollama",
      "model": "llama-3.1-70b"
    },
    "deepScan": {
      "provider": "anthropic",
      "model": "claude-sonnet-4-6"
    },
    "crossFile": {
      "provider": "anthropic",
      "model": "claude-4-opus"
    }
  }
}
```

---

## Trade-offs

### Complexity

**Challenge:** More code to maintain

**Mitigation:**
- Common interface abstracts differences
- Factory pattern centralizes logic
- Each provider isolated in own file

### Testing

**Challenge:** Need to test all providers

**Mitigation:**
- Mock provider for unit tests
- Integration tests run against all providers
- `testConnection` endpoint for manual testing

### Documentation

**Challenge:** Users need to understand options

**Mitigation:**
- Provider comparison tables
- Recommended configurations
- Cost calculators

---

## Future Enhancements

### Automatic Fallback

```typescript
async function sendWithFallback(prompt: string, providers: string[]): Promise<AIResponse> {
  for (const providerId of providers) {
    try {
      const provider = createProvider(providerId);
      return await provider.send(prompt);
    } catch (error) {
      logError(`Provider ${providerId} failed:`, error);
      // Try next provider
    }
  }
  throw new Error('All providers failed');
}
```

### Cost-Based Routing

```typescript
function selectProvider(budget: number): string {
  if (budget > $10) return 'claude-4-opus';
  if (budget > $5) return 'claude-sonnet-4';
  if (budget > $1) return 'gpt-4o';
  return 'llama-3.1-70b';
}
```

### Performance Monitoring

Track latency, error rates, and quality per provider:

```typescript
// Observability dashboard
Provider    | Avg Latency | Error Rate | Cost/Scan
------------|-------------|------------|----------
Anthropic   | 1.2s        | 0.5%       | $8.50
OpenAI      | 0.8s        | 1.2%       | $6.20
Ollama      | 2.5s        | 3.1%       | $0.50
```

---

## See Also

- [Provider Registry](../../reference/config/providers.md)
- [Configuring AI Providers Tutorial](../../tutorials/05-provider-config.md)
- [Providers API](../../reference/api/providers.md)
