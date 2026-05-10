import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { loadConfigFromDb, mergeNodeOverrides } from '@/lib/config';
import { enqueuePipeline } from '@/scan/queue';
import { startWorker } from '@/scan/worker';
import { requireAuth } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { repoUrl, branch, config: configOverrides } = body;

  if (!repoUrl || typeof repoUrl !== 'string') {
    return NextResponse.json({ error: 'repoUrl is required' }, { status: 400 });
  }

  let config;
  try {
    config = await loadConfigFromDb();
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }

  if (configOverrides?.nodes) {
    config = mergeNodeOverrides(config, configOverrides.nodes);
  }

  if (body.instructions) {
    (config as any).instructions = body.instructions;
  }

  const scan = await prisma.scan.create({
    data: {
      repoUrl,
      branch: branch ?? 'main',
      configJson: config as any,
      status: 'PENDING',
      userId: userId ?? null,
    },
  });

  if (body.rules && Array.isArray(body.rules)) {
    for (const rule of body.rules) {
      if (rule.name && rule.ruleText) {
        await prisma.userRule.create({
          data: {
            name: rule.name,
            description: rule.description ?? '',
            ruleText: rule.ruleText,
            severity: rule.severity ?? 'MEDIUM',
            category: rule.category ?? 'SAST',
            cwe: rule.cwe ?? [],
            scanId: scan.id,
          },
        });
      }
    }
  }

  await enqueuePipeline(scan.id, { repoUrl, branch: branch ?? 'main', config });

  void startWorker();

  return NextResponse.json({ scanId: scan.id, status: 'PENDING' }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const { limit, offset } = parsePagination(request);

  const where = status ? { status: status as any } : {};

  const [scans, total] = await Promise.all([
    prisma.scan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.scan.count({ where }),
  ]);

  return NextResponse.json({ scans, total, limit, offset });
}