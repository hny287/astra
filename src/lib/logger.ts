export type LogLevel = 'silent' | 'normal' | 'verbose' | 'debug';

let currentLevel: LogLevel = 'normal';

const LEVEL_ORDER: Record<LogLevel, number> = {
  silent: 0,
  normal: 1,
  verbose: 2,
  debug: 3,
};

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function getLogLevel(): LogLevel {
  return currentLevel;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] <= LEVEL_ORDER[currentLevel];
}

export function step(prefix: string, msg: string) {
  if (shouldLog('normal')) console.log(`\x1b[36m▸\x1b[0m \x1b[1m[${prefix}]\x1b[0m ${msg}`);
}

export function info(msg: string) {
  if (shouldLog('normal')) console.log(msg);
}

export function success(msg: string) {
  if (shouldLog('normal')) console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

export function warn(msg: string) {
  if (shouldLog('normal')) console.log(`\x1b[33m⚠\x1b[0m ${msg}`);
}

export function error(msg: string) {
  if (shouldLog('normal')) console.error(`\x1b[31m✗\x1b[0m ${msg}`);
}

export function verbose(msg: string) {
  if (shouldLog('verbose')) console.log(`\x1b[2m${msg}\x1b[0m`);
}

export function debug(msg: string) {
  if (shouldLog('debug')) console.log(`\x1b[2m[debug] ${msg}\x1b[0m`);
}

export function progress(prefix: string, completed: number, total: number, label?: string) {
  const pct = Math.round((completed / total) * 100);
  const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
  const line = `\x1b[36m▸\x1b[0m [${prefix}] ${bar} ${completed}/${total} (${pct}%)`;
  const full = label ? `${line} — ${label}` : line;
  if (shouldLog('normal')) process.stdout.write(`\r${full}`);
}

export function progressEnd() {
  if (shouldLog('normal')) process.stdout.write('\n');
}