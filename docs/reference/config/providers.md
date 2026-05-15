# Provider Registry

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Complete registry of supported AI providers and their models.

---

## Cloud Ollama

**ID:** `cloud-ollama`

**Base URL:** `https://api.ohmyllama.com`

**SDK:** `ollama` (npm)

**Models:**

| Model | Context Window | Input Limit | Output Limit | Thinking |
|-------|---------------|-------------|--------------|----------|
| `llama-3.1-70b` | 128K | 128K | 4K | No |
| `llama-3.1-8b` | 128K | 128K | 4K | No |
| `mistral-large` | 32K | 32K | 8K | No |
| `qwen-2.5-72b` | 32K | 32K | 4K | No |

**Pricing:** ~$0.10 / 1M input tokens

---

## Hosted Ollama

**ID:** `hosted-ollama`

**Base URL:** `http://localhost:11434` (configurable)

**SDK:** `ollama` (npm)

**Models:** Any model pulled via `ollama pull`

**Common Models:**

| Model | Context Window | Notes |
|-------|---------------|-------|
| `llama3.1` | 128K | Meta's Llama 3.1 |
| `mistral` | 32K | Mistral AI |
| `codellama` | 16K | Code-specialized |
| `qwen2.5` | 32K | Alibaba's Qwen |

**Pricing:** Free (self-hosted)

---

## OpenAI

**ID:** `openai`

**Base URL:** `https://api.openai.com/v1`

**SDK:** `openai` (npm)

**Models:**

| Model | Context Window | Input Limit | Output Limit | Thinking |
|-------|---------------|-------------|--------------|----------|
| `gpt-4o` | 128K | 128K | 4K | No |
| `gpt-4o-mini` | 128K | 128K | 4K | No |
| `o3` | 200K | 200K | 8K | Yes |
| `o4-mini` | 200K | 200K | 8K | Yes |

**Pricing:**
- GPT-4o: $5/1M input, $15/1M output
- GPT-4o-mini: $0.15/1M input, $0.60/1M output
- o3/o4: $10/1M input, $30/1M output

---

## Anthropic

**ID:** `anthropic`

**Base URL:** `https://api.anthropic.com`

**SDK:** `@anthropic-ai/sdk` (npm)

**Models:**

| Model | Context Window | Input Limit | Output Limit | Thinking |
|-------|---------------|-------------|--------------|----------|
| `claude-4-opus` | 200K | 200K | 8K | Yes (max 4K) |
| `claude-sonnet-4-6` | 200K | 200K | 8K | Yes |
| `claude-3-5-sonnet` | 200K | 200K | 8K | No |
| `claude-3-haiku` | 200K | 200K | 4K | No |

**Pricing:**
- Claude 4 Opus: $15/1M input, $75/1M output
- Claude Sonnet 4: $3/1M input, $15/1M output
- Claude 3 Haiku: $0.25/1M input, $1.25/1M output

---

## AWS Bedrock

**ID:** `bedrock`

**Base URL:** N/A (AWS SDK)

**SDK:** `@aws-sdk/client-bedrock-runtime`

**Models:**

| Model | Provider | Context Window | Thinking |
|-------|----------|---------------|----------|
| `claude-3-sonnet-20240229-v1:0` | Anthropic | 200K | No |
| `claude-3-opus-20240229-v1:0` | Anthropic | 200K | No |
| `llama-3-1-70b-instruct-v1:0` | Meta | 128K | No |
| `mistral-large-2402-v1:0` | Mistral | 32K | No |

**Pricing:** AWS Bedrock rates apply

---

## Azure AI Foundry

**ID:** `azure-ai-foundry`

**Base URL:** `https://{resource}.cognitiveservices.azure.com`

**SDK:** `@azure/openai`

**Models:**

| Model | Context Window | Notes |
|-------|---------------|-------|
| `gpt-4o` | 128K | OpenAI via Azure |
| `gpt-4` | 128K | OpenAI via Azure |
| `llama-3.1-405b` | 128K | Meta via Azure |
| `phi-3-medium` | 128K | Microsoft Phi |

**Pricing:** Azure rates apply

---

## LangGraph

**ID:** `langgraph`

**Base URL:** `https://api.langchain.com`

**SDK:** `@langchain/langgraph`

**Use Case:** Graph-based multi-step workflows

**Pricing:** LangChain rates apply

---

## Provider Selection Guide

### For Cost Efficiency

1. **Cloud Ollama** — Lowest cost, good quality
2. **Hosted Ollama** — Free, requires infrastructure
3. **Claude Haiku** — Low-cost premium provider

### For Accuracy

1. **Claude 4 Opus** — Best for code analysis
2. **GPT-4o** — Excellent general reasoning
3. **Claude Sonnet 4** — Balanced cost/accuracy

### For Thinking Mode

1. **Anthropic** — Claude 4 models support thinking
2. **OpenAI** — o3/o4-mini support thinking
3. **Ollama** — Varies by model

---

## See Also

- [Configuring AI Providers Tutorial](../../tutorials/05-provider-config.md)
- [Providers API](../api/providers.md)
- [Multi-Provider Strategy](../../explanation/decisions/multi-provider.md)
