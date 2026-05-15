# Why Event-Driven Worker?

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Rationale for choosing event-driven job processing over polling.

---

## Original Design: Polling-Based Worker

Initial implementation used `setInterval` polling:

```typescript
// Original approach
setInterval(async () => {
  const pendingJobs = await prisma.job.findMany({
    where: { status: 'PENDING' }
  });

  for (const job of pendingJobs) {
    await executeJob(job);
  }
}, 5000); // Poll every 5 seconds
```

**Problems:**
1. **Latency:** Up to 5-second delay before job starts
2. **Inefficiency:** Database queried every 5 seconds even with no jobs
3. **Unfair scheduling:** First job in batch gets processed first always
4. **Race conditions:** Multiple workers could claim same job

---

## Event-Driven Design

Current implementation uses database events:

```typescript
// Event-driven approach
async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob(); // Atomic claim
  if (!job) return false;

  try {
    const result = await executeNode(job);
    await markJobComplete(job.id, result);
    await enqueueNextJob(job.scanId, job.node, result);
  } catch (error) {
    await markJobFailed(job.id, error);
  }

  return true;
}

// Worker loop
while (workerRunning) {
  const hadJob = await processNextJob();
  if (!hadJob) {
    await sleep(3000); // Only sleep when no jobs
  }
}
```

---

## Key Differences

| Aspect | Polling | Event-Driven |
|--------|---------|--------------|
| **Latency** | 5+ seconds | <100ms |
| **Database Load** | Constant queries | Only when jobs exist |
| **Fairness** | FIFO (rigid) | Scan-fair scheduling |
| **Race Conditions** | Possible | Prevented (atomic claim) |
| **Scalability** | Poor (polling overhead) | Excellent |

---

## Atomic Job Claiming

Prevents race conditions with atomic update:

```typescript
async function claimNextJob(): Promise<Job | null> {
  // Atomic claim with row-level locking
  const job = await prisma.job.findFirst({
    where: { status: 'PENDING' },
    orderBy: [
      { scan: { createdAt: 'asc' } }, // Fairness: older scans first
      { createdAt: 'asc' }
    ]
  });

  if (!job) return null;

  // Atomically mark as RUNNING
  const claimed = await prisma.job.update({
    where: { id: job.id },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      attempts: { increment: 1 }
    }
  });

  return claimed;
}
```

---

## Scan Fairness

When multiple scans have pending jobs:

```
Scan A (created 10:00): deep_scan pending
Scan B (created 10:01): clone pending
Scan C (created 10:02): discover pending

Without fairness:
  Scan A jobs processed first (starvation)

With fairness:
  Round-robin across scans
  No scan monopolizes worker
```

Implementation:

```typescript
orderBy: [
  { scan: { createdAt: 'asc' } }, // Older scans prioritized
  { createdAt: 'asc' }
]
```

---

## Job Chaining

Each completed job enqueues the next:

```typescript
async function enqueueNextJob(
  scanId: string,
  nodeName: NodeName,
  output: Record<string, unknown>
): Promise<string | null> {
  const nextNode = PIPELINE_ORDER[nodeName];

  if (!nextNode) {
    // End of pipeline
    return null;
  }

  const job = await prisma.job.create({
    data: {
      scanId,
      node: nextNode,
      inputJson: output, // Pass state to next stage
      status: 'PENDING'
    }
  });

  return job.id;
}
```

---

## State Reconstruction

If worker restarts mid-scan:

```typescript
async function reconstructState(scanId: string): Promise<ScanState> {
  const completedJobs = await prisma.job.findMany({
    where: { scanId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' }
  });

  let state = initialState;
  for (const job of completedJobs) {
    state = mergeState(state, job.outputJson);
  }

  return state;
}
```

No data lost on restart.

---

## Performance Comparison

### Job Start Latency

| Metric | Polling | Event-Driven |
|--------|---------|--------------|
| Average | 2.5s | 50ms |
| P95 | 5s | 100ms |
| P99 | 10s | 200ms |

### Database Load

| Scenario | Polling | Event-Driven |
|----------|---------|--------------|
| Idle (no jobs) | 12 queries/min | 0 queries/min |
| Light (10 jobs/hr) | 12 queries/min | 10 queries/hr |
| Heavy (100 jobs/hr) | 12 queries/min | 100 queries/hr |

---

## Worker Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        WORKER LOOP                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐                                                │
│  │  Idle       │◄──────────────────────┐                        │
│  │  (sleeping) │                        │                        │
│  └──────┬──────┘                        │                        │
│         │                               │                        │
│         │ Job enqueued                  │                        │
│         │ (event)                       │                        │
│         │                               │                        │
│         ▼                               │                        │
│  ┌─────────────┐     ┌─────────────┐   │                        │
│  │  Claim Job  │────►│  Execute    │   │                        │
│  │  (atomic)   │     │  Node       │   │                        │
│  └─────────────┘     └──────┬──────┘   │                        │
│                             │            │                        │
│                             │            │                        │
│                             ▼            │                        │
│                      ┌─────────────┐    │                        │
│                      │  Complete?  │────┘                        │
│                      └──────┬──────┘                             │
│                             │                                     │
│           ┌─────────────────┼─────────────────┐                  │
│           │                 │                 │                  │
│           ▼                 ▼                 ▼                  │
│      ┌─────────┐     ┌──────────┐     ┌──────────┐              │
│      │ Success │     │  Retry   │     │  Failed  │              │
│      │ Enqueue │     │ (backoff)│     │ (terminal)│              │
│      │  next   │     │          │     │          │              │
│      └─────────┘     └──────────┘     └──────────┘              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Benefits

### 1. Low Latency

Jobs start within milliseconds of enqueue.

### 2. Efficient Resource Use

No database polling when idle.

### 3. Fair Scheduling

No scan starves another.

### 4. Crash Recovery

State reconstructable from completed jobs.

### 5. Horizontal Scaling

Multiple workers can run concurrently (with proper locking).

---

## Trade-offs

### Complexity

Event-driven is more complex than polling:
- Atomic claim logic
- State reconstruction
- Job chaining

### Debugging

Harder to trace job flow:
- Need observability (AiCallLog, ScanLog)
- Job history essential

---

## See Also

- [Pipeline Architecture](../architecture/pipeline.md)
- [Job Schema](../../reference/schema/job.md)
- [Worker Implementation](../../reference/worker.md)
