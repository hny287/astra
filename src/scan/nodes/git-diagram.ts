import fs from 'fs/promises';
import path from 'path';
import type { ScanState } from '../state';
import { log } from '../log';
import { prisma } from '@/lib/db';

interface ModuleInfo {
  name: string;
  path: string;
  type: 'entry' | 'route' | 'middleware' | 'service' | 'model' | 'util' | 'config' | 'component' | 'other';
}

function classifyFile(filePath: string, language: string): ModuleInfo['type'] {
  const lower = filePath.toLowerCase();
  if (/\/(?:server|app|main|index|start)\.(ts|js|py|go|rs)$/.test(lower)) return 'entry';
  if (/\/(?:next\.config|nuxt\.config|vite\.config|webpack\.config)/.test(lower)) return 'config';
  if (/\/api\/|\/routes\/|\/router\/|\/controllers?\//.test(lower)) return 'route';
  if (/route\.(ts|js)$/.test(lower)) return 'route';
  if (/\/middleware|\/auth\//.test(lower)) return 'middleware';
  if (/\/models?\/|\/schema\.(ts|js|prisma|sql)|\/entities?\//.test(lower)) return 'model';
  if (/\.(prisma|sql)$/.test(lower)) return 'model';
  if (/\/services?\/|\/lib\/|\/utils?\/|\/helpers?\//.test(lower)) return 'service';
  if (/\/components?\//i.test(lower) && /\.(tsx|jsx)$/.test(lower)) return 'component';
  if (/\.(json|yaml|yml|toml|env|config)/.test(lower)) return 'config';
  return 'other';
}

function groupByDirectory(files: ModuleInfo[]): Map<string, ModuleInfo[]> {
  const groups = new Map<string, ModuleInfo[]>();
  for (const f of files) {
    const dir = path.dirname(f.path).split('/').slice(0, 3).join('/') || 'root';
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(f);
  }
  return groups;
}

const TYPE_LABELS: Record<ModuleInfo['type'], string> = {
  entry: '🚀 Entry',
  route: '🔀 Route',
  middleware: '🛡️ Middleware',
  service: '⚙️ Service',
  model: '💾 Model',
  util: '🔧 Util',
  config: '📋 Config',
  component: '🎨 UI',
  other: '📄 Other',
};

const TYPE_COLORS: Record<ModuleInfo['type'], string> = {
  entry: '#e74c3c',
  route: '#3498db',
  middleware: '#9b59b6',
  service: '#2ecc71',
  model: '#f39c12',
  util: '#95a5a6',
  config: '#1abc9c',
  component: '#e91e63',
  other: '#bdc3c7',
};

// ── Heuristic diagram (fallback when codegraph is unavailable) ───────────

function buildHeuristicDiagram(state: ScanState, modules: ModuleInfo[]): string {
  const groups = groupByDirectory(modules);
  const { repoIntel } = state;
  const repoName = path.basename(state.repoUrl || state.localDir);

  let diagram = 'flowchart TB\n';
  diagram += `  subgraph repo["📁 ${repoName}"]\n`;

  if (repoIntel) {
    diagram += `    direction TB\n`;
    diagram += `    info["${repoIntel.commitCount} commits · ${repoIntel.contributorCount} contributors · ${repoIntel.languages.length} languages"]\n`;
  }

  const typeGroups = new Map<ModuleInfo['type'], ModuleInfo[]>();
  for (const m of modules) {
    if (!typeGroups.has(m.type)) typeGroups.set(m.type, []);
    typeGroups.get(m.type)!.push(m);
  }

  const renderedTypes = new Set<ModuleInfo['type']>();
  for (const [type, files] of typeGroups.entries()) {
    if (type === 'other' && files.length > 20) continue;
    renderedTypes.add(type);
    const label = TYPE_LABELS[type];
    diagram += `    subgraph ${type}_group["${label}"]\n`;
    diagram += `      direction LR\n`;
    for (const f of files.slice(0, 15)) {
      const nodeId = f.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      diagram += `      ${nodeId}["${f.name}<br/><small>${f.path.split('/').slice(-2).join('/')}</small>"]\n`;
    }
    if (files.length > 15) {
      diagram += `      ${type}_more["+${files.length - 15} more"]\n`;
    }
    diagram += `    end\n`;
  }

  diagram += `  end\n\n`;

  const entryModules = modules.filter(m => m.type === 'entry');
  const middlewareModules = modules.filter(m => m.type === 'middleware');
  const routeModules = modules.filter(m => m.type === 'route');
  const serviceModules = modules.filter(m => m.type === 'service');
  const modelModules = modules.filter(m => m.type === 'model');

  if (entryModules.length > 0 && middlewareModules.length > 0) {
    for (const entry of entryModules.slice(0, 3)) {
      const eId = entry.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      for (const mw of middlewareModules.slice(0, 3)) {
        diagram += `  ${eId} --> ${mw.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}\n`;
      }
    }
  }
  if (middlewareModules.length > 0 && routeModules.length > 0) {
    for (const mw of middlewareModules.slice(0, 3)) {
      for (const route of routeModules.slice(0, 5)) {
        diagram += `  ${mw.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)} --> ${route.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}\n`;
      }
    }
  }
  if (routeModules.length > 0 && serviceModules.length > 0) {
    for (const route of routeModules.slice(0, 5)) {
      for (const svc of serviceModules.slice(0, 5)) {
        diagram += `  ${route.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)} --> ${svc.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}\n`;
      }
    }
  }
  if (serviceModules.length > 0 && modelModules.length > 0) {
    for (const svc of serviceModules.slice(0, 5)) {
      for (const model of modelModules.slice(0, 3)) {
        diagram += `  ${svc.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)} --> ${model.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}\n`;
      }
    }
  }

  const hasDb = modules.some(m => /\.prisma$|schema\.sql|knexfile|drizzle/.test(m.path));
  const hasRedis = modules.some(m => /redis/i.test(m.path));
  const hasAuth = modules.some(m => m.type === 'middleware' || /auth|passport|jwt|oauth/i.test(m.path));

  diagram += `\n  subgraph external["External"]\n`;
  if (hasDb) diagram += `    db[("Database")]`;
  if (hasRedis) diagram += `    redis[("Redis")]`;
  if (hasAuth) diagram += `    auth_ext["OAuth/OIDC Provider"]`;
  diagram += `  end\n`;

  if (serviceModules.length > 0) {
    const svcId = serviceModules[0].path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    if (hasDb) diagram += `  ${svcId} -.-> db\n`;
    if (hasRedis) diagram += `  ${svcId} -.-> redis\n`;
  }

  if (repoIntel && repoIntel.hotspotFiles.length > 0) {
    diagram += `\n  subgraph hotspots["🔥 Hotspot Files"]\n`;
    diagram += `    direction LR\n`;
    for (const h of repoIntel.hotspotFiles.slice(0, 10)) {
      const hId = h.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
      diagram += `    ${hId}["${h.path}<br/><small>${h.changeCount} changes</small>"]\n`;
    }
    diagram += `  end\n`;
  }

  return diagram;
}

// ── Main node ──────────────────────────────────────────────────────────

export async function gitDiagramNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const { localDir, discoveredFiles, repoIntel } = state;

  if (!localDir) {
    return { architectureDiagram: '', errors: ['git_diagram: no localDir'] };
  }

  let diagram = '';
  let diagramSource = 'heuristic';

  // Try codegraph Mermaid export first
  try {
    const cg = await import('@optave/codegraph');
    // Check if graph.db exists (codegraph was built in git_ingest)
    const graphDbPath = path.join(localDir, '.codegraph', 'graph.db');
    const dbExists = await fs.access(graphDbPath).then(() => true).catch(() => false);

    if (dbExists) {
      // Open the database and export Mermaid
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(graphDbPath, { readonly: true }) as any;
      try {
        const mermaidOutput = cg.exportMermaid(db, { fileLevel: true, noTests: true, direction: 'TB', limit: 200 });
        if (mermaidOutput && mermaidOutput.length > 50) {
          diagram = mermaidOutput;
          diagramSource = 'codegraph';

          // Overlay hotspot files from repoIntel
          if (repoIntel && repoIntel.hotspotFiles.length > 0) {
            diagram += `\n  subgraph hotspots["🔥 Hotspot Files"]\n`;
            diagram += `    direction LR\n`;
            for (const h of repoIntel.hotspotFiles.slice(0, 10)) {
              const hId = h.path.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
              diagram += `    ${hId}["${h.path}<br/><small>${h.changeCount} changes</small>"]\n`;
            }
            diagram += `  end\n`;
          }
        }
      } finally {
        db.close();
      }
    }
  } catch (e) {
    await log(state.scanId, 'warn', 'git_diagram', `Codegraph Mermaid export failed: ${e instanceof Error ? e.message : String(e)}. Using heuristic diagram.`);
  }

  // Fallback to heuristic diagram if codegraph didn't produce one
  if (!diagram) {
    const modules: ModuleInfo[] = discoveredFiles.map(f => ({
      name: path.basename(f.path, path.extname(f.path)),
      path: f.path,
      type: classifyFile(f.path, f.language),
    }));
    diagram = buildHeuristicDiagram(state, modules);
    diagramSource = 'heuristic';
  }

  const moduleCount = discoveredFiles.length;
  await log(state.scanId, 'info', 'git_diagram', `Generated architecture diagram (${diagramSource}): ${moduleCount} modules, source=${diagramSource}`);

  try {
    await prisma.nodeOutput.create({
      data: {
        scanId: state.scanId,
        node: 'git_diagram',
        modelUsed: diagramSource === 'codegraph' ? 'codegraph' : 'heuristic',
        provider: 'system',
        nodeConfig: { provider: 'system', model: diagramSource === 'codegraph' ? 'codegraph' : 'heuristic' } as any,
        inputJson: { fileCount: moduleCount, diagramSource } as any,
        outputJson: { moduleCount, diagramSource, diagramLength: diagram.length, diagram } as any,
        durationMs: Date.now() - startTime,
      },
    });
  } catch {
    // Non-critical
  }

  return { architectureDiagram: diagram };
}