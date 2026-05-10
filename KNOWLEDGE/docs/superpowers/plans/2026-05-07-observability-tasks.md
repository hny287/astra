# Observability & Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete AI observability (structured logging + per-call AI instrumentation) and a cross-scan Tasks screen with Carbon-styled DataTable to Astra v2.

**Architecture:** Pino replaces console.log for structured JSON logging to file. A new `AiCallLog` Prisma model captures every AI provider call with full request/response data via an `instrumentedSend` wrapper. A new `Task` model (hybrid — auto-created from Findings + manual) powers a `/tasks` page with batch actions, accordion detail, and AI suggestion. The `/observability` page provides cross-scan AI call visibility.

**Tech Stack:** Pino + pino-pretty, Prisma 7.x, Next.js 16 App Router, shadcn/ui components styled with Carbon Design tokens, existing Astra provider factory.

---

## Task 1: Install Pino and Create Structured Logger

**Files:**
- Create: `src/lib/structured-logger.ts`
- Modify: `package.json` (add pino, pino-pretty)

- [ ] **Step 1: Install pino and pino-pretty**

Run:
```bash
cd /root/astra/astra-app && npm install pino pino-pretty
```

- [ ] **Step 2: Create structured logger**

Create `src/lib/structured-logger.ts`:

```ts
import pino from 'pino';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'astra.log');

const isDev = process.env.NODE_ENV !== 'production';

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: LOG_FILE, mkdir: true },
      level: 'trace',
    },
    ...(isDev
      ? [
          {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
            level: 'trace' as const,
          },
        ]
      : []),
  ],
});

export const logger = pino(
  {
    name: 'astra',
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  },
  transport,
);

export type Logger = typeof logger;
```

- [ ] **Step 3: Verify logger works**

Run:
```bash
cd /root/astra/astra-app && npx tsc --noEmit src/lib/structured-logger.ts 2>&1 | head -5
```

- [ ] **Step 4: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add pino structured logger"
```

---

## Task 2: Replace console.log in Worker with Pino

**Files:**
- Modify: `src/scan/worker.ts`
- Modify: `src/scan/nodes/deep-scan.ts`
- Modify: `src/scan/nodes/cross-file.ts`
- Modify: `src/scan/nodes/clone.ts`
- Modify: `src/scan/nodes/discover.ts`
- Modify: `src/scan/nodes/aggregate.ts`
- Modify: `src/scan/nodes/persist.ts`
- Modify: `src/instrumentation.ts`

- [ ] **Step 1: Update worker.ts to use pino**

In `src/scan/worker.ts`, replace `console.log` and `console.error` calls with pino logger.

Add at top:
```ts
import { logger } from '@/lib/structured-logger';
```

Replace each `console.log(`[astra-worker]` ...)` with `logger.info({ scanId, jobId, node }, message)` and each `console.error(`[astra-worker]` ...)` with `logger.error({ scanId, jobId, err: message }, message)`.

- [ ] **Step 2: Update instrumentation.ts**

In `src/instrumentation.ts`, replace `console.log` with `logger.info` and `console.error` with `logger.error`.

Add: `import { logger } from '@/lib/structured-logger';`

- [ ] **Step 3: Update scan node files**

In each of `deep-scan.ts`, `cross-file.ts` — replace `import { log } from '../log'` usage that wraps console.log. Keep the `log` import for scan-specific DB logging, but add pino for application-level logging:

Add at top: `import { logger } from '@/lib/structured-logger';`

Replace patterns like bare `console.error(...)` in catch blocks with `logger.error({ scanId: state.scanId, node: 'deep_scan' }, err.message)`.

The clone, discover, aggregate, persist nodes don't have console calls that need replacing beyond what's already in the `log` function. Only replace bare console.log/console.error in these files.

- [ ] **Step 4: Verify types**

Run:
```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: replace console.log with pino in worker and nodes"
```

---

## Task 3: Add Prisma Schema for AiCallLog, Task, TaskComment, TaskHistory

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema**

Add after the existing `AlertStatus` enum block in `prisma/schema.prisma`:

```prisma
enum AiCallStatus {
  SUCCESS
  ERROR
  TIMEOUT
  RATE_LIMITED
  CANCELLED
}

