import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getJobsForScan } from '@/scan/queue';
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

const POLL_INTERVAL_MS = 1000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError, userId, role } = await requireAuth();
  if (authError) return authError;

  const { id } = await params;

  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return new Response(JSON.stringify({ error: 'Scan not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let lastJobCount = 0;

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('connected', { scanId: id });

      const closed = new Promise<void>((resolve) => {
        request.signal.addEventListener('abort', () => resolve());
      });

      while (true) {
        const currentScan = await prisma.scan.findUnique({ where: { id } });
        if (!currentScan) {
          send('scan_failed', { error: 'Scan not found' });
          break;
        }

        const jobs = await getJobsForScan(id);

        if (jobs.length > lastJobCount) {
          for (let i = lastJobCount; i < jobs.length; i++) {
            const job = jobs[i];
            send('job_update', {
              id: job.id,
              node: job.node,
              status: job.status,
              attempts: job.attempts,
              error: job.error,
              startedAt: job.startedAt,
              completedAt: job.completedAt,
            });
          }
          lastJobCount = jobs.length;
        }

        for (const job of jobs) {
          if (job.status === 'RUNNING') {
            send('node_started', {
              node: job.node,
              startedAt: job.startedAt,
            });
          }
        }

        if (currentScan.status === 'COMPLETED') {
          send('scan_complete', { scanId: id, status: 'COMPLETED' });
          break;
        }

        if (currentScan.status === 'FAILED') {
          send('scan_failed', { scanId: id, status: 'FAILED' });
          break;
        }

        const sleep = new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        await Promise.race([sleep, closed]);

        if (request.signal.aborted) break;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}