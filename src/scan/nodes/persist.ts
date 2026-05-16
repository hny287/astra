import type { ScanState } from '../state';
import { prisma } from '@/lib/db';
import { createTaskFromFinding } from '@/lib/task-sync';

export async function persistNode(state: ScanState): Promise<Partial<ScanState>> {
  const errors: string[] = [];

  try {
    // Findings are persisted incrementally by deep-scan, tool-scan, and cross-file.
    // Here we create tasks for high-severity findings and save business rules + scan metadata.

    const findings = await prisma.finding.findMany({
      where: { scanId: state.scanId },
      select: { id: true, fingerprint: true, severity: true },
    });

    // Create tasks for CRITICAL/HIGH/MEDIUM findings
    const taskCreationErrors: string[] = [];
    for (const finding of findings) {
      const severity = finding.severity.toUpperCase();
      if (severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM') {
        try {
          await createTaskFromFinding(finding.id, state.scanId, state.userId ?? undefined);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          taskCreationErrors.push(`Task creation failed for ${finding.fingerprint}: ${msg}`);
        }
      }
    }
    if (taskCreationErrors.length > 0) {
      errors.push(...taskCreationErrors);
    }

    // Persist business rules
    for (const rule of state.businessRules) {
      await prisma.businessLogicRule.create({
        data: {
          scanId: state.scanId,
          ruleText: rule.ruleText,
          confidence: rule.confidence,
          evidenceFiles: rule.evidenceFiles,
          status: rule.status as any,
          violationDescription: rule.violationDescription,
        },
      });
    }

    // Update scan metadata
    await prisma.scan.update({
      where: { id: state.scanId },
      data: {
        commitSha: state.commitSha || undefined,
        totalInputTokens: state.tokenUsage.input,
        totalOutputTokens: state.tokenUsage.output,
        repoIntel: state.repoIntel ? (state.repoIntel as any) : undefined,
        architectureDiagram: state.architectureDiagram || undefined,
        toolFindingsCount: state.toolFindings?.length ?? 0,
      },
    });

    return { status: 'COMPLETED' as const, errors };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`Persist failed: ${message}`);

    try {
      await prisma.scan.update({
        where: { id: state.scanId },
        data: { status: 'FAILED' },
      });
    } catch {}

    return { status: 'FAILED' as const, errors };
  }
}