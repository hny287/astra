// src/rules/formatter.ts
// Formats rules for AI prompt injection. Each rule type has its own section header.

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

const TYPE_LABEL: Record<string, string> = {
  SECURITY: 'Security Rules',
  COMPLIANCE: 'Compliance Requirements',
  SLA: 'SLA Policies',
  BUSINESS_LOGIC: 'Business Logic Rules',
};

export interface RulesContext {
  rulesText: string;
  rulesCount: number;
  tokenEstimate: number;
  sources: {
    userRules: number;
    businessRules: number;
    patterns: number;
    guidelines: number;
  };
}

interface FormattableRule {
  name: string;
  type: string;
  severity: string;
  category: string;
  ruleText: string;
  languages: string[];
  paths: string[];
  matchPattern?: string | null;
  cwe: string[];
  owasp: string[];
  fixSuggestion?: string | null;
  slaSeverity?: string | null;
  slaHours?: number | null;
  slaAction?: string | null;
  scope: string;
  priority: number;
}

export function formatRuleForPrompt(rule: FormattableRule): string {
  const lines: string[] = [];

  lines.push(`Rule: ${rule.name} (${rule.type}, ${rule.severity} severity, ${rule.category} category)`);

  if (rule.matchPattern) {
    lines.push(`Pattern: ${rule.matchPattern}`);
  }

  if (rule.languages.length > 0) {
    lines.push(`Languages: ${rule.languages.join(', ')}`);
  }

  if (rule.paths.length > 0) {
    lines.push(`Paths: ${rule.paths.join(', ')}`);
  }

  lines.push(`Instruction: ${rule.ruleText}`);

  if (rule.cwe.length > 0) {
    lines.push(`CWE: ${rule.cwe.join(', ')}`);
  }

  if (rule.owasp.length > 0) {
    lines.push(`OWASP: ${rule.owasp.join(', ')}`);
  }

  if (rule.fixSuggestion) {
    lines.push(`Fix: ${rule.fixSuggestion}`);
  }

  // SLA-specific formatting
  if (rule.type === 'SLA' && rule.slaSeverity && rule.slaHours) {
    lines.push(`SLA: ${rule.slaSeverity} findings must be addressed within ${rule.slaHours} hours. Action on breach: ${rule.slaAction || 'NOTIFY'}`);
  }

  return lines.join('\n');
}

export function formatRulesForPrompt(
  userRules: FormattableRule[],
  businessRuleTexts: string[],
  patternTexts: string[],
  guidelineTexts: string[],
  tokenBudget: number = 2000,
): RulesContext {
  // Group rules by type
  const rulesByType: Record<string, FormattableRule[]> = {};
  for (const rule of userRules) {
    const type = rule.type || 'SECURITY';
    if (!rulesByType[type]) rulesByType[type] = [];
    rulesByType[type].push(rule);
  }

  // Sort each group by severity then priority
  for (const type of Object.keys(rulesByType)) {
    rulesByType[type].sort((a, b) => {
      const sevA = SEVERITY_ORDER[a.severity] ?? 99;
      const sevB = SEVERITY_ORDER[b.severity] ?? 99;
      if (sevA !== sevB) return sevA - sevB;
      return b.priority - a.priority;
    });
  }

  // Build sections in type order
  const typeOrder = ['SECURITY', 'COMPLIANCE', 'SLA', 'BUSINESS_LOGIC'];
  const sections: string[] = [];

  for (const type of typeOrder) {
    const rules = rulesByType[type];
    if (!rules || rules.length === 0) continue;

    const label = TYPE_LABEL[type] || `${type} Rules`;
    const formatted = rules.map(formatRuleForPrompt).join('\n\n');
    sections.push(`## ${label}\n\n${formatted}`);
  }

  // Business logic rules from AI inference
  if (businessRuleTexts.length > 0) {
    sections.push(`## Confirmed Business Logic Rules\n\n${businessRuleTexts.join('\n\n')}`);
  }

  // Filesystem patterns
  if (patternTexts.length > 0) {
    sections.push(`## Known Vulnerability Patterns\n\n${patternTexts.join('\n')}`);
  }

  // Filesystem guidelines
  if (guidelineTexts.length > 0) {
    sections.push(`## Security Guidelines\n\n${guidelineTexts.join('\n\n')}`);
  }

  const fullText = sections.join('\n\n');

  // Enforce token budget (rough estimate: ~4 chars per token)
  const maxChars = tokenBudget * 4;
  const truncated = fullText.length > maxChars
    ? fullText.slice(0, maxChars) + '\n\n[... additional rules truncated due to token budget]'
    : fullText;

  return {
    rulesText: truncated,
    rulesCount: userRules.length + businessRuleTexts.length,
    tokenEstimate: Math.ceil(truncated.length / 4),
    sources: {
      userRules: userRules.length,
      businessRules: businessRuleTexts.length,
      patterns: patternTexts.length,
      guidelines: guidelineTexts.length,
    },
  };
}