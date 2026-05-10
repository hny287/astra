const CHARS_PER_TOKEN = 4;

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function calculateAvailableTokens(opts: {
  inputTokenLimit: number;
  outputTokenLimit: number;
  systemPromptTokens: number;
}): number {
  const available = opts.inputTokenLimit - opts.systemPromptTokens - opts.outputTokenLimit - 500;
  return Math.max(0, available);
}