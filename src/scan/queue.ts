import { prisma } from '@/lib/db';

const NODE_PIPELINE = ['clone', 'discover', 'git_ingest', 'git_diagram', 'tool_scan', 'deep_scan', 'cross_file', 'aggregate', 'persist'] as const;

export type NodeName = typeof NODE_PIPELINE[number];

export function getPipeline(): readonly NodeName[] {
  return NODE_PIPELINE;
}

export function getNextNode(current: NodeName): NodeName | null {
  const idx = NODE_PIPELINE.indexOf(current);
  if (idx === -1 || idx === NODE_PIPELINE.length - 1) return null;
  return NODE_PIPELINE[idx + 1];
}

export async function enqueueJob(
  scanId: string,
  node: NodeName,
  inputJson: Record<string, unknown> = {},
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      scanId,
      node,
      status: 'PENDING',
      inputJson: inputJson as any,
    },
  });
  return job.id;
}

export async function claimNextJob(): Promise<{
  id: string;
  scanId: string;
  node: string;
  inputJson: Record<string, unknown>;
} | null> {
  const job = await prisma.job.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return null;

  const claimed = await prisma.job.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date(), attempts: { increment: 1 } },
  });

  return {
    id: claimed.id,
    scanId: claimed.scanId,
    node: claimed.node,
    inputJson: claimed.inputJson as Record<string, unknown>,
  };
}

export async function markJobComplete(jobId: string, outputJson: Record<string, unknown>): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      outputJson: outputJson as any,
      completedAt: new Date(),
    },
  });
}

export async function markJobFailed(jobId: string, error: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error, completedAt: new Date() },
    });
  } else {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING', error },
    });
  }
}

export async function getJobsForScan(scanId: string) {
  return prisma.job.findMany({
    where: { scanId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getJobStatus(scanId: string, node: string) {
  return prisma.job.findFirst({
    where: { scanId, node },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getLastCompletedJob(scanId: string): Promise<{
  node: string;
  outputJson: Record<string, unknown>;
} | null> {
  const job = await prisma.job.findFirst({
    where: { scanId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
  });
  if (!job) return null;
  return { node: job.node, outputJson: job.outputJson as Record<string, unknown> };
}

export async function enqueuePipeline(scanId: string, initialInput: Record<string, unknown> = {}): Promise<void> {
  await enqueueJob(scanId, 'clone', initialInput);
}

export async function enqueueNextJob(scanId: string, completedNode: NodeName, outputJson: Record<string, unknown>): Promise<string | null> {
  const nextNode = getNextNode(completedNode);
  if (!nextNode) return null;

  const existingPending = await prisma.job.findFirst({
    where: { scanId, node: nextNode, status: { in: ['PENDING', 'RUNNING'] } },
  });
  if (existingPending) return existingPending.id;

  return enqueueJob(scanId, nextNode, outputJson);
}

export async function markScanCompletedIfNeeded(scanId: string): Promise<boolean> {
  const persistJob = await prisma.job.findFirst({
    where: { scanId, node: 'persist', status: 'COMPLETED' },
  });
  if (!persistJob) return false;

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return false;

  const allJobs = await prisma.job.findMany({ where: { scanId } });
  const pipelineNodes = getPipeline();
  let hasUnrecoveredFailure = false;
  for (const node of pipelineNodes) {
    const nodeJobs = allJobs.filter(j => j.node === node);
    const hasCompleted = nodeJobs.some(j => j.status === 'COMPLETED');
    const hasFailed = nodeJobs.some(j => j.status === 'FAILED');
    if (hasFailed && !hasCompleted) {
      hasUnrecoveredFailure = true;
      break;
    }
  }
  if (hasUnrecoveredFailure) return false;

  const durationSeconds = scan.createdAt
    ? Math.round((persistJob.completedAt!.getTime() - scan.createdAt.getTime()) / 1000)
    : null;

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: 'COMPLETED',
      ...(durationSeconds != null ? { durationSeconds } : {}),
    },
  });
  return true;
}

export async function markScanFailed(scanId: string): Promise<void> {
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: 'FAILED' },
  });
}

export async function cleanupStuckJobs(): Promise<number> {
  const stuck = await prisma.job.findMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  for (const job of stuck) {
    if (job.attempts >= job.maxAttempts) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: 'Timed out', completedAt: new Date() },
      });
    } else {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'PENDING', startedAt: null },
      });
    }
  }
  return stuck.length;
}