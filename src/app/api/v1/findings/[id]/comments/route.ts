import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const comments = await prisma.alertComment.findMany({
    where: { findingId: id },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ comments });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const { text } = await request.json();
  if (!text) return NextResponse.json({ error: 'text required' }, { status: 400 });

  const comment = await prisma.alertComment.create({
    data: { findingId: id, userId, text },
  });

  await prisma.alertHistory.create({
    data: { findingId: id, userId, action: 'COMMENT', newValue: text.substring(0, 100) },
  });

  return NextResponse.json(comment, { status: 201 });
}