import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite, canAdmin } from '@/lib/rbac';
import { syncTaskAssignmentToFinding } from '@/lib/task-sync';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      finding: true,
      scan: { select: { id: true, repoUrl: true, branch: true, commitSha: true, status: true, createdAt: true } },
      comments: { orderBy: { createdAt: 'asc' } },
      history: { orderBy: { createdAt: 'desc' } },
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  const historyEntries: { action: string; oldValue: string | null; newValue: string | null }[] = [];

  if (body.title !== undefined && body.title !== task.title) {
    updateData.title = body.title;
    historyEntries.push({ action: 'TITLE_CHANGE', oldValue: task.title, newValue: body.title });
  }
  if (body.description !== undefined && body.description !== task.description) {
    updateData.description = body.description;
    historyEntries.push({ action: 'DESCRIPTION_CHANGE', oldValue: task.description, newValue: body.description });
  }
  if (body.type !== undefined && body.type !== task.type) {
    updateData.type = body.type;
    historyEntries.push({ action: 'TYPE_CHANGE', oldValue: task.type, newValue: body.type });
  }
  if (body.priority !== undefined && body.priority !== task.priority) {
    updateData.priority = body.priority;
    historyEntries.push({ action: 'PRIORITY_CHANGE', oldValue: task.priority, newValue: body.priority });
  }
  if (body.status !== undefined && body.status !== task.status) {
    updateData.status = body.status;
    historyEntries.push({ action: 'STATUS_CHANGE', oldValue: task.status, newValue: body.status });
    if (body.status === 'COMPLETED' || body.status === 'CANCELLED') {
      updateData.closedAt = new Date();
    } else if (task.closedAt) {
      updateData.closedAt = null;
    }
  }
  if (body.assignedToId !== undefined) {
    const newAssignee = body.assignedToId || null;
    if (newAssignee !== task.assignedToId) {
      updateData.assignedToId = newAssignee;
      historyEntries.push({ action: 'ASSIGNMENT', oldValue: task.assignedToId, newValue: newAssignee });
      await syncTaskAssignmentToFinding(id, newAssignee);
    }
  }
  if (body.dueDate !== undefined) {
    const newDue = body.dueDate ? new Date(body.dueDate) : null;
    const oldDue = task.dueDate?.toISOString() ?? null;
    if (newDue?.toISOString() !== oldDue) {
      updateData.dueDate = newDue;
      historyEntries.push({ action: 'DUE_DATE_CHANGE', oldValue: oldDue, newValue: newDue?.toISOString() ?? null });
    }
  }
  if (body.findingId !== undefined) {
    const newFindingId = body.findingId || null;
    if (newFindingId !== task.findingId) {
      updateData.findingId = newFindingId;
      if (newFindingId) {
        const finding = await prisma.finding.findUnique({ where: { id: newFindingId } });
        if (!finding) return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
        if (!task.scanId && finding.scanId) updateData.scanId = finding.scanId;
      }
      historyEntries.push({ action: 'FINDING_LINK', oldValue: task.findingId, newValue: newFindingId });
    }
  }

  const updated = await prisma.task.update({ where: { id }, data: updateData });

  if (historyEntries.length > 0) {
    await prisma.taskHistory.createMany({
      data: historyEntries.map(e => ({ taskId: id, userId, ...e })),
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}