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
});

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
      console.error('\n❌ FATAL: Environment validation failed (production mode):\n' + messages + '\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Environment validation warnings (development mode):\n' + messages + '\n');
    }
  }

  // Production-specific checks for payment keys
  if (nodeEnv === 'production') {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('\n❌ FATAL: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required in production\n');
      process.exit(1);
    }
    if (!process.env.BREVO_API_KEY) {
      console.warn('\n⚠️  BREVO_API_KEY not set — email sending will fail\n');
    }
  }

  return result.success ? result.data : (process.env as any);
}
