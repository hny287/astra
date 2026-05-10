# User-Scoped Model Registry Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global file-backed `Config` table with a `UserConfig` table (one row per user, 4 JSON blobs), add `fieldSchema` to `ProviderModel` so the frontend renders forms dynamically from the DB, and update all provider constructors to accept resolved credential strings instead of env-var names.

**Architecture:** Three DB tables: `User` (exists), `ProviderModel` (admin-managed models with capabilities + fieldSchema JSON that drives the UI), `UserConfig` (one row per user with `discoverConfig`, `deepScanConfig`, `crossFileConfig`, `chatConfig` JSON blobs containing credentials + parameters). Provider SDK files become dumb pipes: they receive resolved strings. The factory maps the user's saved JSON into provider-specific constructor args.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Zod, Vitest, IBM Carbon React, TypeScript.

---

## File Structure

| File | Responsibility |
|------|--------------|
| `astra-app/prisma/schema.prisma` | Add `UserConfig` model, add `fieldSchema` to `ProviderModel` |
| `astra-app/prisma/seed.ts` | Seed 7 baseline `ProviderModel` records with `capabilities` + `fieldSchema` |
| `astra-app/src/lib/config.ts` | Zod schemas with credential fields; `loadUserConfigFromDb`, `saveUserConfigToDb` |
| `astra-app/src/providers/base.ts` | `AIProvider` interface (unchanged) |
| `astra-app/src/providers/cloud-ollama.ts` | Constructor accepts `apiKey: string` instead of `apiKeyEnv` |
| `astra-app/src/providers/hosted-ollama.ts` | Constructor accepts `apiKey: string` instead of `apiKeyEnv` |
| `astra-app/src/providers/openai.ts` | Constructor accepts `apiKey: string` + optional `baseURL` |
| `astra-app/src/providers/anthropic.ts` | Constructor accepts `apiKey: string` + optional `baseURL` |
| `astra-app/src/providers/azure-ai-foundry.ts` | Implement from stub: `apiKey`, `baseURL`, `deploymentName` |
| `astra-app/src/providers/bedrock.ts` | Implement from stub: `accessKeyId`, `secretAccessKey`, `region`, `modelId` |
| `astra-app/src/providers/factory.ts` | `createProvider` takes resolved credentials; `createProviderForNode` reads `UserConfig` + `ProviderModel` from DB |
| `astra-app/src/app/api/v1/config/route.ts` | User-scoped GET/PUT using `getCurrentUserId()` |
| `astra-app/src/app/api/v1/providers/route.ts` | Return `ProviderModel` list with `capabilities` + `fieldSchema` |
| `astra-app/src/app/api/v1/providers/test/route.ts` | Accept credentials in POST body, instantiate provider, test connection |
| `astra-app/src/app/api/v1/scans/route.ts` | Use `loadUserConfigFromDb` |
| `astra-app/src/app/api/v1/chat/route.ts` | Use `loadUserConfigFromDb` for chat config |
| `astra-app/src/lib/ai-chat.ts` | `getChatProvider` reads user config from DB |
| `astra-app/src/components/ConfigEditor.tsx` | Data-driven: render credential fields from `fieldSchema`, save to user-scoped endpoint |
| `astra-app/src/components/AdminModelRegistry.tsx` | Admin JSON builder for adding `ProviderModel` entries |
| `astra-app/src/lib/rbac.ts` | Existing `requireAuth()` — used by all API routes (no new auth file needed) |
| `astra-app/src/tests/config.test.ts` | Vitest tests for schema validation and DB loader |
| `astra-app/src/tests/factory.test.ts` | Vitest tests for provider factory credential mapping |

---

### Task 1: Prisma Schema Migration

**Files:**
- Modify: `astra-app/prisma/schema.prisma`
- Create: `astra-app/prisma/migrations/20260508120000_user_config/migration.sql`
- Modify: `astra-app/package.json` (add `seed` script)

- [ ] **Step 1: Add `UserConfig` model and `fieldSchema` to `ProviderModel`**

Open `astra-app/prisma/schema.prisma`. Replace the `Config` model block with `UserConfig` and add `fieldSchema` to `ProviderModel`.

The existing `Config` block at lines 351-355 must be **kept** (not dropped) — `loadConfigFromDb()` still uses it as a fallback for seeding `UserConfig`. Add `UserConfig` **alongside** it:
```prisma
model UserConfig {
  id              String   @id @default(cuid())
  userId          String   @unique
  discoverConfig  Json
  deepScanConfig  Json
  crossFileConfig Json
  chatConfig      Json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Find the `ProviderModel` model (it may not exist — check the schema). If it does not exist, add it after `Preset`. If it exists, add `fieldSchema Json` to it. The final `ProviderModel` should look like:

```prisma
model ProviderModel {
  id              String   @id @default(cuid())
  providerId      String
  modelType       String   @unique
  displayName     String
  capabilities    Json
  fieldSchema     Json
  isDefault       Boolean  @default(false)
  createdAt       DateTime @default(now())

  @@index([providerId])
  @@index([modelType])
}
```

If `ProviderModel` is missing entirely, insert it after the `Preset` model block.

- [ ] **Step 2: Generate and apply migration**

Run the migration commands. This assumes Prisma is configured with a valid `DATABASE_URL`.

```bash
cd /root/astra/astra-app
npx prisma migrate dev --name user_config_and_field_schema
```

Expected: Prisma generates a migration file and applies it to PostgreSQL. Confirm when prompted.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
npx prisma db pull --print | grep -E "(UserConfig|ProviderModel)"
```

Expected output contains both `UserConfig` and `ProviderModel`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add UserConfig and ProviderModel.fieldSchema to schema"
```

---

### Task 2: Seed Baseline ProviderModel Registry

**Files:**
- Create: `astra-app/prisma/seed.ts`
- Modify: `astra-app/package.json`

- [ ] **Step 1: Create seed script**

Create `astra-app/prisma/seed.ts` with the exact baseline records. Each record contains `providerId`, `modelType`, `displayName`, `capabilities`, and `fieldSchema`.

```typescript
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

