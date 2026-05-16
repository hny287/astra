import fs from 'fs/promises';
import path from 'path';
import pLimit from 'p-limit';
import type { ScanState } from '../state';
import type { UnifiedFinding, FileSummary } from '../../findings/types';
import { fingerprint } from '../../findings/dedup';
import { upsertFinding } from '../../findings/persist';
import { createProviderForNode } from '../../providers/factory';
import { loadKnowledgeBase, loadRulesForContext } from '../../rules/loader';
import type { AIRequest } from '../../providers/base';
import type { NodeConfig } from '../../lib/config';
import { SCAN_DEPTH_OUTPUT_TOKENS, THINKING_DEPTH_BUDGET } from '../../lib/config';
import { buildDeepScanPrompt, loadPrompts } from '../prompts/deep-scan';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import { prisma } from '@/lib/db';
import { parseAiJson } from './parse-ai-json';
import { log } from '../log';

function parseFindingsResponse(text: string, filePath: string): { findings: any[]; fileSummary: any } {
  const parsed = parseAiJson<{ findings?: any[]; fileSummary?: any }>(text);
  if (parsed) {
    return {
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      fileSummary: parsed.fileSummary ?? null,
    };
  }
  return { findings: [], fileSummary: null };
}

function mapToUnifiedFinding(raw: any, filePath: string, language: string): UnifiedFinding {
  const ruleId = raw.ruleId || 'ai-layer-1';
  const lineStart = typeof raw.lineStart === 'number' ? raw.lineStart : 0;
  return {
    fingerprint: fingerprint('ai-layer-1', ruleId, filePath, lineStart, raw.title),
    scanner: 'ai-layer-1',
    ruleId,
    title: raw.title || 'AI-detected vulnerability',
    description: raw.description || '',
    severity: raw.severity || 'MEDIUM',
    category: raw.category || 'SAST',
    file: filePath,
    lineStart,
    lineEnd: typeof raw.lineEnd === 'number' ? raw.lineEnd : lineStart,
    codeSnippet: raw.codeSnippet || '',
    language: raw.language || language,
    cwe: Array.isArray(raw.cwe) ? raw.cwe : [],
    owasp: Array.isArray(raw.owasp) ? raw.owasp : [],
    aiExplanation: raw.aiExplanation || '',
    aiFix: raw.aiFix || '',
    exploitationScenario: raw.exploitationScenario || '',
    exploitScore: typeof raw.exploitScore === 'number' ? raw.exploitScore : 5,
    cvssScore: typeof raw.cvssScore === 'number' ? raw.cvssScore : 0,
    cvssVector: typeof raw.cvssVector === 'string' ? raw.cvssVector : '',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.5,
    remediation: raw.remediation || '',
    raw: JSON.stringify(raw),
  };
}

