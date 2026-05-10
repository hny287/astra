import fs from 'fs';
import path from 'path';
import { parseScanRule, ruleToContext } from './parser';
import { RULE_FILE_EXT } from '@/lib/branding';

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