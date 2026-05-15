# API Reference: Providers

**Last updated:** 2026-05-15 | **Version:** v2.23.0

REST API endpoints for AI provider management.

---

## Base URL

```
https://astra.example.com/api/v1/providers
```

All endpoints require authentication.

---

## GET /api/v1/providers

List all configured AI providers.

### Request

```
GET /api/v1/providers
Authorization: Bearer <token>
```

### Response

**200 OK:**
```json
{
  "providers": [
    {
      "id": "cloud-ollama",
      "name": "Cloud Ollama",
      "baseURL": "https://api.ohmyllama.com",
      "configured": true,
      "models": [
        {
          "id": "llama-3.1-70b",
          "name": "Llama 3.1 70B",
          "contextWindow": 128000,
          "inputTokenLimit": 128000,
          "outputTokenLimit": 4096,
          "temperature": 0.2,
          "supportsThinking": false
        },
        {
          "id": "mistral-large",
          "name": "Mistral Large",
          "contextWindow": 32000,
          "inputTokenLimit": 32000,
          "outputTokenLimit": 8192,
          "temperature": 0.3,
          "supportsThinking": false
        }
      ]
    },
    {
      "id": "anthropic",
      "name": "Anthropic",
      "baseURL": "https://api.anthropic.com",
      "configured": true,
      "models": [
        {
          "id": "claude-4-opus",
          "name": "Claude 4 Opus",
          "contextWindow": 200000,
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "temperature": 0.2,
          "supportsThinking": true,
          "maxThinkingTokens": 4096
        },
        {
          "id": "claude-sonnet-4-6",
          "name": "Claude Sonnet 4",
          "contextWindow": 200000,
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "temperature": 0.2,
          "supportsThinking": true
        }
      ]
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "baseURL": "https://api.openai.com/v1",
      "configured": true,
      "models": [
        {
          "id": "gpt-4o",
          "name": "GPT-4o",
          "contextWindow": 128000,
          "inputTokenLimit": 128000,
          "outputTokenLimit": 4096,
          "temperature": 0.2,
          "supportsThinking": false
        },
        {
          "id": "o4-mini",
          "name": "o4-mini",
          "contextWindow": 200000,
          "inputTokenLimit": 200000,
          "outputTokenLimit": 8192,
          "temperature": 0.1,
          "supportsThinking": true
        }
      ]
    }
  ]
}
```

---

## POST /api/v1/providers/test

Test a provider connection.

### Request

**Body:**
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-6"
}
```

### Response

**200 OK:**
```json
{
  "success": true,
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "latencyMs": 245,
  "message": "Connection successful"
}
```

**200 OK (failure):**
```json
{
  "success": false,
  "provider": "anthropic",
  "error": "Invalid API key",
  "message": "Authentication failed. Check your API key."
}
```

---

## Provider Definitions

### Cloud Ollama

```json
{
  "id": "cloud-ollama",
  "name": "Cloud Ollama",
  "baseURL": "https://api.ohmyllama.com",
  "apiKeyEnv": "OLLAMA_API_KEY",
  "sdk": "ollama",
  "sdkVersion": "0.5.x"
}
```

### Hosted Ollama

```json
{
  "id": "hosted-ollama",
  "name": "Hosted Ollama",
  "baseURL": "http://localhost:11434",
  "apiKeyEnv": null,
  "sdk": "ollama",
  "sdkVersion": "0.5.x"
}
```

### OpenAI

```json
{
  "id": "openai",
  "name": "OpenAI",
  "baseURL": "https://api.openai.com/v1",
  "apiKeyEnv": "OPENAI_API_KEY",
  "sdk": "openai",
  "sdkVersion": "4.x"
}
```

### Anthropic

```json
{
  "id": "anthropic",
  "name": "Anthropic",
  "baseURL": "https://api.anthropic.com",
  "apiKeyEnv": "ANTHROPIC_API_KEY",
  "sdk": "@anthropic-ai/sdk",
  "sdkVersion": "0.30.x"
}
```

### AWS Bedrock

```json
{
  "id": "bedrock",
  "name": "AWS Bedrock",
  "baseURL": null,
  "apiKeyEnv": null,
  "sdk": "@aws-sdk/client-bedrock-runtime",
  "sdkVersion": "3.x",
  "credentials": {
    "accessKeyId": "AWS_ACCESS_KEY_ID",
    "secretAccessKey": "AWS_SECRET_ACCESS_KEY",
    "region": "AWS_REGION"
  }
}
```

### Azure AI Foundry

```json
{
  "id": "azure-ai-foundry",
  "name": "Azure AI Foundry",
  "baseURL": "https://{resource}.cognitiveservices.azure.com",
  "apiKeyEnv": "AZURE_AI_API_KEY",
  "sdk": "@azure/openai",
  "sdkVersion": "1.x"
}
```

### LangGraph

```json
{
  "id": "langgraph",
  "name": "LangGraph",
  "baseURL": "https://api.langchain.com",
  "apiKeyEnv": "LANGGRAPH_API_KEY",
  "sdk": "@langchain/langgraph",
  "sdkVersion": "0.2.x"
}
```

---

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 400 Bad Request

```json
{
  "error": "Bad Request",
  "message": "Invalid provider specified"
}
```

### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## See Also

- [Configuring AI Providers Tutorial](../../tutorials/05-provider-config.md)
- [Configure Provider per Node](../../how-to/configure-provider-per-node.md)
- [Config API](./config.md)
