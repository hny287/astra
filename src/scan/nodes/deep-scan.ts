import fs from 'fs/promises';
import path from 'path';
import type { ScanState } from '../state';
import type { UnifiedFinding, FileSummary } from '../../findings/types';
import { fingerprint } from '../../findings/dedup';
import { createProviderForNode } from '../../providers/factory';
import { loadKnowledgeBase } from '../../rules/loader';
import type { AIRequest } from '../../providers/base';
import type { NodeConfig } from '../../lib/config';
import { SCAN_DEPTH_OUTPUT_TOKENS, THINKING_DEPTH_BUDGET } from '../../lib/config';
import { buildDeepScanPrompt, loadPrompts } from '../prompts/deep-scan';
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

function parseFindingsResponse(text: string, filePath: string): { findings: any[]; fileSummary: any } {
  const cleaned = stripMarkdownCodeBlock(text);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      fileSummary: parsed.fileSummary ?? null,
    };
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          findings: Array.isArray(parsed.findings) ? parsed.findings : [],
          fileSummary: parsed.fileSummary ?? null,
        };
      } catch {
        return { findings: [], fileSummary: null };
      }
    }
    return { findings: [], fileSummary: null };
  }
}

function mapToUnifiedFinding(raw: any, filePath: string, language: string): UnifiedFinding {
  const ruleId = raw.ruleId || 'ai-layer-1';
  const lineStart = typeof raw.lineStart === 'number' ? raw.lineStart : 0;
  return {
    fingerprint: fingerprint('ai-layer-1', ruleId, filePath, lineStart),
    scanner: 'ai-layer-1',
    ruleId,
    title: raw.title || 'AI-detected vulnerability',
    description: raw.description || raw.aiExplanation || '',
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
  const systemPrompt = dbPrompts.deepScan || knowledgeBase.prompts.deepScan || buildDeepScanPrompt(
    nodeConfig.scanDepth,
    knowledgeBase.patterns.join('\n')
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
  const singleFileLanguage = (state.currentJobInput as any)?.singleFileLanguage;
  const filesToScan = singleFile
    ? files.filter(f => f.path === singleFile)
    : files;
  await log(state.scanId, 'info', 'deep_scan', `Starting deep scan of ${filesToScan.length} file(s) with ${nodeConfig.model} (${nodeConfig.provider})${singleFile ? ` [single-file: ${singleFile}]` : ''}`);
  const batches: typeof filesToScan[] = [];
  for (let i = 0; i < filesToScan.length; i += concurrency) {
    batches.push(filesToScan.slice(i, i + concurrency));
  }

  for (const batch of batches) {
    const batchIdx = batches.indexOf(batch) + 1;
    await log(state.scanId, 'info', 'deep_scan', `Batch ${batchIdx}/${batches.length} — scanning ${batch.length} files`);

    const results = await Promise.allSettled(
      batch.map(async (fileInfo) => {
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

        const userPrompt = `File: ${fileInfo.path}\nLanguage: ${fileInfo.language}\n\n\`\`\`${fileInfo.language}\n${content}\n\`\`\``;

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
        const errMsg = result.reason?.message || 'Unknown error in batch processing';
        errors.push(errMsg);
        await log(state.scanId, 'error', 'deep_scan', errMsg);
      }
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