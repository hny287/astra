import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, canAdmin } from '@/lib/rbac';
import { loadPrompts, DEFAULT_DISCOVER_PROMPT, DEFAULT_DEEP_SCAN_PROMPT, DEFAULT_CROSS_FILE_PROMPT } from '@/scan/prompts/deep-scan';
import { loadPromptFromDb, savePromptToDb } from '@/lib/config';

const PROMPT_KEYS = ['discover', 'deepScan', 'crossFile', 'chat'] as const;
type PromptKey = typeof PROMPT_KEYS[number];

const DEFAULTS: Record<PromptKey, string> = {
  discover: DEFAULT_DISCOVER_PROMPT,
  deepScan: DEFAULT_DEEP_SCAN_PROMPT,
  crossFile: DEFAULT_CROSS_FILE_PROMPT,
  chat: '',
};

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const dbPrompts = await loadPrompts();
  const prompts = {} as Record<PromptKey, { current: string; default: string; isCustom: boolean }>;
  for (const key of PROMPT_KEYS) {
    const current = dbPrompts[key] || DEFAULTS[key] || '';
    prompts[key] = {
      current,
      default: DEFAULTS[key] || '',
      isCustom: !!(dbPrompts[key] && dbPrompts[key] !== DEFAULTS[key]),
    };
  }

  return NextResponse.json({ prompts });
}

export async function PUT(request: NextRequest) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const body = await request.json();
  const { key, prompt } = body as { key: string; prompt: string };

  if (!PROMPT_KEYS.includes(key as PromptKey)) {
    return NextResponse.json({ error: `Invalid prompt key. Must be one of: ${PROMPT_KEYS.join(', ')}` }, { status: 400 });
  }

  await savePromptToDb(key as PromptKey, prompt);
  return NextResponse.json({ success: true, key, prompt });
}

export async function DELETE(request: NextRequest) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role)) return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key || !PROMPT_KEYS.includes(key as PromptKey)) {
    return NextResponse.json({ error: `Invalid prompt key. Must be one of: ${PROMPT_KEYS.join(', ')}` }, { status: 400 });
  }

  // Reset to default by saving the default
  await savePromptToDb(key as PromptKey, DEFAULTS[key as PromptKey] || '');
  return NextResponse.json({ success: true, key, resetToDefault: true });
}