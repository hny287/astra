# Observability & Tasks Design Spec

**Date:** 2026-05-07
**Status:** Draft

Two core features for Astra v2: (1) Complete observability with structured logging and full AI call capture, and (2) a Tasks screen with Carbon-styled DataTable for cross-scan work management.

---

## 1. Structured Logging — Pino

### Architecture

Replace all `console.log/error` calls and the custom `src/lib/logger.ts` with **Pino** structured JSON logging.

**Implementation: `src/lib/structured-logger.ts`**

- Pino instance with JSON transport to file (`./logs/astra.log`) and `pino-pretty` for dev console
- Default fields per log entry: `timestamp`, `level`, `service: "astra"`, `environment`, `reqId` (request correlator from Next.js middleware)
- Levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`
- Child loggers: `logger.child({ scanId, node })` for pipeline context, `logger.child({ userId })` for API request context
- Log rotation: `pino-roll` or custom rotation at 50MB per file, keep 10 files
- Configurable log level via `astra.config.json` or `LOG_LEVEL` env var

**File transport:**
- Always writes to `./logs/astra.log` (rotating JSON lines)
- Dev mode: also prints pretty-colored console output via `pino-pretty`
- Production: JSON only

**Middleware integration:**
- Next.js middleware assigns `reqId` (uuid) to every request
- API route handlers receive pino child logger with `reqId` pre-attached
- Every API request logged: method, path, statusCode, durationMs, userId

**Migration plan:**
- `src/lib/logger.ts` replaced by wrapper around pino (maintains `step()`, `info()`, `success()`, `warn()`, `error()` signatures for backward compat during migration)
- `src/scan/worker.ts` console.log calls → pino child logger
- `console.log/error` in all other files → pino

---

## 2. AI Observability

### Data Model: AiCallLog

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | PK |
| `scanId` | String? | FK to Scan, null for ad-hoc/test calls |
| `jobId` | String? | FK to Job if pipeline node call |
| `findingId` | String? | FK to Finding if per-finding chat |
| `userId` | String? | User who initiated the call |
| `source` | String | `pipeline`, `chat`, `chat_finding`, `chat_scan`, `test`, `ad_hoc` |
| `node` | String? | Pipeline node name (e.g. `deep_scan`) |
| `provider` | String | Provider ID (`cloud-ollama`, `openai`, `anthropic`, etc.) |
| `model` | String | Model ID (`gpt-oss:120b`, etc.) |
| `endpoint` | String | Full API endpoint URL |
| `sdk` | String | Client library name (`ollama`, `openai`, `@anthropic-ai/sdk`) |
| `sdkVersion` | String | Package version |
| `rawRequest` | Json | Full unredacted request body sent to provider (all messages, parameters, tools, etc.) — no truncation |
| `rawResponse` | Json | Full unredacted response body from provider (all choices, usage, metadata) — no truncation |
| `systemPrompt` | Text | Full system prompt — no truncation |
| `userPrompt` | Text | Full user prompt — no truncation |
| `response` | Text | Full AI response text — no truncation |
| `inputTokens` | Int | Prompt tokens consumed |
| `outputTokens` | Int | Completion tokens generated |
| `thinkingTokens` | Int | Reasoning tokens |
| `latencyMs` | Int | End-to-end call duration in milliseconds |
| `temperature` | Float | Sampling temperature used |
| `thinkingDepth` | String | `none` / `low` / `medium` / `high` / `max` |
| `thinkingBudget` | Int? | Max thinking tokens allowed |
| `topP` | Float? | Top-p sampling parameter |
| `topK` | Int? | Top-k sampling parameter |
| `maxOutputTokens` | Int? | Max output tokens requested |
| `nodeConfig` | Json | Full node config snapshot at time of call |
| `status` | AiCallStatus | `SUCCESS` / `ERROR` / `TIMEOUT` / `RATE_LIMITED` / `CANCELLED` |
| `error` | Text? | Full error message and stack trace if failed |
| `createdAt` | DateTime | Timestamp |

### Enums

```
AiCallStatus: SUCCESS | ERROR | TIMEOUT | RATE_LIMITED | CANCELLED
```

### AI Instrumentation Layer: `src/lib/ai-instrumentation.ts`

Wraps every `AIProvider.send()` call. Interface:

```ts
interface InstrumentationContext {
  scanId?: string;
  jobId?: string;
  findingId?: string;
  userId?: string;
  source: 'pipeline' | 'chat' | 'chat_finding' | 'chat_scan' | 'test' | 'ad_hoc';
  node?: string;
}

