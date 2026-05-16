export const VALID_CATEGORIES = ['SAST', 'SCA', 'SECRETS', 'IAC', 'DATA_FLOW', 'BUSINESS_LOGIC'] as const;
export type ValidCategory = typeof VALID_CATEGORIES[number];

export const CATEGORY_MAP: Record<string, ValidCategory> = {
  SAST: 'SAST',
  SCA: 'SCA',
  SECRETS: 'SECRETS',
  IAC: 'IAC',
  DATA_FLOW: 'DATA_FLOW',
  BUSINESS_LOGIC: 'BUSINESS_LOGIC',
  CONFIGURATION: 'IAC',
  MISCONFIGURATION: 'IAC',
  INSECURE_DESIGN: 'SAST',
  INJECTION: 'SAST',
  BROKEN_ACCESS_CONTROL: 'BUSINESS_LOGIC',
  CRYPTO: 'SAST',
  CRYPTOGRAPHY: 'SAST',
  XSS: 'SAST',
  SQL_INJECTION: 'SAST',
  AUTH: 'BUSINESS_LOGIC',
  AUTHENTICATION: 'BUSINESS_LOGIC',
  AUTHORIZATION: 'BUSINESS_LOGIC',
  VULNERABILITY: 'SAST',
  DEPENDENCY: 'SCA',
  DEPENDENCIES: 'SCA',
  SECRET: 'SECRETS',
  HARDCODED_SECRET: 'SECRETS',
  LEAK: 'SECRETS',
  COMPLIANCE: 'IAC',
  INFRASTRUCTURE: 'IAC',
  DATA_EXPOSURE: 'DATA_FLOW',
  PRIVACY: 'DATA_FLOW',
  LOGIC: 'BUSINESS_LOGIC',
};

export function normalizeCategory(raw: string): ValidCategory {
  const upper = (raw || 'SAST').toUpperCase().replace(/[^A-Z_]/g, '_');
  if ((VALID_CATEGORIES as readonly string[]).includes(upper)) return upper as ValidCategory;
  return CATEGORY_MAP[upper] ?? 'SAST';
}

const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
type ValidSeverity = typeof VALID_SEVERITIES[number];

export function normalizeSeverity(raw: string): ValidSeverity {
  const upper = (raw || 'MEDIUM').toUpperCase();
  if ((VALID_SEVERITIES as readonly string[]).includes(upper)) return upper as ValidSeverity;
  return 'MEDIUM';
}