enum TaskType {
  FINDING_TRIAGE
  REMEDIATION
  MANUAL_REVIEW
  MANUAL
  AI_GENERATED
}

enum TaskPriority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}

enum TaskStatus {
  OPEN
  IN_PROGRESS
  BLOCKED
  IN_REVIEW
  COMPLETED
  CANCELLED
  DUPLICATE
}
```

- [ ] **Step 2: Add AiCallLog model**

Add after the `AiConversation` model:

```prisma
model AiCallLog {
  id             String       @id @default(cuid())
  scanId         String?
  jobId          String?
  findingId      String?
  userId         String?
  source         String
  node           String?
  provider       String
  model          String
  endpoint       String
  sdk            String?
  sdkVersion     String?
  rawRequest     Json?
  rawResponse    Json?
  systemPrompt   String?
  userPrompt     String?
  response       String?
  inputTokens    Int          @default(0)
  outputTokens   Int          @default(0)
  thinkingTokens Int          @default(0)
  latencyMs      Int          @default(0)
  temperature    Float?
  thinkingDepth  String?
  thinkingBudget Int?
  topP           Float?
  topK           Int?
  maxOutputTokens Int?
  nodeConfig     Json?
  status         AiCallStatus @default(SUCCESS)
  error          String?
  createdAt      DateTime     @default(now())

  scan     Scan?     @relation(fields: [scanId], references: [id], onDelete: Cascade)
  job      Job?      @relation(fields: [jobId], references: [id], onDelete: SetNull)
  finding  Finding?  @relation(fields: [findingId], references: [id], onDelete: SetNull)
  user     User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([scanId])
  @@index([provider])
  @@index([model])
  @@index([status])
  @@index([source])
  @@index([createdAt])
  @@index([userId])
}
```

- [ ] **Step 3: Add Task-related models**

Add after `AiCallLog`:

```prisma
model Task {
  id           String      @id @default(cuid())
  title        String
  description  String      @default("")
  type         TaskType    @default(MANUAL)
  priority     TaskPriority @default(MEDIUM)
  status       TaskStatus  @default(OPEN)
  findingId    String?
  scanId       String?
  assignedToId String?
  createdById  String?
  dueDate      DateTime?
  closedAt     DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  finding     Finding?    @relation(fields: [findingId], references: [id], onDelete: SetNull)
  scan       Scan?        @relation(fields: [scanId], references: [id], onDelete: SetNull)
  assignedTo User?        @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
  createdBy  User?        @relation(fields: [createdById], references: [id], onDelete: SetNull)
  comments    TaskComment[]
  history     TaskHistory[]

  @@index([status])
  @@index([type])
  @@index([priority])
  @@index([assignedToId])
  @@index([scanId])
  @@index([findingId])
  @@index([createdAt])
}

model TaskComment {
  id        String   @id @default(cuid())
  taskId    String
  userId    String
  text      String
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([taskId, createdAt])
}

model TaskHistory {
  id        String   @id @default(cuid())
  taskId    String
  userId    String?
  action    String
  oldValue  String?
  newValue  String?
  createdAt DateTime @default(now())

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([taskId])
  @@index([taskId, createdAt])
}
```

- [ ] **Step 4: Add relations to existing models**

Add to `User` model:
```prisma
  aiCallLogs   AiCallLog[]
  tasks        Task[]      @relation("UserCreatedTasks")
  taskHistory  TaskHistory[]
  taskComments TaskComment[]
```

Wait — there's a conflict: User already has `assignedFindings Finding[]` and we need two different Task relations for User (createdBy and assignedTo). Use explicit relation names.

Add to `User` model (replace any conflicting lines — check first):
```prisma
  aiCallLogs       AiCallLog[]
  tasksAssigned    Task[]      @relation("TaskAssignedTo")
  tasksCreated     Task[]      @relation("TaskCreatedBy")
  taskHistory      TaskHistory[]
  taskComments     TaskComment[]
```

Add to `Scan` model:
```prisma
  aiCallLogs  AiCallLog[]
  tasks       Task[]
