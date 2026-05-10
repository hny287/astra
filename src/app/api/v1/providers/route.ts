import { NextResponse } from 'next/server';
import { loadConfigFromDb } from '@/lib/config';
import { listProviders } from '@/providers/registry';
import { requireAuth } from '@/lib/rbac';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  let config;
  try {
    config = await loadConfigFromDb();
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }

  const providers = listProviders(config);
  return NextResponse.json({ providers });
}