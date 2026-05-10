import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getJobsForScan } from '@/scan/queue';
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const jobs = await getJobsForScan(id);

  const scanLogs = await prisma.scanLog.findMany({
    where: { scanId: id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      level: true,
      source: true,
      message: true,
      detail: true,
      createdAt: true,
    },
  });

  const logsBySource: Record<string, typeof scanLogs> = {};
  for (const log of scanLogs) {
    const src = log.source;
    if (!logsBySource[src]) logsBySource[src] = [];
    logsBySource[src].push(log);
  }

  const progress = jobs.map(job => ({
    id: job.id,
    node: job.node,
    status: job.status,
    attempts: job.attempts,
    error: job.error,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  }));

  const allCompleted = jobs.length > 0 && jobs.every(j => j.status === 'COMPLETED' || j.status === 'FAILED');
  const firstStartedAt = jobs.find(j => j.startedAt)?.startedAt;
  const lastCompletedAt = jobs.filter(j => j.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]?.completedAt;
  const totalElapsed = allCompleted && firstStartedAt && lastCompletedAt
    ? new Date(lastCompletedAt).getTime() - new Date(firstStartedAt).getTime()
    : null;

  const currentJob = jobs.find(j => j.status === 'RUNNING');
  const currentNode = currentJob?.node ?? null;

  const elapsed = currentJob?.startedAt
    ? Date.now() - new Date(currentJob.startedAt).getTime()
    : null;

  return NextResponse.json({
    scanId: id,
    scanStatus: scan.status,
    currentNode,
    elapsed,
    totalElapsed,
    jobs: progress,
    logsBySource,
  });
}