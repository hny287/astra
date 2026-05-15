import path from 'path';
import type { ScanState } from '../state';
import type { UnifiedFinding, BusinessLogicRule } from '../../findings/types';
import { fingerprint } from '../../findings/dedup';
import { createProviderForNode } from '../../providers/factory';
import { loadKnowledgeBase } from '../../rules/loader';
import type { AIRequest } from '../../providers/base';
import type { NodeConfig } from '../../lib/config';
import { SCAN_DEPTH_OUTPUT_TOKENS, THINKING_DEPTH_BUDGET } from '../../lib/config';
import { buildCrossFilePrompt, loadPrompts } from '../prompts/deep-scan';
import { instrumentedSend } from '@/lib/ai-instrumentation';
import { prisma } from '@/lib/db';
import { log } from '../log';

function stripMarkdownCodeBlock(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '');
  }
  return cleaned.trim();
}

function parseCrossFileResponse(text: string): { findings: any[]; rules: any[] } {
  const cleaned = stripMarkdownCodeBlock(text);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    };
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          findings: Array.isArray(parsed.findings) ? parsed.findings : [],
          rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        };
      } catch {
        return { findings: [], rules: [] };
      }
    }
    return { findings: [], rules: [] };
  }
}

function mapToUnifiedFinding(raw: any): UnifiedFinding {
  const ruleId = raw.ruleId || 'cross-file-ai';
  const lineStart = typeof raw.lineStart === 'number' ? raw.lineStart : 0;
  const file = raw.file || 'multiple';
  return {
    fingerprint: fingerprint('ai-layer-2', ruleId, file, lineStart, raw.title),
    scanner: 'ai-layer-2',
    ruleId,
    title: raw.title || 'Cross-file vulnerability',
    description: raw.description || '',
    severity: raw.severity || 'HIGH',
    category: raw.category || 'BUSINESS_LOGIC',
    file,
    lineStart,
    lineEnd: typeof raw.lineEnd === 'number' ? raw.lineEnd : lineStart,
    codeSnippet: raw.codeSnippet || '',
    language: raw.language || '',
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

function mapToBusinessRule(raw: any): BusinessLogicRule {
  return {
    ruleText: raw.ruleText || '',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.5,
    evidenceFiles: Array.isArray(raw.evidenceFiles) ? raw.evidenceFiles : [],
    status: 'CANDIDATE' as const,
    violationDescription: raw.violationDescription ?? null,
  };
}

function buildCrossFileUserPrompt(summariesText: string, state: ScanState): string {
  let prompt = '';

  // Inject repo intelligence if available
  if (state.repoIntel) {
    const ri = state.repoIntel;
    prompt += `## Repository Intelligence\n`;
    prompt += `- ${ri.commitCount} commits, ${ri.contributorCount} contributors, ${ri.branchCount} branches\n`;
    if (ri.languages.length > 0) {
      prompt += `- Languages: ${ri.languages.map(l => `${l.language} (${l.percentage}%)`).join(', ')}\n`;
    }
    if (ri.hotspotFiles.length > 0) {
      prompt += `- Hotspot files (most changed):\n${ri.hotspotFiles.slice(0, 10).map(h => `  - ${h.path} (${h.changeCount} changes)`).join('\n')}\n`;
    }
    if (ri.dependencies.length > 0) {
      prompt += `- Dependencies: ${ri.dependencies.map(d => `${d.name} (${d.type})`).join(', ')}\n`;
    }
    prompt += '\n';
  }

  // Inject full code intelligence
  const ci = state.repoIntel?.codeIntel;
  if (ci) {
    prompt += `## Codebase Intelligence\n\n`;
    prompt += `**Overview:** ${ci.files.length} files, ${ci.entryPoints.length} entry points, ${ci.apiRoutes.length} API routes, ${ci.dataModels.length} data models, ${ci.deadExports.length} dead exports, ${ci.callChains.length} call chains\n\n`;

    // File map — role, exports count, imports count per file
    prompt += `### File Map\n`;
    const maxFiles = Math.min(ci.files.length, 200);
    for (let i = 0; i < maxFiles; i++) {
      const f = ci.files[i];
      prompt += `- ${f.path} (${f.language}, ${f.role}, ${f.exports.length} exports, ${f.imports.length} imports)\n`;
    }
    if (ci.files.length > maxFiles) {
      prompt += `- ... and ${ci.files.length - maxFiles} more files\n`;
    }
    prompt += '\n';

    // Import graph — which files depend on which
    if (ci.imports.length > 0) {
      prompt += `### Import Graph\n`;
      const maxEdges = Math.min(ci.imports.length, 150);
      for (let i = 0; i < maxEdges; i++) {
        const imp = ci.imports[i];
        prompt += `- ${imp.from} → ${imp.to}`;
        if (imp.symbols.length > 0 && imp.symbols.length <= 5) {
          prompt += ` (${imp.symbols.join(', ')})`;
        } else if (imp.symbols.length > 5) {
          prompt += ` (${imp.symbols.slice(0, 5).join(', ')} +${imp.symbols.length - 5})`;
        }
        prompt += '\n';
      }
      if (ci.imports.length > maxEdges) {
        prompt += `- ... and ${ci.imports.length - maxEdges} more import edges\n`;
      }
      prompt += '\n';
    }

    // API routes
    if (ci.apiRoutes.length > 0) {
      prompt += `### API Routes\n`;
      for (const r of ci.apiRoutes) {
        prompt += `- ${r.method} ${r.path} → ${r.handler}`;
        if (r.middleware.length > 0) prompt += ` [${r.middleware.join(', ')}]`;
        prompt += '\n';
      }
      prompt += '\n';
    }

    // Data models
    if (ci.dataModels.length > 0) {
      prompt += `### Data Models\n`;
      for (const m of ci.dataModels) {
        prompt += `- **${m.name}** (${m.fields.length} fields, ${m.relations.length} relations)\n`;
        for (const f of m.fields.slice(0, 15)) {
          prompt += `  - ${f.name}: ${f.type}${f.nullable ? '?' : ''}\n`;
        }
        if (m.fields.length > 15) prompt += `  - ... +${m.fields.length - 15} more fields\n`;
        for (const r of m.relations) {
          prompt += `  - ↔ ${r.name} → ${r.target} (${r.type})\n`;
        }
      }
      prompt += '\n';
    }

    // Call chains (security-relevant)
    if (ci.callChains.length > 0) {
      prompt += `### Security-Relevant Call Chains\n`;
      for (const c of ci.callChains) {
        prompt += `- ${c.entry} → ${c.chain.join(' → ')} (risk: ${c.risk})\n`;
      }
      prompt += '\n';
    }

    // Dead exports
    if (ci.deadExports.length > 0) {
      prompt += `### Dead Exports\n`;
      for (const d of ci.deadExports.slice(0, 30)) {
        prompt += `- ${d}\n`;
      }
      if (ci.deadExports.length > 30) prompt += `- ... +${ci.deadExports.length - 30} more\n`;
      prompt += '\n';
    }
  }

  // Inject architecture diagram if available
  if (state.architectureDiagram) {
    prompt += `## Architecture Diagram\n\n${state.architectureDiagram}\n\n`;
  }

  // Inject tool scanner findings summary
  if (state.toolFindings && state.toolFindings.length > 0) {
    prompt += `## Known Findings from Static Analysis Tools\n`;
    const byScanner: Record<string, number> = {};
    const byFile: Record<string, string[]> = {};
    for (const f of state.toolFindings) {
      byScanner[f.scanner] = (byScanner[f.scanner] || 0) + 1;
      const fileKey = f.file || '(unknown)';
      if (!byFile[fileKey]) byFile[fileKey] = [];
      byFile[fileKey].push(`[${f.scanner}] ${f.severity} ${f.category}: "${f.title}"`);
    }
    prompt += `Total: ${state.toolFindings.length} findings (${Object.entries(byScanner).map(([s, c]) => `${c} ${s}`).join(', ')})\n`;
    for (const [file, findings] of Object.entries(byFile).slice(0, 30)) {
      prompt += `- ${file}: ${findings.join('; ')}\n`;
    }
    prompt += `\nConsider these findings when analyzing cross-file vulnerabilities. Enrich or confirm them as appropriate.\n\n`;
  }

  prompt += `## File Summaries for Cross-File Analysis\n\n${summariesText}`;
  return prompt;
}

export async function crossFileNode(state: ScanState): Promise<Partial<ScanState>> {
  const startTime = Date.now();
  const nodeConfig: NodeConfig = state.config.scan.nodes.crossFile;
  const provider = createProviderForNode('crossFile', state.config);
  await log(state.scanId, 'info', 'cross_file', `Starting cross-file analysis with ${nodeConfig.model} (${nodeConfig.provider}), ${state.fileSummaries.length} summaries`);
  const knowledgeBase = await loadKnowledgeBase(path.join(process.cwd(), 'src/rules')).catch(() => ({
    patterns: [],
    guidelines: [],
    prompts: { deepScan: '', businessLogic: '', enrichment: '' },
  }));

  const dbPrompts = await loadPrompts();
  const systemPrompt = dbPrompts.crossFile || knowledgeBase.prompts.businessLogic || buildCrossFilePrompt(
    nodeConfig.scanDepth,
    knowledgeBase.patterns.join('\n')
  );

  const summariesText = state.fileSummaries.map(s => {
    return `File: ${s.path}
Language: ${s.language}
Purpose: ${s.purpose}
Exports: ${s.exports.join(', ') || 'none'}
Dependencies: ${s.dependencies.join(', ') || 'none'}
Risk Areas: ${s.riskAreas.join(', ') || 'none'}
Summary: ${s.summary}`;
  }).join('\n\n---\n\n');

  if (!summariesText.trim()) {
    await log(state.scanId, 'warn', 'cross_file', 'No file summaries available for cross-file analysis');
    return {
      crossFileFindings: [],
      businessRules: [],
      errors: ['No file summaries available for cross-file analysis'],
      tokenUsage: { input: 0, output: 0, thinking: 0 },
    };
  }

  const userPrompt = buildCrossFileUserPrompt(summariesText, state);

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

  const crossFileFindings: UnifiedFinding[] = [];
  const businessRules: BusinessLogicRule[] = [];
  const errors: string[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalThinkingTokens = 0;

  let lastError: string | null = null;
  for (let attempt = 0; attempt <= nodeConfig.maxRetries; attempt++) {
    try {
      const response = await instrumentedSend(provider, request, {
        scanId: state.scanId,
        jobId: state.currentJobId,
        source: 'pipeline',
        node: 'cross_file',
        nodeConfig: nodeConfig as Record<string, unknown>,
      });
      totalInputTokens = response.inputTokens;
      totalOutputTokens = response.outputTokens;
      totalThinkingTokens = response.thinkingTokens;

      // Detect empty response despite reported output tokens — model hit token limit
      if (!response.text.trim() && response.outputTokens > 0) {
        lastError = `Model returned empty response with ${response.outputTokens} output tokens (attempt ${attempt + 1})`;
        await log(state.scanId, 'warn', 'cross_file', lastError);
        if (attempt < nodeConfig.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, nodeConfig.retryBackoffMs * (attempt + 1)));
          continue;
        }
        throw new Error(lastError);
      }

      const parsed = parseCrossFileResponse(response.text);
      for (const raw of parsed.findings) {
        crossFileFindings.push(mapToUnifiedFinding(raw));
      }
      for (const raw of parsed.rules) {
        businessRules.push(mapToBusinessRule(raw));
      }
      lastError = null;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < nodeConfig.maxRetries) {
        await new Promise(resolve => setTimeout(resolve, nodeConfig.retryBackoffMs * (attempt + 1)));
      }
    }
  }

  if (lastError) {
    errors.push(`Cross-file AI call failed after ${nodeConfig.maxRetries + 1} attempts: ${lastError}`);
  }

  try {
    await prisma.nodeOutput.create({
      data: {
        scanId: state.scanId,
        node: 'cross_file',
        modelUsed: nodeConfig.model,
        provider: nodeConfig.provider,
        nodeConfig: nodeConfig as any,
        inputJson: { summaryCount: state.fileSummaries.length } as any,
        outputJson: { findings: crossFileFindings.length, rules: businessRules.length } as any,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        thinkingTokens: totalThinkingTokens,
        durationMs: Date.now() - startTime,
      },
    });
  } catch {
    errors.push('Failed to save NodeOutput for cross_file');
  }

  await log(state.scanId, 'success', 'cross_file', `Cross-file analysis: ${crossFileFindings.length} findings, ${businessRules.length} business rules`);

  return {
    crossFileFindings,
    businessRules,
    errors,
    tokenUsage: { input: totalInputTokens, output: totalOutputTokens, thinking: totalThinkingTokens },
  };
}