import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface AnthropicConfig {
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

export class AnthropicProvider implements AIProvider {
  readonly id = "anthropic";
  private client: Anthropic;
  private model: string;
  private modelInfo: ModelInfo;

  constructor(config: AnthropicConfig) {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(`Missing API key: set ${config.apiKeyEnv} environment variable`);
    }
    this.client = new Anthropic({ apiKey });
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
    const maxTokens = request.maxOutputTokens ?? 4096;

    const messageParams: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: maxTokens,
      messages: request.messages ?? [{ role: "user", content: request.prompt }],
      system: request.system,
      temperature: request.temperature ?? 0.2,
      top_p: request.topP ?? 0.9,
      stop_sequences: request.stopSequences?.length ? request.stopSequences : undefined,
    };

    if (request.thinkingDepth && request.thinkingDepth !== "none" && this.modelInfo.supportsThinking) {
      const budgetTokens = request.thinkingBudget ?? 2048;
      messageParams.thinking = {
        type: "enabled",
        budget_tokens: Math.min(budgetTokens, this.modelInfo.maxThinkingTokens),
      };
    }

    const response = await this.client.messages.create(messageParams);

    let text = "";
    let thinkingTokens = 0;

    for (const block of response.content) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "thinking") {
        thinkingTokens += this.estimateTokens(block.thinking);
      }
    }

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    return {
      text,
      inputTokens,
      outputTokens,
      thinkingTokens,
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
      await this.client.messages.create({
        model: this.model,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      return { connected: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }
}