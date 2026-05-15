import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import type { ScanState, RepoIntel, CodeIntel, CodeIntelFile, ImportEdge, ApiRoute, DataModel, CallChain } from '../state';
import { log } from '../log';
import { prisma } from '@/lib/db';

function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, maxBuffer: 50 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(err);
      resolve(stdout.trim());
    });
  });
}

function parseDependencies(localDir: string, discoveredFiles: { path: string }[]): { name: string; version: string; type: string }[] {
  const deps: { name: string; version: string; type: string }[] = [];
  const fileNames = new Set(discoveredFiles.map(f => f.path));

  const manifestPaths: Record<string, string> = {
    'package.json': 'npm',
    'requirements.txt': 'pip',
    'go.mod': 'go',
    'Cargo.toml': 'cargo',
    'pom.xml': 'maven',
    'Gemfile': 'rubygems',
    'composer.json': 'composer',
  };

  for (const [filename, type] of Object.entries(manifestPaths)) {
    if (!fileNames.has(filename)) continue;
    try {
      deps.push({ name: `${filename} (manifest)`, version: '', type });
    } catch { /* skip */ }
  }

  return deps;
}

// ── Codegraph extraction ────────────────────────────────────────────────

async function extractCodeIntel(localDir: string, discoveredFiles: { path: string; language: string }[]): Promise<CodeIntel | null> {
  let codegraph: typeof import('@optave/codegraph') | null = null;
  try {
    codegraph = await import('@optave/codegraph');
  } catch {
    await log(null as any, 'warn', 'git_ingest', '@optave/codegraph not available, skipping code intelligence extraction');
    return null;
  }

  const cg = codegraph!;

  // Build the dependency graph
  const buildStart = Date.now();
  try {
    await cg.buildGraph(localDir);
  } catch (e) {
    await log(null as any, 'warn', 'git_ingest', `Codegraph build failed: ${e instanceof Error ? e.message : String(e)}. Falling back to git-only intelligence.`);
    return null;
  }
  const buildMs = Date.now() - buildStart;

  // Extract structured data from the graph
  const files: CodeIntelFile[] = [];
  const imports: ImportEdge[] = [];
  const apiRoutes: ApiRoute[] = [];
  const dataModels: DataModel[] = [];
  const entryPoints: string[] = [];
  const deadExports: string[] = [];
  const callChains: CallChain[] = [];
  const edgeMap = new Map<string, ImportEdge>();

  const graphDbPath = path.join(localDir, '.codegraph', 'graph.db');

  try {
    // Get role classification for all symbols
    const roles = cg.rolesData(graphDbPath, { noTests: true });

    // Get structure per file
    const structure = cg.structureData(graphDbPath, { depth: 3 });

    // Get entry points (listEntryPointsData returns Record<string, unknown>)
    const entryData = cg.listEntryPointsData(graphDbPath, { noTests: true }) as any;
    if (entryData?.entries) {
      for (const e of entryData.entries as Array<{ file: string; name: string }>) {
        entryPoints.push(`${e.file}:${e.name}`);
      }
    }

    // Get dead/leaf exports
    if (roles?.symbols) {
      for (const s of roles.symbols) {
        if (s.role === 'dead-leaf' || s.role === 'dead-unresolved') {
          deadExports.push(`${s.file}:${s.name}`);
        }
      }
    }

    // Build per-file intelligence from ALL discovered files (not just structureData which limits per-directory)
    for (const df of discoveredFiles) {
      const filePath = df.path;

      // Determine role from roles data
      const fileRole = (() => {
        if (!roles?.symbols) return 'core' as const;
        const fileSymbols = roles.symbols.filter(s => s.file === filePath);
        if (fileSymbols.length === 0) return 'other' as const;
        if (fileSymbols.some(s => s.role === 'entry')) return 'entry' as const;
        if (fileSymbols.some(s => s.role === 'core')) return 'core' as const;
        if (fileSymbols.some(s => s.role === 'utility')) return 'utility' as const;
        if (fileSymbols.some(s => s.role === 'dead-leaf' || s.role === 'dead-unresolved')) return 'dead' as const;
        if (fileSymbols.some(s => s.role === 'leaf')) return 'leaf' as const;
        return 'core' as const;
      })();

      // Get per-file deps (imports/exports)
      let fileExports: string[] = [];
      let fileImports: { symbol: string; from: string }[] = [];
      try {
        const deps = cg.fileDepsData(filePath, graphDbPath);
        if (deps?.results) {
          for (const r of deps.results) {
            // r.imports = files this file imports from
            for (const imp of r.imports as Array<{ file: string; typeOnly: boolean }>) {
              fileImports.push({ symbol: '', from: imp.file });
            }
            // r.definitions = symbols defined in this file
            if (r.definitions) {
              for (const def of r.definitions as Array<{ name: string; kind: string; line: number }>) {
                fileExports.push(def.name);
              }
            }
          }
        }
      } catch { /* file not in graph */ }

      // Get per-file exports detail for richer export names
      try {
        const exp = cg.exportsData(filePath, graphDbPath) as any;
        if (exp?.exports) {
          fileExports = (exp.exports as Array<{ name: string }>).map(e => e.name).filter(Boolean);
        }
      } catch { /* no exports data */ }

      files.push({
        path: filePath,
        language: df.language,
        role: fileRole,
        exports: fileExports,
        imports: fileImports,
        functions: [],
        classes: [],
      });
    }

    // Extract import edges from file deps
    for (const file of files) {
      for (const imp of file.imports) {
        if (imp.from) {
          imports.push({
            from: file.path,
            to: imp.from,
            symbols: [imp.symbol],
          });
        }
      }
    }

    // Merge duplicate import edges
    edgeMap.clear();
    for (const edge of imports) {
      const key = `${edge.from}->${edge.to}`;
      const existing = edgeMap.get(key);
      if (existing) {
        for (const s of edge.symbols) {
          if (!existing.symbols.includes(s)) existing.symbols.push(s);
        }
      } else {
        edgeMap.set(key, { ...edge });
      }
    }

    // Detect API routes from Next.js App Router conventions
    for (const file of discoveredFiles) {
      const match = file.path.match(/app\/api\/(.+)\/route\.(ts|js|tsx|jsx)$/);
      if (match) {
        const routePath = `/api/${match[1]}`;
        apiRoutes.push({
          method: 'ANY',
          path: routePath,
          handler: file.path,
          middleware: [],
        });
      }
    }

    // Detect data models from Prisma schema
    const prismaPath = path.join(localDir, 'prisma', 'schema.prisma');
    try {
      const schemaContent = await fs.readFile(prismaPath, 'utf-8');
      const modelBlocks = schemaContent.matchAll(new RegExp('model\\s+(\\w+)\\s*\\{([\\s\\S]*?)\\}', 'g'));
      for (const match of modelBlocks) {
        const modelName = match[1];
        const body = match[2];
        const fields: DataModel['fields'] = [];
        const relations: DataModel['relations'] = [];
        for (const line of body.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
          const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?)?\s*/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const fieldType = fieldMatch[2];
            const nullable = fieldMatch[3] === '?';
            if (fieldType.match(/Id$/)) {
              // Skip ID fields or treat as regular field
            }
            fields.push({ name: fieldName, type: fieldType, nullable });
          }
          // Relations: lines with @relation
          const relMatch = trimmed.match(/^(\w+)\s+\w+.*@relation\(([^)]*)\)/);
          if (relMatch) {
            const relName = relMatch[1];
            const relBody = relMatch[2];
            const nameMatch = relBody.match(/"([^"]+)"/);
            const fieldsMatch = relBody.match(/fields:\s*\[(\w+)\]/);
            const refsMatch = relBody.match(/references:\s*\[(\w+)\]/);
            relations.push({
              name: relName,
              target: nameMatch?.[1] || refsMatch?.[1] || '',
              type: trimmed.includes('[]') ? 'one-to-many' : 'one-to-one',
            });
          }
        }
        dataModels.push({
          name: modelName,
          file: 'prisma/schema.prisma',
          fields,
          relations,
        });
      }
    } catch { /* no Prisma schema, skip */ }

    await log(null as any, 'info', 'git_ingest', `CodeIntel extracted: ${files.length} files, ${edgeMap.size} import edges, ${apiRoutes.length} API routes, ${dataModels.length} data models, ${callChains.length} call chains, ${deadExports.length} dead exports (codegraph build: ${buildMs}ms)`);

    return {
      files,
      imports: Array.from(edgeMap.values()),
      apiRoutes,
      dataModels,
      entryPoints,
      deadExports: deadExports.slice(0, 100), // cap at 100
      callChains,
    };
  } catch (e) {
    await log(null as any, 'warn', 'git_ingest', `Codegraph extraction failed: ${e instanceof Error ? e.message : String(e)}. Using partial data.`);
    return files.length > 0 ? {
      files,
      imports: Array.from(edgeMap.values()),
      apiRoutes,
      dataModels,
      entryPoints,
      deadExports: deadExports.slice(0, 100),
      callChains,
    } : null;
  } finally {
    // Clean up .codegraph directory
    try {
      await fs.rm(path.join(localDir, '.codegraph'), { recursive: true, force: true });
    } catch { /* non-critical */ }
  }
}

