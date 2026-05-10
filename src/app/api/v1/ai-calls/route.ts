import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const provider = searchParams.get('provider') ?? undefined;
  const model = searchParams.get('model') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const source = searchParams.get('source') ?? undefined;
  const scanId = searchParams.get('scanId') ?? undefined;
  const jobId = searchParams.get('jobId') ?? undefined;
  const findingId = searchParams.get('findingId') ?? undefined;
  const userId = searchParams.get('userId') ?? undefined;
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const { limit, offset } = parsePagination(request, 25);

  const where: Record<string, unknown> = {};
  if (provider) where.provider = provider;
  if (model) where.model = model;
  if (status) where.status = status as any;
  if (source) where.source = source;
  if (scanId) where.scanId = scanId;
  if (jobId) where.jobId = jobId;
  if (findingId) where.findingId = findingId;
  if (userId) where.userId = userId;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: new Date(from) }),
      ...(to && { lte: new Date(to) }),
    };
  }
  if (search) {
    where.OR = [
      { systemPrompt: { contains: search, mode: 'insensitive' } },
      { userPrompt: { contains: search, mode: 'insensitive' } },
      { response: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.aiCallLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        scanId: true,
        jobId: true,
        findingId: true,
        userId: true,
        source: true,
        node: true,
        provider: true,
        model: true,
        endpoint: true,
        inputTokens: true,
        outputTokens: true,
        thinkingTokens: true,
        latencyMs: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.aiCallLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, limit, offset });
}