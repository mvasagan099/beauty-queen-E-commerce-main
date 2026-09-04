import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid MySQL connection URL' }),
  JWT_ACCESS_SECRET: z.string().min(32, { message: 'JWT_ACCESS_SECRET must be at least 32 characters' }),
  JWT_REFRESH_SECRET: z.string().min(32, { message: 'JWT_REFRESH_SECRET must be at least 32 characters' }),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  REDIS_URL: z.string().optional(),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  WORKER_HEALTH_PORT: z.coerce.number().default(5001),
});

const devSecretPatterns = [
  'dev-access-secret',
  'dev-refresh-secret',
  'test-access-secret',
  'test-refresh-secret',
  'change-in-production',
  'your-',
  'CHANGE_ME',
];

function containsDevPattern(value: string): boolean {
  const lower = value.toLowerCase();
  return devSecretPatterns.some((p) => lower.includes(p.toLowerCase()));
}

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(', ')}`)
      .join('\n');

    if (nodeEnv === 'production') {
      console.error('\nFATAL: Environment validation failed (production mode):\n' + messages + '\n');
      process.exit(1);
    } else {
      console.warn('\nEnvironment validation warnings (development mode):\n' + messages + '\n');
    }
  }

  if (nodeEnv === 'production') {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('\nFATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production\n');
      process.exit(1);
    }

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      console.error('\nFATAL: RAZORPAY_WEBHOOK_SECRET is required in production\n');
      process.exit(1);
    }

    if (!process.env.BREVO_API_KEY) {
      console.warn('\nBREVO_API_KEY not set - email sending will fail\n');
    }

    const accessSecret = process.env.JWT_ACCESS_SECRET || '';
    const refreshSecret = process.env.JWT_REFRESH_SECRET || '';

    if (containsDevPattern(accessSecret)) {
      console.error('\nFATAL: JWT_ACCESS_SECRET contains a development/test pattern. Generate a unique secret with: openssl rand -base64 48\n');
      process.exit(1);
    }

    if (containsDevPattern(refreshSecret)) {
      console.error('\nFATAL: JWT_REFRESH_SECRET contains a development/test pattern. Generate a unique secret with: openssl rand -base64 48\n');
      process.exit(1);
    }

    if (accessSecret === refreshSecret) {
      console.error('\nFATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different\n');
      process.exit(1);
    }

    if (process.env.FRONTEND_URL === 'http://localhost:3000') {
      console.error('\nFATAL: FRONTEND_URL must be set to the production domain URL\n');
      process.exit(1);
    }
  }

  return result.success ? result.data : (process.env as any);
}