async function instrumentedSend(
  provider: AIProvider,
  request: AIRequest,
  context: InstrumentationContext
): Promise<AIResponse>
```

Behavior:
1. Records start timestamp
2. Calls `provider.send(request)`
3. On success: writes `AiCallLog` with `status: SUCCESS`, full `rawRequest`, `rawResponse`, all token counts, latency
4. On error: catches the error, writes `AiCallLog` with `status: ERROR`/`TIMEOUT`/`RATE_LIMITED`, `rawRequest` still captured, `error` field populated
5. Also logs via pino (child logger with scanId, node, provider, model)
6. Returns the AIResponse to the caller unchanged

**Integration points:**
- `src/scan/nodes/*.ts` — each node's AI call routed through `instrumentedSend`
- `src/lib/ai-chat.ts` — chat AI calls routed through `instrumentedSend`
- `/api/v1/providers/test` — provider test calls routed through `instrumentedSend` with `source: 'test'`

### Observability UI

**Dedicated page: `/observability`** — top-level nav item

- 4 summary cards: Total Calls (24h), Avg Latency, Token Usage (24h), Error Rate
- Full Carbon-styled data table with:
  - Columns: Checkbox | Timestamp | Provider | Model | In Tokens | Out Tokens | Think Tokens | Latency | Status | Expand
  - Expandable rows: click to reveal full system prompt, user prompt, response, rawRequest (JSON viewer), rawResponse (JSON viewer), endpoint, SDK+version, temperature, thinkingDepth, thinkingBudget, topP, topK, maxOutputTokens, userId, scanId, jobId, findingId, node
  - NO truncation on any field — full text shown with scrollable containers
  - Filters: text search (across prompts/responses), provider, model, status, source, date range
  - Sorting: timestamp, provider, model, latency, token counts, status
  - Pagination: configurable page size (25/50/100)
- Export individual AI call as JSON

**Enhanced Pipeline tab** in scan detail (`/scans/[id]`):
- Same expandable AI call table, pre-filtered by scanId
- Shows all AI calls made for that scan, grouped by node

---

## 3. Tasks

### Data Model

**Task:**

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | PK |
| `title` | String | Task title |
| `description` | Text | Rich description |
| `type` | TaskType | `FINDING_TRIAGE`, `REMEDIATION`, `MANUAL_REVIEW`, `MANUAL`, `AI_GENERATED` |
| `priority` | TaskPriority | `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO` |
| `status` | TaskStatus | `OPEN`, `IN_PROGRESS`, `BLOCKED`, `IN_REVIEW`, `COMPLETED`, `CANCELLED`, `DUPLICATE` |
| `findingId` | String? | Optional FK to Finding |
| `scanId` | String? | Denormalized from Finding for fast queries, null for standalone tasks |
| `assignedToId` | String? | FK to User |
| `createdById` | String? | FK to User who created. Null for system auto-created tasks (from findings). |
| `dueDate` | DateTime? | Optional deadline |
| `closedAt` | DateTime? | When completed/cancelled |
| `createdAt` | DateTime | |
| `updatedAt` | DateTime | |

**TaskComment:**

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | PK |
| `taskId` | String | FK to Task |
| `userId` | String | FK to User |
| `text` | Text | Comment body |
| `createdAt` | DateTime | |

**TaskHistory:**

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | PK |
| `taskId` | String | FK to Task |
| `userId` | String? | FK to User (null for system actions) |
| `action` | String | `STATUS_CHANGE`, `ASSIGNMENT`, `PRIORITY_CHANGE`, `TYPE_CHANGE`, `DUE_DATE_CHANGE`, `FINDING_LINKED`, `COMMENT_ADDED`, `CREATED` |
| `oldValue` | String? | |
| `newValue` | String? | |
| `createdAt` | DateTime | |

### Enums

```
TaskType: FINDING_TRIAGE | REMEDIATION | MANUAL_REVIEW | MANUAL | AI_GENERATED
TaskPriority: CRITICAL | HIGH | MEDIUM | LOW | INFO
TaskStatus: OPEN | IN_PROGRESS | BLOCKED | IN_REVIEW | COMPLETED | CANCELLED | DUPLICATE
```

### Task-Finding Bidirectional Sync

When `persistNode` creates a Finding with `status: OPEN`:
1. Auto-create a Task with `type: FINDING_TRIAGE`, `priority` mapped from severity (CRITICAL→CRITICAL, HIGH→HIGH, MEDIUM→MEDIUM, LOW→LOW, INFO→INFO), `findingId` linked, `scanId` from the scan, `createdById` set to the scan's userId
2. Finding's `assignedToId` changes sync to Task's `assignedToId` and vice versa
3. Finding's `status` changes do NOT sync to Task's `status` — they represent different workflows (finding alert status vs. task work status)

### Tasks UI

**Dedicated page: `/tasks`** — top-level nav item

Carbon-styled DataTable with AI Label Selection & Expansion pattern:

**Table columns:** Checkbox | Expand ▶ | Severity badge | Title | Priority | Status | Type | Assignee | Due | Overflow ⋯

**Selection:**
- Checkbox column enables multi-select
- Dark batch action toolbar slides in when rows selected: Reassign, Change Priority, Mark In Progress, Complete, Cancel, Deselect All
- Header checkbox = select all on current page

**Expansion (accordion):**
- Click ▶ or row to expand
- Expanded content has sub-tabs: **Details**, **Actions**, **Comments**, **AI Context**
  - **Details**: Full description, remediation, finding reference (link to alert), file location, CWE/OWASP badges, inline action buttons (Confirm, False Positive, Remediated, Accept Risk, AI Assist, Reassign)
  - **Actions**: TaskHistory timeline (status changes, assignments, priority changes with who/when/old→new)
  - **Comments**: Threaded TaskComment list + add comment input
  - **AI Context**: Relevant AiCallLog entries and linked finding details, with "AI Assist" that opens the global chat with task context

**Filtering toolbar:**
- Text search (title, description, file)
- Type, Priority, Status, Assignee (including "Unassigned"), Category, Severity filters
- Reset button to clear all filters
- Active filters shown as removable tags

**Sorting:**
- Click column headers (Title, Assignee, Due, Priority, Status)
- Active sort indicator: ▲/▼ in IBM Blue
- Multi-sort with shift-click

**Pagination:**
- Configurable rows per page: 25/50/100
- Page number buttons + Prev/Next

**Overflow menu (⋯):** Edit, Reassign, Change Priority, Duplicate, Link Finding, Delete, AI Assist

**New task creation:**
- Click "+ New task" → modal/slide-out with: title, description, type, priority, assignee, due date, optional finding link
- "AI Suggest" button → calls `/api/v1/tasks/ai-suggest` which analyzes open findings and returns task suggestions (preview, not auto-created)

### AI Task Suggestion

When user clicks "AI Suggest":
1. System collects all open/unassigned findings with severity HIGH or CRITICAL
2. Sends to AI with system prompt: "Analyze these security findings and suggest task groupings..."
3. AI returns suggested Task objects (title, description, type, priority, suggested assignee, findingIds to link)
4. UI shows suggestions as preview cards — user can accept, modify, or dismiss each
5. Accepting creates the Task(s) and links the findings

---

## 4. API Endpoints

### AI Observability

| Route | Method | Description |
|---|---|---|
| `/api/v1/ai-calls` | GET | List AI calls. Filters: `provider`, `model`, `status`, `source`, `scanId`, `jobId`, `findingId`, `userId`, `from`, `to`, `search`. Paginated. |
| `/api/v1/ai-calls/[id]` | GET | Single AI call — full rawRequest, rawResponse, prompts, response (no truncation) |
| `/api/v1/ai-calls/stats` | GET | Aggregated stats: total calls, avg latency, token totals, error rate, breakdown by provider/model/status |

### Tasks

| Route | Method | Description |
|---|---|---|
| `/api/v1/tasks` | GET | List tasks. Filters: `type`, `priority`, `status`, `assignedToId`, `scanId`, `severity`, `category`, `search`, `hasFinding`, `dueBefore`, `dueAfter`. Sortable. Paginated. |
| `/api/v1/tasks` | POST | Create task. RBAC: `canWrite()`. |
| `/api/v1/tasks/[id]` | GET | Full task with finding, comments, history. |
| `/api/v1/tasks/[id]` | PATCH | Update task. RBAC: `canWrite()`. Creates TaskHistory entries. |
| `/api/v1/tasks/[id]` | DELETE | Delete task. RBAC: `canAdmin()`. |
| `/api/v1/tasks/[id]/comments` | GET, POST | List/add task comments. |
| `/api/v1/tasks/[id]/history` | GET | Task history timeline. |
| `/api/v1/tasks/batch` | POST | Batch ops: `{ action, taskIds[], payload }`. RBAC: `canWrite()`. |
| `/api/v1/tasks/ai-suggest` | POST | AI analyzes findings and suggests tasks. Returns preview, does not create. |

---

## 5. Navigation Changes

Add two items to the top nav bar in AppShell:

```
Scans | Tasks | Observability | Configuration | Rules | Changelog
```

The "Tasks" and "Observability" pages are protected by auth (same middleware as other app routes).

---

## 6. Design Principles

- **No truncation**: Every AI call log stores and displays full raw request, raw response, prompts, and response text. Use scrollable containers in UI.
- **Carbon Design fidelity**: All UI follows IBM Carbon Design System via `context/ibm-design.md` and `frontend-design` skill — Plex Sans 300 for display, 0px border-radius, IBM Blue accent only, `letter-spacing: 0.16px`, surface-change hierarchy, no drop shadows.
- **Custom Carbon-styled components**: Continue using shadcn/ui base primitives styled with Carbon CSS variables. No `@carbon/react` package.
- **RBAC enforcement**: Task write operations require `canWrite()` (ANALYST+ADMIN). Delete requires `canAdmin()` (ADMIN only). Observability is read-only for all authenticated users.
- **Pino to file**: Structured logging with pino writes to rotating JSON log files + pretty console in dev. No DB transport for pino (deferred). AiCallLog always persists to DB.