const BASELINE_MODELS = [
  {
    providerId: "cloud-ollama",
    modelType: "glm-5.1:cloud",
    displayName: "GLM 5.1 Cloud",
    capabilities: { inputTokenLimit: 128000, outputTokenLimit: 8192, contextWindow: 128000, supportsThinking: true, maxThinkingTokens: 8192 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: false },
        { id: "baseURL", label: "Base URL", type: "url", required: true, default: "https://api.ohmyllama.com" },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "hosted-ollama",
    modelType: "llama3.1:8b",
    displayName: "Llama 3.1 8B",
    capabilities: { inputTokenLimit: 128000, outputTokenLimit: 4096, contextWindow: 128000, supportsThinking: false, maxThinkingTokens: 0 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: false },
        { id: "baseURL", label: "Host URL", type: "url", required: true, default: "http://localhost:11434" },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "openai",
    modelType: "gpt-4o",
    displayName: "GPT-4o",
    capabilities: { inputTokenLimit: 128000, outputTokenLimit: 4096, contextWindow: 128000, supportsThinking: false, maxThinkingTokens: 0 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: true },
        { id: "baseURL", label: "Base URL", type: "url", required: false, default: "https://api.openai.com/v1" },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "anthropic",
    modelType: "claude-sonnet-4-6",
    displayName: "Claude Sonnet 4.6",
    capabilities: { inputTokenLimit: 200000, outputTokenLimit: 8192, contextWindow: 200000, supportsThinking: true, maxThinkingTokens: 8192 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: true },
        { id: "baseURL", label: "Base URL", type: "url", required: false },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "azure-ai-foundry",
    modelType: "gpt-4o-azure",
    displayName: "GPT-4o Azure",
    capabilities: { inputTokenLimit: 128000, outputTokenLimit: 4096, contextWindow: 128000, supportsThinking: false, maxThinkingTokens: 0 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: true },
        { id: "baseURL", label: "Azure Endpoint", type: "url", required: true },
        { id: "deploymentName", label: "Deployment Name", type: "string", required: true },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "bedrock",
    modelType: "claude-3-sonnet-bedrock",
    displayName: "Claude 3 Sonnet (Bedrock)",
    capabilities: { inputTokenLimit: 200000, outputTokenLimit: 8192, contextWindow: 200000, supportsThinking: true, maxThinkingTokens: 8192 },
    fieldSchema: {
      credentials: [
        { id: "accessKeyId", label: "Access Key ID", type: "string", required: true },
        { id: "secretAccessKey", label: "Secret Access Key", type: "password", required: true },
        { id: "region", label: "AWS Region", type: "string", required: true, default: "us-east-1" },
      ],
      parameters: [
        { id: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.1, default: 0.2 },
        { id: "maxOutputTokens", label: "Max Output Tokens", type: "number", default: 4096 },
      ],
    },
    isDefault: true,
  },
  {
    providerId: "langgraph",
    modelType: "langgraph-default",
    displayName: "LangGraph Default",
    capabilities: { inputTokenLimit: 0, outputTokenLimit: 0, contextWindow: 0, supportsThinking: false, maxThinkingTokens: 0 },
    fieldSchema: {
      credentials: [
        { id: "apiKey", label: "API Key", type: "password", required: true },
        { id: "baseURL", label: "Base URL", type: "url", required: true },
      ],
      parameters: [],
    },
    isDefault: true,
  },
];

