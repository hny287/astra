import type { UnifiedFinding, Severity } from './types';

const severityOrder: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFO: 1,
};

export function aggregate(findingsArrays: UnifiedFinding[][]): UnifiedFinding[] {
  const all = findingsArrays.flat();
  const seen = new Map<string, UnifiedFinding>();

  for (const f of all) {
    const existing = seen.get(f.fingerprint);
    if (!existing) {
      seen.set(f.fingerprint, f);
    } else if (severityOrder[f.severity] > severityOrder[existing.severity]) {
      seen.set(f.fingerprint, f);
    }
  }

  return Array.from(seen.values()).sort((a, b) => {
    return (severityOrder[b.severity] ?? 0) - (severityOrder[a.severity] ?? 0);
  });
}