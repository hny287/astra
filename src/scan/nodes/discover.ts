import fs from 'fs/promises';
import path from 'path';
import type { ScanState, PrioritizedFile } from '../state';
import { log } from '../log';

const SCANABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.scala',
  '.cs', '.vb', '.php', '.swift', '.c', '.cpp', '.h', '.hpp',
  '.lua', '.r', '.pl', '.pm', '.sh', '.bash', '.zsh',
  '.sql', '.graphql', '.proto',
  '.html', '.htm', '.xml', '.svg',
  '.css', '.scss', '.sass', '.less',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.env',
  '.dockerfile', '.tf', '.hcl',
  '.md', '.rst', '.txt',
  '.lock', '.gradle',
]);

const SKIP_FILENAMES = new Set([
  '.git', '.svn', '.hg', 'node_modules', '__pycache__', '.venv', 'venv',
  '.tox', '.mypy_cache', '.pytest_cache', 'dist', 'build', '.next', '.nuxt',
  'vendor', '.terraform', '.terragrunt-cache', 'coverage', '.coverage',
  '.cache', '.parcel-cache', '.turbo', '.vercel', '.env.local', '.env.production',
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Gemfile.lock',
  'go.sum', 'cargo.lock', 'poetry.lock',
]);

const SKIP_PREFIXES = ['.git/', 'node_modules/', 'vendor/', 'dist/', 'build/', '.next/'];

const PRIORITY_PATTERNS: { pattern: RegExp; priority: number }[] = [
  { pattern: /(?:auth|login|session|token|jwt|password|credential|oauth)/i, priority: 0 },
  { pattern: /(?:sql|query|database|db|prisma|sequelize|knex|typeorm|drizzle)/i, priority: 0 },
  { pattern: /(?:payment|checkout|stripe|charge|invoice|billing|transaction)/i, priority: 0 },
  { pattern: /(?:admin|root|superuser|privilege|permission|rbac|access.?control)/i, priority: 0 },
  { pattern: /(?:encrypt|decrypt|hash|crypto|cipher|aes|rsa|ssl|tls|cert)/i, priority: 1 },
  { pattern: /(?:upload|download|file|attachment|import|export)/i, priority: 1 },
  { pattern: /(?:api|endpoint|route|handler|controller|middleware|resolver)/i, priority: 2 },
  { pattern: /(?:config|setting|env|secret|key|api.?key|private.?key)/i, priority: 2 },
  { pattern: /(?:user|account|profile|register|signup)/i, priority: 2 },
  { pattern: /(?:command|exec|spawn|eval|shell|system|popen|subprocess)/i, priority: 3 },
  { pattern: /(?:request|response|http|fetch|axios|ajax|rest|graphql)/i, priority: 3 },
  { pattern: /(?:template|render|view|html|markup|ejs|pug|hbs)/i, priority: 3 },
  { pattern: /(?:model|schema|type|interface|class|struct)/i, priority: 4 },
  { pattern: /(?:util|helper|lib|common|shared|service)/i, priority: 4 },
];

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescript', '.js': 'javascript', '.jsx': 'javascript',
  '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.rb': 'ruby', '.go': 'go', '.rs': 'rust',
  '.java': 'java', '.kt': 'kotlin', '.scala': 'scala',
  '.cs': 'csharp', '.php': 'php', '.swift': 'swift',
  '.c': 'c', '.cpp': 'cpp', '.h': 'c', '.hpp': 'cpp',
  '.sql': 'sql', '.graphql': 'graphql',
  '.html': 'html', '.css': 'css', '.scss': 'scss',
  '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.tf': 'hcl', '.sh': 'shell', '.bash': 'shell',
};

function getFilePriority(filePath: string): number {
  for (const { pattern, priority } of PRIORITY_PATTERNS) {
    if (pattern.test(filePath)) return priority;
  }
  return 4;
}

function getLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return EXT_TO_LANG[ext] ?? 'unknown';
}

export async function discoverNode(state: ScanState): Promise<Partial<ScanState>> {
  const { localDir } = state;
  const discoveredFiles: PrioritizedFile[] = [];
  const skippedFiles: string[] = [];

  if (!localDir) {
    return {
      discoveredFiles: [],
      skippedFiles: [],
      totalFiles: 0,
      errors: [`Discover failed: localDir does not exist: ${localDir}`],
    };
  }

  try {
    await fs.access(localDir);
  } catch {
    return {
      discoveredFiles: [],
      skippedFiles: [],
      totalFiles: 0,
      errors: [`Discover failed: localDir does not exist: ${localDir}`],
    };
  }

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(localDir, fullPath);

      if (SKIP_FILENAMES.has(entry.name)) {
        skippedFiles.push(relPath);
        continue;
      }

      const relPathWithSlash = relPath + '/';
      if (SKIP_PREFIXES.some(p => relPathWithSlash.startsWith(p) || relPath.startsWith(p.replace(/\/$/, '')))) {
        skippedFiles.push(relPath);
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SCANABLE_EXTENSIONS.has(ext) || ext === '' && entry.name === 'Dockerfile') {
          discoveredFiles.push({
            path: relPath,
            priority: getFilePriority(relPath),
            language: ext === '' && entry.name === 'Dockerfile' ? 'dockerfile' : getLanguage(relPath),
          });
        } else {
          skippedFiles.push(relPath);
        }
      }
    }
  }

  await walk(localDir);
  discoveredFiles.sort((a, b) => a.priority - b.priority);

  await log(state.scanId, 'success', 'discover', `Found ${discoveredFiles.length} scannable files, skipped ${skippedFiles.length}`);

  return {
    discoveredFiles,
    skippedFiles,
    totalFiles: discoveredFiles.length + skippedFiles.length,
  };
}