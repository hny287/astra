import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';

const VALID_STATUSES = ['CANDIDATE', 'CONFIRMED', 'REJECTED'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role)) return NextResponse.json({ error: 'Insufficient role' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, violationDescription } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const rule = await prisma.businessLogicRule.findUnique({ where: { id } });
  if (!rule) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }

  const updated = await prisma.businessLogicRule.update({
    where: { id },
    data: {
      status,
      ...(violationDescription !== undefined ? { violationDescription } : {}),
    },
  });

  return NextResponse.json(updated);
}