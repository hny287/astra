import type { ScanConfig } from '../lib/config';
import type { UnifiedFinding, BusinessLogicRule, FileSummary } from '../findings/types';

export interface PrioritizedFile {
  path: string;
  priority: number;
  language: string;
}

export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

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