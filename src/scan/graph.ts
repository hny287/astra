import { StateGraph, START, END, Annotation } from '@langchain/langgraph';
import type { ScanState } from './state';
import { cloneNode } from './nodes/clone';
import { discoverNode } from './nodes/discover';
import { deepScanNode } from './nodes/deep-scan';
import { crossFileNode } from './nodes/cross-file';
import { aggregateNode } from './nodes/aggregate';
import { persistNode } from './nodes/persist';

export const ScanStateAnnotation = Annotation.Root({
  repoUrl: Annotation<string>({
    reducer: (_: string, update: string) => update,
    default: () => '',
  }),
  branch: Annotation<string>({
    reducer: (_: string, update: string) => update,
    default: () => 'main',
  }),
  localDir: Annotation<string>({
    reducer: (_: string, update: string) => update,
    default: () => '',
  }),
  commitSha: Annotation<string>({
    reducer: (_: string, update: string) => update,
    default: () => '',
  }),
  scanId: Annotation<string>({
    reducer: (_: string, update: string) => update,
    default: () => '',
  }),
  config: Annotation<ScanState['config']>({
    reducer: (_: ScanState['config'], update: ScanState['config']) => update,
    default: () => null as unknown as ScanState['config'],
  }),
  discoveredFiles: Annotation<ScanState['discoveredFiles']>({
    reducer: (_: ScanState['discoveredFiles'], update: ScanState['discoveredFiles']) => update,
    default: () => [],
  }),
  skippedFiles: Annotation<string[]>({
    reducer: (a: string[], b: string[]) => [...a, ...b],
    default: () => [],
  }),
  totalFiles: Annotation<number>({
    reducer: (_: number, update: number) => update,
    default: () => 0,
  }),
  findingsPerFile: Annotation<Record<string, ScanState['findingsPerFile'][string]>>({
    reducer: (a: Record<string, ScanState['findingsPerFile'][string]>, b: Record<string, ScanState['findingsPerFile'][string]>) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  fileSummaries: Annotation<ScanState['fileSummaries']>({
    reducer: (a: ScanState['fileSummaries'], b: ScanState['fileSummaries']) => [...a, ...b],
    default: () => [],
  }),
  crossFileFindings: Annotation<ScanState['crossFileFindings']>({
    reducer: (a: ScanState['crossFileFindings'], b: ScanState['crossFileFindings']) => [...a, ...b],
    default: () => [],
  }),
  businessRules: Annotation<ScanState['businessRules']>({
    reducer: (a: ScanState['businessRules'], b: ScanState['businessRules']) => [...a, ...b],
    default: () => [],
  }),
  allFindings: Annotation<ScanState['allFindings']>({
    reducer: (_: ScanState['allFindings'], update: ScanState['allFindings']) => update,
    default: () => [],
  }),
  deduplicatedFindings: Annotation<ScanState['deduplicatedFindings']>({
    reducer: (_: ScanState['deduplicatedFindings'], update: ScanState['deduplicatedFindings']) => update,
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (a: string[], b: string[]) => [...a, ...b],
    default: () => [],
  }),
  tokenUsage: Annotation<ScanState['tokenUsage']>({
    reducer: (a: ScanState['tokenUsage'], b: ScanState['tokenUsage']) => ({
      input: a.input + b.input,
      output: a.output + b.output,
      thinking: a.thinking + b.thinking,
    }),
    default: () => ({ input: 0, output: 0, thinking: 0 }),
  }),
  status: Annotation<ScanState['status']>({
    reducer: (_: ScanState['status'], update: ScanState['status']) => update,
    default: () => 'PENDING' as ScanState['status'],
  }),
});

export function createScanGraph() {
  const graph = new StateGraph(ScanStateAnnotation)
    .addNode('clone', cloneNode)
    .addNode('discover', discoverNode)
    .addNode('deep_scan', deepScanNode)
    .addNode('cross_file', crossFileNode)
    .addNode('aggregate', aggregateNode)
    .addNode('persist', persistNode)
    .addEdge(START, 'clone')
    .addEdge('clone', 'discover')
    .addEdge('discover', 'deep_scan')
    .addEdge('deep_scan', 'cross_file')
    .addEdge('cross_file', 'aggregate')
    .addEdge('aggregate', 'persist')
    .addEdge('persist', END);

  return graph.compile();
}