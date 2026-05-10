export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type Category = 'SAST' | 'SCA' | 'SECRETS' | 'IAC' | 'DATA_FLOW' | 'BUSINESS_LOGIC';

export interface UnifiedFinding {
  fingerprint: string;
  scanner: string;
  ruleId: string;
  title: string;
  description: string;
  severity: Severity;
  category: Category;
  file: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string;
  language: string;
  cwe: string[];
  owasp: string[];
  aiExplanation: string;
  aiFix: string;
  exploitationScenario: string;
  exploitScore: number;
  confidence: number;
  remediation: string;
  raw: string;
}

export interface BusinessLogicRule {
  ruleText: string;
  confidence: number;
  evidenceFiles: string[];
  status: 'CANDIDATE' | 'CONFIRMED' | 'REJECTED';
  violationDescription: string | null;
}

export interface FileSummary {
  path: string;
  language: string;
  purpose: string;
  exports: string[];
  dependencies: string[];
  riskAreas: string[];
  summary: string;
}