import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? undefined;
  const priority = searchParams.get('priority') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const assignedToId = searchParams.get('assignedToId') ?? undefined;
  const scanId = searchParams.get('scanId') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const hasFinding = searchParams.get('hasFinding') ?? undefined;
  const dueBefore = searchParams.get('dueBefore') ?? undefined;
  const dueAfter = searchParams.get('dueAfter') ?? undefined;
  const severity = searchParams.get('severity') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const { limit, offset } = parsePagination(request, 50);
  const sort = searchParams.get('sort') ?? 'createdAt';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (priority) where.priority = priority;
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (scanId) where.scanId = scanId;
  if (hasFinding === 'true') where.findingId = { not: null };
  else if (hasFinding === 'false') where.findingId = null;
  if (dueBefore || dueAfter) {
    const dueDateFilter: Record<string, Date> = {};
    if (dueBefore) dueDateFilter.lte = new Date(dueBefore);
    if (dueAfter) dueDateFilter.gte = new Date(dueAfter);
    where.dueDate = dueDateFilter;
  }
  if (severity || category) {
    const findingFilter: Record<string, unknown> = {};
    if (severity) findingFilter.severity = severity;
    if (category) findingFilter.category = category;
    where.finding = findingFilter;
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { [sort]: order },
      take: limit,
      skip: offset,
      include: {
        finding: { select: { id: true, severity: true, category: true, title: true, file: true, lineStart: true } },
        scan: { select: { id: true, repoUrl: true, branch: true, commitSha: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ tasks, total, limit, offset });
}

export async function POST(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;
  if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { title, description, type, priority, assignedToId, dueDate, findingId } = body;
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  let scanId: string | null = body.scanId ?? null;
  if (findingId) {
    const finding = await prisma.finding.findUnique({ where: { id: findingId } });
    if (finding) scanId = finding.scanId;
  }

  const closedAt = (type === 'COMPLETED' || type === 'CANCELLED') ? new Date() : undefined;

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? '',
      type: type ?? 'MANUAL',
      priority: priority ?? 'MEDIUM',
      status: 'OPEN',
      assignedToId: assignedToId ?? null,
      createdById: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      closedAt: closedAt ?? null,
      findingId: findingId ?? null,
      scanId,
    },
  });

  await prisma.taskHistory.create({
    data: { taskId: task.id, userId, action: 'CREATED', newValue: title },
  });

  return NextResponse.json(task, { status: 201 });
}