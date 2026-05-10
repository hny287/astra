# Streaming Chat Design

**Date:** 2026-05-07
**Version:** 2.4.0
**Status:** Approved

## Context

All three chat endpoints (org, scan, finding) currently return complete responses after a single `await`. The UI shows a static "Thinking..." indicator, then replaces it with the full response. This feels slow even when the model is actively generating tokens.

## Decision

Add typewriter-style streaming to all chat contexts using Approach A: `sendStream()` on `AIProvider` + SSE endpoints + ReadableStream consumption in the UI.

## Scope

- **All three chat contexts**: org, scan, finding
- **All providers**: cloud-ollama, hosted-ollama, openai, anthropic get real streaming; bedrock, azure-ai-foundry, langgraph (stubs) fall back to single-chunk yield
- **UI**: Both `AiChatProvider` (global sidebar) and `ScanChat` (inline scan chat) get typewriter rendering

## Architecture

### 1. Provider Layer — `sendStream()` on `AIProvider`

Add to `src/providers/base.ts`:

```ts
export type StreamChunk =
  | { type: 'text'; content: string }
  | { type: 'thinking'; content: string }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'done'; durationMs: number };

export interface AIProvider {
  id: string;
  send(request: AIRequest): Promise<AIResponse>;
  sendStream(request: AIRequest): AsyncGenerator<StreamChunk>;  // NEW
  estimateTokens(text: string): number;
  getModelInfo(): ModelInfo;
  testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }>;
}
```

Each provider implements `sendStream`:

| Provider | Implementation |
|---|---|
| cloud-ollama | `ollama.generate({ stream: true })` — yield `text` chunks, emit `usage` + `done` |
| hosted-ollama | Same as cloud-ollama |
| openai | `client.chat.completions.create({ stream: true })` — yield delta content chunks |
| anthropic | `client.messages.stream()` — yield text + thinking blocks |
| bedrock (stub) | Fallback: call `send()` internally, yield single `text` chunk, then `usage` + `done` |
| azure-ai-foundry (stub) | Fallback: same pattern |
| langgraph (stub) | Fallback: same pattern |

