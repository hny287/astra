import type { ScanState } from '../state';
import { prisma } from '@/lib/db';
import { createTaskFromFinding } from '@/lib/task-sync';
import { log } from '../log';

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

    // SLA enforcement: check SLA-type rules and set deadlines on matching findings
    const slaRules = await prisma.userRule.findMany({
      where: { type: 'SLA', isActive: true },
    });

    if (slaRules.length > 0) {
      for (const rule of slaRules) {
        if (!rule.slaSeverity || !rule.slaHours) continue;
        const matchingFindings = findings.filter(f => f.severity.toUpperCase() === rule.slaSeverity!.toUpperCase());
        for (const finding of matchingFindings) {
          try {
            await prisma.finding.update({
              where: { id: finding.id },
              data: {
                slaDeadline: new Date(Date.now() + rule.slaHours! * 60 * 60 * 1000),
              },
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`SLA deadline update failed for finding ${finding.id}: ${msg}`);
          }
        }
      }
      await log(state.scanId, 'info', 'persist', `SLA enforcement: checked ${slaRules.length} SLA rule(s) against ${findings.length} finding(s)`);
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