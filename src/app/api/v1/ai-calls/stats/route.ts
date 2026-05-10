import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }

  const [agg, byProvider, byModel, byStatus] = await Promise.all([
    prisma.aiCallLog.aggregate({
      where,
      _count: true,
      _avg: { latencyMs: true },
      _sum: { inputTokens: true, outputTokens: true },
    }),
    prisma.aiCallLog.groupBy({
      by: ['provider'],
      where,
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.aiCallLog.groupBy({
      by: ['model'],
      where,
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.aiCallLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
  ]);

  const errorWhere = { ...where, status: 'ERROR' as const };
  const errorCount = await prisma.aiCallLog.count({ where: errorWhere });
  const total = agg._count;
  const successCount = total - errorCount;

  return NextResponse.json({
    total,
    successCount,
    errorCount,
    errorRate: total > 0 ? errorCount / total : 0,
    avgLatencyMs: agg._avg.latencyMs ?? 0,
    totalInputTokens: agg._sum.inputTokens ?? 0,
    totalOutputTokens: agg._sum.outputTokens ?? 0,
    byProvider: byProvider.map((p) => ({
      provider: p.provider,
      count: p._count,
      avgLatencyMs: p._avg.latencyMs ?? 0,
    })),
    byModel: byModel.map((m) => ({
      model: m.model,
      count: m._count,
      avgLatencyMs: m._avg.latencyMs ?? 0,
    })),
    byStatus: byStatus.map((s) => ({
      status: s.status,
      count: s._count,
    })),
  });
}