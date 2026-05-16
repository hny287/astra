import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.userRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  const updated = await prisma.userRule.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.ruleText !== undefined ? { ruleText: body.ruleText } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.cwe !== undefined ? { cwe: body.cwe } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.scope !== undefined ? { scope: body.scope } : {}),
      ...(body.repoUrl !== undefined ? { repoUrl: body.repoUrl } : {}),
      ...(body.languages !== undefined ? { languages: body.languages } : {}),
      ...(body.paths !== undefined ? { paths: body.paths } : {}),
      ...(body.excludePaths !== undefined ? { excludePaths: body.excludePaths } : {}),
      ...(body.matchPattern !== undefined ? { matchPattern: body.matchPattern } : {}),
      ...(body.owasp !== undefined ? { owasp: body.owasp } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.fixSuggestion !== undefined ? { fixSuggestion: body.fixSuggestion } : {}),
      ...(body.references !== undefined ? { references: body.references } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.codeRule !== undefined ? { codeRule: body.codeRule } : {}),
      ...(body.slaSeverity !== undefined ? { slaSeverity: body.slaSeverity } : {}),
      ...(body.slaHours !== undefined ? { slaHours: body.slaHours } : {}),
      ...(body.slaAction !== undefined ? { slaAction: body.slaAction } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive, enabledAt: body.isActive ? new Date() : rule.enabledAt } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role } = await requireAuth();
  if (error) return error;

  // Only admins can delete rules
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const rule = await prisma.userRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  await prisma.userRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}