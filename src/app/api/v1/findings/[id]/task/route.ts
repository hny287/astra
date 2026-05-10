import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { createTaskFromFinding } from '@/lib/task-sync';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role, userId } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const finding = await prisma.finding.findUnique({ where: { id } });
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

  // Check if task already exists for this finding
  const existing = await prisma.task.findUnique({ where: { findingId: id } });
  if (existing) {
    return NextResponse.json({ task: existing, message: 'Task already exists for this finding' });
  }

  const task = await createTaskFromFinding(id, finding.scanId, userId!);
  return NextResponse.json({ task }, { status: 201 });
}