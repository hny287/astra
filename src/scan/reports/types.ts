export interface ReportData {
  scan: {
    id: string;
    repoUrl: string;
    branch: string;
    status: string;
    createdAt: string;
    durationSeconds: number | null;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
  findings: {
    id: string;
    status: string;
    assignedToId: string | null;
    title: string;
    severity: string;
    category: string;
    file: string;
    lineStart: number;
    lineEnd: number;
    codeSnippet: string;
    aiExplanation: string | null;
    aiFix: string | null;
    exploitationScenario: string | null;
    cwe: string[];
    owasp: string[];
    exploitScore: number;
    confidence: number;
    description: string;
    remediation: string;
    scanner: string;
    language: string;
  }[];
  businessRules: {
    ruleText: string;
    confidence: number;
    evidenceFiles: string[];
    status: string;
    violationDescription: string | null;
  }[];
}