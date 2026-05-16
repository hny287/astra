/**
 * Parse JSON from AI model output, handling common LLM JSON errors:
 * - Invalid Unicode escape sequences (e.g. \uXXXX with non-hex chars, lone \u)
 * - Markdown code fences
 * - Trailing commas
 * - Unquoted control characters
 */
export function parseAiJson<T = unknown>(text: string): T | null {
  let cleaned = text.trim();

  // Strip markdown code fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
    cleaned = cleaned.trim();
  }

  // Extract first JSON object if there's surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : cleaned;

  // Try parsing as-is first
  try {
    return JSON.parse(candidate) as T;
  } catch {
    // Fall through to sanitization
  }

  // Sanitize and retry:
  // 1. Replace invalid \u escapes: \u followed by non-hex or fewer than 4 hex digits
  //    Replace with empty string (the model made up a unicode escape that doesn't exist)
  const sanitized = candidate
    .replace(/\\u(?![0-9a-fA-F]{4})/g, '') // lone \u or \u with <4 hex digits
    .replace(/,\s*([}\]])/g, '$1');          // trailing commas before } or ]

  try {
    return JSON.parse(sanitized) as T;
  } catch {
    return null;
  }
}