import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canWrite } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? undefined;
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
  if (severity) where.severity = severity;
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
  if (category) where.category = category;
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
        finding: { select: { id: true, severity: true, category: true, title: true, file: true, lineStart: true, lineEnd: true, codeSnippet: true, cwe: true, owasp: true, exploitationScenario: true, exploitScore: true, cvssScore: true, confidence: true, remediation: true, aiExplanation: true, aiFix: true } },
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
  const { title, description, type, severity, assignedToId, dueDate, findingId } = body;
  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

  let scanId: string | null = body.scanId ?? null;
  if (findingId) {
    const finding = await prisma.finding.findUnique({ where: { id: findingId } });
    if (finding) scanId = finding.scanId;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? '',
      type: type ?? 'MANUAL',
      severity: severity ?? 'MEDIUM',
      status: 'OPEN',
      assignedToId: assignedToId ?? null,
      createdById: userId,
      dueDate: dueDate ? new Date(dueDate) : null,
      findingId: findingId ?? null,
      scanId,
      scanner: body.scanner ?? '',
      ruleId: body.ruleId ?? '',
      file: body.file ?? '',
      lineStart: body.lineStart ?? 0,
      lineEnd: body.lineEnd ?? 0,
      codeSnippet: body.codeSnippet ?? '',
      language: body.language ?? '',
      category: body.category ?? null,
      cwe: body.cwe ?? [],
      owasp: body.owasp ?? [],
      aiExplanation: body.aiExplanation ?? null,
      aiFix: body.aiFix ?? null,
      exploitationScenario: body.exploitationScenario ?? null,
      exploitScore: body.exploitScore ?? null,
      cvssScore: body.cvssScore ?? null,
      confidence: body.confidence ?? 0.5,
      remediation: body.remediation ?? '',
    },
  });

  await prisma.taskHistory.create({
    data: { taskId: task.id, userId, action: 'CREATED', newValue: title },
  });

  return NextResponse.json(task, { status: 201 });
}