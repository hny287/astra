import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite, canAdmin } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, taskIds, payload } = await request.json();
  if (!action || !Array.isArray(taskIds) || taskIds.length === 0) {
    return NextResponse.json({ error: 'action and taskIds required' }, { status: 400 });
  }

  if (action === 'delete') {
    if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    return NextResponse.json({ deleted: taskIds.length });
  }

  const results: { id: string; success: boolean; error?: string }[] = [];

  await prisma.$transaction(async (tx) => {
    for (const taskId of taskIds) {
      const task = await tx.task.findUnique({ where: { id: taskId } });
      if (!task) {
        results.push({ id: taskId, success: false, error: 'Not found' });
        continue;
      }

      const updateData: Record<string, unknown> = {};
      let historyAction = '';
      let oldValue: string | null = null;
      let newValue: string | null = null;

      switch (action) {
        case 'reassign':
          updateData.assignedToId = payload.assignedToId || null;
          historyAction = 'ASSIGNMENT';
          oldValue = task.assignedToId;
          newValue = payload.assignedToId || null;
          break;
        case 'changeSeverity':
          updateData.severity = payload.severity;
          historyAction = 'SEVERITY_CHANGE';
          oldValue = task.severity;
          newValue = payload.severity;
          break;
        case 'changeStatus':
          updateData.status = payload.status;
          historyAction = 'STATUS_CHANGE';
          oldValue = task.status;
          newValue = payload.status;
          if (payload.status === 'COMPLETED' || payload.status === 'CANCELLED') {
            updateData.closedAt = new Date();
          }
          break;
        default:
          results.push({ id: taskId, success: false, error: 'Unknown action' });
          continue;
      }

      await tx.task.update({ where: { id: taskId }, data: updateData });

      if (historyAction) {
        await tx.taskHistory.create({
          data: { taskId, userId, action: historyAction, oldValue, newValue },
        });
      }

      results.push({ id: taskId, success: true });
    }
  });

  return NextResponse.json({ results });
}