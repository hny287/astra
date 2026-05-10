import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { APP_DOMAIN, SCAN_CONFIG_DB_KEY, DEFAULT_SYSTEM_PROMPT } from '../src/lib/branding';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

// Parse schema from connection string (e.g. ?schema=astra01) and pass explicitly,
// because PrismaPg does not read it from the URL automatically.
const schemaParam = new URL(url).searchParams.get('schema') ?? 'public';

const adapter = new PrismaPg({ connectionString: url }, { schema: schemaParam });
const prisma = new PrismaClient({ adapter });

// ─── Default config ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG = {
  providers: {
    anthropic: {
      apiKeyEnv: 'ANTHROPIC_API_KEY',
      models: {
        'claude-opus-4-7': {
          inputTokenLimit: 200000,
          outputTokenLimit: 8192,
          contextWindow: 200000,
          temperature: 0.2,
          supportsThinking: true,
          maxThinkingTokens: 8000,
        },
        'claude-sonnet-4-6': {
          inputTokenLimit: 200000,
          outputTokenLimit: 8192,
          contextWindow: 200000,
          temperature: 0.2,
          supportsThinking: false,
        },
        'claude-haiku-4-5': {
          inputTokenLimit: 200000,
          outputTokenLimit: 4096,
          contextWindow: 200000,
          temperature: 0.2,
          supportsThinking: false,
        },
      },
    },
    openai: {
      apiKeyEnv: 'OPENAI_API_KEY',
      models: {
        'gpt-4o': {
          inputTokenLimit: 128000,
          outputTokenLimit: 4096,
          contextWindow: 128000,
          temperature: 0.2,
          supportsThinking: false,
        },
        'gpt-4o-mini': {
          inputTokenLimit: 128000,
          outputTokenLimit: 4096,
          contextWindow: 128000,
          temperature: 0.2,
          supportsThinking: false,
        },
        o3: {
          inputTokenLimit: 200000,
          outputTokenLimit: 100000,
          contextWindow: 200000,
          temperature: 1,
          supportsThinking: true,
          maxThinkingTokens: 80000,
        },
      },
    },
    'cloud-ollama': {
      baseURL: 'https://ollama.com/api',
      apiKeyEnv: 'CLOUD_OLLAMA_API_KEY',
      models: {
        'gemma3:27b': {
          inputTokenLimit: 64000,
          outputTokenLimit: 8192,
          contextWindow: 64000,
          temperature: 0.6,
          supportsThinking: true,
          maxThinkingTokens: 4096,
        },
        'gemma4:31b': {
          inputTokenLimit: 64000,
          outputTokenLimit: 8192,
          contextWindow: 64000,
          temperature: 0.6,
          supportsThinking: true,
          maxThinkingTokens: 4096,
        },
        'llama3.3:70b': {
          inputTokenLimit: 128000,
          outputTokenLimit: 4096,
          contextWindow: 128000,
          temperature: 0.2,
          supportsThinking: false,
        },
        'deepseek-r1:70b': {
          inputTokenLimit: 64000,
          outputTokenLimit: 8192,
          contextWindow: 64000,
          temperature: 0.6,
          supportsThinking: true,
          maxThinkingTokens: 4096,
        },
        'qwen2.5-coder:32b': {
          inputTokenLimit: 32768,
          outputTokenLimit: 4096,
          contextWindow: 32768,
          temperature: 0.2,
          supportsThinking: false,
        },
      },
    },
    'hosted-ollama': {
      baseURL: process.env.OLLAMA_HOST ?? 'http://localhost:11434',
      models: {
        'llama3.1:8b': {
          inputTokenLimit: 32768,
          outputTokenLimit: 2048,
          contextWindow: 32768,
          temperature: 0.2,
          supportsThinking: false,
        },
      },
    },
  },
  scan: {
    nodes: {
      discover: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        temperature: 0.2,
        thinkingDepth: 'low',
        thinkingBudget: null,
        topP: 0.9,
        topK: null,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        scanDepth: 'standard',
        maxFileBytes: 51200,
        maxOutputTokens: 2048,
        contextWindowOverride: null,
        instructions: '',
        tools: [],
        knowledge: [],
        maxRetries: 3,
        retryBackoffMs: 2000,
        timeoutMs: 60000,
        concurrency: 1,
      },
      deepScan: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        temperature: 0.2,
        thinkingDepth: 'medium',
        thinkingBudget: null,
        topP: 0.9,
        topK: null,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        scanDepth: 'standard',
        maxFileBytes: 51200,
        maxOutputTokens: 4096,
        contextWindowOverride: null,
        instructions: '',
        tools: [],
        knowledge: [],
        maxRetries: 3,
        retryBackoffMs: 2000,
        timeoutMs: 120000,
        concurrency: 5,
      },
      crossFile: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-6',
        temperature: 0.3,
        thinkingDepth: 'medium',
        thinkingBudget: null,
        topP: 0.9,
        topK: null,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        scanDepth: 'standard',
        maxFileBytes: 51200,
        maxOutputTokens: 4096,
        contextWindowOverride: null,
        instructions: '',
        tools: [],
        knowledge: [],
        maxRetries: 3,
        retryBackoffMs: 2000,
        timeoutMs: 180000,
        concurrency: 1,
      },
    },
    severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'],
    ignore: ['node_modules', '.git', 'dist', 'build', '.next', '__pycache__'],
  },
  chat: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.3,
    thinkingDepth: 'low',
    thinkingBudget: null,
    topP: 0.9,
    topK: null,
    frequencyPenalty: 0,
    presencePenalty: 0,
    stopSequences: [],
    maxOutputTokens: 2048,
    maxRetries: 2,
    retryBackoffMs: 1000,
    timeoutMs: 30000,
    systemPrompt:
      DEFAULT_SYSTEM_PROMPT + '\n\nSeverity levels: CRITICAL, HIGH, MEDIUM, LOW, INFO\nFinding categories: SAST (code-level vulns), SCA (dependency vulns), SECRETS (hardcoded credentials), IAC (infra misconfig), DATA_FLOW (unsafe data flow), BUSINESS_LOGIC (logic flaws)\nStatus values: OPEN, CONFIRMED, FALSE_POSITIVE, REMEDIATED, ACCEPTED_RISK, IN_PROGRESS',
  },
};

