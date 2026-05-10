export interface ParsedRule {
  id: string;
  severity: string;
  category: string;
  cwe?: string;
  owasp?: string;
  match?: string;
  languages?: string[];
  message: string;
}

export function parseScanRule(content: string): ParsedRule[] {
  const rules: ParsedRule[] = [];
  const ruleRegex = /rule\s+(\S+)\s*\{([\s\S]*?)\}/g;

  let match;
  while ((match = ruleRegex.exec(content)) !== null) {
    const id = match[1];
    const body = match[2];
    const rule: ParsedRule = {
      id,
      severity: extractField(body, 'severity') ?? 'MEDIUM',
      category: extractField(body, 'category') ?? 'SAST',
      message: extractQuoted(body, 'message') ?? '',
    };

    const cwe = extractField(body, 'cwe');
    if (cwe) rule.cwe = cwe;

    const owasp = extractField(body, 'owasp');
    if (owasp) rule.owasp = owasp;

    const matchPattern = extractField(body, 'match');
    if (matchPattern) {
      rule.match = matchPattern;
      const inClause = body.match(/in\s+([\w,]+)/);
      if (inClause) rule.languages = inClause[1].split(',').map(s => s.trim());
    }

    rules.push(rule);
  }

  return rules;
}

function extractField(body: string, name: string): string | undefined {
  const regex = new RegExp(`${name}:\\s*(\\S+)`);
  const match = body.match(regex);
  return match ? match[1] : undefined;
}

function extractQuoted(body: string, name: string): string | undefined {
  const regex = new RegExp(`${name}:\\s*"([^"]*)"`);
  const match = body.match(regex);
  return match ? match[1] : undefined;
}

export function ruleToContext(rule: ParsedRule): string {
  let text = `Rule ${rule.id} (${rule.severity} severity, ${rule.category} category): ${rule.message}`;
  if (rule.cwe) text += ` [${rule.cwe}]`;
  if (rule.match) text += ` — Watch for pattern: ${rule.match}`;
  return text;
}