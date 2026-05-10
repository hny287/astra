import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { createProvider } from '@/providers/factory';
import { loadConfigFromDb } from '@/lib/config';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import type { AIRequest } from '@/providers/base';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const originalCall = await prisma.aiCallLog.findUnique({ where: { id } });
  if (!originalCall) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const config = await loadConfigFromDb();
  const providerConfig = config.providers[originalCall.provider];
  if (!providerConfig) {
    return NextResponse.json({ error: `Provider "${originalCall.provider}" not found in config` }, { status: 400 });
  }

  const modelConfig = providerConfig.models[originalCall.model];
  if (!modelConfig) {
    return NextResponse.json({ error: `Model "${originalCall.model}" not found in provider "${originalCall.provider}"` }, { status: 400 });
  }

  const provider = createProvider({
    providerId: originalCall.provider,
    providerConfig,
    modelId: originalCall.model,
    modelConfig: {
      inputTokenLimit: modelConfig.inputTokenLimit,
      outputTokenLimit: originalCall.maxOutputTokens ?? modelConfig.outputTokenLimit,
      contextWindow: modelConfig.contextWindow,
      temperature: originalCall.temperature ?? modelConfig.temperature,
      supportsThinking: modelConfig.supportsThinking,
      maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
    },
  });

  const aiRequest: AIRequest = {
    system: originalCall.systemPrompt ?? '',
    prompt: originalCall.userPrompt ?? '',
    maxOutputTokens: originalCall.maxOutputTokens ?? undefined,
    temperature: originalCall.temperature ?? undefined,
    topP: originalCall.topP ?? undefined,
    topK: originalCall.topK ?? undefined,
    frequencyPenalty: undefined,
    presencePenalty: undefined,
    thinkingDepth: (originalCall.thinkingDepth as any) ?? undefined,
    thinkingBudget: originalCall.thinkingBudget ?? undefined,
  };

  try {
    const response = await instrumentedSend(provider, aiRequest, {
      scanId: originalCall.scanId ?? undefined,
      jobId: originalCall.jobId ?? undefined,
      findingId: originalCall.findingId ?? undefined,
      userId: userId!,
      source: 'ad_hoc',
      node: originalCall.node ?? undefined,
    });

    return NextResponse.json({
      originalCallId: id,
      newCallId: null,
      response: {
        text: response.text,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        thinkingTokens: response.thinkingTokens,
        durationMs: response.durationMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}