// ─── Builtin presets ──────────────────────────────────────────────────────────

const BUILTIN_PRESETS = [
  {
    name: 'Standard',
    description: 'Balanced scan — good coverage with reasonable speed. Recommended for most repositories.',
    configJson: {
      scan: {
        nodes: {
          discover: { scanDepth: 'standard', concurrency: 1 },
          deepScan: { scanDepth: 'standard', concurrency: 5, maxOutputTokens: 4096 },
          crossFile: { scanDepth: 'standard', concurrency: 1 },
        },
      },
    },
  },
  {
    name: 'Quick Scan',
    description: 'Fast surface-level scan. Ideal for CI/CD gates and pull-request checks on changed files.',
    configJson: {
      scan: {
        nodes: {
          discover: { scanDepth: 'quick', concurrency: 1 },
          deepScan: { scanDepth: 'quick', concurrency: 10, maxOutputTokens: 1024, timeoutMs: 60000 },
          crossFile: { scanDepth: 'quick', concurrency: 1 },
        },
      },
    },
  },
  {
    name: 'Deep Analysis',
    description: 'Exhaustive scan with maximum AI budget. Use on release candidates and critical services.',
    configJson: {
      scan: {
        nodes: {
          discover: { scanDepth: 'deep', concurrency: 1 },
          deepScan: { scanDepth: 'deep', concurrency: 3, maxOutputTokens: 8192, thinkingDepth: 'high', timeoutMs: 300000 },
          crossFile: { scanDepth: 'deep', concurrency: 1, maxOutputTokens: 8192, thinkingDepth: 'high', timeoutMs: 300000 },
        },
      },
    },
  },
];

// ─── Builtin rules ────────────────────────────────────────────────────────────

