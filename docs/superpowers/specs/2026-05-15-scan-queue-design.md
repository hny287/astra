# Scan Queue Design

**Date:** 2026-05-15  
**Status:** Draft  
**Scope:** Replace single-threaded polling worker with a configurable multi-backend job queue

## Problem

The current scan pipeline uses a single-threaded polling worker (`processNextJob()` in `worker.ts`) that:
- Processes one job at a time — scans queue up sequentially
- Has no priority system — manual triggers wait behind scheduled scans
- No scheduling — scans start immediately or never
- No concurrency — a 17K-file pipedream scan blocks all other scans
- No cancellation awareness — deep_scan batches keep running after user cancels
- Stuck jobs block the queue — a hung `git_ingest` starves all other scans

## Requirements

1. **Inter-scan parallelism** — Run up to N scans concurrently (configurable via env)
2. **Priority ordering** — Manual triggers > scheduled > low-priority background scans
3. **Scheduled scans** — Defer scan start to a future time
4. **Recurring scans** — Cron-based repeat scans (nightly, weekly, etc.)
5. **Cancellation awareness** — Workers check scan status between pipeline stages
6. **Robustness** — Stuck job detection, retry with backoff, proper status transitions
7. **Observability** — Queue depth, active scans, wait times via API
8. **Configurable backend** — PostgreSQL (default, zero infra), Redis/BullMQ, or external MQ

## Architecture

### Queue Backend Interface

```typescript
interface ScanQueue {
  enqueue(scanId: string, priority: Priority, scheduledAt?: Date): Promise<void>
  dequeue(): Promise<QueueJob | null>
  markRunning(jobId: string): Promise<void>
  markComplete(jobId: string, output: Record<string, unknown>): Promise<void>
  markFailed(jobId: string, error: string): Promise<void>
  cancel(scanId: string): Promise<void>
  getQueueStats(): Promise<QueueStats>
}

interface QueueJob {
  id: string
  scanId: string
  priority: Priority  // 'critical' | 'high' | 'normal' | 'low'
  status: 'pending' | 'running' | 'completed' | 'failed'
  scheduledAt: Date | null
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
  attempts: number
  error: string | null
}

type Priority = 'critical' | 'high' | 'normal' | 'low'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}
```

### Backends

| Backend | Env `QUEUE_BACKEND` | Dependencies | Best For |
|---|---|---|---|
| PostgreSQL | `postgres` | None (existing DB) | Single-server, low volume |
| Redis/BullMQ | `redis` | Redis | Multi-server, high volume, real-time |
| External MQ | `mq` | Redis + RabbitMQ/NATS/SQS | Enterprise, existing MQ infra |

### Environment Configuration

```bash
QUEUE_BACKEND=postgres          # postgres | redis | mq (default: postgres)
MAX_CONCURRENT_SCANS=3          # Worker pool size (default: 3)
REDIS_URL=redis://localhost:6379  # Required for redis and mq backends
MQ_URL=amqp://user:pass@host:5672  # Required for mq backend (RabbitMQ, NATS, SQS)
QUEUE_POLL_INTERVAL_MS=1000     # Polling interval for postgres backend (default: 1000)
JOB_RETRY_MAX=3                 # Max retries per job (default: 3)
JOB_RETRY_BACKOFF_MS=5000       # Exponential backoff base (default: 5000)
STUCK_JOB_TIMEOUT_MS=600000    # 10 minutes — mark RUNNING jobs as stuck (default: 600000)
```

### Data Model Changes

#### Scan model additions

```prisma
model Scan {
  // ... existing fields ...
  priority     Priority    @default(NORMAL)    // critical | high | normal | low
  scheduledAt  DateTime?                        // Defer start to this time
  cron         String?                          // Cron expression for recurring scans
  recurrenceId String?                          // Links recurring scans to their template
  queueBackend String?                          // Which backend processed this (for observability)
}
```

#### Job model additions

```prisma
model Job {
  // ... existing fields ...
  priority  Int      @default(2)    // 0=critical, 1=high, 2=normal, 3=low
  scheduledAt DateTime?            // When this job becomes eligible to run
}
```

### Worker Pool

Replace the single-threaded `while (workerRunning)` loop with a worker pool:

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async start() {
    for (let i = 0; i < this.maxConcurrent; i++) {
      const worker = new Worker(i);
      this.workers.push(worker);
      worker.start(); // Each worker polls claimNextAvailableScan()
    }
  }

  async stop() {
    for (const worker of this.workers) {
      worker.stop();
    }
  }
}

class Worker {
  private running = true;

  async start() {
    while (this.running) {
      const scan = await queue.dequeue(); // Priority-aware, respects scheduledAt
      if (!scan) {
        await sleep(QUEUE_POLL_INTERVAL_MS);
        continue;
      }
      await this.runPipeline(scan);
    }
  }

