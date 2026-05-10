import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;
  const node = request.nextUrl.searchParams.get('node') ?? undefined;

  const outputs = await prisma.nodeOutput.findMany({
    where: {
      scanId: id,
      ...(node ? { node } : {}),
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ outputs });
}