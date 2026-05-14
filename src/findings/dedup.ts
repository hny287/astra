import { createHash } from 'crypto';

export function fingerprint(scanner: string, ruleId: string, file: string, lineStart: number, title?: string): string {
  const hash = createHash('sha256');
  // Include title to distinguish multiple findings in the same file
  // with the same scanner/ruleId/lineStart (e.g., AI findings without distinct ruleIds)
  hash.update(`${scanner}:${ruleId}:${file}:${lineStart}:${title ?? ''}`);
  return hash.digest('hex').slice(0, 32);
}

export function isDuplicate(fp: string, existing: Set<string>): boolean {
  return existing.has(fp);
}