import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function GET() {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  // Non-admin users see built-in presets + their own
  const where = canAdmin(role!)
    ? {}
    : { OR: [{ isBuiltin: true }, { userId }] };

  const presets = await prisma.preset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ presets });
}

export async function POST(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { name, description, configJson } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (configJson === undefined) {
    return NextResponse.json({ error: 'configJson is required' }, { status: 400 });
  }

  const preset = await prisma.preset.create({
    data: {
      name,
      description: description ?? '',
      configJson,
      userId,
    },
  });

  return NextResponse.json(preset, { status: 201 });
}