  async runPipeline(scan: Scan) {
    // Run all 9 pipeline nodes sequentially for this scan
    // Check scan.status between nodes for cancellation
    for (const node of PIPELINE) {
      const currentScan = await prisma.scan.findUnique({ where: { id: scan.id } });
      if (currentScan?.status === 'FAILED') {
        logger.info({ scanId: scan.id }, 'Scan cancelled, stopping pipeline');
        break;
      }
      await this.runNode(scan.id, node);
    }
  }
}
```

### Priority System

| Priority | Value | Use Case |
|---|---|---|
| `critical` | 0 | Manual user trigger, re-scan of specific file |
| `high` | 1 | Manual user trigger (default for new scans) |
| `normal` | 2 | Scheduled one-time scan |
| `low` | 3 | Recurring/background scan |

`claimNextAvailableScan()` picks the highest-priority, oldest-creation-time scan where:
- `status = PENDING` or first job is `PENDING`
- `scheduledAt IS NULL OR scheduledAt <= now()`
- The scan doesn't already have `MAX_CONCURRENT_SCANS` running nodes

### Scheduled & Recurring Scans

#### One-time scheduled scan

```json
POST /api/v1/scans
{
  "repoUrl": "https://github.com/org/repo",
  "branch": "main",
  "scheduledAt": "2026-05-16T02:00:00Z"
}
```

The scan is created with `status: PENDING` and `scheduledAt: 2026-05-16T02:00:00Z`. The worker only picks it up when `scheduledAt <= now()`.

#### Recurring scan (cron)

```json
POST /api/v1/scans
{
  "repoUrl": "https://github.com/org/repo",
  "branch": "main",
  "cron": "0 2 * * *"
}
```

A cron checker (runs every minute) evaluates all Scan records with a `cron` field:
1. Calculate next run time from cron expression
2. If next run time has passed and no scan exists for this recurrence in the current window, create a new Scan with `scheduledAt: nextRunTime`
3. Link the new scan to the template via `recurrenceId`

### Cancellation Awareness

Already partially implemented (deep_scan checks `scan.status` between batches). Expand to all long-running nodes:

```typescript
// In worker, between pipeline nodes:
async runPipeline(scan: Scan) {
  for (const node of PIPELINE) {
    // Check for cancellation before each node
    const current = await prisma.scan.findUnique({ where: { id: scan.id } });
    if (current?.status === 'FAILED') {
      await markScanFailed(scan.id);
      return;
    }
    await this.runNode(scan.id, node);
  }
}
```

Deep_scan already checks between batches. Add similar checks in:
- `git_ingest` (after codegraph build)
- `tool_scan` (between Trivy and Gitleaks runs)
- `cross_file` (before AI call)

### Stuck Job Recovery

Replace the existing `cleanupStuckJobs()` with a more robust version:

```typescript
async function recoverStuckJobs() {
  const stuckJobs = await prisma.job.findMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: new Date(Date.now() - STUCK_JOB_TIMEOUT_MS) },
    },
  });

  for (const job of stuckJobs) {
    if (job.attempts >= job.maxAttempts) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: 'Job timed out', completedAt: new Date() },
      });
      // Mark the scan as failed too
      await markScanFailed(job.scanId);
    } else {
      // Reset to PENDING for retry
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'PENDING', startedAt: null },
      });
    }
  }
}
```

Run `recoverStuckJobs()` on a 60-second interval alongside the worker pool.

### API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/v1/scans` | Create scan (supports `scheduledAt`, `cron`, `priority`) |
| `POST` | `/api/v1/scans/:id/cancel` | Cancel running scan |
| `POST` | `/api/v1/scans/:id/resume` | Resume failed scan from last completed node |
| `GET` | `/api/v1/scans/:id/progress` | Job status, logs, elapsed time |
| `GET` | `/api/v1/queue/stats` | Queue depth, active/waiting/completed counts |
| `POST` | `/api/v1/queue/recover` | Manually trigger stuck job recovery |

### Implementation Order

1. **Priority + scheduled scans** — Add `priority`, `scheduledAt` to Scan model; update `claimNextJob` to respect them; update API
2. **Worker pool** — Replace single worker with `MAX_CONCURRENT_SCANS` workers
3. **Cancellation awareness** — Add scan status checks between all pipeline nodes
4. **Stuck job recovery** — Improve `cleanupStuckJobs()` with proper timeout and retry
5. **Queue backend abstraction** — Create `ScanQueue` interface, implement `PostgresQueue`
6. **Redis/BullMQ backend** — Implement `RedisQueue` with BullMQ
7. **MQ backend** — Implement `MQQueue` with Redis state + external broker
8. **Recurring scans** — Cron checker, `recurrenceId`, template scan management
9. **Queue stats API** — Observability endpoint

## Migration Path

- Phase 1 (this PR): Steps 1-4 — priority, scheduling, worker pool, cancellation, stuck recovery
- Phase 2: Step 5 — queue backend abstraction (interface + postgres implementation)
- Phase 3: Steps 6-7 — Redis and MQ backends
- Phase 4: Steps 8-9 — recurring scans and observability

No breaking changes at any phase. The postgres backend uses the existing Job model with added fields.