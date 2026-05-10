import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const history = await prisma.alertHistory.findMany({
    where: { findingId: id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ history });
}