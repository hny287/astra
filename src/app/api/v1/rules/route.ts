import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;
  const { searchParams } = request.nextUrl;
  const scanId = searchParams.get('scanId') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const where: Record<string, unknown> = {};
  if (scanId) where.scanId = scanId;
  if (status) where.status = status;

  const rules = await prisma.businessLogicRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}