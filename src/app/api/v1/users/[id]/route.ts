import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';
import bcrypt from 'bcryptjs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { role: newRole, password } = body;

  if (!newRole && !password) {
    return NextResponse.json({ error: 'Provide at least one field to update (role or password)' }, { status: 400 });
  }

  if (newRole && !['ADMIN', 'ANALYST', 'VIEWER'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (password && password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data: Record<string, string> = {};
  if (newRole) data.role = newRole;
  if (password) data.passwordHash = await bcrypt.hash(password, 12);

  const updated = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true } });
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

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}