```

Add to `Job` model:
```prisma
  aiCallLogs  AiCallLog[]
```

Add to `Finding` model:
```prisma
  aiCallLogs  AiCallLog[]
  task       Task?
```

- [ ] **Step 5: Run migration**

```bash
cd /root/astra/astra-app && npx prisma migrate dev --name add_observability_and_tasks
```

- [ ] **Step 6: Regenerate Prisma client**

```bash
cd /root/astra/astra-app && npx prisma generate
```

- [ ] **Step 7: Verify**

Run:
```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 8: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add AiCallLog, Task, TaskComment, TaskHistory to Prisma schema"
```

---

## Task 4: Create AI Instrumentation Layer

**Files:**
- Create: `src/lib/ai-instrumentation.ts`

- [ ] **Step 1: Create the instrumentation module**

Create `src/lib/ai-instrumentation.ts`:

```ts
import { prisma } from '@/lib/db';
import { logger } from '@/lib/structured-logger';
import type { AIProvider, AIRequest, AIResponse } from '@/providers/base';

export type InstrumentationSource =
  | 'pipeline'
  | 'chat'
  | 'chat_finding'
  | 'chat_scan'
  | 'test'
  | 'ad_hoc';

export interface InstrumentationContext {
  scanId?: string;
  jobId?: string;
  findingId?: string;
  userId?: string;
  source: InstrumentationSource;
  node?: string;
  nodeConfig?: Record<string, unknown>;
}

function classifyError(err: unknown): 'ERROR' | 'TIMEOUT' | 'RATE_LIMITED' {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
      return 'TIMEOUT';
    }
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
      return 'RATE_LIMITED';
    }
  }
  return 'ERROR';
}

export async function instrumentedSend(
  provider: AIProvider,
  request: AIRequest,
  context: InstrumentationContext,
): Promise<AIResponse> {
  const startTime = Date.now();
  const modelInfo = provider.getModelInfo();

  const logCtx = {
    scanId: context.scanId,
    node: context.node,
    provider: provider.id,
    model: modelInfo.id,
    source: context.source,
  };

  logger.info(logCtx, `AI call starting: ${context.source}/${context.node || 'direct'}`);

  let response: AIResponse;
  let status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'RATE_LIMITED' = 'SUCCESS';
  let error: string | undefined;

  try {
    response = await provider.send(request);
  } catch (err: unknown) {
    status = classifyError(err);
    error = err instanceof Error ? err.message : String(err);
    if (error.length > 10000) error = error.substring(0, 10000) + '... [truncated at 10k for error field]';
    const elapsed = Date.now() - startTime;

    logger.error({ ...logCtx, elapsed, status, error }, `AI call failed: ${status}`);

    await prisma.aiCallLog.create({
      data: {
        scanId: context.scanId,
        jobId: context.jobId,
        findingId: context.findingId,
        userId: context.userId,
        source: context.source,
        node: context.node,
        provider: provider.id,
        model: modelInfo.id,
        endpoint: modelInfo.id,
        sdk: provider.id,
        rawRequest: request as any,
        systemPrompt: request.system,
        userPrompt: request.prompt,
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        latencyMs: elapsed,
        temperature: request.temperature ?? null,
        thinkingDepth: request.thinkingDepth ?? null,
        thinkingBudget: request.thinkingBudget ?? null,
        topP: request.topP ?? null,
        topK: request.topK ?? null,
        maxOutputTokens: request.maxOutputTokens ?? null,
        nodeConfig: context.nodeConfig ?? undefined,
        status,
        error,
      },
    });

    throw err;
  }

  const elapsed = Date.now() - startTime;

  logger.info({ ...logCtx, elapsed, inputTokens: response.inputTokens, outputTokens: response.outputTokens, thinkingTokens: response.thinkingTokens }, 'AI call completed');

  await prisma.aiCallLog.create({
    data: {
      scanId: context.scanId,
      jobId: context.jobId,
      findingId: context.findingId,
      userId: context.userId,
      source: context.source,
      node: context.node,
      provider: provider.id,
      model: modelInfo.id,
      endpoint: modelInfo.id,
      sdk: provider.id,
      rawRequest: request as any,
      rawResponse: response as any,
      systemPrompt: request.system,
      userPrompt: request.prompt,
      response: response.text,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      thinkingTokens: response.thinkingTokens,
      latencyMs: elapsed,
      temperature: request.temperature ?? null,
      thinkingDepth: request.thinkingDepth ?? null,
      thinkingBudget: request.thinkingBudget ?? null,
      topP: request.topP ?? null,
      topK: request.topK ?? null,
      maxOutputTokens: request.maxOutputTokens ?? null,
      nodeConfig: context.nodeConfig ?? undefined,
      status: 'SUCCESS',
    },
  });

  return response;
}
```

- [ ] **Step 2: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add AI instrumentation layer (instrumentedSend)"
```