// ── Main node ──────────────────────────────────────────────────────────

export async function gitIngestNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const { localDir } = state;
  if (!localDir) {
    return { repoIntel: null, errors: ['git_ingest: no localDir'] };
  }

  const errors: string[] = [];

  // Git log — recent commits
  let recentCommits: RepoIntel['recentCommits'] = [];
  try {
    const logOutput = await execGit(
      ['log', '--max-count=100', '--format=%H|%an|%ae|%ai|%s'],
      localDir,
    );
    recentCommits = logOutput.split('\n').filter(Boolean).map(line => {
      const [hash, name, email, date, ...msgParts] = line.split('|');
      return { hash, author: `${name} <${email}>`, date, message: msgParts.join('|') };
    });
  } catch (e) {
    errors.push(`git_ingest: failed to read git log: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Contributors
  let topContributors: RepoIntel['topContributors'] = [];
  let commitCount = 0;
  let contributorCount = 0;
  try {
    const shortlog = await execGit(['shortlog', '-sne', 'HEAD'], localDir);
    const lines = shortlog.split('\n').filter(Boolean);
    commitCount = lines.reduce((sum, l) => sum + parseInt(l.trim().split('\t')[0], 10) || 0, 0);
    contributorCount = lines.length;
    topContributors = lines.slice(0, 20).map(l => {
      const [countStr, identity] = l.trim().split('\t');
      const [name, email] = identity.includes('<') ? [identity.replace(/ <.*>/, ''), identity.replace(/.*<|>/g, '')] : [identity, ''];
      return { name, email, commitCount: parseInt(countStr, 10) || 0 };
    });
  } catch (e) {
    errors.push(`git_ingest: failed to read contributors: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Branch count
  let branchCount = 0;
  try {
    const branches = await execGit(['branch', '-a'], localDir);
    branchCount = branches.split('\n').filter(Boolean).length;
  } catch { /* non-critical */ }

  // Hotspot files — by change frequency
  let hotspotFiles: RepoIntel['hotspotFiles'] = [];
  try {
    const logNames = await execGit(
      ['log', '--max-count=200', '--diff-filter=ACDMR', '--name-only', '--pretty=format:'],
      localDir,
    );
    const counts: Record<string, number> = {};
    for (const f of logNames.split('\n')) {
      const trimmed = f.trim();
      if (!trimmed) continue;
      counts[trimmed] = (counts[trimmed] || 0) + 1;
    }
    hotspotFiles = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([path, changeCount]) => ({ path, changeCount }));
  } catch { /* non-critical */ }

  // Language breakdown from discoveredFiles
  const langCounts: Record<string, number> = {};
  for (const f of state.discoveredFiles) {
    langCounts[f.language] = (langCounts[f.language] || 0) + 1;
  }
  const totalFiles = state.discoveredFiles.length || 1;
  const languages = Object.entries(langCounts)
    .map(([language, fileCount]) => ({ language, fileCount, percentage: Math.round((fileCount / totalFiles) * 10000) / 100 }))
    .sort((a, b) => b.fileCount - a.fileCount);

  // Dependencies
  const dependencies = parseDependencies(localDir, state.discoveredFiles);

  // Code intelligence extraction via @optave/codegraph
  const codeIntel = await extractCodeIntel(localDir, state.discoveredFiles);

  const repoIntel: RepoIntel = {
    commitCount,
    contributorCount,
    branchCount,
    recentCommits,
    topContributors,
    hotspotFiles,
    languages,
    dependencies,
    codeIntel,
  };

  await log(state.scanId, 'info', 'git_ingest', `Repo intel: ${commitCount} commits, ${contributorCount} contributors, ${languages.length} languages, ${hotspotFiles.length} hotspots${codeIntel ? `, ${codeIntel.files.length} code files, ${codeIntel.imports.length} imports, ${codeIntel.apiRoutes.length} API routes, ${codeIntel.dataModels.length} data models` : ', no code intelligence'}`);

  try {
    await prisma.nodeOutput.create({
      data: {
        scanId: state.scanId,
        node: 'git_ingest',
        modelUsed: codeIntel ? 'git+codegraph' : 'git',
        provider: 'system',
        nodeConfig: { provider: 'system', model: codeIntel ? 'git+codegraph' : 'git' } as any,
        inputJson: { fileCount: state.discoveredFiles.length } as any,
        outputJson: {
          commitCount,
          contributorCount,
          branchCount,
          languageCount: languages.length,
          hotspotCount: hotspotFiles.length,
          dependencyCount: dependencies.length,
          topLanguages: languages.slice(0, 5).map(l => `${l.language} (${l.percentage}%)`),
          topHotspots: hotspotFiles.slice(0, 5).map(h => `${h.path} (${h.changeCount} changes)`),
          topContributors: topContributors.slice(0, 5).map(c => `${c.name} (${c.commitCount} commits)`),
          codeIntel: codeIntel ? {
            files: codeIntel.files.length,
            imports: codeIntel.imports.length,
            apiRoutes: codeIntel.apiRoutes.length,
            dataModels: codeIntel.dataModels.length,
            entryPoints: codeIntel.entryPoints.length,
            deadExports: codeIntel.deadExports.length,
            callChains: codeIntel.callChains.length,
          } : null,
        } as any,
        durationMs: Date.now() - startTime,
      },
    });
  } catch {
    errors.push('Failed to save NodeOutput for git_ingest');
  }

  return { repoIntel, errors };
}