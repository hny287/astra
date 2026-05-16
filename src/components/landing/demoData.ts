// src/components/landing/demoData.ts
// Mock findings and output examples for the interactive demo section.
// Includes both raw scanner output and AI-enriched output for comparison.

import { APP_NAME } from '@/lib/branding';

export interface DemoFinding {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  file: string;
  line: number;
  scanner: string;
  category: string;
}

const severityColors: Record<string, string> = {
  CRITICAL: '#da1e28',
  HIGH: '#f57c00',
  MEDIUM: '#f1c21b',
  LOW: '#24a148',
};

export const demoFindings: DemoFinding[] = [
  {
    id: 'f-001',
    severity: 'CRITICAL',
    title: 'SQL injection in authentication query',
    file: 'auth/login.ts',
    line: 47,
    scanner: `${APP_NAME} AI`,
    category: 'SAST',
  },
  {
    id: 'f-002',
    severity: 'HIGH',
    title: 'Exposed AWS access key in environment config',
    file: '.env',
    line: 5,
    scanner: 'Gitleaks',
    category: 'Secrets',
  },
  {
    id: 'f-003',
    severity: 'HIGH',
    title: 'Open S3 bucket allows public read access',
    file: 'terraform/main.tf',
    line: 34,
    scanner: 'Trivy',
    category: 'IaC',
  },
  {
    id: 'f-004',
    severity: 'MEDIUM',
    title: 'Missing authentication middleware on admin endpoints',
    file: 'routes/admin.ts',
    line: 12,
    scanner: `${APP_NAME} AI`,
    category: 'Business Logic',
  },
  {
    id: 'f-005',
    severity: 'MEDIUM',
    title: 'CVE-2024-1234: Prototype pollution in lodash',
    file: 'package.json',
    line: 0,
    scanner: 'Trivy',
    category: 'SCA',
  },
];

export const rawOutputExample = `{
  "SchemaVersion": "2.1.0",
  "ArtifactName": "repo",
  "Results": [{
    "Target": "auth/login.ts",
    "Type": "misconfiguration",
    "Vulnerabilities": [{
      "VulnerabilityID": "CVE-2024-38512",
      "PkgName": "express",
      "InstalledVersion": "4.18.2",
      "FixedVersion": "4.19.2",
      "Title": "express: Open Redirect vulnerability",
      "Severity": "MEDIUM",
      "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2024-38512",
      "Description": "Open redirect vulnerability in Express allows attackers to redirect users to arbitrary URLs via malformed input to res.redirect()"
    }, {
      "VulnerabilityID": "CVE-2024-3094",
      "PkgName": "xz-utils",
      "InstalledVersion": "5.6.0",
      "FixedVersion": "5.4.6",
      "Title": "xz-utils: Supply chain backdoor",
      "Severity": "CRITICAL",
      "PrimaryURL": "https://avd.aquasec.com/nvd/cve-2024-3094",
      "Description": "Supply chain backdoor in xz-utils 5.6.0/5.6.1 allows remote code execution via SSH authentication"
    }]
  }, {
    "Target": "terraform/main.tf",
    "Type": "misconfiguration",
    "Misconfigurations": [{
      "ID": "AVD-AWS-0035",
      "Title": "S3 bucket has public read access",
      "Severity": "HIGH",
      "PrimaryURL": "https://avd.aquasec.com/misconfig/avd-aws-0035",
      "Description": "S3 bucket 'app-uploads' allows public read access, potentially exposing sensitive data"
    }]
  }]
}`;

export const enrichedOutputExample = {
  title: 'SQL injection in authentication query',
  explanation: 'This SQL query concatenates user input directly into the query string, enabling complete authentication bypass. An attacker can inject `\' OR 1=1 --` to bypass login, or use UNION SELECT to exfiltrate the entire user table including password hashes.',
  fix: 'Replace string interpolation with parameterized queries:\n\n```diff\n- const query = `SELECT * FROM users WHERE username = \'${username}\' AND password = \'${password}\'`;\n+ const query = \'SELECT * FROM users WHERE username = $1 AND password = $2\';\n+ const result = await db.query(query, [username, password]);\n```',
  exploitScore: 8.2,
  cwe: ['CWE-89'],
  owasp: ['A03:2021'],
  businessContext: 'This endpoint is part of the authentication flow — a successful injection bypasses login entirely, granting unauthorized access to any account including admin. Combined with the missing auth middleware on /api/admin/*, this creates a critical privilege escalation chain.',
  remediation: 'Use parameterized queries or an ORM that handles query construction. Add rate limiting and account lockout to prevent brute-force attacks. Consider adding WAF rules for SQL injection patterns.',
};