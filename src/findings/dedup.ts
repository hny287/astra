import { createHash } from 'crypto';

export function fingerprint(scanner: string, ruleId: string, file: string, lineStart: number): string {
  const hash = createHash('sha256');
  hash.update(`${scanner}:${ruleId}:${file}:${lineStart}`);
  return hash.digest('hex').slice(0, 32);
}

export function isDuplicate(fp: string, existing: Set<string>): boolean {
  return existing.has(fp);
}