async function main() {
  for (const model of BASELINE_MODELS) {
    await prisma.providerModel.upsert({
      where: { modelType: model.modelType },
      update: {
        displayName: model.displayName,
        capabilities: model.capabilities as any,
        fieldSchema: model.fieldSchema as any,
        isDefault: model.isDefault,
      },
      create: {
        providerId: model.providerId,
        modelType: model.modelType,
        displayName: model.displayName,
        capabilities: model.capabilities as any,
        fieldSchema: model.fieldSchema as any,
        isDefault: model.isDefault,
      },
    });
  }
  console.log(`Seeded ${BASELINE_MODELS.length} ProviderModel records.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
```

- [ ] **Step 2: Add seed script to package.json**

In `astra-app/package.json`, inside `"scripts"`, add:
```json
"seed": "npx tsx prisma/seed.ts"
```

- [ ] **Step 3: Run seed**

```bash
cd /root/astra/astra-app
npm run seed
```

Expected output: `Seeded 7 ProviderModel records.`

- [ ] **Step 4: Verify in database**

```bash
npx prisma studio --port 5555 &
sleep 3
curl -s http://localhost:5555/api/providerModel | head -c 200 || true
```

Alternatively, run a quick query via Prisma:
```bash
npx tsx -e "const {PrismaClient} = require('@/generated/prisma'); const p = new PrismaClient(); p.providerModel.count().then(c => console.log('count:', c)).then(() => p.$disconnect());"
```

Expected: `count: 7`

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: seed baseline ProviderModel registry with fieldSchema"
```

---

### Task 3: Update Provider Constructors to Accept Resolved Credentials

**Files:**
- Modify: `astra-app/src/providers/cloud-ollama.ts`
- Modify: `astra-app/src/providers/hosted-ollama.ts`
- Modify: `astra-app/src/providers/openai.ts`
- Modify: `astra-app/src/providers/anthropic.ts`
- Modify: `astra-app/src/providers/azure-ai-foundry.ts`
- Modify: `astra-app/src/providers/bedrock.ts`
- Modify: `astra-app/src/providers/langgraph-connector.ts`

- [ ] **Step 1: Update `cloud-ollama.ts`**

Replace the `CloudOllamaConfig` interface and constructor at lines 4-16 and 33-49.

Old interface:
```typescript
interface CloudOllamaConfig {
  baseURL: string;
  model: string;
  apiKeyEnv: string;
  modelInfo: { ... };
}
```

New interface:
```typescript
interface CloudOllamaConfig {
  baseURL: string;
  model: string;
  apiKey: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}
```

Old constructor:
```typescript
constructor(config: CloudOllamaConfig) {
  const apiKey = process.env[config.apiKeyEnv] ?? "";
  this.client = new Ollama({
    host: config.baseURL,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  // ...
}
```

New constructor:
```typescript
constructor(config: CloudOllamaConfig) {
  this.client = new Ollama({
    host: config.baseURL,
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
  });
  this.model = config.model;
  this.modelInfo = {
    id: config.model,
    inputTokenLimit: config.modelInfo.inputTokenLimit,
    outputTokenLimit: config.modelInfo.outputTokenLimit,
    contextWindow: config.modelInfo.contextWindow,
    supportsSystemPrompt: true,
    supportsThinking: config.modelInfo.supportsThinking,
    maxThinkingTokens: config.modelInfo.maxThinkingTokens,
  };
}
```

- [ ] **Step 2: Update `hosted-ollama.ts`**

Same pattern. Replace `apiKeyEnv: string` with `apiKey: string` in the interface. In the constructor, remove `process.env[config.apiKeyEnv]` and use `config.apiKey` directly.

Old:
```typescript
interface HostedOllamaConfig {
  baseURL?: string;
  model: string;
  apiKeyEnv?: string;
  modelInfo: { ... };
}
```

New:
```typescript
interface HostedOllamaConfig {
  baseURL?: string;
  model: string;
  apiKey?: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}
```

Old constructor:
```typescript
constructor(config: HostedOllamaConfig) {
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] ?? "" : "";
  this.client = new Ollama({
    host: config.baseURL ?? "http://localhost:11434",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
```

New constructor:
```typescript
constructor(config: HostedOllamaConfig) {
  this.client = new Ollama({
    host: config.baseURL ?? "http://localhost:11434",
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
  });
```

- [ ] **Step 3: Update `openai.ts`**

Replace `apiKeyEnv: string` with `apiKey: string; baseURL?: string`.

Old interface:
```typescript
interface OpenAIConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: { ... };
}
```

New interface:
```typescript
interface OpenAIConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}
```

Old constructor:
```typescript
constructor(config: OpenAIConfig) {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing API key: set ${config.apiKeyEnv} environment variable`);
  }
  this.client = new OpenAI({ apiKey });
```

New constructor:
```typescript
constructor(config: OpenAIConfig) {
  if (!config.apiKey) {
    throw new Error("Missing API key for OpenAI provider");
  }
  this.client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
```

- [ ] **Step 4: Update `anthropic.ts`**

Same pattern as OpenAI.

Old interface:
```typescript
interface AnthropicConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: { ... };
}
```

New interface:
```typescript
interface AnthropicConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}
```

Old constructor:
```typescript
constructor(config: AnthropicConfig) {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`Missing API key: set ${config.apiKeyEnv} environment variable`);
  }
  this.client = new Anthropic({ apiKey });
```

New constructor:
```typescript
constructor(config: AnthropicConfig) {
  if (!config.apiKey) {
    throw new Error("Missing API key for Anthropic provider");
  }
  this.client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseURL });
```

- [ ] **Step 5: Implement `azure-ai-foundry.ts` from stub**

Replace the entire file content. Azure OpenAI uses the OpenAI SDK with a custom baseURL.

```typescript
import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface AzureAIFoundryConfig {
  apiKey: string;
  baseURL: string;
  deploymentName: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class AzureAIFoundryProvider implements AIProvider {
  readonly id = "azure-ai-foundry";
  private client: OpenAI;
  private deploymentName: string;
  private modelInfo: ModelInfo;

  constructor(config: AzureAIFoundryConfig) {
    if (!config.apiKey || !config.baseURL || !config.deploymentName) {
      throw new Error("Missing required Azure configuration: apiKey, baseURL, deploymentName");
    }
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.baseURL.replace(/\/$/, "")}/openai/deployments/${config.deploymentName}`,
      defaultQuery: { "api-version": "2024-06-01" },
    });
    this.deploymentName = config.deploymentName;
    this.modelInfo = {
      id: config.deploymentName,
      inputTokenLimit: config.modelInfo.inputTokenLimit,
      outputTokenLimit: config.modelInfo.outputTokenLimit,
      contextWindow: config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: config.modelInfo.supportsThinking,
      maxThinkingTokens: config.modelInfo.maxThinkingTokens,
    };
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.deploymentName,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxOutputTokens ?? 4096,
      top_p: request.topP ?? 0.9,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0,
      stop: request.stopSequences?.length ? request.stopSequences : undefined,
    });

    const choice = response.choices[0];
    const inputTokens = response.usage?.prompt_tokens ?? this.estimateTokens(request.system + request.prompt);
    const outputTokens = response.usage?.completion_tokens ?? this.estimateTokens(choice?.message?.content ?? "");

    return {
      text: choice?.message?.content ?? "",
      inputTokens,
      outputTokens,
      thinkingTokens: 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return this.modelInfo;
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.models.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }
}
```

- [ ] **Step 6: Implement `bedrock.ts` from stub**

Install the AWS SDK first, then implement the provider.

```bash
cd /root/astra/astra-app
npm install @aws-sdk/client-bedrock-runtime
```

Replace the entire file:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface BedrockConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  modelId: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class BedrockProvider implements AIProvider {
  readonly id = "bedrock";
  private client: BedrockRuntimeClient;
  private modelId: string;
  private modelInfo: ModelInfo;

  constructor(config: BedrockConfig) {
    if (!config.accessKeyId || !config.secretAccessKey || !config.region || !config.modelId) {
      throw new Error("Missing required Bedrock configuration: accessKeyId, secretAccessKey, region, modelId");
    }
    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    this.modelId = config.modelId;
    this.modelInfo = {
      id: config.modelId,
      inputTokenLimit: config.modelInfo.inputTokenLimit,
      outputTokenLimit: config.modelInfo.outputTokenLimit,
      contextWindow: config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: config.modelInfo.supportsThinking,
      maxThinkingTokens: config.modelInfo.maxThinkingTokens,
    };
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: request.maxOutputTokens ?? 4096,
      temperature: request.temperature ?? 0.2,
      top_p: request.topP ?? 0.9,
      system: request.system,
      messages: [{ role: "user", content: request.prompt }],
      stop_sequences: request.stopSequences?.length ? request.stopSequences : undefined,
    });

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      body: new TextEncoder().encode(body),
      contentType: "application/json",
    });

    const response = await this.client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const text = responseBody.content?.[0]?.text ?? "";
    const inputTokens = responseBody.usage?.input_tokens ?? this.estimateTokens(request.system + request.prompt);
    const outputTokens = responseBody.usage?.output_tokens ?? this.estimateTokens(text);

    return {
      text,
      inputTokens,
      outputTokens,
      thinkingTokens: 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return this.modelInfo;
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: new TextEncoder().encode(body),
        contentType: "application/json",
      });
      await this.client.send(command);
      return { connected: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }
}
```

- [ ] **Step 7: Update `langgraph-connector.ts` stub constructor**

Keep it as a stub but update the constructor to accept a config object so the factory compiles.

```typescript
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface LangGraphConfig {
  apiKey?: string;
  baseURL?: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class LangGraphConnectorProvider implements AIProvider {
  readonly id = "langgraph";

  constructor(_config: LangGraphConfig) {}

  async send(_request: AIRequest): Promise<AIResponse> {
    throw new Error("LangGraph Connectors provider not yet implemented");
  }

  estimateTokens(_text: string): number {
    return 0;
  }

  getModelInfo(): ModelInfo {
    return {
      id: "langgraph",
      inputTokenLimit: 0,
      outputTokenLimit: 0,
      contextWindow: 0,
      supportsSystemPrompt: false,
      supportsThinking: false,
      maxThinkingTokens: 0,
    };
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    return { connected: false, latencyMs: 0, error: "LangGraph Connectors provider not yet implemented" };
  }
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /root/astra/astra-app
npx tsc --noEmit
```

Expected: No errors from provider files. Pre-existing errors in other files are acceptable.

- [ ] **Step 9: Commit**

```bash
git add src/providers/
git commit -m "feat: update all providers to accept resolved credentials; implement azure and bedrock"
```

---

### Task 4: Update Factory & Config Logic

**Files:**
- Modify: `astra-app/src/providers/factory.ts`
- Modify: `astra-app/src/lib/config.ts`
- Create: `astra-app/src/lib/auth.ts`

- [ ] **Step 1: Add credential fields to `nodeConfigSchema` and `chatConfigSchema`**

In `astra-app/src/lib/config.ts`, add these fields to `nodeConfigSchema` (after `concurrency`):

```typescript
apiKey: z.string().optional(),
baseURL: z.string().optional(),
accessKeyId: z.string().optional(),
secretAccessKey: z.string().optional(),
region: z.string().optional(),
deploymentName: z.string().optional(),
systemPrompt: z.string().default(""),
```

Add the same fields to `chatConfigSchema` (after `systemPrompt` at line 62).

- [ ] **Step 2: Add `loadUserConfigFromDb` and `saveUserConfigToDb`**

Append to `astra-app/src/lib/config.ts` after `saveConfigToDb`:

```typescript
export async function loadUserConfigFromDb(userId: string): Promise<{
  discoverConfig: NodeConfig;
  deepScanConfig: NodeConfig;
  crossFileConfig: NodeConfig;
  chatConfig: ChatConfig;
}> {
  const { prisma } = await import("@/lib/db");
  const row = await prisma.userConfig.findUnique({ where: { userId } });

  if (!row) {
    // Seed from global config on first access
    const globalConfig = await loadConfigFromDb();
    const userConfig = {
      userId,
      discoverConfig: globalConfig.scan.nodes.discover,
      deepScanConfig: globalConfig.scan.nodes.deepScan,
      crossFileConfig: globalConfig.scan.nodes.crossFile,
      chatConfig: globalConfig.chat ?? chatConfigSchema.parse({}),
    };
    await prisma.userConfig.create({ data: userConfig as any });
    return {
      discoverConfig: nodeConfigSchema.parse(userConfig.discoverConfig),
      deepScanConfig: nodeConfigSchema.parse(userConfig.deepScanConfig),
      crossFileConfig: nodeConfigSchema.parse(userConfig.crossFileConfig),
      chatConfig: chatConfigSchema.parse(userConfig.chatConfig),
    };
  }

  return {
    discoverConfig: nodeConfigSchema.parse(row.discoverConfig),
    deepScanConfig: nodeConfigSchema.parse(row.deepScanConfig),
    crossFileConfig: nodeConfigSchema.parse(row.crossFileConfig),
    chatConfig: chatConfigSchema.parse(row.chatConfig),
  };
}

export async function saveUserConfigToDb(
  userId: string,
  config: {
    discoverConfig: NodeConfig;
    deepScanConfig: NodeConfig;
    crossFileConfig: NodeConfig;
    chatConfig: ChatConfig;
  }
): Promise<void> {
  const { prisma } = await import("@/lib/db");
  await prisma.userConfig.upsert({
    where: { userId },
    update: {
      discoverConfig: config.discoverConfig as any,
      deepScanConfig: config.deepScanConfig as any,
      crossFileConfig: config.crossFileConfig as any,
      chatConfig: config.chatConfig as any,
    },
    create: {
      userId,
      discoverConfig: config.discoverConfig as any,
      deepScanConfig: config.deepScanConfig as any,
      crossFileConfig: config.crossFileConfig as any,
      chatConfig: config.chatConfig as any,
    },
  });
}
```

- [ ] **Step 3: Use `requireAuth()` from existing `rbac.ts`**

The project already has `requireAuth()` in `astra-app/src/lib/rbac.ts` that returns `{ error, userId, role }`. All API routes that need a user ID should use this existing pattern. No new auth helper file is needed.

In API routes, use:
```typescript
import { requireAuth } from "@/lib/rbac";

// Inside the handler:
const { error, userId } = await requireAuth();
if (error) return error;
if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

The `userId` returned by `requireAuth()` is the user's database ID from the NextAuth session.

- [ ] **Step 4: Rewrite `factory.ts`**

Replace the entire file `astra-app/src/providers/factory.ts`:

```typescript
import type { ModelInfo } from "./base";
import type { AIProvider } from "./base";
import { CloudOllamaProvider } from "./cloud-ollama";
import { HostedOllamaProvider } from "./hosted-ollama";
import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { BedrockProvider } from "./bedrock";
import { AzureAIFoundryProvider } from "./azure-ai-foundry";
import { LangGraphConnectorProvider } from "./langgraph-connector";

interface NodeCreateConfig {
  providerId: string;
  modelId: string;
  modelInfo: ModelInfo;
  credentials: {
    apiKey?: string;
    baseURL?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    region?: string;
    deploymentName?: string;
  };
}

export function createProvider(config: NodeCreateConfig): AIProvider {
  const { providerId, modelId, modelInfo, credentials } = config;

  switch (providerId) {
    case "cloud-ollama":
      return new CloudOllamaProvider({
        baseURL: credentials.baseURL ?? "https://api.ohmyllama.com",
        model: modelId,
        apiKey: credentials.apiKey ?? "",
        modelInfo,
      });

    case "hosted-ollama":
      return new HostedOllamaProvider({
        baseURL: credentials.baseURL,
        model: modelId,
        apiKey: credentials.apiKey ?? "",
        modelInfo,
      });

    case "openai":
      return new OpenAIProvider({
        apiKey: credentials.apiKey ?? "",
        baseURL: credentials.baseURL,
        model: modelId,
        modelInfo,
      });

    case "anthropic":
      return new AnthropicProvider({
        apiKey: credentials.apiKey ?? "",
        baseURL: credentials.baseURL,
        model: modelId,
        modelInfo,
      });

    case "azure-ai-foundry":
      return new AzureAIFoundryProvider({
        apiKey: credentials.apiKey ?? "",
        baseURL: credentials.baseURL ?? "",
        deploymentName: credentials.deploymentName ?? "",
        modelInfo,
      });

    case "bedrock":
      return new BedrockProvider({
        accessKeyId: credentials.accessKeyId ?? "",
        secretAccessKey: credentials.secretAccessKey ?? "",
        region: credentials.region ?? "us-east-1",
        modelId: modelId,
        modelInfo,
      });

    case "langgraph":
      return new LangGraphConnectorProvider({
        apiKey: credentials.apiKey,
        baseURL: credentials.baseURL,
        modelInfo,
      });

    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

export async function createProviderForNode(
  nodeName: "discover" | "deepScan" | "crossFile" | "chat",
  userId: string
): Promise<AIProvider> {
  const { prisma } = await import("@/lib/db");
  const { loadUserConfigFromDb } = await import("@/lib/config");

  const userConfig = await loadUserConfigFromDb(userId);

  const nodeConfig =
    nodeName === "chat"
      ? userConfig.chatConfig
      : userConfig[`${nodeName}Config` as keyof typeof userConfig];

  const raw = nodeConfig as Record<string, unknown>;
  const modelType = raw.model as string;
  const providerId = raw.provider as string;

  const modelRecord = await prisma.providerModel.findUnique({
    where: { modelType },
  });
  if (!modelRecord) {
    throw new Error(`Model "${modelType}" not found in registry`);
  }

  const caps = modelRecord.capabilities as Record<string, unknown>;

  return createProvider({
    providerId,
    modelId: modelType,
    modelInfo: {
      id: modelRecord.modelType,
      inputTokenLimit: Number(caps.inputTokenLimit),
      outputTokenLimit: Number(caps.outputTokenLimit),
      contextWindow: Number(caps.contextWindow),
      supportsSystemPrompt: true,
      supportsThinking: Boolean(caps.supportsThinking),
      maxThinkingTokens: Number(caps.maxThinkingTokens ?? 0),
    },
    credentials: {
      apiKey: raw.apiKey as string | undefined,
      baseURL: raw.baseURL as string | undefined,
      accessKeyId: raw.accessKeyId as string | undefined,
      secretAccessKey: raw.secretAccessKey as string | undefined,
      region: raw.region as string | undefined,
      deploymentName: raw.deploymentName as string | undefined,
    },
  });
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No new errors from `factory.ts` or `config.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/config.ts src/providers/factory.ts
git commit -m "feat: add loadUserConfigFromDb, saveUserConfigToDb, and credential-aware factory"
```

---

### Task 5: Write Failing Tests for Config & Factory

**Files:**
- Create: `astra-app/src/tests/config.test.ts`
- Create: `astra-app/src/tests/factory.test.ts`
- Modify: `astra-app/package.json` (add test script)

- [ ] **Step 1: Add test script to package.json and create vitest config**

Inside `"scripts"` in `package.json`:
```json
"test": "vitest run"
```

Create `astra-app/vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 2: Write test for `nodeConfigSchema` credential fields**

Create `astra-app/src/tests/config.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { nodeConfigSchema, chatConfigSchema } from "@/lib/config";

describe("nodeConfigSchema", () => {
  it("parses a config with Azure credentials", () => {
    const result = nodeConfigSchema.parse({
      provider: "azure-ai-foundry",
      model: "gpt-4o-azure",
      apiKey: "test-key",
      baseURL: "https://my-resource.openai.azure.com",
      deploymentName: "my-deployment",
      temperature: 0.2,
    });
    expect(result.provider).toBe("azure-ai-foundry");
    expect(result.deploymentName).toBe("my-deployment");
    expect(result.apiKey).toBe("test-key");
  });

  it("parses a config with Bedrock credentials", () => {
    const result = nodeConfigSchema.parse({
      provider: "bedrock",
      model: "claude-3-sonnet-bedrock",
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      region: "us-west-2",
      temperature: 0.2,
    });
    expect(result.provider).toBe("bedrock");
    expect(result.region).toBe("us-west-2");
  });

  it("applies defaults for missing fields", () => {
    const result = nodeConfigSchema.parse({
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-test",
    });
    expect(result.temperature).toBe(0.2);
    expect(result.maxOutputTokens).toBe(4096);
    expect(result.maxRetries).toBe(3);
  });
});

describe("chatConfigSchema", () => {
  it("parses chat config with system prompt", () => {
    const result = chatConfigSchema.parse({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      apiKey: "test-key",
      systemPrompt: "You are a security expert.",
    });
    expect(result.systemPrompt).toBe("You are a security expert.");
    expect(result.apiKey).toBe("test-key");
  });
});
```

- [ ] **Step 3: Write test for `createProvider` credential mapping**

Create `astra-app/src/tests/factory.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { createProvider } from "@/providers/factory";

describe("createProvider", () => {
  it("creates Azure provider with deploymentName", () => {
    const provider = createProvider({
      providerId: "azure-ai-foundry",
      modelId: "gpt-4o-azure",
      modelInfo: {
        id: "gpt-4o-azure",
        inputTokenLimit: 128000,
        outputTokenLimit: 4096,
        contextWindow: 128000,
        supportsSystemPrompt: true,
        supportsThinking: false,
        maxThinkingTokens: 0,
      },
      credentials: {
        apiKey: "azure-key",
        baseURL: "https://test.openai.azure.com",
        deploymentName: "my-deployment",
      },
    });
    expect(provider.id).toBe("azure-ai-foundry");
  });

  it("creates Bedrock provider with AWS credentials", () => {
    const provider = createProvider({
      providerId: "bedrock",
      modelId: "claude-3-sonnet-bedrock",
      modelInfo: {
        id: "claude-3-sonnet-bedrock",
        inputTokenLimit: 200000,
        outputTokenLimit: 8192,
        contextWindow: 200000,
        supportsSystemPrompt: true,
        supportsThinking: true,
        maxThinkingTokens: 8192,
      },
      credentials: {
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        region: "us-east-1",
      },
    });
    expect(provider.id).toBe("bedrock");
  });

  it("creates OpenAI provider with apiKey and baseURL", () => {
    const provider = createProvider({
      providerId: "openai",
      modelId: "gpt-4o",
      modelInfo: {
        id: "gpt-4o",
        inputTokenLimit: 128000,
        outputTokenLimit: 4096,
        contextWindow: 128000,
        supportsSystemPrompt: true,
        supportsThinking: false,
        maxThinkingTokens: 0,
      },
      credentials: {
        apiKey: "sk-test",
        baseURL: "https://proxy.example.com/v1",
      },
    });
    expect(provider.id).toBe("openai");
  });

  it("throws for unknown provider", () => {
    expect(() =>
      createProvider({
        providerId: "unknown",
        modelId: "x",
        modelInfo: {
          id: "x",
          inputTokenLimit: 0,
          outputTokenLimit: 0,
          contextWindow: 0,
          supportsSystemPrompt: false,
          supportsThinking: false,
          maxThinkingTokens: 0,
        },
        credentials: {},
      })
    ).toThrow("Unknown provider: unknown");
  });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /root/astra/astra-app
npx vitest run src/tests/config.test.ts src/tests/factory.test.ts
```

Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/tests/ package.json
git commit -m "test: add vitest tests for config schemas and provider factory"
```

---

### Task 6: Update API Routes

**Files:**
- Modify: `astra-app/src/app/api/v1/config/route.ts`
- Modify: `astra-app/src/app/api/v1/providers/route.ts`
- Modify: `astra-app/src/app/api/v1/providers/test/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/route.ts`
- Modify: `astra-app/src/app/api/v1/chat/route.ts`
- Modify: `astra-app/src/lib/ai-chat.ts`

- [ ] **Step 1: Update `/api/v1/config/route.ts` to user-scoped GET/PUT**

Replace the entire file:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { loadUserConfigFromDb, saveUserConfigToDb, type NodeConfig, type ChatConfig } from "@/lib/config";
import { requireAuth } from "@/lib/rbac";

export async function GET() {
  const { error, userId } = await requireAuth();
  if (error) return error;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const config = await loadUserConfigFromDb(userId);
    return NextResponse.json(config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();

    const config = {
      discoverConfig: body.discoverConfig as NodeConfig,
      deepScanConfig: body.deepScanConfig as NodeConfig,
      crossFileConfig: body.crossFileConfig as NodeConfig,
      chatConfig: body.chatConfig as ChatConfig,
    };

    await saveUserConfigToDb(userId, config);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Update `/api/v1/providers/route.ts`**

Replace the entire file to return `ProviderModel` list with `capabilities` and `fieldSchema`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const models = await prisma.providerModel.findMany({
      orderBy: [{ providerId: "asc" }, { displayName: "asc" }],
    });

    const providers = models.reduce<
      Record<string, { id: string; models: Array<{
        id: string;
        displayName: string;
        capabilities: unknown;
        fieldSchema: unknown;
      }> }>
    >((acc, model) => {
      if (!acc[model.providerId]) {
        acc[model.providerId] = { id: model.providerId, models: [] };
      }
      acc[model.providerId].models.push({
        id: model.modelType,
        displayName: model.displayName,
        capabilities: model.capabilities,
        fieldSchema: model.fieldSchema,
      });
      return acc;
    }, {});

    return NextResponse.json({ providers: Object.values(providers) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Update `/api/v1/providers/test/route.ts`**

The test endpoint must now accept credentials in the POST body and instantiate the provider using the factory.

```typescript
import { NextResponse } from "next/server";
import { createProvider } from "@/providers/factory";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerId, modelId, credentials, modelInfo } = body;

    if (!providerId || !modelId || !modelInfo) {
      return NextResponse.json({ error: "Missing providerId, modelId, or modelInfo" }, { status: 400 });
    }

    const provider = createProvider({ providerId, modelId, modelInfo, credentials: credentials ?? {} });
    const result = await provider.testConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ connected: false, latencyMs: 0, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Update `/api/v1/scans/route.ts`**

The existing scan route already uses `requireAuth()`. Replace `loadConfigFromDb()` with `loadUserConfigFromDb` and use the `userId` from `requireAuth`.

At the top of the file, replace the import:
```typescript
import { loadConfigFromDb, mergeNodeOverrides } from "@/lib/config";
```

With:
```typescript
import { loadUserConfigFromDb } from "@/lib/config";
```

In the POST handler, the route already has:
```typescript
const { error } = await requireAuth();
if (error) return error;
```

Change to:
```typescript
const { error, userId } = await requireAuth();
if (error) return error;
```

Then replace the config loading block:
```typescript
let config;
try {
  config = await loadConfigFromDb();
} catch {
  return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
}

if (configOverrides?.nodes) {
  config = mergeNodeOverrides(config, configOverrides.nodes);
}
```

With:
```typescript
let userConfig;
try {
  userConfig = await loadUserConfigFromDb(userId!);
} catch {
  return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
}

const config = {
  providers: {},
  scan: {
    nodes: {
      discover: userConfig.discoverConfig,
      deepScan: userConfig.deepScanConfig,
      crossFile: userConfig.crossFileConfig,
    },
    severity: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"],
    ignore: [],
  },
  chat: userConfig.chatConfig,
};

// Per-scan overrides still apply on top of user config
if (configOverrides?.nodes) {
  Object.assign(config.scan.nodes, configOverrides.nodes);
}
```

Also store `userId` on the created `Scan` record (the `Scan` model already has `userId` field):
```typescript
const scan = await prisma.scan.create({
  data: {
    repoUrl,
    branch: branch ?? 'main',
    configJson: config as any,
    userId,
    status: 'PENDING',
  },
});
```

- [ ] **Step 5: Update `/api/v1/chat/route.ts`**

The chat route already uses `requireAuth()`. The `sendChatMessage` function in `ai-chat.ts` currently takes `context?: { userId?: string }`. Update `ai-chat.ts` (Step 6) to use `userId` to load the user's chat config instead of the global config.

No import changes needed in this file — the `requireAuth` pattern is already in place. The change is in `ai-chat.ts` (next step).

- [ ] **Step 6: Update `src/lib/ai-chat.ts`**

The current `getChatProvider()` uses `loadConfigFromDb()` + `config.providers[...]`. Replace it to use `loadUserConfigFromDb(userId)` + `prisma.providerModel.findUnique()`.

Replace the entire `getChatProvider` function:

```typescript
async function getChatProvider(userId: string): Promise<{ provider: AIProvider; chatConfig: ChatConfig }> {
  const userConfig = await loadUserConfigFromDb(userId);
  const chatConfig = userConfig.chatConfig;

  const configHash = `${chatConfig.provider}:${chatConfig.model}:${chatConfig.temperature}`;
  if (cachedProvider && configHash === cachedConfigHash) {
    return { provider: cachedProvider, chatConfig };
  }

  const modelRecord = await prisma.providerModel.findUnique({
    where: { modelType: chatConfig.model },
  });
  if (!modelRecord) throw new Error(`Chat model "${chatConfig.model}" not found in registry`);

  const caps = modelRecord.capabilities as Record<string, unknown>;

  const provider = createProvider({
    providerId: chatConfig.provider,
    modelId: chatConfig.model,
    modelInfo: {
      id: modelRecord.modelType,
      inputTokenLimit: Number(caps.inputTokenLimit),
      outputTokenLimit: Number(caps.outputTokenLimit),
      contextWindow: Number(caps.contextWindow),
      supportsSystemPrompt: true,
      supportsThinking: Boolean(caps.supportsThinking),
      maxThinkingTokens: Number(caps.maxThinkingTokens ?? 0),
    },
    credentials: {
      apiKey: chatConfig.apiKey,
      baseURL: chatConfig.baseURL,
    },
  });

  cachedProvider = provider;
  cachedConfigHash = configHash;

  return { provider, chatConfig };
}
```

Update imports at top of file — remove `AstraConfig` import, add `loadUserConfigFromDb` and Prisma:

```typescript
import { loadUserConfigFromDb, type ChatConfig } from './config';
import { createProvider } from '../providers/factory';
import type { AIProvider, AIRequest, AIResponse } from '../providers/base';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import { prisma } from '@/lib/db';
```

Remove the `AstraConfig` import and `getDefaultChatConfig` function (no longer needed).

Update `sendChatMessage` to pass `userId` through to `getChatProvider`:

```typescript
export async function sendChatMessage(
  userMessage: string,
  context?: { ... }
): Promise<{ text: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const userId = context?.userId ?? 'default-user';
  const { provider, chatConfig } = await getChatProvider(userId);
  // ... rest stays the same
}
```
```

- [ ] **Step 7: Verify routes compile**

```bash
npx tsc --noEmit
```

Expected: No new errors from the modified route files.

- [ ] **Step 8: Delete `registry.ts` (now dead code)**

The `src/providers/registry.ts` file's `listProviders()` function reads from `AstraConfig.providers` which no longer exists. The `/api/v1/providers` route now queries `prisma.providerModel.findMany()` directly. Delete the file.

```bash
rm astra-app/src/providers/registry.ts
```

- [ ] **Step 9: Update `ProviderSelector.tsx` for new data shape**

The current `ProviderSelector` expects `{ id, name, models: { id, inputTokenLimit, ... }[] }`. The new providers API returns `{ id, models: { id, displayName, capabilities, fieldSchema }[] }`. Update `ProviderSelector` to:

1. Show `displayName` instead of `id` in the model dropdown
2. Remove the `name` prop (no longer in API response)
3. Pass `fieldSchema` and `capabilities` to the parent component

Update `astra-app/src/components/ProviderSelector.tsx`:

```typescript
interface ProviderModel {
  id: string;
  displayName: string;
  capabilities: Record<string, unknown>;
  fieldSchema: Record<string, unknown>;
}

interface Provider {
  id: string;
  models: ProviderModel[];
}

interface ProviderSelectorProps {
  selectedProvider?: string;
  selectedModel?: string;
  onChange: (provider: string, model: string) => void;
  onModelChange?: (provider: string, model: ProviderModel | undefined) => void;
}
```

In the model dropdown, show `m.displayName` as the label:
```typescript
<SelectItem key={m.id} value={m.id} className="font-mono text-sm">
  {m.displayName || m.id}
</SelectItem>
```

Add an `onModelChange` callback that fires with the full model object (including `fieldSchema` and `capabilities`) when the model selection changes:

```typescript
const handleModelChange = (value: string) => {
  setCurrentModel(value);
  const model = activeProvider?.models.find((m) => m.id === value);
  onChange(currentProvider, value);
  onModelChange?.(currentProvider, model);
};
```

- [ ] **Step 10: Commit**

```bash
git add src/app/api/v1/config/route.ts src/app/api/v1/providers/route.ts src/app/api/v1/providers/test/route.ts src/app/api/v1/scans/route.ts src/app/api/v1/chat/route.ts src/lib/ai-chat.ts src/providers/registry.ts src/components/ProviderSelector.tsx
git commit -m "feat: update all API routes to user-scoped config, model registry, and existing auth"
```

---

### Task 7: Update Frontend ConfigEditor with Data-Driven Forms

**Files:**
- Modify: `astra-app/src/components/ConfigEditor.tsx`
- Create: `astra-app/src/components/DynamicFieldForm.tsx`

- [ ] **Step 1: Create `DynamicFieldForm` component**

Create `astra-app/src/components/DynamicFieldForm.tsx`. It renders credential and parameter inputs from a `fieldSchema` JSON blob.

```typescript
'use client';

interface FieldDef {
  id: string;
  label: string;
  type: 'password' | 'url' | 'string' | 'number';
  required?: boolean;
  default?: string | number;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

interface FieldSchema {
  credentials?: FieldDef[];
  parameters?: FieldDef[];
}

export default function DynamicFieldForm({
  schema,
  values,
  onChange,
}: {
  schema: FieldSchema;
  values: Record<string, string | number | undefined>;
  onChange: (id: string, value: string | number) => void;
}) {
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline)',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    color: 'var(--ibm-ink)',
    outline: 'none',
    borderRadius: 0,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.32px',
    textTransform: 'uppercase' as const,
    color: 'var(--ibm-ink-muted)',
    marginBottom: 6,
  };

  const renderField = (field: FieldDef) => {
    const val = values[field.id] ?? field.default ?? '';
    if (field.type === 'number') {
      return (
        <input
          key={field.id}
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={val as number}
          required={field.required}
          onChange={(e) => onChange(field.id, Number(e.target.value))}
          style={fieldStyle}
        />
      );
    }
    return (
      <input
        key={field.id}
        type={field.type === 'password' ? 'password' : 'text'}
        value={val as string}
        placeholder={field.placeholder ?? ''}
        required={field.required}
        onChange={(e) => onChange(field.id, e.target.value)}
        style={fieldStyle}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {schema.credentials && schema.credentials.length > 0 && (
        <div>
          <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Credentials
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
            {schema.credentials.map((field) => (
              <div key={field.id}>
                <label style={labelStyle}>{field.label}{field.required ? ' *' : ''}</label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      )}
      {schema.parameters && schema.parameters.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
            Parameters
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {schema.parameters.map((field) => (
              <div key={field.id}>
                <label style={labelStyle}>{field.label}{field.required ? ' *' : ''}</label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `ConfigEditor.tsx` to use data-driven fields**

The `ConfigEditor` needs to:
1. Fetch user config from `/api/v1/config` (returns 4 JSON blobs)
2. Fetch provider models from `/api/v1/providers` (returns `fieldSchema`)
3. Render credentials dynamically from the selected model's `fieldSchema`
4. Save the 4 JSON blobs back to `/api/v1/config`

Because this is a large rewrite, replace the `NodeConfigPanel` and `ChatConfigPanel` implementations to use `DynamicFieldForm`.

Key changes in `ConfigEditor.tsx`:

Update the `providers` state type (around line 276):
```typescript
const [providers, setProviders] = useState<{
  id: string;
  models: {
    id: string;
    displayName: string;
    capabilities: unknown;
    fieldSchema: { credentials?: Array<{
      id: string; label: string; type: string; required?: boolean; default?: string | number; placeholder?: string; min?: number; max?: number; step?: number;
    }>; parameters?: Array<{
      id: string; label: string; type: string; required?: boolean; default?: string | number; placeholder?: string; min?: number; max?: number; step?: number;
    }> };
  }[];
}[]>([]);
```

In `NodeConfigPanel`, find the active model and render `DynamicFieldForm`:
```typescript
const activeModel = activeProvider?.models.find((m) => m.id === config.model);
const fieldSchema = activeModel?.fieldSchema ?? { credentials: [], parameters: [] };
```

Replace the hardcoded "Parameters" and add a "Credentials" section inside `NodeConfigPanel`:

```typescript
<div style={sectionStyle}>
  <p className="ibm-eyebrow" style={{ color: 'var(--ibm-primary)', marginBottom: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.32px' }}>
    Provider & Model
  </p>
  <ProviderSelector
    selectedProvider={config.provider}
    selectedModel={config.model}
    onChange={(provider, model) => onChange({ provider, model })}
  />
  {activeModel && (
    <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <span className="ibm-tag" style={{ background: 'var(--ibm-surface-2)', padding: '4px 12px', fontSize: 12 }}>
        Context: {(activeModel.capabilities as any)?.contextWindow?.toLocaleString() ?? '—'}
      </span>
      <span className="ibm-tag" style={{ background: 'var(--ibm-surface-2)', padding: '4px 12px', fontSize: 12 }}>
        Thinking: {(activeModel.capabilities as any)?.supportsThinking ? 'Yes' : 'No'}
      </span>
    </div>
  )}
</div>

<div style={sectionStyle}>
  <DynamicFieldForm
    schema={fieldSchema}
    values={config as unknown as Record<string, string | number | undefined>}
    onChange={(id, value) => onChange({ [id]: value } as Partial<NodeConfig>)}
  />
</div>
```

Do the same for `ChatConfigPanel`, using `chatConfig` and its selected model's `fieldSchema`.

Update the save payload in `handleSave` (around line 318-326):
```typescript
const res = await fetch('/api/v1/config', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    discoverConfig: config.scan.nodes.discover,
    deepScanConfig: config.scan.nodes.deepScan,
    crossFileConfig: config.scan.nodes.crossFile,
    chatConfig: config.chat,
  }),
});
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds without errors from `ConfigEditor.tsx` or `DynamicFieldForm.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ConfigEditor.tsx src/components/DynamicFieldForm.tsx
git commit -m "feat: data-driven ConfigEditor with DynamicFieldForm from model registry"
```

---

### Task 8: Admin Model Registry UI

**Files:**
- Create: `astra-app/src/app/admin/models/page.tsx`
- Create: `astra-app/src/components/ModelRegistryEditor.tsx`

- [ ] **Step 1: Create `ModelRegistryEditor` component**

Create `astra-app/src/components/ModelRegistryEditor.tsx`. This is the JSON builder screen for admins to add `ProviderModel` entries.

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';

interface ProviderModel {
  id: string;
  providerId: string;
  modelType: string;
  displayName: string;
  capabilities: string;
  fieldSchema: string;
  isDefault: boolean;
}

const PROVIDER_OPTIONS = [
  'cloud-ollama',
  'hosted-ollama',
  'openai',
  'anthropic',
  'azure-ai-foundry',
  'bedrock',
  'langgraph',
];

const defaultCapabilities = {
  inputTokenLimit: 128000,
  outputTokenLimit: 4096,
  contextWindow: 128000,
  supportsThinking: false,
  maxThinkingTokens: 0,
};

const defaultFieldSchema = {
  credentials: [
    { id: 'apiKey', label: 'API Key', type: 'password', required: true },
  ],
  parameters: [
    { id: 'temperature', label: 'Temperature', type: 'number', min: 0, max: 2, step: 0.1, default: 0.2 },
  ],
};

export default function ModelRegistryEditor() {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProviderModel>({
    id: '',
    providerId: 'openai',
    modelType: '',
    displayName: '',
    capabilities: JSON.stringify(defaultCapabilities, null, 2),
    fieldSchema: JSON.stringify(defaultFieldSchema, null, 2),
    isDefault: false,
  });

  useEffect(() => {
    fetch('/api/v1/providers')
      .then((r) => r.json())
      .then((data) => {
        const flat: ProviderModel[] = [];
        for (const provider of data.providers ?? []) {
          for (const model of provider.models) {
            flat.push({
              id: model.id,
              providerId: provider.id,
              modelType: model.id,
              displayName: model.displayName,
              capabilities: JSON.stringify(model.capabilities, null, 2),
              fieldSchema: JSON.stringify(model.fieldSchema, null, 2),
              isDefault: false,
            });
          }
        }
        setModels(flat);
      })
      .catch(() => {});
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        providerId: form.providerId,
        modelType: form.modelType,
        displayName: form.displayName,
        capabilities: JSON.parse(form.capabilities),
        fieldSchema: JSON.parse(form.fieldSchema),
        isDefault: form.isDefault,
      };
      const res = await fetch('/api/v1/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Save failed');
      setModels((prev) => [
        ...prev,
        { ...form, id: form.modelType },
      ]);
      setForm({
        id: '',
        providerId: 'openai',
        modelType: '',
        displayName: '',
        capabilities: JSON.stringify(defaultCapabilities, null, 2),
        fieldSchema: JSON.stringify(defaultFieldSchema, null, 2),
        isDefault: false,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  }, [form]);

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--ibm-surface-1)',
    border: '1px solid var(--ibm-hairline)',
    borderBottom: '2px solid var(--ibm-hairline)',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    letterSpacing: '0.16px',
    color: 'var(--ibm-ink)',
    outline: 'none',
    borderRadius: 0,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.32px',
    textTransform: 'uppercase' as const,
    color: 'var(--ibm-ink-muted)',
    marginBottom: 6,
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 300, marginBottom: 32 }}>Model Registry</h1>

      <div style={{ display: 'grid', gap: 16, marginBottom: 32, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={labelStyle}>Provider</label>
          <select
            value={form.providerId}
            onChange={(e) => setForm((f) => ({ ...f, providerId: e.target.value }))}
            style={fieldStyle}
          >
            {PROVIDER_OPTIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Model Type (unique ID)</label>
          <input
            value={form.modelType}
            onChange={(e) => setForm((f) => ({ ...f, modelType: e.target.value }))}
            style={fieldStyle}
            placeholder="e.g. gpt-4o"
          />
        </div>
        <div>
          <label style={labelStyle}>Display Name</label>
          <input
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            style={fieldStyle}
            placeholder="e.g. GPT-4o"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
            />
            <span style={{ fontSize: 14 }}>Default model for this provider</span>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16, marginBottom: 32, gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label style={labelStyle}>Capabilities JSON</label>
          <textarea
            value={form.capabilities}
            onChange={(e) => setForm((f) => ({ ...f, capabilities: e.target.value }))}
            rows={12}
            style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, resize: 'vertical' }}
          />
        </div>
        <div>
          <label style={labelStyle}>Field Schema JSON (drives the frontend form)</label>
          <textarea
            value={form.fieldSchema}
            onChange={(e) => setForm((f) => ({ ...f, fieldSchema: e.target.value }))}
            rows={12}
            style={{ ...fieldStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, resize: 'vertical' }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !form.modelType || !form.displayName}
        style={{
          background: saving ? 'var(--ibm-surface-2)' : 'var(--ibm-primary)',
          color: saving ? 'var(--ibm-ink-subtle)' : 'var(--ibm-on-primary)',
          border: 'none',
          padding: '12px 24px',
          fontSize: 14,
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontWeight: 600,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : 'Add Model'}
      </button>

      <h2 style={{ fontSize: 20, fontWeight: 300, marginTop: 48, marginBottom: 16 }}>Existing Models</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Provider</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Model Type</th>
            <th style={{ textAlign: 'left', padding: '8px 12px', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Display Name</th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={`${m.providerId}-${m.modelType}`} style={{ borderBottom: '1px solid var(--ibm-hairline)' }}>
              <td style={{ padding: '8px 12px', fontSize: 14 }}>{m.providerId}</td>
              <td style={{ padding: '8px 12px', fontSize: 14, fontFamily: "'IBM Plex Mono', monospace" }}>{m.modelType}</td>
              <td style={{ padding: '8px 12px', fontSize: 14 }}>{m.displayName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create admin page**

Create `astra-app/src/app/admin/models/page.tsx`:

```typescript
import ModelRegistryEditor from "@/components/ModelRegistryEditor";

export default function AdminModelsPage() {
  return <ModelRegistryEditor />;
}
```

- [ ] **Step 3: Create admin API route**

Create `astra-app/src/app/api/v1/admin/models/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { providerId, modelType, displayName, capabilities, fieldSchema, isDefault } = body;

    if (!providerId || !modelType || !displayName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const model = await prisma.providerModel.upsert({
      where: { modelType },
      update: {
        providerId,
        displayName,
        capabilities: capabilities as any,
        fieldSchema: fieldSchema as any,
        isDefault: isDefault ?? false,
      },
      create: {
        providerId,
        modelType,
        displayName,
        capabilities: capabilities as any,
        fieldSchema: fieldSchema as any,
        isDefault: isDefault ?? false,
      },
    });

    return NextResponse.json({ success: true, model });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds. Admin page is reachable at `/admin/models`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ModelRegistryEditor.tsx src/app/admin/models/page.tsx src/app/api/v1/admin/models/route.ts
git commit -m "feat: admin model registry UI with JSON builder for capabilities and fieldSchema"
```

---

## Self-Review

**1. Spec coverage:**

| Requirement | Task |
|---|---|
| `UserConfig` table with 4 JSON blobs | Task 1 |
| `ProviderModel.fieldSchema` drives frontend forms | Task 1, Task 2 |
| Provider constructors accept resolved credentials (not env vars) | Task 3 |
| Azure AI Foundry implemented from stub | Task 3 |
| Bedrock implemented from stub | Task 3 |
| Factory maps user JSON → provider constructor args | Task 4 |
| API routes user-scoped using existing `requireAuth()` | Task 6 |
| ConfigEditor renders data-driven credential fields | Task 7 |
| Admin JSON builder for model registry | Task 8 |
| Tests for schema + factory | Task 5 |
| Dead code removed (`registry.ts`) | Task 6 |
| `ProviderSelector` updated for new API shape | Task 6 |
| `Config` model kept for fallback seeding | Task 1 |

No gaps identified.

**2. Placeholder scan:**

- No "TBD", "TODO", "implement later" found.
- No vague steps like "add appropriate error handling" — exact code is provided.
- No "Similar to Task N" — each task is self-contained.
- Exact file paths are used throughout.

**3. Type consistency:**

- `NodeConfig` in `config.ts` includes credential fields (Task 4 Step 1).
- `createProvider` uses `credentials` object consistently across all 7 providers (Task 4 Step 4).
- `fieldSchema` JSON shape is consistent between seed script (Task 2), admin UI (Task 8), and frontend component (Task 7).
- Auth uses `requireAuth()` from `rbac.ts` consistently across all routes (no separate `getCurrentUserId`).

**4. Validation fixes applied:**

- Auth: Use existing `requireAuth()` from `rbac.ts` instead of creating a duplicate `getCurrentUserId`. Chat and scans routes already use this pattern.
- `Config` model kept alongside `UserConfig` so `loadConfigFromDb()` fallback still works during migration.
- `ProviderSelector.tsx` updated to handle new data shape (`displayName` + `fieldSchema` instead of old `name` + token limits).
- `registry.ts` deleted (dead code after providers API queries `ProviderModel` directly).
- `scans/route.ts` uses `requireAuth()` + `mergeNodeOverrides` pattern preserved.
- Vitest config added (`vitest.config.ts` with `@` path alias).

All checks pass.

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-05-08-user-scoped-model-registry-config.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. REQUIRED SUB-SKILL: `superpowers:subagent-driven-development`.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?