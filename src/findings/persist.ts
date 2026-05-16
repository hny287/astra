import { prisma } from '@/lib/db';
import type { UnifiedFinding } from './types';
import { normalizeCategory, normalizeSeverity } from './normalize';
import { syncFindingFieldsToTask } from '@/lib/task-sync';

/**
 * Upsert a single finding to the DB. Used for incremental persist
 * from deep-scan, tool-scan, and cross-file nodes.
 */
export async function upsertFinding(finding: UnifiedFinding, scanId: string): Promise<void> {
  const existing = await prisma.finding.findFirst({
    where: { fingerprint: finding.fingerprint, scanId },
  });

  if (existing) {
    await prisma.finding.update({
      where: { id: existing.id },
      data: {
        title: finding.title,
        description: finding.description,
        severity: normalizeSeverity(finding.severity),
        category: normalizeCategory(finding.category),
        aiExplanation: finding.aiExplanation || null,
        aiFix: finding.aiFix || null,
        exploitationScenario: finding.exploitationScenario || null,
        exploitScore: finding.exploitScore ?? null,
        cvssScore: finding.cvssScore ?? null,
        cvssVector: finding.cvssVector || null,
        confidence: finding.confidence ?? null,
        remediation: finding.remediation || '',
      },
    });
    await syncFindingFieldsToTask(existing.id).catch(() => {});
  } else {
    await prisma.finding.create({
      data: {
        fingerprint: finding.fingerprint,
        scanId,
        scanner: finding.scanner,
        ruleId: finding.ruleId,
        title: finding.title,
        description: finding.description,
        severity: normalizeSeverity(finding.severity),
        category: normalizeCategory(finding.category),
        file: finding.file,
        lineStart: finding.lineStart,
        lineEnd: finding.lineEnd,
        codeSnippet: finding.codeSnippet || '',
        language: finding.language || '',
        cwe: finding.cwe,
        owasp: finding.owasp,
        aiExplanation: finding.aiExplanation || null,
        aiFix: finding.aiFix || null,
        exploitationScenario: finding.exploitationScenario || null,
        exploitScore: finding.exploitScore ?? null,
        cvssScore: finding.cvssScore ?? null,
        cvssVector: finding.cvssVector || null,
        confidence: finding.confidence ?? null,
        remediation: finding.remediation || '',
        rawJson: finding.raw as any,
      },
    });
  }
}

/**
 * Upsert multiple findings to the DB. Logs errors but doesn't throw.
 */
export async function upsertFindings(findings: UnifiedFinding[], scanId: string, logFn?: (msg: string) => void): Promise<string[]> {
  const errors: string[] = [];
  for (const finding of findings) {
    try {
      await upsertFinding(finding, scanId);
    } catch (err) {
      const msg = `Failed to upsert finding ${finding.fingerprint}: ${err instanceof Error ? err.message : String(err)}`;
      errors.push(msg);
      logFn?.(msg);
    }
  }
  return errors;
}