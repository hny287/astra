import OpenAI from "openai";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface OpenAIConfig {
  apiKeyEnv: string;
  model: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai";
  private client: OpenAI;
  private model: string;
  private modelInfo: ModelInfo;

  constructor(config: OpenAIConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key: set ${config.apiKeyEnv} environment variable`);
    }
    this.client = new OpenAI({ apiKey });
    this.model = config.model;
    this.modelInfo = {
      id: config.model,
      inputTokenLimit: config.modelInfo.inputTokenLimit,
      outputTokenLimit: config.modelInfo.outputTokenLimit,
      contextWindow: config.modelInfo.contextWindow,
      supportsSystemPrompt: true,
      supportsThinking: config.modelInfo.supportsThinking,
      maxThinkingTokens: config.modelInfo.maxThinkingTokens,
    };
  }

  async send(request: AIRequest): Promise<AIResponse> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        ...(request.messages ?? [{ role: "user" as const, content: request.prompt }]),
      ],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxOutputTokens ?? 4096,
      top_p: request.topP ?? 0.9,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0,
      stop: request.stopSequences?.length ? request.stopSequences : undefined,
    });

    const choice = response.choices[0];
    const inputTokens = response.usage?.prompt_tokens ?? this.estimateTokens(request.system + request.prompt);
    const outputTokens = response.usage?.completion_tokens ?? this.estimateTokens(choice?.message?.content ?? "");

    return {
      text: choice?.message?.content ?? "",
      inputTokens,
      outputTokens,
      thinkingTokens: 0,
      durationMs: Date.now() - start,
    };
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return this.modelInfo;
  }

  async testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      await this.client.models.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }
}