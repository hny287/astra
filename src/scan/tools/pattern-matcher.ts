import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const BUILTIN_PATTERNS: Record<string, RegExp> = {
  sql_injection: /(?:execute\s*\(|\.query\s*\(|\.raw\s*\(|\.exec\s*\(|string\.format.*(?:SELECT|INSERT|UPDATE|DELETE|DROP))/i,
  xss: /(?:innerHTML|document\.write|v-html|dangerouslySetInnerHTML|\.html\s*\()/i,
  hardcoded_secret: /(?:password\s*[:=]\s*['"][^'"]+['"]|api_?key\s*[:=]\s*['"][^'"]+['"]|secret\s*[:=]\s*['"][^'"]+['"]|token\s*[:=]\s*['"][^'"]+['"]|private_?key\s*[:=]\s*['"][^'"]+['"])/i,
  eval_usage: /(?:\beval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['"`]|setInterval\s*\(\s*['"`])/i,
  weak_crypto: /(?:MD5|SHA1|DES|RC4|ECB|hashlib\.md5|hashlib\.sha1|crypto\.createCipher\b)/i,
  path_traversal: /(?:\.\.\/|\.\.\\|path\.join\s*\([^)]*\.\.|\.\.\/|readFile\s*\([^)]*\+|writeFile\s*\([^)]*\+)/i,
  missing_auth: /(?:app\.(get|post|put|delete|patch)\s*\(\s*['"])/i,
};

export function createPatternMatcherTool(baseDir: string) {
  return tool(
    async ({ filePath, patternName }: { filePath: string; patternName: string }) => {
      const fullPath = path.resolve(baseDir, filePath);
      if (!fullPath.startsWith(path.resolve(baseDir))) {
        return 'Error: Access denied — path traversal detected';
      }

      const pattern = BUILTIN_PATTERNS[patternName];
      if (!pattern) {
        return `Error: Unknown pattern "${patternName}". Available patterns: ${Object.keys(BUILTIN_PATTERNS).join(', ')}`;
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');
        const matches: string[] = [];

        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            matches.push(`${i + 1}: ${lines[i].trim()}`);
          }
        }

        if (matches.length === 0) {
          return `No matches for pattern "${patternName}" in ${filePath}`;
        }
        return `Pattern "${patternName}" matches in ${filePath}:\n${matches.join('\n')}`;
      } catch (err) {
        return `Error checking patterns: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: 'pattern_matcher',
      description: 'Check a file for common vulnerability patterns. Available patterns: sql_injection, xss, hardcoded_secret, eval_usage, weak_crypto, path_traversal, missing_auth',
      schema: z.object({
        filePath: z.string().describe('Relative file path from repo root'),
        patternName: z.string().describe('Pattern name: sql_injection, xss, hardcoded_secret, eval_usage, weak_crypto, path_traversal, missing_auth'),
      }),
    }
  );
}