import { prisma } from '@/lib/db';

const SEVERITY_TO_PRIORITY: Record<string, string> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  INFO: 'INFO',
};

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
      priority: (SEVERITY_TO_PRIORITY[finding.severity] as any) || 'MEDIUM',
      status: 'OPEN',
      findingId: finding.id,
      scanId,
      createdById: userId ?? null,
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