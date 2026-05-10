import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export function createDirectoryListerTool(baseDir: string) {
  return tool(
    async ({ dirPath, extensionFilter }: { dirPath: string; extensionFilter?: string }) => {
      const fullPath = path.resolve(baseDir, dirPath);
      if (!fullPath.startsWith(path.resolve(baseDir))) {
        return 'Error: Access denied — path traversal detected';
      }

      try {
        const entries: string[] = [];
        const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build', '.next', 'vendor', '.terraform']);

        function walk(currentDir: string, prefix: string) {
          const items = fs.readdirSync(currentDir, { withFileTypes: true });
          for (const item of items) {
            if (SKIP_DIRS.has(item.name)) continue;

            const relPath = prefix ? `${prefix}/${item.name}` : item.name;
            if (item.isDirectory()) {
              entries.push(`${relPath}/`);
              walk(path.join(currentDir, item.name), relPath);
            } else if (item.isFile()) {
              if (extensionFilter) {
                if (item.name.endsWith(extensionFilter)) {
                  entries.push(relPath);
                }
              } else {
                entries.push(relPath);
              }
            }
          }
        }

        walk(fullPath, dirPath === '.' ? '' : dirPath);
        return entries.join('\n') || '(empty directory)';
      } catch (err) {
        return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: 'directory_lister',
      description: 'List the directory tree structure. Optionally filter by file extension (e.g., ".ts", ".py").',
      schema: z.object({
        dirPath: z.string().describe('Relative directory path from repo root (use "." for root)'),
        extensionFilter: z.string().optional().describe('Filter files by extension (e.g., ".ts")'),
      }),
    }
  );
}