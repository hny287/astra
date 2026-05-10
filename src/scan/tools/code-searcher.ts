import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export function createCodeSearcherTool(baseDir: string) {
  return tool(
    async ({ regex, fileFilter, maxResults }: { regex: string; fileFilter?: string; maxResults?: number }) => {
      let pattern: RegExp;
      try {
        pattern = new RegExp(regex, 'i');
      } catch {
        return `Error: Invalid regex pattern: ${regex}`;
      }

      const limit = maxResults ?? 50;
      const matches: string[] = [];
      const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.next', 'vendor', '.terraform']);

      function walk(currentDir: string) {
        if (matches.length >= limit) return;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          if (matches.length >= limit) return;
          if (SKIP_DIRS.has(entry.name)) continue;

          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.isFile()) {
            if (fileFilter && !entry.name.endsWith(fileFilter)) continue;
            if (entry.name.endsWith('.lock') || entry.name.endsWith('.map')) continue;

            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const lines = content.split('\n');
              for (let i = 0; i < lines.length; i++) {
                if (matches.length >= limit) break;
                if (pattern.test(lines[i])) {
                  const relPath = path.relative(baseDir, fullPath);
                  matches.push(`${relPath}:${i + 1}: ${lines[i].trim()}`);
                }
              }
            } catch {}
          }
        }
      }

      walk(baseDir);

      if (matches.length === 0) {
        return `No matches found for regex: ${regex}`;
      }
      return matches.join('\n');
    },
    {
      name: 'code_searcher',
      description: 'Search the entire codebase with a regex pattern. Optionally filter by file extension and limit results.',
      schema: z.object({
        regex: z.string().describe('Regex pattern to search for (case-insensitive)'),
        fileFilter: z.string().optional().describe('Filter by file extension (e.g., ".ts")'),
        maxResults: z.number().optional().describe('Maximum number of results to return (default 50)'),
      }),
    }
  );
}