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
    fingerprint: fingerprint('ai-layer-2', ruleId, file, lineStart),
    scanner: 'ai-layer-2',
    ruleId,
    title: raw.title || 'Cross-file vulnerability',
    description: raw.description || raw.aiExplanation || '',
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

  const userPrompt = `File Summaries for Cross-File Analysis:\n\n${summariesText}`;

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