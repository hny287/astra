import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/rbac';
import { loadConfigFromDb } from '@/lib/config';
import { listProviders } from '@/providers/registry';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const config = await loadConfigFromDb();
  const chatConfig = config.chat ?? config.scan?.nodes?.deepScan;
  const providers = listProviders(config);

  if (!chatConfig) {
    return NextResponse.json({ current: null, models: [] });
  }

  const models = providers.flatMap(p =>
    p.models.map(m => ({
      providerId: p.id,
      providerName: p.name,
      modelId: m.id,
    }))
  );

  return NextResponse.json({
    current: {
      providerId: chatConfig.provider,
      providerName: providers.find(p => p.id === chatConfig.provider)?.name ?? chatConfig.provider,
      modelId: chatConfig.model,
    },
    models,
  });
}
