import { Ollama } from "ollama";
import type { AIProvider, AIRequest, AIResponse, ModelInfo } from "./base";

interface CloudOllamaConfig {
  baseURL: string;
  model: string;
  apiKeyEnv: string;
  modelInfo: {
    inputTokenLimit: number;
    outputTokenLimit: number;
    contextWindow: number;
    temperature: number;
    supportsThinking: boolean;
    maxThinkingTokens: number;
  };
}

const RETRYABLE_ERRORS = [
  "fetch_failed",
  "ECONNRESET",
  "429",
  "503",
];

export class CloudOllamaProvider implements AIProvider {
  readonly id = "cloud-ollama";
  private client: Ollama;
  private model: string;
  private modelInfo: ModelInfo;
  private maxRetries = 3;
  private baseBackoffMs = 2000;

  constructor(config: CloudOllamaConfig) {
    const apiKey = process.env[config.apiKeyEnv] ?? "";
    // The ollama SDK appends /api/ to the host, so strip any trailing /api to avoid doubling
    const normalizedHost = config.baseURL.replace(/\/api\/?$/, '');
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
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
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
            const emptyErr = new Error(`Model returned empty response despite ${outputTokens} output tokens (likely hit num_predict limit). Model: ${this.model}`);
            if (attempt < this.maxRetries) {
              lastError = emptyErr;
              const backoff = this.baseBackoffMs * Math.pow(2, attempt);
              await new Promise((resolve) => setTimeout(resolve, backoff));
              continue;
            }
            throw emptyErr;
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

        // Some models return empty text but report output tokens (hit token limit)
        if (!responseText.trim() && outputTokens > 0) {
          const emptyErr = new Error(`Model returned empty response despite ${outputTokens} output tokens (likely hit num_predict limit). Model: ${this.model}`);
          const isRetryable = RETRYABLE_ERRORS.some((e) => emptyErr.message.includes(e));
          if (!isRetryable && attempt < this.maxRetries) {
            lastError = emptyErr;
            const backoff = this.baseBackoffMs * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
          throw emptyErr;
        }

        return {
          text: responseText,
          inputTokens,
          outputTokens,
          thinkingTokens: 0,
          durationMs: Date.now() - start,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const isRetryable = RETRYABLE_ERRORS.some((e) => message.includes(e));

        if (!isRetryable || attempt === this.maxRetries) {
          throw err;
        }

        lastError = err instanceof Error ? err : new Error(String(err));
        const backoff = this.baseBackoffMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }

    throw lastError;
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