---

## Task 5: Wire AI Instrumentation into Pipeline Nodes

**Files:**
- Modify: `src/scan/nodes/deep-scan.ts`
- Modify: `src/scan/nodes/cross-file.ts`

- [ ] **Step 1: Instrument deep-scan.ts**

Add import at top of `src/scan/nodes/deep-scan.ts`:
```ts
import { instrumentedSend } from '@/lib/ai-instrumentation';
```

In each place where `provider.send(request)` is called inside the retry loop, replace:
```ts
const response = await provider.send(request);
```
with:
```ts
const response = await instrumentedSend(provider, request, {
  scanId: state.scanId,
  jobId: state.currentJobId,
  source: 'pipeline',
  node: 'deep_scan',
  nodeConfig: nodeConfig as Record<string, unknown>,
});
```

If `state` doesn't have `currentJobId`, use `undefined` for jobId — since the worker knows the job ID but the node function doesn't receive it yet. We'll handle this in Task 6 by passing jobId through state.

For now, pass `jobId: undefined` and note that this will be updated.

- [ ] **Step 2: Instrument cross-file.ts**

Same pattern: add `import { instrumentedSend } from '@/lib/ai-instrumentation';` and replace `provider.send(request)` with `instrumentedSend(provider, request, { scanId: state.scanId, source: 'pipeline', node: 'cross_file' })`.

- [ ] **Step 3: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: wire AI instrumentation into pipeline nodes"
```

---

## Task 6: Pass jobId Through ScanState and Wire into Worker

**Files:**
- Modify: `src/scan/state.ts`
- Modify: `src/scan/worker.ts`

- [ ] **Step 1: Add jobId to ScanState**

In `src/scan/state.ts`, add `currentJobId?: string` to the ScanState interface.

- [ ] **Step 2: Set jobId in worker before calling nodes**

In `src/scan/worker.ts`, after `claimNextJob()` succeeds and before `reconstructState`, set `state.currentJobId = jobId;` (or pass it through reconstructState).

Update reconstructState to accept an optional jobId parameter and set it on the base state.

- [ ] **Step 3: Update instrumentedSend calls to include jobId**

In `deep-scan.ts` and `cross-file.ts`, update the `instrumentedSend` calls to use `jobId: state.currentJobId` instead of `undefined`.

- [ ] **Step 4: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: pass jobId through ScanState for AI instrumentation"
```

---

## Task 7: Wire AI Instrumentation into Chat and Provider Test

**Files:**
- Modify: `src/lib/ai-chat.ts`
- Modify: `src/app/api/v1/providers/test/route.ts`

- [ ] **Step 1: Instrument ai-chat.ts**

Add import: `import { instrumentedSend } from '@/lib/ai-instrumentation';`

Replace the `provider.send(request)` call in `sendChatMessage` with:

```ts
const response = await instrumentedSend(provider, request, {
  scanId: context?.scanId,
  findingId: context?.findingId,
  userId: context?.userId,
  source: findingId ? 'chat_finding' : (scanId ? 'chat_scan' : 'chat'),
});
```

Note: the `sendChatMessage` function needs `userId`, `scanId`, and `findingId` in its context parameter. Update the interface to include these optional fields.

- [ ] **Step 2: Update chat API routes to pass userId**