const BUILTIN_RULES = [
  {
    name: 'No hardcoded secrets',
    description: 'Flag any hardcoded API keys, passwords, tokens, or credentials in source files.',
    ruleText: 'Report any string literals that appear to be API keys, passwords, connection strings, or authentication tokens. Look for patterns like "password =", "api_key =", "secret =", connection string formats, and bearer token assignments.',
    severity: 'CRITICAL',
    category: 'SECRETS',
    cwe: ['CWE-798'],
  },
  {
    name: 'SQL injection risk',
    description: 'Detect unsanitized user input concatenated into SQL queries.',
    ruleText: 'Identify database queries that concatenate user-controlled input directly without parameterization or prepared statements. Flag string formatting, concatenation, or template literal usage in SQL context.',
    severity: 'CRITICAL',
    category: 'SAST',
    cwe: ['CWE-89'],
  },
  {
    name: 'Missing authentication check',
    description: 'Flag API endpoints or routes that process sensitive operations without verifying authentication.',
    ruleText: 'Look for request handlers, route definitions, or API endpoints that perform privileged actions (data mutation, admin operations, user management) without a visible auth check, session validation, or middleware guard.',
    severity: 'HIGH',
    category: 'BUSINESS_LOGIC',
    cwe: ['CWE-306'],
  },
  {
    name: 'Insecure direct object reference',
    description: 'Detect cases where user-supplied IDs access objects without ownership verification.',
    ruleText: 'Flag code that uses a user-supplied identifier (from URL params, query string, or request body) to look up a database record without verifying the requesting user owns or has permission to access that record.',
    severity: 'HIGH',
    category: 'SAST',
    cwe: ['CWE-639'],
  },
  {
    name: 'Sensitive data in logs',
    description: 'Detect PII, credentials, or sensitive values being written to logs.',
    ruleText: 'Identify logging statements (console.log, logger.info, print, etc.) that include sensitive fields such as passwords, tokens, credit card numbers, SSNs, email addresses, or any field labeled as private or confidential.',
    severity: 'MEDIUM',
    category: 'DATA_FLOW',
    cwe: ['CWE-532'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 12);

  await prisma.user.upsert({
    where: { email: `admin@${APP_DOMAIN}` },
    update: {},
    create: { email: `admin@${APP_DOMAIN}`, name: 'Admin User', passwordHash, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { email: `analyst@${APP_DOMAIN}` },
    update: {},
    create: { email: `analyst@${APP_DOMAIN}`, name: 'Security Analyst', passwordHash, role: 'ANALYST' },
  });

  await prisma.user.upsert({
    where: { email: `viewer@${APP_DOMAIN}` },
    update: {},
    create: { email: `viewer@${APP_DOMAIN}`, name: 'Viewer', passwordHash, role: 'VIEWER' },
  });

  console.log(`  ✓ Users: admin@${APP_DOMAIN} · analyst@${APP_DOMAIN} · viewer@${APP_DOMAIN} (password: password123)`);

  // ── Config ─────────────────────────────────────────────────────────────────
  await prisma.config.upsert({
    where: { key: SCAN_CONFIG_DB_KEY },
    update: { value: DEFAULT_CONFIG as any },
    create: { key: SCAN_CONFIG_DB_KEY, value: DEFAULT_CONFIG as any },
  });

  console.log(`  ✓ Config: ${SCAN_CONFIG_DB_KEY}`);

  // ── Preferences ────────────────────────────────────────────────────────────
  await prisma.userPreference.upsert({
    where: { key: 'theme' },
    update: {},
    create: { key: 'theme', value: 'light' },
  });

  console.log('  ✓ Preferences: theme=light');

  // ── Presets ────────────────────────────────────────────────────────────────
  for (const preset of BUILTIN_PRESETS) {
    await prisma.preset.upsert({
      where: { name: preset.name },
      update: { description: preset.description, configJson: preset.configJson as any },
      create: {
        name: preset.name,
        description: preset.description,
        configJson: preset.configJson as any,
        isBuiltin: true,
        userId: null,
      },
    });
  }

  console.log(`  ✓ Presets: ${BUILTIN_PRESETS.map(p => p.name).join(' · ')}`);

  // ── Builtin rules ──────────────────────────────────────────────────────────
  for (const rule of BUILTIN_RULES) {
    const existing = await prisma.userRule.findFirst({
      where: { name: rule.name, isBuiltin: true },
    });
    if (!existing) {
      await prisma.userRule.create({
        data: { ...rule, isBuiltin: true, isActive: true },
      });
    }
  }

  console.log(`  ✓ Rules: ${BUILTIN_RULES.map(r => r.name).join(' · ')}`);

  console.log('\n✅ Seed complete.\n');
  console.log('  Sign in at /auth/signin with any seeded account:');
  console.log('  ┌─────────────────────────┬─────────────┬──────────┐');
  console.log('  │ Email                   │ Password    │ Role     │');
  console.log('  ├─────────────────────────┼─────────────┼──────────┤');
  console.log(`  │ admin@${APP_DOMAIN}          │ password123 │ ADMIN    │`);
  console.log(`  │ analyst@${APP_DOMAIN}        │ password123 │ ANALYST  │`);
  console.log(`  │ viewer@${APP_DOMAIN}         │ password123 │ VIEWER   │`);
  console.log('  └─────────────────────────┴─────────────┴──────────┘');
}

main()
  .catch(e => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
