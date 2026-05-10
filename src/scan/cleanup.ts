import { prisma } from '@/lib/db';
import { cleanupStuckJobs } from './queue';

export async function cleanupStuckScans(): Promise<number> {
  const stuck = await prisma.scan.findMany({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      createdAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
    },
  });

  let count = 0;
  for (const scan of stuck) {
    const hasRunningJobs = await prisma.job.findFirst({
      where: { scanId: scan.id, status: 'RUNNING' },
    });
    if (hasRunningJobs) continue;

    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: 'FAILED' },
    });
    count++;
  }

  const stuckJobCount = await cleanupStuckJobs();

  return count + stuckJobCount;
}