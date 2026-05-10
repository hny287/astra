const isServer = typeof window === 'undefined' && typeof process !== 'undefined';

const noop = () => {};
const stubLogger = {
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  fatal: noop,
  child: () => stubLogger,
} as any;

let logger: any = stubLogger;

if (isServer && process.env.NEXT_RUNTIME === 'nodejs') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('./structured-logger-node');
    logger = mod.logger;
  } catch {
    // Falls back to stub in Edge Runtime
  }
}

export { logger };
export type Logger = typeof logger;