import type { ScanState } from '../state';

export async function aggregateNode(state: ScanState): Promise<Partial<ScanState>> {
  const allFindings = [...state.allFindings, ...state.crossFileFindings];

  const seen = new Set<string>();
  const deduplicatedFindings = allFindings.filter(f => {
    if (seen.has(f.fingerprint)) return false;
    seen.add(f.fingerprint);
    return true;
  });

  const allowedSeverities = new Set(state.config.scan.severity);
  const filtered = deduplicatedFindings.filter(f => allowedSeverities.has(f.severity));

  return {
    allFindings,
    deduplicatedFindings: filtered,
  };
}