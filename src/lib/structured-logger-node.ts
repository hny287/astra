import pino from 'pino';
import path from 'path';
import { LOG_FILE, LOG_SERVICE } from './branding';

const isDev = process.env.NODE_ENV !== 'production';

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      options: { destination: path.join(process.cwd(), 'logs', LOG_FILE), mkdir: true },
      level: 'trace',
    },
    ...(isDev
      ? [
          {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'SYS:standard' },
            level: 'trace' as const,
          },
        ]
      : []),
  ],
});

export const logger = pino(
  {
    name: LOG_SERVICE,
    level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  },
  transport,
);