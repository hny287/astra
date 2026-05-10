import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

export function createFileReaderTool(baseDir: string) {
  return tool(
    async ({ filePath, startLine, endLine }: { filePath: string; startLine?: number; endLine?: number }) => {
      const fullPath = path.resolve(baseDir, filePath);
      if (!fullPath.startsWith(path.resolve(baseDir))) {
        return 'Error: Access denied — path traversal detected';
      }

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        if (startLine !== undefined || endLine !== undefined) {
          const start = Math.max(1, startLine ?? 1);
          const end = Math.min(lines.length, endLine ?? lines.length);
          const selected = lines.slice(start - 1, end);
          return selected.map((line, i) => `${start + i}: ${line}`).join('\n');
        }

        return lines.map((line, i) => `${i + 1}: ${line}`).join('\n');
      } catch (err) {
        return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
      }
    },
    {
      name: 'file_reader',
      description: 'Read the contents of a file. Optionally specify startLine and endLine to read a specific range. Line numbers are 1-indexed.',
      schema: z.object({
        filePath: z.string().describe('Relative file path from repo root'),
        startLine: z.number().optional().describe('Start line number (1-indexed)'),
        endLine: z.number().optional().describe('End line number (1-indexed, inclusive)'),
      }),
    }
  );
}