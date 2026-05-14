import type { ScanState } from '../state';
import { prisma } from '@/lib/db';
import { createTaskFromFinding, syncFindingFieldsToTask } from '@/lib/task-sync';

const VALID_CATEGORIES = ['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'] as const;
type ValidCategory = typeof VALID_CATEGORIES[number];

const CATEGORY_MAP: Record<string, ValidCategory> = {
  SAST: 'SAST',
  SCA: 'SCA',
  SECRETS: 'SECRETS',
  IAC: 'IAC',
  DATA_FLOW: 'DATA_FLOW',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  CONFIGURATION: 'IAC',
  MISCONFIGURATION: 'IAC',
  INSECURE_DESIGN: 'SAST',
  INJECTION: 'SAST',
  BROKEN_ACCESS_CONTROL: 'BUSINESS_LOGIC',
  CRYPTO: 'SAST',
  CRYPTOGRAPHY: 'SAST',
  XSS: 'SAST',
  SQL_INJECTION: 'SAST',
  AUTH: 'BUSINESS_LOGIC',
  AUTHENTICATION: 'BUSINESS_LOGIC',
  AUTHORIZATION: 'BUSINESS_LOGIC',
  VULNERABILITY: 'SAST',
  DEPENDENCY: 'SCA',
  DEPENDENCIES: 'SCA',
  SECRET: 'SECRETS',
  HARDCODED_SECRET: 'SECRETS',
  LEAK: 'SECRETS',
  COMPLIANCE: 'IAC',
  INFRASTRUCTURE: 'IAC',
  DATA_EXPOSURE: 'DATA_FLOW',
  PRIVACY: 'DATA_FLOW',
  LOGIC: 'BUSINESS_LOGIC',
};

function normalizeCategory(raw: string): ValidCategory {
  const upper = (raw || 'SAST').toUpperCase().replace(/[^A-Z_]/g, '_');
  if ((VALID_CATEGORIES as readonly string[]).includes(upper)) return upper as ValidCategory;
  return CATEGORY_MAP[upper] ?? 'SAST';
}

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
type ValidSeverity = typeof VALID_SEVERITIES[number];

function normalizeSeverity(raw: string): ValidSeverity {
  const upper = (raw || 'MEDIUM').toUpperCase();
  if ((VALID_SEVERITIES as readonly string[]).includes(upper)) return upper as ValidSeverity;
  return 'MEDIUM';
}

export async function persistNode(state: ScanState): Promise<Partial<ScanState>> {
  const errors: string[] = [];

  try {
    for (const finding of state.deduplicatedFindings) {
      const existing = await prisma.finding.findFirst({
        where: { fingerprint: finding.fingerprint, scanId: state.scanId },
      });
      if (existing) {
        await prisma.finding.update({
          where: { id: existing.id },
          data: {
            title: finding.title,
            description: finding.description,
            severity: normalizeSeverity(finding.severity),
            category: normalizeCategory(finding.category),
            aiExplanation: finding.aiExplanation,
            aiFix: finding.aiFix,
            exploitationScenario: finding.exploitationScenario,
            exploitScore: finding.exploitScore,
            cvssScore: finding.cvssScore,
            cvssVector: finding.cvssVector || null,
            confidence: finding.confidence,
          },
        });
        // Sync updated fields to any linked Task
        await syncFindingFieldsToTask(existing.id).catch(() => {});
      } else {
        await prisma.finding.create({
          data: {
            fingerprint: finding.fingerprint,
            scanId: state.scanId,
            scanner: finding.scanner,
            ruleId: finding.ruleId,
            title: finding.title,
            description: finding.description,
            severity: normalizeSeverity(finding.severity),
            category: normalizeCategory(finding.category),
            file: finding.file,
            lineStart: finding.lineStart,
            lineEnd: finding.lineEnd,
            codeSnippet: finding.codeSnippet,
            language: finding.language,
            cwe: finding.cwe,
            owasp: finding.owasp,
            aiExplanation: finding.aiExplanation,
            aiFix: finding.aiFix,
            exploitationScenario: finding.exploitationScenario,
            exploitScore: finding.exploitScore,
            cvssScore: finding.cvssScore,
            cvssVector: finding.cvssVector || null,
            confidence: finding.confidence,
            remediation: finding.remediation,
            rawJson: finding.raw as any,
          },
        });
      }
    }

    const taskCreationErrors: string[] = [];
    for (const finding of state.deduplicatedFindings) {
      const severity = finding.severity?.toUpperCase() || 'MEDIUM';
      if (severity === 'CRITICAL' || severity === 'HIGH' || severity === 'MEDIUM') {
        try {
          const existing = await prisma.finding.findFirst({
            where: { fingerprint: finding.fingerprint, scanId: state.scanId },
            select: { id: true },
          });
          if (existing) {
            await createTaskFromFinding(existing.id, state.scanId, state.userId ?? undefined);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          taskCreationErrors.push(`Task creation failed for ${finding.fingerprint}: ${msg}`);
        }
      }
    }
    if (taskCreationErrors.length > 0) {
      errors.push(...taskCreationErrors);
    }

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

    await prisma.scan.update({
      where: { id: state.scanId },
      data: {
        commitSha: state.commitSha || undefined,
        totalInputTokens: state.tokenUsage.input,
        totalOutputTokens: state.tokenUsage.output,
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