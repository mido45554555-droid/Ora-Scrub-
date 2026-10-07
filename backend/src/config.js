import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const envFile = path.join(BACKEND_ROOT, '.env');
// Real environment variables always win over .env (Node's behavior),
// so production hosts can inject secrets without a file on disk.
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().regex(/^[A-Za-z0-9_]+$/, 'DB_NAME may only contain letters, digits and _'),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),

  INTERNAL_API_KEY: z.string().min(32, 'INTERNAL_API_KEY must be at least 32 characters'),
  STORAGE_DIR: z.string().default('./storage'),
  ADMIN_SESSION_HOURS: z.coerce.number().positive().max(24 * 30).default(12),
  PROCESSING_TIME_ZONE: z.string().default('Africa/Cairo'),
  PUBLIC_SITE_URL: z.string().url().optional(),
  ORDER_RATE_LIMIT: z.coerce.number().int().positive().default(5),
  ORDER_IP_RATE_LIMIT: z.coerce.number().int().positive().default(30),
  ORDER_GLOBAL_RATE_LIMIT: z.coerce.number().int().positive().default(100),
  // How many uploads may stream to disk at once (bounds disk I/O; memory
  // is no longer a factor since uploads are streamed, not buffered).
  UPLOAD_CONCURRENCY: z.coerce.number().int().positive().max(512).default(64),

  // New-order email. All optional: if Resend isn't configured, orders are
  // still saved and the email step is skipped with a warning.
  RESEND_API_KEY: z.string().default(''),
  MAIL_FROM: z.string().default(''),
  ORDER_NOTIFY_TO: z.string().default(''),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(
      `Invalid backend configuration (see .env.example, or run \`npm run setup\`):\n${problems}`
    );
  }

  const env = parsed.data;
  const publicSiteUrl = env.PUBLIC_SITE_URL ?? (env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (env.NODE_ENV === 'production' && (!publicSiteUrl || new URL(publicSiteUrl).protocol !== 'https:')) {
    throw new Error('PUBLIC_SITE_URL must be set to the public HTTPS site origin in production.');
  }
  return {
    env: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    host: env.HOST,
    port: env.PORT,
    db: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
    },
    internalApiKey: env.INTERNAL_API_KEY,
    storageDir: path.resolve(BACKEND_ROOT, env.STORAGE_DIR),
    adminSessionMs: env.ADMIN_SESSION_HOURS * 60 * 60 * 1000,
    processingTimeZone: env.PROCESSING_TIME_ZONE,
    publicSiteUrl: publicSiteUrl.replace(/\/+$/, ''),
    orderRateLimit: env.ORDER_RATE_LIMIT,
    orderIpRateLimit: env.ORDER_IP_RATE_LIMIT,
    orderGlobalRateLimit: env.ORDER_GLOBAL_RATE_LIMIT,
    uploadConcurrency: env.UPLOAD_CONCURRENCY,
    mail: {
      enabled: Boolean(env.RESEND_API_KEY && env.MAIL_FROM && env.ORDER_NOTIFY_TO),
      apiKey: env.RESEND_API_KEY,
      from: env.MAIL_FROM,
      to: env.ORDER_NOTIFY_TO.split(',')
        .map((address) => address.trim())
        .filter(Boolean),
    },
  };
}

export const config = loadConfig();
