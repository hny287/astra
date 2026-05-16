import { prisma } from '@/lib/db';
import { logger } from '@/lib/structured-logger';

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
  logger.info({ scanId, node, jobId: job.id }, 'Job enqueued');
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

  logger.info({ scanId: claimed.scanId, node: claimed.node, jobId: claimed.id, attempt: claimed.attempts }, 'Job claimed');
  return {
    id: claimed.id,
    scanId: claimed.scanId,
    node: claimed.node,
    inputJson: claimed.inputJson as Record<string, unknown>,
  };
}

export async function markJobComplete(jobId: string, outputJson: Record<string, unknown>): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      outputJson: outputJson as any,
      completedAt: new Date(),
    },
  });
  const durationMs = job?.startedAt ? Date.now() - job.startedAt.getTime() : null;
  logger.info({ jobId, scanId: job?.scanId, node: job?.node, durationMs }, 'Job completed');
}

export async function markJobFailed(jobId: string, error: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.attempts >= job.maxAttempts) {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error, completedAt: new Date() },
    });
    logger.error({ jobId, scanId: job.scanId, node: job.node, error, attempts: job.attempts }, 'Job failed permanently');
  } else {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING', error },
    });
    logger.warn({ jobId, scanId: job.scanId, node: job.node, error, attempts: job.attempts }, 'Job failed, re-enqueued for retry');
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
  logger.info({ scanId }, 'Pipeline started: enqueuing clone job');
  await enqueueJob(scanId, 'clone', initialInput);
}

export async function enqueueNextJob(scanId: string, completedNode: NodeName, outputJson: Record<string, unknown>): Promise<string | null> {
  const nextNode = getNextNode(completedNode);
  if (!nextNode) {
    logger.info({ scanId, completedNode }, 'Pipeline complete: no next node after persist');
    return null;
  }

  const existingPending = await prisma.job.findFirst({
    where: { scanId, node: nextNode, status: { in: ['PENDING', 'RUNNING'] } },
  });
  if (existingPending) {
    logger.info({ scanId, completedNode, nextNode, jobId: existingPending.id }, 'Next job already exists, skipping enqueue');
    return existingPending.id;
  }

  const jobId = await enqueueJob(scanId, nextNode, outputJson);
  logger.info({ scanId, completedNode, nextNode, jobId }, 'Enqueued next job');
  return jobId;
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
  if (hasUnrecoveredFailure) {
    logger.warn({ scanId }, 'Persist completed but unrecovered failures exist, not marking scan complete');
    return false;
  }

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
  logger.info({ scanId, durationSeconds }, 'Scan completed');
  return true;
}

export async function markScanFailed(scanId: string): Promise<void> {
  await prisma.scan.update({
    where: { id: scanId },
    data: { status: 'FAILED' },
  });
  logger.error({ scanId }, 'Scan marked as FAILED');
}

export async function cleanupStuckJobs(): Promise<number> {
  const stuck = await prisma.job.findMany({
    where: {
      status: 'RUNNING',
      startedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
    },
  });
  if (stuck.length === 0) return 0;

  for (const job of stuck) {
    if (job.attempts >= job.maxAttempts) {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'FAILED', error: 'Timed out', completedAt: new Date() },
      });
      logger.warn({ jobId: job.id, scanId: job.scanId, node: job.node }, 'Stuck job timed out, marked FAILED');
    } else {
      await prisma.job.update({
        where: { id: job.id },
        data: { status: 'PENDING', startedAt: null },
      });
      logger.warn({ jobId: job.id, scanId: job.scanId, node: job.node }, 'Stuck job reset to PENDING for retry');
    }
  }
  logger.info({ count: stuck.length }, 'Stuck jobs cleaned up');
  return stuck.length;
}