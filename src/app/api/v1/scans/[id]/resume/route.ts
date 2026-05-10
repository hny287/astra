import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueJob, getPipeline, cleanupStuckJobs, type NodeName } from '@/scan/queue';
import { processNextJob } from '@/scan/worker';
import { requireAuth, requireScanOwnership, canWrite } from '@/lib/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (scan.status === 'COMPLETED') {
    return NextResponse.json({ error: 'Scan already completed. Use re-run-node instead.' }, { status: 400 });
  }

  await cleanupStuckJobs();

  const runningJobs = await prisma.job.count({
    where: { scanId: id, status: { in: ['PENDING', 'RUNNING'] } },
  });

  if (runningJobs > 0) {
    return NextResponse.json({ error: 'Scan already has pending/running jobs. Cancel the scan first, then resume.' }, { status: 400 });
  }

  const completedJobs = await prisma.job.findMany({
    where: { scanId: id, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

  const completedNodes = new Set(completedJobs.map(j => j.node));
  const pipeline = getPipeline();
  const firstIncomplete = pipeline.find(n => !completedNodes.has(n));

  if (!firstIncomplete) {
    await prisma.scan.update({ where: { id }, data: { status: 'COMPLETED' } });
    return NextResponse.json({ scanId: id, status: 'COMPLETED' });
  }

  const lastCompletedJob = completedJobs.length > 0 ? completedJobs[0] : null;
  const inputJson = lastCompletedJob ? (lastCompletedJob.outputJson as Record<string, unknown>) : { repoUrl: scan.repoUrl, branch: scan.branch, config: scan.configJson };

  await enqueueJob(id, firstIncomplete as NodeName, inputJson);
  await prisma.scan.update({ where: { id }, data: { status: 'RUNNING' } });

  void processNextJob();

  return NextResponse.json({ scanId: id, status: 'RUNNING', resumedFromNode: firstIncomplete });
}