function mapToFileSummary(raw: any, filePath: string, language: string): FileSummary {
  return {
    path: filePath,
    language: raw?.language || language,
    purpose: raw?.purpose || '',
    exports: Array.isArray(raw?.exports) ? raw.exports : [],
    dependencies: Array.isArray(raw?.dependencies) ? raw.dependencies : [],
    riskAreas: Array.isArray(raw?.riskAreas) ? raw.riskAreas : [],
    summary: raw?.summary || '',
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildFilePrompt(
  filePath: string,
  language: string,
  content: string,
  toolFindings: import('../../findings/types').UnifiedFinding[] | undefined,
  repoIntel: ScanState['repoIntel'],
  architectureDiagram: string | undefined,
): string {
  let prompt = `File: ${filePath}\nLanguage: ${language}`;

  // Inject repo intelligence context
  if (repoIntel) {
    prompt += `\n\n## Repository Intelligence\n`;
    prompt += `- ${repoIntel.commitCount} commits, ${repoIntel.contributorCount} contributors, ${repoIntel.branchCount} branches\n`;
    if (repoIntel.languages.length > 0) {
      prompt += `- Languages: ${repoIntel.languages.map(l => `${l.language} (${l.percentage}%)`).join(', ')}\n`;
    }
    if (repoIntel.hotspotFiles.length > 0) {
      prompt += `- Hotspot files (most changed):\n${repoIntel.hotspotFiles.slice(0, 10).map(h => `  - ${h.path} (${h.changeCount} changes)`).join('\n')}\n`;
    }
    if (repoIntel.dependencies.length > 0) {
      prompt += `- Dependencies: ${repoIntel.dependencies.map(d => `${d.name} (${d.type})`).join(', ')}\n`;
    }
  }

  // Inject code intelligence (per-file context + direct dependencies)
  const ci = repoIntel?.codeIntel;
  if (ci) {
    const thisFile = ci.files.find(f => f.path === filePath || filePath.endsWith(f.path));
    const directImports = ci.imports.filter(imp => imp.from === filePath || filePath.endsWith(imp.from));

    prompt += `\n\n## Codebase Intelligence\n`;
    prompt += `- ${ci.files.length} files analyzed, ${ci.entryPoints.length} entry points, ${ci.apiRoutes.length} API routes, ${ci.dataModels.length} data models`;
    if (ci.deadExports.length > 0) {
      prompt += `, ${ci.deadExports.length} dead exports`;
    }
    prompt += `\n`;

    // This file's role and exports
    if (thisFile) {
      prompt += `\n### This File\n`;
      prompt += `- Role: ${thisFile.role}\n`;
      if (thisFile.exports.length > 0) {
        prompt += `- Exports: ${thisFile.exports.slice(0, 20).join(', ')}\n`;
      }
      if (thisFile.imports.length > 0) {
        prompt += `- Imports:\n${thisFile.imports.slice(0, 15).map(i => `  - ${i.symbol} from '${i.from}'`).join('\n')}\n`;
      }
    }

    // Direct dependency context — what this file imports
    if (directImports.length > 0) {
      prompt += `\n### Direct Dependencies\n`;
      for (const imp of directImports.slice(0, 15)) {
        const depFile = ci.files.find(f => f.path === imp.to || (imp.to && imp.to.endsWith(f.path)));
        if (depFile && depFile.exports.length > 0) {
          prompt += `- ${imp.to} → exports: ${depFile.exports.slice(0, 10).join(', ')}\n`;
        }
      }
    }

    // API routes reaching this file (security-relevant)
    const reachingRoutes = ci.apiRoutes.filter(r =>
      thisFile && (r.handler === filePath || r.handler === thisFile.path)
    );
    if (reachingRoutes.length > 0) {
      prompt += `\n### API Routes Reaching This File\n`;
      for (const r of reachingRoutes) {
        prompt += `- ${r.method} ${r.path} → ${r.handler}\n`;
      }
    }

    // Security-relevant call chains
    const relevantChains = ci.callChains.filter(c =>
      thisFile && (c.entry.includes(thisFile.path) || c.chain.some(s => s.includes(thisFile.path)))
    );
    if (relevantChains.length > 0) {
      prompt += `\n### Security-Relevant Call Chains\n`;
      for (const c of relevantChains.slice(0, 5)) {
        prompt += `- ${c.entry} → ${c.chain.join(' → ')} (risk: ${c.risk})\n`;
      }
    }

    // Data models (if this file relates to a model)
    if (ci.dataModels.length > 0) {
      prompt += `\n### Data Models\n`;
      for (const m of ci.dataModels.slice(0, 10)) {
        prompt += `- ${m.name} (${m.fields.length} fields, ${m.relations.length} relations)\n`;
      }
    }
  }

  // Inject architecture diagram
  if (architectureDiagram) {
    prompt += `\n\n## Architecture Diagram\n\n${architectureDiagram}\n`;
  }

  // Inject tool scanner findings for this file as context
  const fileFindings = (toolFindings ?? []).filter(f => f.file && (f.file === filePath || f.file.endsWith('/' + filePath) || filePath.endsWith(f.file)));
  if (fileFindings.length > 0) {
    prompt += `\n\nKnown findings from static analysis tools:`;
    for (const f of fileFindings.slice(0, 20)) {
      prompt += `\n- [${f.scanner}] ${f.severity} ${f.category}: "${f.title}" (lines ${f.lineStart}-${f.lineEnd})`;
      if (f.ruleId) prompt += ` — ${f.ruleId}`;
    }
    prompt += `\n\nConsider these findings when analyzing this file. Confirm, enrich, or add new findings as appropriate.`;
  }

  prompt += `\n\n\`\`\`${language}\n${content}\n\`\`\``;
  return prompt;
}

export async function deepScanNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const nodeConfig: NodeConfig = state.config.scan.nodes.deepScan;
  const provider = createProviderForNode('deepScan', state.config);
  const knowledgeBase = await loadKnowledgeBase(path.join(process.cwd(), 'src/rules')).catch(() => ({
    patterns: [],
    guidelines: [],
    prompts: { deepScan: '', businessLogic: '', enrichment: '' },
  }));

  const dbPrompts = await loadPrompts();
  const rulesContext = await loadRulesForContext({
    scanId: state.scanId,
    repoUrl: state.repoUrl,
    languages: state.repoIntel?.languages?.map(l => l.language),
    tokenBudget: nodeConfig.rulesTokenBudget ?? 2000,
  });
  const systemPrompt = dbPrompts.deepScan || knowledgeBase.prompts.deepScan || buildDeepScanPrompt(
    nodeConfig.scanDepth,
    knowledgeBase.patterns.join('\n'),
    rulesContext.rulesText
  );

  const concurrency = nodeConfig.concurrency ?? 5;
  const maxRetries = nodeConfig.maxRetries;
  const retryBackoffMs = nodeConfig.retryBackoffMs;
  const maxFileBytes = nodeConfig.maxFileBytes;

  const findingsPerFile: Record<string, UnifiedFinding[]> = {};
  const fileSummaries: FileSummary[] = [];
  const allFindings: UnifiedFinding[] = [];
  const errors: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;

  const files = state.discoveredFiles;
  // Support single-file rescan: if the job input specifies a singleFile, only scan that one
  const singleFile = (state.currentJobInput as any)?.singleFile;
  const filesToScan = singleFile
    ? files.filter(f => f.path === singleFile)
    : files;

  await log(state.scanId, 'info', 'deep_scan', `Starting deep scan of ${filesToScan.length} file(s) with ${nodeConfig.model} (${nodeConfig.provider}), concurrency=${concurrency}${singleFile ? ` [single-file: ${singleFile}]` : ''}`);

  // Run all files concurrently with p-limit gating at `concurrency` parallel AI calls
  const limit = pLimit(concurrency);

  const tasks = filesToScan.map((fileInfo) =>
    limit(async () => {
      // Cancellation check before each file
      const scan = await prisma.scan.findUnique({ where: { id: state.scanId }, select: { status: true } });
      if (scan?.status === 'FAILED') {
        return { findings: [], summary: null, error: 'Scan cancelled' };
      }

      const fullPath = path.join(state.localDir, fileInfo.path);
      let content: string;
      try {
        const stat = await fs.stat(fullPath);
        if (stat.size > maxFileBytes) {
          return { findings: [], summary: null, error: `File too large: ${fileInfo.path} (${stat.size} bytes)` };
        }
        content = await fs.readFile(fullPath, 'utf-8');
      } catch (err) {
        return { findings: [], summary: null, error: `Cannot read file: ${fileInfo.path}: ${err instanceof Error ? err.message : String(err)}` };
      }

      const estimatedTokens = provider.estimateTokens(content);
      const modelInfo = provider.getModelInfo();
      if (estimatedTokens > modelInfo.contextWindow * 0.8) {
        return { findings: [], summary: null, error: `File too large for context: ${fileInfo.path} (${estimatedTokens} tokens)` };
      }

      const userPrompt = buildFilePrompt(fileInfo.path, fileInfo.language, content, state.toolFindings, state.repoIntel, state.architectureDiagram);

      const request: AIRequest = {
        system: systemPrompt,
        prompt: userPrompt,
        maxOutputTokens: SCAN_DEPTH_OUTPUT_TOKENS[nodeConfig.scanDepth] ?? nodeConfig.maxOutputTokens,
        temperature: nodeConfig.temperature,
        topP: nodeConfig.topP,
        topK: nodeConfig.topK ?? undefined,
        frequencyPenalty: nodeConfig.frequencyPenalty,
        presencePenalty: nodeConfig.presencePenalty,
        stopSequences: nodeConfig.stopSequences.length > 0 ? nodeConfig.stopSequences : undefined,
        thinkingDepth: nodeConfig.thinkingDepth,
        thinkingBudget: nodeConfig.thinkingBudget ?? (nodeConfig.thinkingDepth !== 'none' ? THINKING_DEPTH_BUDGET[nodeConfig.thinkingDepth] : null),
      };

      let lastError: string | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await instrumentedSend(provider, request, {
            scanId: state.scanId,
            jobId: state.currentJobId,
            source: 'pipeline',
            node: 'deep_scan',
            nodeConfig: nodeConfig as Record<string, unknown>,
          });
          totalInputTokens += response.inputTokens;
          totalOutputTokens += response.outputTokens;
          totalThinkingTokens += response.thinkingTokens;

          // Detect empty response despite reported output tokens — model hit token limit
          if (!response.text.trim() && response.outputTokens > 0) {
            lastError = `Model returned empty response with ${response.outputTokens} output tokens for ${fileInfo.path} (attempt ${attempt + 1})`;
            await log(state.scanId, 'warn', 'deep_scan', lastError);
            if (attempt < maxRetries) {
              await sleep(retryBackoffMs * (attempt + 1));
              continue;
            }
            return { findings: [], summary: null, error: lastError, inputTokens: response.inputTokens, outputTokens: response.outputTokens, thinkingTokens: response.thinkingTokens };
          }

          const parsed = parseFindingsResponse(response.text, fileInfo.path);
          const findings = parsed.findings.map((raw: any) => mapToUnifiedFinding(raw, fileInfo.path, fileInfo.language));
          const summary = parsed.fileSummary ? mapToFileSummary(parsed.fileSummary, fileInfo.path, fileInfo.language) : null;

          // Incremental persist: upsert findings to DB as each file completes
          for (const finding of findings) {
            try {
              await upsertFinding(finding, state.scanId);
            } catch (err) {
              await log(state.scanId, 'warn', 'deep_scan', `Failed to upsert finding for ${finding.file}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }

          return { findings, summary, error: null, inputTokens: response.inputTokens, outputTokens: response.outputTokens, thinkingTokens: response.thinkingTokens };
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (attempt < maxRetries) {
            await sleep(retryBackoffMs * (attempt + 1));
          }
        }
      }
      return { findings: [], summary: null, error: `AI call failed for ${fileInfo.path} after ${maxRetries + 1} attempts: ${lastError}` };
    })
  );

  const results = await Promise.allSettled(tasks);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { findings, summary, error } = result.value;
      if (error) {
        errors.push(error);
        await log(state.scanId, 'warn', 'deep_scan', error);
      }
      if (findings.length > 0) {
        const filePath = findings[0].file;
        findingsPerFile[filePath] = findings;
        allFindings.push(...findings);
        await log(state.scanId, 'success', 'deep_scan', `Found ${findings.length} finding(s) in ${filePath}`, { severity: findings.map(f => f.severity) });
      }
      if (summary) {
        fileSummaries.push(summary);
        await log(state.scanId, 'info', 'deep_scan', `Summary: ${summary.path} — ${summary.purpose || 'no purpose'}`);
      }
    } else {
      const errMsg = result.reason?.message || 'Unknown error in deep-scan processing';
      errors.push(errMsg);
      await log(state.scanId, 'error', 'deep_scan', errMsg);
    }
  }

  try {
    await prisma.nodeOutput.create({
      data: {
        scanId: state.scanId,
        node: 'deep_scan',
        modelUsed: nodeConfig.model,
        provider: nodeConfig.provider,
        nodeConfig: nodeConfig as any,
        inputJson: { filesScanned: files.map(f => f.path), fileCount: files.length } as any,
        outputJson: { findings: allFindings.length, summaries: fileSummaries.length } as any,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        thinkingTokens: totalThinkingTokens,
        durationMs: Date.now() - startTime,
      },
    });
  } catch {
    errors.push('Failed to save NodeOutput for deep_scan');
  }

  return {
    findingsPerFile,
    fileSummaries,
    allFindings,
    errors,
    tokenUsage: { input: totalInputTokens, output: totalOutputTokens, thinking: totalThinkingTokens },
  };
}