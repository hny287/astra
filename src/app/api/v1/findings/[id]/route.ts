import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { syncFindingAssignmentToTask, syncFindingStatusToTask, syncFindingFieldsToTask } from '@/lib/task-sync';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role, userId } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, assignedToId } = body;

  const finding = await prisma.finding.findUnique({ where: { id } });
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;

  const updated = await prisma.finding.update({ where: { id }, data: updateData });

  // Sync field changes to linked Task
  await syncFindingFieldsToTask(id).catch(() => {});

  if (status && status !== finding.status) {
    await prisma.alertHistory.create({
      data: { findingId: id, userId, action: 'STATUS_CHANGE', oldValue: finding.status, newValue: status },
    });
    await syncFindingStatusToTask(id, status);
  }
  if (assignedToId !== undefined && assignedToId !== finding.assignedToId) {
    await prisma.alertHistory.create({
      data: { findingId: id, userId, action: 'ASSIGNMENT', oldValue: finding.assignedToId, newValue: assignedToId || 'unassigned' },
    });
  }

  if (body.assignedToId !== undefined) {
    await syncFindingAssignmentToTask(id, body.assignedToId ?? null);
  }

  return NextResponse.json(updated);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const finding = await prisma.finding.findUnique({
    where: { id },
    include: {
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { name: true } } },
      },
      history: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
      task: true,
    },
  });
  if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
  return NextResponse.json(finding);
}