import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDb } from '@/lib/config';
import { createProvider } from '@/providers/factory';
import { requireAuth } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { provider: providerId, model: modelId } = body;

  if (!providerId || typeof providerId !== 'string') {
    return NextResponse.json({ error: 'provider is required' }, { status: 400 });
  }

  let config;
  try {
    config = await loadConfigFromDb();
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }

  const providerConfig = config.providers[providerId];
  if (!providerConfig) {
    return NextResponse.json({ error: `Provider "${providerId}" not found` }, { status: 404 });
  }

  const resolvedModelId = modelId ?? Object.keys(providerConfig.models)[0];
  if (!resolvedModelId) {
    return NextResponse.json({ error: 'No models available for this provider' }, { status: 400 });
  }

  const modelConfig = providerConfig.models[resolvedModelId];
  if (!modelConfig) {
    return NextResponse.json({ error: `Model "${resolvedModelId}" not found` }, { status: 404 });
  }

  try {
    const provider = createProvider({
      providerId,
      providerConfig,
      modelId: resolvedModelId,
      modelConfig: {
        inputTokenLimit: modelConfig.inputTokenLimit,
        outputTokenLimit: modelConfig.outputTokenLimit,
        contextWindow: modelConfig.contextWindow,
        temperature: modelConfig.temperature,
        supportsThinking: modelConfig.supportsThinking,
        maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
      },
    });

    const result = await provider.testConnection();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ connected: false, latencyMs: 0, error: message }, { status: 500 });
  }
}