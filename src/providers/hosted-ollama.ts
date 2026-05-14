import { Ollama } from "ollama";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface HostedOllamaConfig {
  baseURL?: string;
  model: string;
  apiKeyEnv?: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

export class HostedOllamaProvider implements AIProvider {
  readonly id = "hosted-ollama";
  private client: Ollama;
  private model: string;
  private modelInfo: ModelInfo;

  constructor(config: HostedOllamaConfig) {
    const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] ?? "" : "";
    // The ollama SDK appends /api/ to the host, so strip any trailing /api to avoid doubling
    const normalizedHost = (config.baseURL ?? "http://localhost:11434").replace(/\/api\/?$/, '');
    this.client = new Ollama({
      host: normalizedHost,
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
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
    const opts = {
      temperature: request.temperature ?? 0.2,
      num_predict: request.maxOutputTokens ?? 4096,
      top_p: request.topP ?? 0.9,
      top_k: request.topK ?? 40,
      frequency_penalty: request.frequencyPenalty ?? 0,
      presence_penalty: request.presencePenalty ?? 0,
      stop: request.stopSequences?.length ? request.stopSequences : undefined,
    };

    // Use chat() for multi-turn, generate() for single-turn
    if (request.messages && request.messages.length > 0) {
      const chatResponse = await this.client.chat({
        model: this.model,
        messages: [
          { role: 'system', content: request.system },
          ...request.messages.map(m => ({ role: m.role, content: m.content })),
        ],
        stream: false,
        options: opts,
      });

      const inputTokens = chatResponse.prompt_eval_count ?? Math.ceil(request.system.length / 4 + request.messages.reduce((s, m) => s + m.content.length, 0) / 4);
      const outputTokens = chatResponse.eval_count ?? Math.ceil((chatResponse.message?.content?.length ?? 0) / 4);
      const responseText = chatResponse.message?.content ?? '';

      if (!responseText.trim() && outputTokens > 0) {
        throw new Error(`Model returned empty response despite ${outputTokens} output tokens (likely hit num_predict limit). Model: ${this.model}`);
      }

      return {
        text: responseText,
        inputTokens,
        outputTokens,
        thinkingTokens: 0,
        durationMs: Date.now() - start,
      };
    }

    const response = await this.client.generate({
      model: this.model,
      prompt: request.prompt,
      system: request.system,
      stream: false,
      options: opts,
    });

    const inputTokens = response.prompt_eval_count ?? Math.ceil(request.system.length / 4 + request.prompt.length / 4);
    const outputTokens = response.eval_count ?? Math.ceil((response.response?.length ?? 0) / 4);
    const responseText = response.response ?? "";

    if (!responseText.trim() && outputTokens > 0) {
      throw new Error(`Model returned empty response despite ${outputTokens} output tokens (likely hit num_predict limit). Model: ${this.model}`);
    }

    return {
      text: responseText,
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
      await this.client.list();
      return { connected: true, latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { connected: false, latencyMs: Date.now() - start, error: message };
    }
  }
}