In each chat API route (`/api/v1/chat/route.ts`, `/api/v1/scans/[id]/chat/route.ts`, `/api/v1/findings/[id]/chat/route.ts`), get the userId from auth and pass it to `sendChatMessage`.

- [ ] **Step 3: Instrument provider test route**

In `src/app/api/v1/providers/test/route.ts`, wrap the `provider.testConnection()` call. Note that `testConnection()` is not `send()` — it's a different method. We can either:
a) Leave testConnection as-is (it's not an AI generation call), or
b) Log it as a separate source

For now, leave `testConnection` uninstrumentated since it's a connectivity check, not an AI generation call. The spec says `source: 'test'` for provider tests, but `testConnection` doesn't return prompts/responses.

- [ ] **Step 4: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: wire AI instrumentation into chat routes"
```

---

## Task 8: Create AI Call API Endpoints

**Files:**
- Create: `src/app/api/v1/ai-calls/route.ts`
- Create: `src/app/api/v1/ai-calls/[id]/route.ts`
- Create: `src/app/api/v1/ai-calls/stats/route.ts`

- [ ] **Step 1: Create `/api/v1/ai-calls` list endpoint**

Create `src/app/api/v1/ai-calls/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get('provider') ?? undefined;
  const model = searchParams.get('model') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const scanId = searchParams.get('scanId') ?? undefined;
  const jobId = searchParams.get('jobId') ?? undefined;
  const findingId = searchParams.get('findingId') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const limit = parseInt(searchParams.get('limit') ?? '25', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const where: Record<string, unknown> = {};
  if (provider) where.provider = provider;
  if (model) where.model = model;
  if (status) where.status = status;
  if (source) where.source = source;
  if (scanId) where.scanId = scanId;
  if (jobId) where.jobId = jobId;
  if (findingId) where.findingId = findingId;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }
  if (search) {
    where.OR = [
      { systemPrompt: { contains: search, mode: 'insensitive' } },
      { userPrompt: { contains: search, mode: 'insensitive' } },
      { response: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.aiCallLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        scanId: true,
        jobId: true,
        findingId: true,
        userId: true,
        source: true,
        node: true,
        provider: true,
        model: true,
        endpoint: true,
        inputTokens: true,
        outputTokens: true,
        thinkingTokens: true,
        latencyMs: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.aiCallLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, limit, offset });
}
```

- [ ] **Step 2: Create `/api/v1/ai-calls/[id]` detail endpoint**

Create `src/app/api/v1/ai-calls/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const call = await prisma.aiCallLog.findUnique({ where: { id } });
  if (!call) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(call);
}
```

- [ ] **Step 3: Create `/api/v1/ai-calls/stats` endpoint**

Create `src/app/api/v1/ai-calls/stats/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const dateFilter: Record<string, unknown> = {};
  if (from || to) {
    dateFilter.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
  }

  const [total, successCount, errorCount, avgLatency, totalInputTokens, totalOutputTokens] = await Promise.all([
    prisma.aiCallLog.count({ where: dateFilter }),
    prisma.aiCallLog.count({ where: { ...dateFilter, status: 'SUCCESS' } }),
    prisma.aiCallLog.count({ where: { ...dateFilter, status: { in: ['ERROR', 'TIMEOUT', 'RATE_LIMITED'] } } }),
    prisma.aiCallLog.aggregate({ where: dateFilter, _avg: { latencyMs: true } }),
    prisma.aiCallLog.aggregate({ where: dateFilter, _sum: { inputTokens: true } }),
    prisma.aiCallLog.aggregate({ where: dateFilter, _sum: { outputTokens: true } }),
  ]);

  const byProvider = await prisma.aiCallLog.groupBy({ by: ['provider'], where: dateFilter, _count: true, _avg: { latencyMs: true } });
  const byModel = await prisma.aiCallLog.groupBy({ by: ['model'], where: dateFilter, _count: true, _avg: { latencyMs: true } });
  const byStatus = await prisma.aiCallLog.groupBy({ by: ['status'], where: dateFilter, _count: true });

  return NextResponse.json({
    total,
    successCount,
    errorCount,
    errorRate: total > 0 ? errorCount / total : 0,
    avgLatencyMs: avgLatency._avg.latencyMs ?? 0,
    totalInputTokens: totalInputTokens._sum.inputTokens ?? 0,
    totalOutputTokens: totalOutputTokens._sum.outputTokens ?? 0,
    byProvider,
    byModel,
    byStatus,
  });
}
```

- [ ] **Step 4: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add AI call API endpoints (list, detail, stats)"
```

