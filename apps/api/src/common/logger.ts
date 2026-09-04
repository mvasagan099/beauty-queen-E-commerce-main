import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

/**
 * Production-grade logger.
 *
 * - Production: structured JSON output (parsed by log aggregators)
 * - Development: human-readable pretty-printed output
 *
 * Sensitive fields (passwords, tokens, secrets) must never be logged.
 */
export const logger = pino({
  level: logLevel,
  ...(isProduction
    ? {
        // Structured JSON for production log aggregators
        formatters: {
          level(label: string) {
            return { level: label };
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.access_token',
            'req.body.refresh_token',
            '*.password',
            '*.token',
            '*.secret',
            '*.key',
            '*.authorization',
          ],
          remove: true,
        },
      }
    : {
        // Pretty-printed for development
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
});
