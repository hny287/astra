import { prisma } from '@/lib/db';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export async function log(
  scanId: string,
  level: LogLevel,
  source: string,
  message: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.scanLog.create({
      data: {
        scanId,
        level,
        source,
        message,
        detail: detail as any,
      },
    });
  } catch {}
}

export async function getLogs(
  scanId: string,
  afterId?: string,
  limit = 200,
): Promise<{ id: string; level: string; source: string; message: string; detail: any; createdAt: string }[]> {
  const where = afterId ? { scanId, id: { gt: afterId } } : { scanId };
  const rows = await prisma.scanLog.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  return rows.map(r => ({
    ...r,
    detail: r.detail as any,
    createdAt: r.createdAt.toISOString(),
  }));
}