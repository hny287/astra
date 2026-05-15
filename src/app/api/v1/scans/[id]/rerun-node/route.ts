import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { enqueueJob, type NodeName } from '@/scan/queue';
import { processNextJob } from '@/scan/worker';
import { requireAuth, requireScanOwnership, canWrite } from '@/lib/rbac';

const NODE_TO_SCANNER: Record<string, string[]> = {
  clone: [],
  discover: ['ai-discover'],
  git_ingest: [],
  git_diagram: [],
  tool_scan: ['trivy', 'gitleaks'],
  deep_scan: ['ai-layer-1'],
  cross_file: ['ai-layer-2'],
  aggregate: [],
  persist: [],
};

const VALID_NODES: NodeName[] = ['clone', 'discover', 'git_ingest', 'git_diagram', 'tool_scan', 'deep_scan', 'cross_file', 'aggregate', 'persist'];

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

  const body = await request.json().catch(() => ({}));
  const { node } = body as { node?: string };

  if (!node || !VALID_NODES.includes(node as NodeName)) {
    return NextResponse.json({ error: 'Invalid or missing node name' }, { status: 400 });
  }

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  await prisma.job.deleteMany({
    where: { scanId: id, node },
  });

  const scannersToDelete = NODE_TO_SCANNER[node] ?? [];
  if (scannersToDelete.length > 0) {
    await prisma.finding.deleteMany({
      where: {
        scanId: id,
        scanner: { in: scannersToDelete },
      },
    });
  }

  const completedJobs = await prisma.job.findMany({
    where: { scanId: id, status: 'COMPLETED' },
    orderBy: { createdAt: 'desc' },
  });

  const prevJob = completedJobs.find(j => {
    const pipeline = VALID_NODES;
    const nodeIdx = pipeline.indexOf(node as NodeName);
    const jobIdx = pipeline.indexOf(j.node as NodeName);
    return jobIdx < nodeIdx;
  });

  const inputJson = prevJob
    ? (prevJob.outputJson as Record<string, unknown>)
    : { repoUrl: scan.repoUrl, branch: scan.branch, config: scan.configJson };

  await enqueueJob(id, node as NodeName, inputJson);

  void processNextJob();

  await prisma.scan.update({
    where: { id },
    data: { status: 'RUNNING' },
  });

  return NextResponse.json({ scanId: id, node, status: 'RUNNING' });
}