---

## Task 9: Create Observability UI Page

**Files:**
- Create: `src/app/(app)/observability/page.tsx`
- Create: `src/components/AiCallTable.tsx`

- [ ] **Step 1: Create AiCallTable component**

Create `src/components/AiCallTable.tsx` — a Carbon-styled DataTable with:
- Checkbox selection column
- Expandable rows (click to reveal full AI call details)
- Columns: Timestamp, Provider, Model, In Tokens, Out Tokens, Think Tokens, Latency, Status
- Expanded detail: system prompt, user prompt, response, raw request (JSON), raw response (JSON), endpoint, SDK, temperature, thinking depth, node config
- Filters: search, provider, model, status, source, date range
- Sorting by column headers
- Pagination (25/50/100)
- NO truncation on any field — scrollable containers for long text

Style: IBM Carbon — square corners (0px), Plex Sans, `letter-spacing: 0.16px`, IBM Blue accent, surface-change hierarchy.

- [ ] **Step 2: Create Observability page**

Create `src/app/(app)/observability/page.tsx` — fetches stats from `/api/v1/ai-calls/stats` and list from `/api/v1/ai-calls`, renders:
- 4 summary cards at top (Total Calls, Avg Latency, Token Usage, Error Rate)
- `<AiCallTable>` below

- [ ] **Step 3: Add to AppShell navigation**

In `src/components/AppShell.tsx`, add to NAV_LINKS:
```ts
{ href: '/observability', label: 'Observability' },
```

- [ ] **Step 4: Verify page renders**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 5: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add Observability page with AI call DataTable"
```

---

## Task 10: Enhance Pipeline Tab with Per-Scan AI Call Logs

**Files:**
- Modify: `src/app/(app)/scans/[id]/page.tsx`

- [ ] **Step 1: Add AI Calls tab to scan detail**

In `src/app/(app)/scans/[id]/page.tsx`, add a new tab:

Update the `Tab` type to include `'logs'`.

Add to the tabs array:
```ts
{ id: 'logs' as Tab, label: 'AI Calls' },
```

Add rendering block:
```tsx
{tab === 'logs' && (
  <AiCallTable
    scanId={scan.id}
    filters={{ scanId: scan.id }}
  />
)}
```

This reuses the `AiCallTable` component with a pre-applied scanId filter.

- [ ] **Step 2: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add AI Calls tab to scan detail pipeline view"
```

---

## Task 11: Create Task API Endpoints

**Files:**
- Create: `src/app/api/v1/tasks/route.ts`
- Create: `src/app/api/v1/tasks/[id]/route.ts`
- Create: `src/app/api/v1/tasks/[id]/comments/route.ts`
- Create: `src/app/api/v1/tasks/[id]/history/route.ts`
- Create: `src/app/api/v1/tasks/batch/route.ts`
- Create: `src/app/api/v1/tasks/ai-suggest/route.ts`
- Create: `src/lib/task-sync.ts`

- [ ] **Step 1: Create task-sync.ts utility**

Create `src/lib/task-sync.ts` — handles bidirectional sync between Finding and Task:

```ts
import { prisma } from '@/lib/db';

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

export async function createTaskFromFinding(findingId: string, scanId: string, userId?: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) return null;

  const existing = await prisma.task.findFirst({ where: { findingId } });
  if (existing) return existing;

  return prisma.task.create({
    data: {
      title: finding.title,
      description: finding.description,
      type: 'FINDING_TRIAGE',
      priority: (SEVERITY_TO_PRIORITY[finding.severity] as any) || 'MEDIUM',
      status: 'OPEN',
      findingId: finding.id,
      scanId,
      createdById: userId ?? null,
    },
  });
}

export async function syncFindingAssignmentToTask(findingId: string, assignedToId: string | null) {
  return prisma.task.updateMany({
    where: { findingId },
    data: { assignedToId },
  });
}

export async function syncTaskAssignmentToFinding(taskId: string, assignedToId: string | null) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task?.findingId) return;
  return prisma.finding.update({
    where: { id: task.findingId },
    data: { assignedToId },
  });
}
```

