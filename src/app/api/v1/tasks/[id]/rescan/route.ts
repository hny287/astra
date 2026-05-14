import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { enqueueJob } from '@/scan/queue';
import { processNextJob } from '@/scan/worker';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { finding: true },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (!task.finding) {
    return NextResponse.json({ error: 'Task has no linked finding — cannot rescan' }, { status: 400 });
  }

  const finding = task.finding;
  const scan = await prisma.scan.findUnique({ where: { id: finding.scanId! } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  // Get the latest completed deep_scan job for this scan
  const deepScanJob = await prisma.job.findFirst({
    where: { scanId: scan.id, node: 'deep_scan', status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

  if (!deepScanJob) {
    return NextResponse.json({ error: 'No completed deep_scan job found for this scan' }, { status: 400 });
  }

  // Delete old deep_scan findings for this specific file
  await prisma.finding.deleteMany({
    where: {
      scanId: scan.id,
      file: finding.file,
      scanner: 'ai-layer-1',
    },
  });

  // Enqueue a new deep_scan job scoped to this single file
  const inputJson = {
    ...(deepScanJob.outputJson as Record<string, unknown> ?? {}),
    singleFile: finding.file,
    singleFileLanguage: finding.language || 'unknown',
  };

  await enqueueJob(scan.id, 'deep_scan', inputJson);
  await prisma.scan.update({ where: { id: scan.id }, data: { status: 'RUNNING' } });

  void processNextJob();

  return NextResponse.json({
    taskId: id,
    findingId: finding.id,
    scanId: scan.id,
    file: finding.file,
    status: 'RUNNING',
    message: `Rescanning file: ${finding.file} for task: ${task.title}`,
  });
}