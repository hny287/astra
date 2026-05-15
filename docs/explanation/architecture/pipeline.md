# Scan Pipeline Architecture

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Detailed architecture of the 9-stage scan pipeline.

---

## Pipeline DAG

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    SCAN PIPELINE                       │
                    └─────────────────────────────────────────────────────────┘

    ┌─────────┐
    │  clone  │ Git clone, map structure, detect languages
    └────┬────┘
         │
         ▼
    ┌───────────┐
    │  discover  │ AI ranks files by security relevance
    └─────┬─────┘
          │
          ▼
    ┌────────────┐
    │  git_ingest │ Analyze commit history, contributors, hotspots
    └──────┬─────┘
           │
           ▼
    ┌─────────────┐
    │  git_diagram │ Generate Mermaid architecture diagram
    └──────┬──────┘
           │
           ▼
    ┌────────────┐
    │  tool_scan  │ Trivy, Semgrep, Gitleaks, Bearer
    └──────┬─────┘
           │
           ▼
    ┌─────────────┐
    │  deep_scan  │ Per-file AI analysis (parallel)
    └──────┬──────┘
           │
           ▼
    ┌──────────────┐
    │  cross_file  │ Cross-module business logic inference
    └──────┬───────┘
           │
           ▼
    ┌────────────┐
    │  aggregate  │ SHA-256 deduplication, fingerprinting
    └──────┬─────┘
           │
           ▼
    ┌─────────┐
    │  persist │ Save findings, create tasks, update scan status
    └─────────┘
```

---

## Stage Details

### 1. Clone

**Input:** `repoUrl`, `branch`, GitHub PAT (if private)

**Process:**
- Shallow git clone to temp directory
- PAT injection for private repos
- Language detection
- File tree mapping

**Output:**
```json
{
  "localDir": "/tmp/astra-scan-abc123",
  "commitSha": "f4e2d1c8b9a7...",
  "languages": ["TypeScript", "Python"],
  "totalFiles": 342
}
```

---

### 2. Discover

**Input:** File tree from clone

**Process:**
- AI analyzes file paths and structure
- Ranks files by security relevance
- Creates prioritized queue

**Output:**
```json
{
  "discoveredFiles": [
    {"path": "src/auth/login.ts", "priority": 0.95}
  ],
  "totalFiles": 342
}
```

---

### 3. Git Ingest

**Input:** Git repository

**Process:**
- Commit history analysis
- Contributor mapping
- Hotspot identification
- Suspicious pattern detection

**Output:**
```json
{
  "repoIntel": {
    "totalCommits": 1247,
    "contributors": 23,
    "hotspots": [...]
  }
}
```

---

### 4. Git Diagram

**Input:** Code structure

**Process:**
- Parse import/export statements
- Build dependency graph
- Generate Mermaid diagram

**Output:**
```json
{
  "architectureDiagram": "mermaid\ngraph TD..."
}
```

---

### 5. Tool Scan

**Input:** Local repository

**Process:**
- Execute Trivy (SCA, IaC, secrets)
- Execute Semgrep (SAST)
- Execute Gitleaks (secrets)
- Execute Bearer (data flow)

**Output:**
```json
{
  "toolFindings": [
    {"scanner": "trivy", "severity": "HIGH", ...}
  ],
  "toolFindingsCount": 47
}
```

---

### 6. Deep Scan

**Input:** Prioritized files

**Process:**
- Per-file AI analysis (parallel)
- SAST, secrets, data flow detection
- AI explanations and fixes
- CVSS scoring

**Output:**
```json
{
  "findingsPerFile": {...},
  "fileSummaries": [...],
  "tokenUsage": {"input": 45230, "output": 12450}
}
```

---

### 7. Cross-File

**Input:** All file analyses

**Process:**
- Cross-module data flow analysis
- Business logic inference
- Security invariant detection

**Output:**
```json
{
  "crossFileFindings": [...],
  "businessRules": [...]
}
```

---

### 8. Aggregate

**Input:** All findings from all sources

**Process:**
- SHA-256 fingerprinting
- Deduplication
- Severity reconciliation
- Source merging

**Output:**
```json
{
  "allFindings": [...],
  "deduplicatedFindings": [...],
  "totalUniqueFindings": 23
}
```

---

### 9. Persist

**Input:** Final findings

**Process:**
- Create Finding records
- Link to scan
- Auto-create tasks for HIGH/CRITICAL
- Update scan status

**Output:**
```json
{
  "status": "COMPLETED",
  "findingsCreated": 23,
  "tasksCreated": 8
}
```

---

## Job Execution Model

### Queue Structure

```
┌─────────────────────────────────────────────────────────┐
│                      JOB QUEUE                          │
├─────────────────────────────────────────────────────────┤
│  scan-1/clone  scan-2/clone  scan-1/discover  scan-3/clone  │
│       ↑                                                      │
│       │                                                      │
│   Worker claims next (FIFO with scan fairness)              │
└─────────────────────────────────────────────────────────┘
```

### Job Lifecycle

```
PENDING ──► RUNNING ──► COMPLETED
              │
              ├──► FAILED (retry, max 3 attempts)
              │
              └──► FAILED (terminal, mark scan failed)
```

### Fairness Algorithm

When multiple scans have pending jobs:
1. Sort by scan creation time
2. Within each scan, respect DAG order
3. No scan starves another

---

## Error Handling

### Node Failure

1. Job marked FAILED
2. Retry up to `maxAttempts` (default: 3)
3. Exponential backoff between retries
4. After final failure, scan marked FAILED

### Scan Failure

1. All pending jobs cancelled
2. Temp directories cleaned up
3. Partial findings preserved
4. User can resume or re-run nodes

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

---

## Performance Characteristics

### Typical Scan Times

| Repo Size | Files | Time |
|-----------|-------|------|
| Small | <100 | 3–5 min |
| Medium | 100–500 | 10–20 min |
| Large | 500–2000 | 30–60 min |
| Very Large | >2000 | 1–2 hours |

### Bottlenecks

1. **Deep Scan:** Per-file AI calls (parallelized)
2. **Cross-File:** Complex reasoning (sequential)
3. **Tool Scan:** External tool execution

### Optimization Levers

- Increase `concurrency` for deepScan
- Reduce `scanDepth` for faster scans
- Use cheaper/faster AI models
- Ignore non-essential files

---

## See Also

- [System Overview](./overview.md)
- [Worker Implementation](../../reference/worker.md)
- [Scan Pipeline Tutorial](../../tutorials/02-scan-pipeline.md)
