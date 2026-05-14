import { loadConfigFromDb } from './config';
import { createProvider } from '../providers/factory';
import type { AIProvider, AIRequest, AIResponse, ChatMessage } from '../providers/base';
import type { ScanConfig, ChatConfig } from './config';
import { DEFAULT_SYSTEM_PROMPT } from './branding';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import { loadPrompts } from '../scan/prompts/deep-scan';

let cachedProvider: AIProvider | null = null;
let cachedConfigHash: string = '';

function getDefaultChatConfig(config: ScanConfig): ChatConfig {
  const deepScanConfig = config.scan.nodes.deepScan;
  return {
    provider: deepScanConfig.provider,
    model: deepScanConfig.model,
    temperature: 0.3,
    thinkingDepth: 'low',
    thinkingBudget: null,
    topP: 0.9,
    topK: null,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    maxOutputTokens: 2048,
    maxRetries: 2,
    retryBackoffMs: 1000,
    timeoutMs: 30000,
    systemPrompt: DEFAULT_SYSTEM_PROMPT
  };
}

async function getChatProvider(override?: { provider?: string; model?: string }): Promise<{ provider: AIProvider; chatConfig: ChatConfig }> {
  const config = await loadConfigFromDb();
  const baseConfig: ChatConfig = config.chat ?? getDefaultChatConfig(config);

  const providerId = (override?.provider ?? baseConfig.provider) as ChatConfig['provider'];
  const modelId = override?.model ?? baseConfig.model;
  const chatConfig: ChatConfig = { ...baseConfig, provider: providerId, model: modelId };

  // Only use cache when no per-request override
  if (!override?.provider && !override?.model) {
    const configHash = `${chatConfig.provider}:${chatConfig.model}:${chatConfig.temperature}`;
    if (cachedProvider && configHash === cachedConfigHash) {
      return { provider: cachedProvider, chatConfig };
    }
  }

  const providerConfig = config.providers[providerId];
  if (!providerConfig) {
    throw new Error(`Chat provider "${providerId}" not found in config`);
  }

  const modelConfig = providerConfig.models[modelId];
  if (!modelConfig) {
    throw new Error(`Chat model "${modelId}" not found in provider "${providerId}"`);
  }

  const provider = createProvider({
    providerId,
    providerConfig,
    modelId,
    modelConfig: {
      inputTokenLimit: modelConfig.inputTokenLimit,
      outputTokenLimit: chatConfig.maxOutputTokens,
      contextWindow: modelConfig.contextWindow,
      temperature: chatConfig.temperature,
      supportsThinking: modelConfig.supportsThinking,
      maxThinkingTokens: modelConfig.maxThinkingTokens ?? 0,
    },
  });

  if (!override?.provider && !override?.model) {
    cachedProvider = provider;
    cachedConfigHash = `${providerId}:${modelId}:${chatConfig.temperature}`;
  }

  return { provider, chatConfig };
}

function buildSystemPrompt(
  chatConfig: ChatConfig,
  dbChatPrompt: string,
  context?: {
    finding?: {
      title: string;
      severity: string;
      file: string;
      lineStart: number;
      lineEnd: number;
      category: string;
      confidence: number;
      status: string;
      cwe: string[];
      owasp: string[];
      exploitationScenario: string | null;
      remediation: string;
      description: string;
      aiExplanation?: string | null;
      aiFix?: string | null;
      exploitScore?: number | null;
      cvssScore?: number | null;
      codeSnippet?: string | null;
    };
  }
): string {
  const basePrompt = dbChatPrompt || chatConfig.systemPrompt || DEFAULT_SYSTEM_PROMPT;

  if (!context?.finding) return basePrompt;

  const f = context.finding;
  let prompt = `${basePrompt}\n\nYou are currently discussing a specific security finding:\n\n`;
  prompt += `Finding: "${f.title}"\n`;
  prompt += `Severity: ${f.severity}\n`;
  prompt += `File: ${f.file}:${f.lineStart}-${f.lineEnd}\n`;
  prompt += `Category: ${f.category}\n`;
  prompt += `Confidence: ${(f.confidence * 100).toFixed(0)}%\n`;
  prompt += `Status: ${f.status}\n`;
  if (f.exploitScore != null) prompt += `Exploit Score: ${f.exploitScore}/10\n`;
  if (f.cvssScore != null) prompt += `CVSS Score: ${f.cvssScore}/10\n`;
  if (f.cwe.length > 0) prompt += `CWE: ${f.cwe.join(', ')}\n`;
  if (f.owasp.length > 0) prompt += `OWASP: ${f.owasp.join(', ')}\n`;
  if (f.codeSnippet) prompt += `\nVulnerable code:\n\`\`\`\n${f.codeSnippet}\n\`\`\`\n`;
  if (f.exploitationScenario) prompt += `\nExploitation scenario:\n${f.exploitationScenario}\n`;
  if (f.remediation) prompt += `\nRemediation:\n${f.remediation}\n`;
  if (f.aiExplanation) prompt += `\nAI analysis:\n${f.aiExplanation}\n`;
  if (f.aiFix) prompt += `\nSuggested fix:\n${f.aiFix}\n`;
  if (f.description && f.description !== f.aiExplanation) prompt += `\nSummary:\n${f.description}\n`;
  prompt += `\nAnswer the user's questions about this finding. Be specific, reference the details above, and provide actionable advice.`;
  return prompt;
}

export async function sendChatMessage(
  userMessage: string,
  context?: {
    scanId?: string;
    findingId?: string;
    userId?: string;
    conversationHistory?: ChatMessage[];
    modelOverride?: { provider: string; model: string };
    finding?: {
      title: string;
      severity: string;
      file: string;
      lineStart: number;
      lineEnd: number;
      category: string;
      confidence: number;
      status: string;
      cwe: string[];
      owasp: string[];
      exploitationScenario: string | null;
      remediation: string;
      description: string;
      aiExplanation?: string | null;
      aiFix?: string | null;
      exploitScore?: number | null;
      cvssScore?: number | null;
      codeSnippet?: string | null;
    };
  }
): Promise<{ text: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const { provider, chatConfig } = await getChatProvider(context?.modelOverride);
  const dbPrompts = await loadPrompts();
  const systemPrompt = buildSystemPrompt(chatConfig, dbPrompts.chat, context);

  const messages: ChatMessage[] | undefined = context?.conversationHistory?.length
    ? [...context.conversationHistory, { role: 'user' as const, content: userMessage }]
    : undefined;

  const request: AIRequest = {
    system: systemPrompt,
    prompt: userMessage,
    messages,
    maxOutputTokens: chatConfig.maxOutputTokens,
    temperature: chatConfig.temperature,
    topP: chatConfig.topP,
    thinkingDepth: chatConfig.thinkingDepth,
    thinkingBudget: chatConfig.thinkingBudget,
  };

  const response: AIResponse = await instrumentedSend(provider, request, {
    scanId: context?.scanId,
    findingId: context?.findingId,
    userId: context?.userId,
    source: context?.findingId ? 'chat_finding' : (context?.scanId ? 'chat_scan' : 'chat'),
  });
  return {
    text: response.text,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    durationMs: response.durationMs,
  };
}