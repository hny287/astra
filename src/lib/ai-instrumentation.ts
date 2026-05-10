import { prisma } from '@/lib/db';
import { logger } from '@/lib/structured-logger';
import type { AIProvider, AIRequest, AIResponse } from '@/providers/base';

export type InstrumentationSource =
  | 'pipeline'
  | 'chat'
  | 'chat_finding'
  | 'chat_scan'
  | 'test'
  | 'ad_hoc';

export interface InstrumentationContext {
  scanId?: string;
  jobId?: string;
  findingId?: string;
  userId?: string;
  source: InstrumentationSource;
  node?: string;
  nodeConfig?: Record<string, unknown>;
}

function classifyError(err: unknown): 'ERROR' | 'TIMEOUT' | 'RATE_LIMITED' {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
      return 'TIMEOUT';
    }
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
      return 'RATE_LIMITED';
    }
  }
  return 'ERROR';
}

export async function instrumentedSend(
  provider: AIProvider,
  request: AIRequest,
  context: InstrumentationContext,
): Promise<AIResponse> {
  const startTime = Date.now();
  const modelInfo = provider.getModelInfo();

  const logCtx = {
    scanId: context.scanId,
    node: context.node,
    provider: provider.id,
    model: modelInfo.id,
    source: context.source,
  };

  logger.info(logCtx, `AI call starting: ${context.source}/${context.node || 'direct'}`);

  let response: AIResponse;
  let status: 'SUCCESS' | 'ERROR' | 'TIMEOUT' | 'RATE_LIMITED' | 'CANCELLED' = 'SUCCESS';
  let error: string | undefined;

  try {
    response = await provider.send(request);
  } catch (err: unknown) {
    const classified = classifyError(err);
    status = classified;
    error = err instanceof Error ? err.message : String(err);
    if (error.length > 10000) error = error.substring(0, 10000) + '... [truncated at 10k for error field]';
    const elapsed = Date.now() - startTime;

    logger.error({ ...logCtx, elapsed, status, error }, `AI call failed: ${status}`);

    await prisma.aiCallLog.create({
      data: {
        scanId: context.scanId,
        jobId: context.jobId,
        findingId: context.findingId,
        userId: context.userId,
        source: context.source,
        node: context.node,
        provider: provider.id,
        model: modelInfo.id,
        endpoint: modelInfo.id,
        sdk: provider.id,
        rawRequest: request as any,
        systemPrompt: request.system,
        userPrompt: request.prompt,
        inputTokens: 0,
        outputTokens: 0,
        thinkingTokens: 0,
        latencyMs: elapsed,
        temperature: request.temperature ?? null,
        thinkingDepth: request.thinkingDepth ?? null,
        thinkingBudget: request.thinkingBudget ?? null,
        topP: request.topP ?? null,
        topK: request.topK ?? null,
        maxOutputTokens: request.maxOutputTokens ?? null,
        nodeConfig: context.nodeConfig ? (context.nodeConfig as any) : undefined,
        status: classified as any,
        error,
      },
    });

    throw err;
  }

  const elapsed = Date.now() - startTime;

  logger.info({ ...logCtx, elapsed, inputTokens: response.inputTokens, outputTokens: response.outputTokens, thinkingTokens: response.thinkingTokens }, 'AI call completed');

  await prisma.aiCallLog.create({
    data: {
      scanId: context.scanId,
      jobId: context.jobId,
      findingId: context.findingId,
      userId: context.userId,
      source: context.source,
      node: context.node,
      provider: provider.id,
      model: modelInfo.id,
      endpoint: modelInfo.id,
      sdk: provider.id,
      rawRequest: request as any,
      rawResponse: response as any,
      systemPrompt: request.system,
      userPrompt: request.prompt,
      response: response.text,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      thinkingTokens: response.thinkingTokens,
      latencyMs: elapsed,
      temperature: request.temperature ?? null,
      thinkingDepth: request.thinkingDepth ?? null,
      thinkingBudget: request.thinkingBudget ?? null,
      topP: request.topP ?? null,
      topK: request.topK ?? null,
      maxOutputTokens: request.maxOutputTokens ?? null,
      nodeConfig: context.nodeConfig ? (context.nodeConfig as any) : undefined,
      status: 'SUCCESS',
    },
  });

  return response;
}