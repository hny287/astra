import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const scanId = searchParams.get('scanId') ?? undefined;
  const active = searchParams.get('active');
  const global = searchParams.get('global');

  const where: Record<string, unknown> = {};
  if (scanId) where.scanId = scanId;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;
  if (global === 'true') where.scanId = null;
  if (global === 'false') where.scanId = { not: null };

  const rules = await prisma.userRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { name, description, ruleText, severity, category, cwe, scanId } = body;

  if (!name || !ruleText) {
    return NextResponse.json({ error: 'name and ruleText are required' }, { status: 400 });
  }

  // If scanId provided, verify the scan exists
  if (scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
  }

  const rule = await prisma.userRule.create({
    data: {
      name,
      description: description ?? '',
      ruleText,
      severity: severity ?? 'MEDIUM',
      category: category ?? 'SAST',
      cwe: cwe ?? [],
      scanId: scanId ?? null,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}