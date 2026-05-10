import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDb, saveConfigToDb, configSchema } from '@/lib/config';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function GET() {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const config = await loadConfigFromDb();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid config', details: parsed.error.flatten() }, { status: 400 });
  }

  await saveConfigToDb(parsed.data);

  return NextResponse.json(parsed.data);
}