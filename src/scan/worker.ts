import fs from 'fs/promises';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/structured-logger';
import { TEMP_DIR_PREFIX } from '@/lib/branding';
import { claimNextJob, markJobComplete, markJobFailed, enqueueNextJob, markScanCompletedIfNeeded, markScanFailed, type NodeName } from './queue';
import { cloneNode } from './nodes/clone';
import { discoverNode } from './nodes/discover';
import { gitIngestNode } from './nodes/git-ingest';
import { gitDiagramNode } from './nodes/git-diagram';
import { toolScanNode } from './nodes/tool-scan';
import { deepScanNode } from './nodes/deep-scan';
import { crossFileNode } from './nodes/cross-file';
import { aggregateNode } from './nodes/aggregate';
import { persistNode } from './nodes/persist';
import type { ScanState } from './state';

const NODE_FNS: Record<string, (state: ScanState) => Promise<Partial<ScanState>>> = {
  clone: cloneNode,
  discover: discoverNode,
  git_ingest: gitIngestNode,
  git_diagram: gitDiagramNode,
  tool_scan: toolScanNode,
  deep_scan: deepScanNode,
  cross_file: crossFileNode,
  aggregate: aggregateNode,
  persist: persistNode,
};

async function cleanupScanTmpDir(scanId: string): Promise<void> {
  try {
    const cloneJob = await prisma.job.findFirst({
      where: { scanId, node: 'clone', status: 'COMPLETED' },
    });
    if (!cloneJob) return;
    const output = cloneJob.outputJson as Record<string, unknown> | null;
    const localDir = output?.localDir as string | undefined;
    if (localDir && localDir.includes(TEMP_DIR_PREFIX)) {
      await fs.rm(localDir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup
  }
}

export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false;

  const { id: jobId, scanId, node, inputJson } = job;
  logger.info({ scanId, node, jobId }, 'Processing job');

  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) {
    logger.warn({ scanId, jobId }, 'Skipping job: scan not found');
    await markJobFailed(jobId, 'Scan not found');
    return true;
  }

  if (scan.status === 'FAILED' || scan.status === 'COMPLETED') {
    logger.warn({ scanId, jobId, scanStatus: scan.status }, 'Skipping job: scan already terminal');
    await markJobFailed(jobId, `Scan already ${scan.status}`);
    return true;
  }

  try {
    const state = await reconstructState(scanId, inputJson);
    state.scanId = scanId;
    state.currentJobId = jobId;
    state.userId = scan.userId ?? undefined;
    state.currentJobInput = inputJson as Record<string, unknown>;

    const nodeFn = NODE_FNS[node];
    if (!nodeFn) {
      throw new Error(`Unknown node: ${node}`);
    }

    const result = await nodeFn(state);

    const outputJson = { ...result } as Record<string, unknown>;

    if (result.errors && result.errors.length > 0) {
      outputJson._errors = result.errors;
    }
    if (result.tokenUsage) {
      outputJson._tokenUsage = result.tokenUsage;
    }

    await markJobComplete(jobId, outputJson);

    if (result.status === 'FAILED') {
      logger.error({ scanId, node }, 'Node reported failure');
      const currentScan = await prisma.scan.findUnique({ where: { id: scanId } });
      if (currentScan && currentScan.status !== 'COMPLETED') {
        await markScanFailed(scanId);
        await cleanupScanTmpDir(scanId);
      }
      return true;
    }

    const nextJobId = await enqueueNextJob(scanId, node as NodeName, outputJson);

    if (!nextJobId) {
      const completed = await markScanCompletedIfNeeded(scanId);
      if (!completed) {
        const currentScan = await prisma.scan.findUnique({ where: { id: scanId } });
        if (currentScan && currentScan.status !== 'COMPLETED') {
          await markScanFailed(scanId);
          await cleanupScanTmpDir(scanId);
        }
      }
      return true;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ jobId, err: message }, 'Job failed');
    await markJobFailed(jobId, message);
    const currentScan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (currentScan && currentScan.status !== 'COMPLETED') {
      await markScanFailed(scanId);
      await cleanupScanTmpDir(scanId);
    }
  }

  return true;
}

async function reconstructState(scanId: string, currentInput: Record<string, unknown>): Promise<ScanState> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) throw new Error(`Scan ${scanId} not found`);

  const baseState: ScanState = {
    repoUrl: scan.repoUrl,
    branch: scan.branch,
    scanId,
    config: scan.configJson as ScanState['config'],
    localDir: '',
    commitSha: '',
    discoveredFiles: [],
    skippedFiles: [],
    totalFiles: 0,
    repoIntel: null,
    architectureDiagram: '',
    toolFindings: [],
    findingsPerFile: {},
    fileSummaries: [],
    crossFileFindings: [],
    businessRules: [],
    allFindings: [],
    deduplicatedFindings: [],
    errors: [],
    tokenUsage: { input: 0, output: 0, thinking: 0 },
    status: 'RUNNING',
  };

  const completedJobs = await prisma.job.findMany({
    where: { scanId, status: 'COMPLETED' },
    orderBy: { createdAt: 'asc' },
  });

  for (const job of completedJobs) {
    const out = job.outputJson as Record<string, unknown>;
    mergeStateFromOutput(baseState, job.node, out);
  }

  mergeStateFromOutput(baseState, '', currentInput);

  return baseState;
}

function mergeStateFromOutput(state: ScanState, _node: string, output: Record<string, unknown>): void {
  if (output.localDir) state.localDir = output.localDir as string;
  if (output.commitSha) state.commitSha = output.commitSha as string;
  if (output.status) state.status = output.status as ScanState['status'];
  if (output.discoveredFiles) state.discoveredFiles = output.discoveredFiles as any[];
  if (output.skippedFiles) state.skippedFiles = output.skippedFiles as string[];
  if (output.totalFiles) state.totalFiles = output.totalFiles as number;
  if (output.repoIntel) state.repoIntel = output.repoIntel as ScanState['repoIntel'];
  if (output.architectureDiagram) state.architectureDiagram = output.architectureDiagram as string;
  if (output.toolFindings) state.toolFindings = output.toolFindings as any[];
  if (output.findingsPerFile) state.findingsPerFile = output.findingsPerFile as Record<string, any>;
  if (output.fileSummaries) state.fileSummaries = output.fileSummaries as any[];
  if (output.crossFileFindings) state.crossFileFindings = output.crossFileFindings as any[];
  if (output.businessRules) state.businessRules = output.businessRules as any[];
  if (output.allFindings) state.allFindings = output.allFindings as any[];
  if (output.deduplicatedFindings) state.deduplicatedFindings = output.deduplicatedFindings as any[];
  if (output.errors) state.errors = [...state.errors, ...(output.errors as string[])];
  if (output._tokenUsage) {
    const tu = output._tokenUsage as { input: number; output: number; thinking: number };
    state.tokenUsage = {
      input: state.tokenUsage.input + (tu.input ?? 0),
      output: state.tokenUsage.output + (tu.output ?? 0),
      thinking: state.tokenUsage.thinking + (tu.thinking ?? 0),
    };
  }
}

const POLL_INTERVAL_MS = 3000;
let workerRunning = false;

export async function startWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  while (workerRunning) {
    try {
      const hadJob = await processNextJob();
      if (!hadJob) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Worker loop error');
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

export function stopWorker(): void {
  workerRunning = false;
}