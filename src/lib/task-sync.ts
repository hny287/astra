import { prisma } from '@/lib/db';

export async function createTaskFromFinding(findingId: string, scanId: string, userId?: string) {
  const finding = await prisma.finding.findUnique({ where: { id: findingId } });
  if (!finding) return null;
  const existing = await prisma.task.findFirst({ where: { findingId } });
  if (existing) return existing;
  return prisma.task.create({
    data: {
      title: finding.title,
      description: finding.description,
      type: 'FINDING_TRIAGE',
      severity: finding.severity,
      status: finding.status,
      findingId: finding.id,
      scanId,
      createdById: userId ?? null,
      assignedToId: finding.assignedToId ?? null,
      // Copy rich scanner fields from Finding
      scanner: finding.scanner,
      ruleId: finding.ruleId,
      file: finding.file,
      lineStart: finding.lineStart,
      lineEnd: finding.lineEnd,
      codeSnippet: finding.codeSnippet,
      language: finding.language,
      category: finding.category,
      cwe: finding.cwe,
      owasp: finding.owasp,
      aiExplanation: finding.aiExplanation,
      aiFix: finding.aiFix,
      exploitationScenario: finding.exploitationScenario,
      exploitScore: finding.exploitScore,
      cvssScore: finding.cvssScore,
      confidence: finding.confidence,
      remediation: finding.remediation,
    },
  });
}

export async function syncFindingAssignmentToTask(findingId: string, assignedToId: string | null) {
  return prisma.task.updateMany({
    where: { findingId },
    data: { assignedToId },
  });
}

export async function syncTaskAssignmentToFinding(taskId: string, assignedToId: string | null) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task?.findingId) return;
  return prisma.finding.update({
    where: { id: task.findingId },
    data: { assignedToId },
  });
}

export async function syncFindingStatusToTask(findingId: string, status: string) {
  return prisma.task.updateMany({
    where: { findingId },
    data: { status: status as any },
  });
}

export async function syncTaskStatusToFinding(taskId: string, status: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task?.findingId) return;
  return prisma.finding.update({
    where: { id: task.findingId },
    data: { status: status as any },
  });
}