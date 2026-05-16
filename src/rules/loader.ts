import fs from 'fs';
import path from 'path';
import { parseScanRule, ruleToContext } from './parser';
import { RULE_FILE_EXT } from '@/lib/branding';
import { formatRulesForPrompt, type RulesContext } from './formatter';
import { prisma } from '@/lib/db';

export interface KnowledgeBase {
  patterns: string[];
  guidelines: string[];
  prompts: {
    deepScan: string;
    businessLogic: string;
    enrichment: string;
  };
}

export async function loadKnowledgeBase(rulesDir: string): Promise<KnowledgeBase> {
  const patterns = loadPatterns(path.join(rulesDir, 'patterns'));
  const guidelines = loadGuidelines(path.join(rulesDir, 'guidelines'));
  const prompts = loadPrompts(path.join(rulesDir, 'prompts'));

  return { patterns, guidelines, prompts };
}

function loadPatterns(dir: string): string[] {
  const entries: string[] = [];
  if (!fs.existsSync(dir)) return entries;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') || f.endsWith(RULE_FILE_EXT));
  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    if (file.endsWith(RULE_FILE_EXT)) {
      const rules = parseScanRule(content);
      for (const rule of rules) {
        entries.push(ruleToContext(rule));
      }
    } else {
      try {
        const json = JSON.parse(content);
        if (json.rules && Array.isArray(json.rules)) {
          for (const rule of json.rules) {
            entries.push(
              `Rule ${rule.id ?? 'unknown'} (${rule.severity ?? 'MEDIUM'} severity, ${rule.category ?? 'SAST'} category): ${rule.title ?? rule.message ?? 'Vulnerability pattern'}`
            );
          }
        }
      } catch {
        entries.push(content);
      }
    }
  }
  return entries;
}

function loadGuidelines(dir: string): string[] {
  const entries: string[] = [];
  if (!fs.existsSync(dir)) return entries;

  const walkDir = (currentDir: string) => {
    const items = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(currentDir, item.name);
      if (item.isDirectory()) {
        walkDir(fullPath);
      } else if (item.name.endsWith('.md')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        entries.push(content);
      }
    }
  };

  walkDir(dir);
  return entries;
}

function loadPrompts(dir: string): KnowledgeBase['prompts'] {
  const readFile = (name: string) => {
    const filePath = path.join(dir, name);
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  };

  return {
    deepScan: readFile('deep-scan.md'),
    businessLogic: readFile('business-logic.md'),
    enrichment: readFile('enrichment.md'),
  };
}

export async function loadRulesForContext(options: {
  scanId?: string;
  repoUrl?: string;
  languages?: string[];
  tokenBudget?: number;
}): Promise<RulesContext> {
  const tokenBudget = options.tokenBudget ?? 2000;

  // 1. Load active UserRules (global + project-scoped)
  const where: Record<string, unknown> = {
    isActive: true,
    status: 'ACTIVE',
  };

  const globalRules = await prisma.userRule.findMany({
    where: { ...where, scope: 'GLOBAL' },
    orderBy: [{ severity: 'asc' }, { priority: 'desc' }],
  });

  let projectRules: typeof globalRules = [];
  if (options.repoUrl) {
    const normalizedUrl = options.repoUrl.replace(/\/+$/, '');
    projectRules = await prisma.userRule.findMany({
      where: {
        ...where,
        scope: 'PROJECT',
        repoUrl: { in: [normalizedUrl, normalizedUrl + '/'] },
      },
      orderBy: [{ severity: 'asc' }, { priority: 'desc' }],
    });
  }

  // Deduplicate by id
  const seenIds = new Set<string>();
  const allRules = [...globalRules, ...projectRules].filter(rule => {
    if (seenIds.has(rule.id)) return false;
    seenIds.add(rule.id);
    return true;
  });

  // 2. Filter by language overlap
  const scanLanguages = new Set(options.languages ?? []);
  const filteredRules = scanLanguages.size > 0
    ? allRules.filter(rule => rule.languages.length === 0 || rule.languages.some(l => scanLanguages.has(l)))
    : allRules;

  // 3. Load confirmed BusinessLogicRules for this scan
  let businessRuleTexts: string[] = [];
  if (options.scanId) {
    const bizRules = await prisma.businessLogicRule.findMany({
      where: { scanId: options.scanId, status: 'CONFIRMED' },
      select: { ruleText: true, confidence: true, violationDescription: true, evidenceFiles: true },
    });
    businessRuleTexts = bizRules.map(r => {
      let text = r.ruleText;
      if (r.violationDescription) text += `\nViolation: ${r.violationDescription}`;
      if (r.evidenceFiles.length > 0) text += `\nEvidence: ${r.evidenceFiles.join(', ')}`;
      return text;
    });
  }

  // 4. Load filesystem patterns and guidelines
  const rulesDir = path.join(process.cwd(), 'src/rules');
  let knowledgeBase: { patterns: string[]; guidelines: string[]; prompts: { deepScan: string; businessLogic: string; enrichment: string } };
  try {
    knowledgeBase = await loadKnowledgeBase(rulesDir);
  } catch {
    knowledgeBase = { patterns: [], guidelines: [], prompts: { deepScan: '', businessLogic: '', enrichment: '' } };
  }

  // 5. Format and return
  return formatRulesForPrompt(
    filteredRules.map(r => ({
      name: r.name,
      type: r.type,
      severity: r.severity,
      category: r.category,
      ruleText: r.ruleText,
      languages: r.languages,
      paths: r.paths,
      matchPattern: r.matchPattern,
      cwe: r.cwe,
      owasp: r.owasp,
      fixSuggestion: r.fixSuggestion,
      slaSeverity: r.slaSeverity,
      slaHours: r.slaHours,
      slaAction: r.slaAction,
      scope: r.scope,
      priority: r.priority,
    })),
    businessRuleTexts,
    knowledgeBase.patterns,
    knowledgeBase.guidelines,
    tokenBudget,
  );
}