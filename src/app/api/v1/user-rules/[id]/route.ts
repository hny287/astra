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
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
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