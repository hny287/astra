export type ThinkingDepth = 'none' | 'low' | 'medium' | 'high' | 'max';
export type ScanDepth = 'quick' | 'standard' | 'deep' | 'exhaustive';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  system: string;
  prompt: string;
  messages?: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  thinkingDepth?: ThinkingDepth;
  thinkingBudget?: number | null;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
  durationMs: number;
}

export interface ModelInfo {
  id: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  contextWindow: number;
  supportsSystemPrompt: boolean;
  supportsThinking: boolean;
  maxThinkingTokens: number;
}

export interface AIProvider {
  id: string;
  send(request: AIRequest): Promise<AIResponse>;
  estimateTokens(text: string): number;
  getModelInfo(): ModelInfo;
  testConnection(): Promise<{ connected: boolean; latencyMs: number; error?: string }>;
}