- [ ] **Step 2: Create tasks list/create endpoint**

Create `src/app/api/v1/tasks/route.ts` — GET (list with filters, sorting, pagination) and POST (create task, RBAC: canWrite).

Follow the pattern from `/api/v1/findings/route.ts`.

GET supports filters: `type`, `priority`, `status`, `assignedToId`, `scanId`, `severity` (via finding relation), `search`, `hasFinding`, `dueBefore`, `dueAfter`. Sort by `sort` param (e.g., `priority`, `dueDate`, `createdAt`). Pagination with `limit` and `offset`.

POST creates a task. If `findingId` is provided, links to the finding and auto-sets scanId. Creates a TaskHistory entry with `action: 'CREATED'`.

- [ ] **Step 3: Create task detail endpoint**

Create `src/app/api/v1/tasks/[id]/route.ts` — GET (full task with finding, comments, history), PATCH (update fields, create TaskHistory entries for changes, sync assignment to finding if applicable), DELETE (RBAC: canAdmin).

- [ ] **Step 4: Create task comments endpoint**

Create `src/app/api/v1/tasks/[id]/comments/route.ts` — GET (list comments), POST (add comment, RBAC: canWrite). Creates TaskHistory with `action: 'COMMENT_ADDED'`.

- [ ] **Step 5: Create task history endpoint**

Create `src/app/api/v1/tasks/[id]/history/route.ts` — GET (list history entries ordered by createdAt desc).

- [ ] **Step 6: Create batch operations endpoint**

Create `src/app/api/v1/tasks/batch/route.ts` — POST with body `{ action: 'reassign' | 'changePriority' | 'changeStatus' | 'delete', taskIds: string[], payload: Record<string, unknown> }`. RBAC: canWrite.

- [ ] **Step 7: Create AI suggest endpoint**

Create `src/app/api/v1/tasks/ai-suggest/route.ts` — POST endpoint that:
1. Requires auth + canWrite
2. Fetches all OPEN findings with severity HIGH or CRITICAL that don't already have a linked task
3. Sends them to AI via `sendChatMessage` with a system prompt asking it to suggest task groupings
4. Returns the AI response as suggested tasks (preview, not created in DB)

- [ ] **Step 8: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 9: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add Task API endpoints (CRUD, comments, history, batch, AI suggest)"
```

---

## Task 12: Auto-Create Tasks from Findings in Persist Node

**Files:**
- Modify: `src/scan/nodes/persist.ts`

- [ ] **Step 1: Import and call createTaskFromFinding**

In `src/scan/nodes/persist.ts`, add import:
```ts
import { createTaskFromFinding } from '@/lib/task-sync';
```

After the finding upsert loop (after line ~102), add:
```ts
for (const finding of state.deduplicatedFindings) {
  const severity = normalizeSeverity(finding.severity);
  if (severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM') {
    const existing = await prisma.finding.findFirst({
      where: { fingerprint: finding.fingerprint, scanId: state.scanId },
      select: { id: true },
    });
    if (existing) {
      await createTaskFromFinding(existing.id, state.scanId, state.userId);
    }
  }
}
```

- [ ] **Step 2: Add userId to ScanState**

In `src/scan/state.ts`, add `userId?: string` to ScanState interface.

In `src/scan/worker.ts`, after reconstructing state, set `state.userId = scan.userId ?? undefined;`.

- [ ] **Step 3: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 4: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: auto-create tasks from OPEN findings in persist node"
```

---

## Task 13: Create Tasks UI Page

**Files:**
- Create: `src/app/(app)/tasks/page.tsx`
- Create: `src/components/TaskDataTable.tsx`
- Create: `src/components/TaskDetailAccordion.tsx`
- Create: `src/components/CreateTaskModal.tsx`

