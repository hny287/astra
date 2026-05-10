// Central product identity constants.
// All values are configurable via environment variables.
// Change .env to rebrand — no code changes needed.

// ─── Brand identity (NEXT_PUBLIC_ = available in browser) ─────────────────────

/** Short product name — displayed in nav, footer, auth pages, reports. */
export const APP_NAME: string = process.env.NEXT_PUBLIC_APP_NAME || 'Astra';

/** Full product title — page title, SARIF driver name, report headings. */
export const APP_TITLE: string = process.env.NEXT_PUBLIC_APP_TITLE || 'Astra Security Platform';

/** Machine identifier — used for prefixes, filenames, localStorage keys. */
export const APP_ID: string = process.env.NEXT_PUBLIC_APP_ID || 'astra';

/** Email domain for seeded users. */
export const APP_DOMAIN: string = process.env.NEXT_PUBLIC_APP_DOMAIN || 'astra.dev';

// ─── Derived from APP_ID / APP_NAME ──────────────────────────────────────────

/** localStorage key prefix. Changing this invalidates existing browser data. */
export const STORAGE_PREFIX = `${APP_ID}:v1:`;

/** Log file basename (written to logs/ directory). */
export const LOG_FILE = `${APP_ID}.log`;

/** Pino logger service name. */
export const LOG_SERVICE = APP_ID;

/** Temp directory prefix for scan working directories. */
export const TEMP_DIR_PREFIX = `${APP_ID}-scan-`;

/** Download filename prefix — e.g. "astra-<scanId>.csv". */
export const DOWNLOAD_PREFIX = APP_ID;

/** SARIF tool driver name — e.g. "Astra Security Platform Scanner". */
export const SARIF_TOOL_NAME = `${APP_TITLE} Scanner`;

/** SARIF tool information URI — e.g. "https://github.com/astra". */
export const SARIF_INFO_URI = process.env.NEXT_PUBLIC_SARIF_INFO_URI || `https://github.com/${APP_ID}`;

// ─── AI system prompt ─────────────────────────────────────────────────────────

/** Default system prompt for AI chat. Overridable per-scan via DB-backed prompts. */
export const DEFAULT_SYSTEM_PROMPT: string =
  process.env.DEFAULT_SYSTEM_PROMPT ||
  `You are ${APP_NAME}, an AI security assistant. You help users understand security findings, vulnerabilities, and remediation strategies. Be concise, technical, and actionable. When discussing findings, reference specific details like severity, file paths, CWE/OWASP identifiers, and provide concrete remediation advice.`;

// ─── Internal constants (not configurable, not user-facing) ───────────────────

export const SCAN_CONFIG_FILENAME = 'scan.config.json';
export const SCAN_CONFIG_DB_KEY = 'scan.config';
export const RULE_FILE_EXT = '.rule';