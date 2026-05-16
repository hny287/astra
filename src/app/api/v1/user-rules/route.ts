import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const scanId = searchParams.get('scanId') ?? undefined;
  const active = searchParams.get('active');
  const global = searchParams.get('global');
  const type = searchParams.get('type') ?? undefined;
  const scope = searchParams.get('scope') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const where: Record<string, unknown> = {};
  if (scanId) where.scanId = scanId;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;
  if (global === 'true') where.scanId = null;
  if (global === 'false') where.scanId = { not: null };
  if (type) where.type = type;
  if (scope) where.scope = scope;
  if (status) where.status = status;

  const rules = await prisma.userRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const {
    name, description, ruleText, severity, category, cwe,
    type, scope, repoUrl, languages, paths, excludePaths, matchPattern,
    owasp, priority, fixSuggestion, references, tags, codeRule,
    slaSeverity, slaHours, slaAction, source,
  } = body;

  if (!name || !ruleText) {
    return NextResponse.json({ error: 'name and ruleText are required' }, { status: 400 });
  }

  // If scanId provided, verify the scan exists
  const { scanId } = body;
  if (scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
  }

  const rule = await prisma.userRule.create({
    data: {
      name,
      description: description ?? '',
      ruleText,
      severity: severity ?? 'MEDIUM',
      category: category ?? 'SAST',
      cwe: cwe ?? [],
      type: type ?? 'SECURITY',
      scope: scope ?? 'GLOBAL',
      repoUrl: repoUrl ?? null,
      languages: languages ?? [],
      paths: paths ?? [],
      excludePaths: excludePaths ?? [],
      matchPattern: matchPattern ?? null,
      owasp: owasp ?? [],
      priority: priority ?? 0,
      fixSuggestion: fixSuggestion ?? null,
      references: references ?? [],
      tags: tags ?? [],
      codeRule: codeRule ?? null,
      slaSeverity: slaSeverity ?? null,
      slaHours: slaHours ?? null,
      slaAction: slaAction ?? null,
      source: source ?? 'manual',
      scanId: scanId ?? null,
      userId,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}