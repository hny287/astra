import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const key = request.nextUrl.searchParams.get('key');
  if (key) {
    const pref = await prisma.userPreference.findUnique({ where: { key } });
    return NextResponse.json({ key, value: pref?.value ?? null });
  }
  const prefs = await prisma.userPreference.findMany();
  return NextResponse.json({ preferences: prefs });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { key, value } = await request.json();
  if (!key || !value) return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  const pref = await prisma.userPreference.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json(pref);
}