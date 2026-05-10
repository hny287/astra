import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireScanOwnership, canWrite } from '@/lib/rbac';

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

  const scan = await prisma.scan.findUnique({ where: { id } });
  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  if (scan.status !== 'RUNNING' && scan.status !== 'PENDING') {
    return NextResponse.json({ error: 'Scan is not running or pending' }, { status: 400 });
  }

  await prisma.job.updateMany({
    where: { scanId: id, status: { in: ['PENDING', 'RUNNING'] } },
    data: { status: 'FAILED', error: 'Cancelled by user', completedAt: new Date() },
  });

  await prisma.scan.update({
    where: { id },
    data: { status: 'FAILED' },
  });

  return NextResponse.json({ scanId: id, status: 'FAILED' });
}