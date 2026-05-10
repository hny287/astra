import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const { limit, offset } = parsePagination(request, 50);
  const scanId = searchParams.get('scanId') ?? undefined;
  const severity = searchParams.get('severity') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const scanner = searchParams.get('scanner') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const file = searchParams.get('file') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const assignedToId = searchParams.get('assignedToId') ?? undefined;

  const where: Record<string, unknown> = {};
  // Non-admin users can only see findings from their own scans
  if (!canAdmin(role!)) {
    where.scan = { userId };
  }
  if (scanId) where.scanId = scanId;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (scanner) where.scanner = scanner;
  if (file) where.file = { contains: file, mode: 'insensitive' };
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { file: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { aiExplanation: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { task: true },
    }),
    prisma.finding.count({ where }),
  ]);

  return NextResponse.json({ findings, total, limit, offset });
}