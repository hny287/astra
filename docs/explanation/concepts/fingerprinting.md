# Finding Fingerprinting

**Last updated:** 2026-05-15 | **Version:** v2.23.0

How Astra deduplicates findings across multiple scanner sources.

---

## The Problem

When multiple scanners analyze the same codebase:

- Trivy finds a vulnerability in `src/auth/login.ts:42`
- Semgrep finds the same vulnerability
- AI Deep Scan also detects it

Without deduplication, users see 3 separate findings for the same issue.

---

## The Solution: SHA-256 Fingerprinting

Astra generates a unique fingerprint for each finding:

```
fingerprint = SHA-256(scanner + ruleId + file + lineStart + lineEnd)
```

---

## Fingerprint Components

| Component | Source | Example |
|-----------|--------|---------|
| `scanner` | Scanner name | `trivy`, `semgrep`, `deep_scan` |
| `ruleId` | Rule identifier | `CVE-2024-1234`, `sql-injection-001` |
| `file` | File path | `src/auth/login.ts` |
| `lineStart` | Starting line | `42` |
| `lineEnd` | Ending line | `48` |

---

## Deduplication Process

```
┌──────────────────────────────────────────────────────────────────┐
│                     AGGREGATE STAGE                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: All findings from all sources                           │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │  Trivy      │  │  Semgrep    │  │  Deep Scan  │             │
│  │  15 findings│  │  20 findings│  │  25 findings│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                         │
│              │  Compute Fingerprints │                         │
│              │  SHA-256(scanner+...) │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                         │
│              │  Group by Fingerprint │                         │
│              │  Merge duplicates     │                         │
│              └───────────┬───────────┘                         │
│                          │                                      │
│                          ▼                                      │
│              ┌───────────────────────┐                         │
│              │  23 unique findings   │                         │
│              │  (from 60 total)      │                         │
│              └───────────────────────┘                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Merging Duplicates

When multiple scanners find the same vulnerability:

### Before Merge

```json
[
  {
    "scanner": "trivy",
    "ruleId": "CVE-2024-1234",
    "file": "src/auth/login.ts",
    "lineStart": 42,
    "lineEnd": 48,
    "severity": "HIGH"
  },
  {
    "scanner": "semgrep",
    "ruleId": "sql-injection-001",
    "file": "src/auth/login.ts",
    "lineStart": 42,
    "lineEnd": 48,
    "severity": "ERROR"
  }
]
```

### After Merge

```json
{
  "fingerprint": "sha256:abc123...",
  "sources": ["trivy", "semgrep"],
  "file": "src/auth/login.ts",
  "lineStart": 42,
  "lineEnd": 48,
  "severity": "CRITICAL",
  "mergedFrom": ["finding-1", "finding-2"],
  "aiExplanation": "Consolidated explanation from AI analysis..."
}
```

---

## Benefits

### 1. Reduced Noise

- 60 raw findings → 23 unique findings
- Users triage once, not multiple times
- Cleaner reports

### 2. Enriched Metadata

- Multiple sources increase confidence
- Combined rule IDs for better categorization
- Richer context for AI analysis

### 3. Accurate Metrics

- True vulnerability count
- Better severity distribution
- Correct SLA tracking

---

## Edge Cases

### Same File, Different Lines

```
Finding A: src/auth/login.ts:42-48
Finding B: src/auth/login.ts:50-55
```

**Result:** Different fingerprints (different lines) → Both kept

---

### Same Vulnerability, Different Files

```
Finding A: src/auth/login.ts:42-48
Finding B: src/api/user.ts:15-20
```

**Result:** Different fingerprints (different files) → Both kept

---

### Scanner Disagreement

```
Finding A (Trivy): severity HIGH
Finding B (Semgrep): severity ERROR
```

**Result:** Merged with highest severity (CRITICAL)

---

## Implementation

```typescript
import { createHash } from 'crypto';

function computeFingerprint(finding: Finding): string {
  const data = `${finding.scanner}:${finding.ruleId}:${finding.file}:${finding.lineStart}:${finding.lineEnd}`;
  return createHash('sha256').update(data).digest('hex');
}

function deduplicate(findings: Finding[]): Finding[] {
  const byFingerprint = new Map<string, Finding[]>();

  for (const finding of findings) {
    const fp = computeFingerprint(finding);
    if (!byFingerprint.has(fp)) {
      byFingerprint.set(fp, []);
    }
    byFingerprint.get(fp)!.push(finding);
  }

  return Array.from(byFingerprint.entries()).map(([fp, group]) => ({
    fingerprint: fp,
    sources: group.map(f => f.scanner),
    ...mergeFindings(group)
  }));
}
```

---

## Limitations

### What Fingerprinting Doesn't Catch

1. **Semantic duplicates:** Same vulnerability, slightly different location
2. **Cross-file duplicates:** Vulnerability spans multiple files
3. **AI-only findings:** No scanner/ruleId for comparison

### Future Enhancements

- Semantic similarity detection
- Cross-file fingerprinting
- ML-based deduplication

---

## See Also

- [Aggregate Node](../../tutorials/02-scan-pipeline.md#stage-8-aggregate)
- [Finding Schema](../../reference/schema/finding.md)
- [Scanner Coverage](../../docs/README.md#scanner-coverage)