- [ ] **Step 1: Create TaskDataTable component**

Create `src/components/TaskDataTable.tsx` — the main Carbon-styled DataTable component with:

- **Columns:** Checkbox | Expand ▶ | Severity/Priority badge | Title | Priority | Status | Type | Assignee | Due | Overflow ⋯
- **Selection:** Checkbox column, batch action toolbar (dark theme) when rows selected
- **Expansion:** Accordion with sub-tabs (Details, Actions, Comments, AI Context)
- **Filters:** Search, Type, Priority, Status, Assignee, Category, Severity dropdowns
- **Sorting:** Click column headers, active sort with ▲/▼ in IBM Blue
- **Pagination:** 25/50/100 rows per page
- **Overflow menu:** Edit, Reassign, Change Priority, Duplicate, Link Finding, Delete, AI Assist

Carbon styling: 0px border-radius, Plex Sans weight 300 for display, `letter-spacing: 0.16px` on body, IBM Blue accent, surface-change hierarchy, no drop shadows.

- [ ] **Step 2: Create TaskDetailAccordion component**

Create `src/components/TaskDetailAccordion.tsx` — the expanded detail panel with:

- Sub-tabs: Details | Actions | Comments | AI Context
- **Details tab:** Full description, remediation, finding reference link, file location, CWE/OWASP badges, inline action buttons (Confirm, False Positive, Remediated, Accept Risk, AI Assist, Reassign)
- **Actions tab:** TaskHistory timeline
- **Comments tab:** TaskComment list + add comment input
- **AI Context tab:** Linked AiCallLog entries + AI Assist button that opens global chat with task context

- [ ] **Step 3: Create CreateTaskModal component**

Create `src/components/CreateTaskModal.tsx` — modal/slide-out for creating new tasks:
- Fields: title, description, type (dropdown), priority (dropdown), assignee (user dropdown), due date (date picker), optional finding link
- AI Suggest button that calls `/api/v1/tasks/ai-suggest`

- [ ] **Step 4: Create Tasks page**

Create `src/app/(app)/tasks/page.tsx` — fetches tasks from API, renders:

- Page header with "Tasks" title, count of open tasks, "+ New task" button, "AI suggest" button
- `<TaskDataTable>` component

- [ ] **Step 5: Add to AppShell navigation**

In `src/components/AppShell.tsx`, add to NAV_LINKS:
```ts
{ href: '/tasks', label: 'Tasks' },
```

- [ ] **Step 6: Verify page renders**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 7: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: add Tasks page with Carbon DataTable, batch actions, accordion detail"
```

---

## Task 14: Wire Finding Assignment Sync on Existing Endpoints

**Files:**
- Modify: `src/app/api/v1/findings/[id]/route.ts`

- [ ] **Step 1: Add task sync to finding PATCH endpoint**

In the PATCH handler for `/api/v1/findings/[id]/route.ts`, when `assignedToId` is changed, also call `syncFindingAssignmentToTask(findingId, assignedToId)`.

Add import: `import { syncFindingAssignmentToTask } from '@/lib/task-sync';`

After the finding update, if the patch includes `assignedToId`:
```ts
if (body.assignedToId !== undefined) {
  await syncFindingAssignmentToTask(findingId, body.assignedToId ?? null);
}
```

- [ ] **Step 2: Verify types**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -10
```

- [ ] **Step 3: Commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: sync finding assignment changes to linked tasks"
```

---

## Task 15: Final Integration and Type Check

**Files:**
- Various (verification only)

- [ ] **Step 1: Full type check**

```bash
cd /root/astra/astra-app && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 2: Verify database migration applies cleanly**

```bash
cd /root/astra/astra-app && npx prisma migrate status
```

- [ ] **Step 3: Verify dev server starts**

```bash
cd /root/astra/astra-app && timeout 15 npm run dev 2>&1 | head -20
```

- [ ] **Step 4: Final commit**

```bash
cd /root/astra/astra-app && git add -A && git commit -m "feat: complete observability and tasks integration"
```