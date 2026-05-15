import type { ScanConfig } from '../lib/config';
import type { UnifiedFinding, BusinessLogicRule, FileSummary } from '../findings/types';

export interface PrioritizedFile {
  path: string;
  priority: number;
  language: string;
}

export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// ── Code Intelligence (from @optave/codegraph) ──────────────────────────

export interface CodeIntelFile {
  path: string;
  language: string;
  role: 'entry' | 'core' | 'utility' | 'adapter' | 'dead' | 'leaf' | 'other';
  exports: string[];
  imports: { symbol: string; from: string }[];
  functions: { name: string; lineStart: number; lineEnd: number }[];
  classes: { name: string; lineStart: number; lineEnd: number; methods: string[] }[];
}

export interface ImportEdge {
  from: string;
  to: string;
  symbols: string[];
}

export interface ApiRoute {
  method: string;
  path: string;
  handler: string;
  middleware: string[];
}

export interface DataModel {
  name: string;
  file: string;
  fields: { name: string; type: string; nullable: boolean }[];
  relations: { name: string; target: string; type: string }[];
}

export interface CallChain {
  entry: string;
  chain: string[];
  risk: 'high' | 'medium' | 'low';
}

export interface CodeIntel {
  files: CodeIntelFile[];
  imports: ImportEdge[];
  apiRoutes: ApiRoute[];
  dataModels: DataModel[];
  entryPoints: string[];
  deadExports: string[];
  callChains: CallChain[];
}

export interface RepoIntel {
  commitCount: number;
  contributorCount: number;
  branchCount: number;
  recentCommits: { hash: string; author: string; date: string; message: string }[];
  topContributors: { name: string; email: string; commitCount: number }[];
  hotspotFiles: { path: string; changeCount: number }[];
  languages: { language: string; fileCount: number; percentage: number }[];
  dependencies: { name: string; version: string; type: string }[];
  codeIntel: CodeIntel | null;
}

export interface ScanState {
  repoUrl: string;
  branch: string;
  localDir: string;
  commitSha: string;
  scanId: string;
  config: ScanConfig;
  discoveredFiles: PrioritizedFile[];
  skippedFiles: string[];
  totalFiles: number;
  repoIntel: RepoIntel | null;
  architectureDiagram: string;
  toolFindings: UnifiedFinding[];
  findingsPerFile: Record<string, UnifiedFinding[]>;
  fileSummaries: FileSummary[];
  crossFileFindings: UnifiedFinding[];
  businessRules: BusinessLogicRule[];
  allFindings: UnifiedFinding[];
  deduplicatedFindings: UnifiedFinding[];
  errors: string[];
  tokenUsage: { input: number; output: number; thinking: number };
  status: ScanStatus;
  currentJobId?: string;
  userId?: string;
  currentJobInput?: Record<string, unknown>;
}