**Fallback pattern** (for stubs and any provider that doesn't natively stream):
```ts
async *sendStream(request: AIRequest): AsyncGenerator<StreamChunk> {
  const start = Date.now();
  const response = await this.send(request);
  yield { type: 'text', content: response.text };
  yield { type: 'usage', inputTokens: response.inputTokens, outputTokens: response.outputTokens };
  yield { type: 'done', durationMs: Date.now() - start };
}
```

### 2. Instrumentation — `instrumentedSendStream()`

Add to `src/lib/ai-instrumentation.ts`:

```ts
export async function* instrumentedSendStream(
  provider: AIProvider,
  request: AIRequest,
  context: InstrumentationContext,
): AsyncGenerator<StreamChunk> {
  const startTime = Date.now();
  const modelInfo = provider.getModelInfo();
  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;
  let thinkingTokens = 0;
  let status: AiCallStatus = 'SUCCESS';
  let error: string | undefined;

  try {
    for await (const chunk of provider.sendStream(request)) {
      if (chunk.type === 'text') fullText += chunk.content;
      if (chunk.type === 'usage') {
        inputTokens = chunk.inputTokens;
        outputTokens = chunk.outputTokens;
      }
      if (chunk.type === 'thinking') {
        thinkingTokens += chunk.content.length; // or use provider-reported count
      }
      yield chunk;
    }

    const durationMs = Date.now() - startTime;
    yield { type: 'done', durationMs };

    await prisma.aiCallLog.create({
      data: {
        // same fields as instrumentedSend, full fidelity, no truncation
        scanId, jobId, findingId, userId, source, node,
        provider: provider.id, model: modelInfo.id,
        rawRequest: request, rawResponse: { text: fullText },
        systemPrompt: request.system, userPrompt: request.prompt, response: fullText,
        inputTokens, outputTokens, thinkingTokens,
        latencyMs: durationMs,
        temperature, thinkingDepth, thinkingBudget, topP, topK, maxOutputTokens,
        nodeConfig, status: 'SUCCESS',
      },
    });
  } catch (err) {
    status = classifyError(err);
    error = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;

    await prisma.aiCallLog.create({
      data: {
        // error log — same schema, partial text captured
        ...commonFields,
        response: fullText || null,
        status,
        error,
      },
    });

    throw err;
  }
}
```

Key guarantee: **one AiCallLog per streaming call**, written after the stream completes (or fails). Same schema, same detail, no truncation. The observability page sees no difference.

### 3. Chat Service — `streamChatMessage()`

Add to `src/lib/ai-chat.ts`:

```ts
export async function* streamChatMessage(
  userMessage: string,
  context?: { scanId?: string; findingId?: string; userId?: string; finding?: FindingContext }
): AsyncGenerator<StreamChunk> {
  const { provider, chatConfig } = getChatProvider();
  const systemPrompt = buildSystemPrompt(chatConfig, context);

  const request: AIRequest = {
    system: systemPrompt,
    prompt: userMessage,
    maxOutputTokens: chatConfig.maxOutputTokens,
    temperature: chatConfig.temperature,
    topP: chatConfig.topP,
    thinkingDepth: chatConfig.thinkingDepth,
    thinkingBudget: chatConfig.thinkingBudget,
  };

  yield* instrumentedSendStream(provider, request, {
    scanId: context?.scanId,
    findingId: context?.findingId,
    userId: context?.userId,
    source: context?.findingId ? 'chat_finding' : (context?.scanId ? 'chat_scan' : 'chat'),
  });
}
```

### 4. API Layer — 3 New SSE Endpoints

Each endpoint follows the existing `/scans/[id]/stream` pattern:

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/chat/stream` | Global chat SSE stream |
| `POST /api/v1/scans/[id]/chat/stream` | Scan-level chat SSE stream |
| `POST /api/v1/findings/[id]/chat/stream` | Finding-level chat SSE stream |

Each endpoint:
1. Authenticates via `requireAuth()`
2. Reads body as `{ content: string }`
3. Creates user message in DB
4. Resolves provider via `streamChatMessage()`
5. Iterates the `AsyncGenerator`, writes each `StreamChunk` as SSE events
6. On `done`: creates assistant message in DB, sends `event: complete`
7. On error: sends `event: error`, cleans up

**SSE protocol:**

```
event: chunk
data: {"type":"text","content":"Hello"}

event: chunk
data: {"type":"thinking","content":"Let me think..."}

event: chunk
data: {"type":"usage","inputTokens":1234,"outputTokens":567}

event: complete
data: {"messageId":"cx123","content":"full response text","inputTokens":1234,"outputTokens":567,"durationMs":2345}

event: error
data: {"error":"Something went wrong"}
```

### 5. UI Layer — Typewriter Rendering

Both `AiChatProvider.tsx` and `ScanChat.tsx` update:

**Before:**
```ts
// Old: wait for full response
const res = await fetch('/api/v1/chat', { method: 'POST', body });
const data = await res.json();
setMessages(prev => [...prev, userMsg, data.assistantMsg]);
```

**After:**
```ts
// New: stream response
const res = await fetch('/api/v1/chat/stream', { method: 'POST', body });
const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

// Add optimistic user message + empty assistant message
const assistantId = crypto.randomUUID();
setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Parse SSE events from buffer
  const lines = buffer.split('\n\n');
  buffer = lines.pop()!; // keep incomplete event

  for (const event of lines) {
    const eventType = event.match(/^event: (\w+)/m)?.[1];
    const dataMatch = event.match(/^data: (.+)$/m)?.[1];
    if (!dataMatch) continue;
    const data = JSON.parse(dataMatch);

    if (eventType === 'chunk' && data.type === 'text') {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: m.content + data.content } : m
      ));
    }
    if (eventType === 'complete') {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, id: data.messageId, content: data.content } : m
      ));
    }
    if (eventType === 'error') {
      // Show error, keep partial text visible
    }
  }
}
```

**Fallback:** If `sendStream` fails or streaming is unavailable, fall back to the existing non-streaming `sendChatMessage()` path. This is wrapped in a `try/catch` — if the SSE connection fails, we retry with the original POST endpoint.

### 6. Files Changed

| File | Change |
|---|---|
| `src/providers/base.ts` | Add `StreamChunk` type, `sendStream` to `AIProvider` interface |
| `src/providers/cloud-ollama.ts` | Implement `sendStream` with `stream: true` |
| `src/providers/hosted-ollama.ts` | Implement `sendStream` with `stream: true` |
| `src/providers/openai.ts` | Implement `sendStream` with `stream: true` |
| `src/providers/anthropic.ts` | Implement `sendStream` with streaming API |
| `src/providers/bedrock.ts` | Stub: fallback single-chunk from `send()` |
| `src/providers/azure-ai-foundry.ts` | Stub: fallback single-chunk from `send()` |
| `src/providers/langgraph.ts` | Stub: fallback single-chunk from `send()` |
| `src/lib/ai-instrumentation.ts` | Add `instrumentedSendStream()` generator |
| `src/lib/ai-chat.ts` | Add `streamChatMessage()` generator function |
| `src/app/api/v1/chat/stream/route.ts` | New: SSE streaming org chat |
| `src/app/api/v1/scans/[id]/chat/stream/route.ts` | New: SSE streaming scan chat |
| `src/app/api/v1/findings/[id]/chat/stream/route.ts` | New: SSE streaming finding chat |
| `src/components/AiChatProvider.tsx` | Consume SSE, typewriter rendering, fallback |
| `src/components/ScanChat.tsx` | Consume SSE, typewriter rendering, fallback |

### 7. Observability — Data Flow

```
User types message
  → UI: POST /chat/stream (body: { content })
    → API: authenticate, create user message in DB
    → API: streamChatMessage()
      → instrumentedSendStream()
        → provider.sendStream()
          → Provider: stream chunks from AI service
            → SSE event: chunk { type: "text", content: "..." }
            → UI: append content (typewriter)
          → Provider: done
        → instrumentedSendStream accumulates: fullText, inputTokens, outputTokens, durationMs
      → yield done chunk
    → API: on done — create assistant message in DB
    → API: on done — write AiCallLog (ONE row, full data, no truncation)
    → SSE event: complete { messageId, content, inputTokens, outputTokens, durationMs }
    → UI: finalize message with server-confirmed ID
```

The AiCallTable and Observability page query the same `AiCallLog` model with the same fields. Streaming is transparent to observability.

### 8. Non-Streaming Fallback

When streaming fails (connection error, provider doesn't support it, older client):
- The SSE endpoint catches the error and falls back to calling `sendChatMessage()` (non-streaming)
- Returns a single `event: complete` with the full response
- UI fallback: if `ReadableStream` API is unavailable, use existing `POST → res.json()` path

### 9. DB Persistence

No schema changes required. The `AiConversation` model already stores full message content. The `AiCallLog` model already supports all fields needed.

New assistant messages are written to DB **after** the stream completes (in the `complete` event handler), so partial messages during streaming are only in React state — if the connection drops, the user's message exists but there's no partial assistant message row. This matches the current UX where a failed chat request simply doesn't get an assistant response.