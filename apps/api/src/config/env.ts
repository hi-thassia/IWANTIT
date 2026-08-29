import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(3333),
  WEB_ORIGIN: z.url().default('http://localhost:5173'),
  DATABASE_URL: z.url().default('postgresql://postgres:postgres@localhost:5432/iwantit'),
  MERCADO_LIVRE_ACCESS_TOKEN: z.preprocess((value) => value === '' ? undefined : value, z.string().trim().min(1).optional()),
  MONITORING_ENABLED: z.stringbool().default(false),
  MONITORING_INTERVAL_MINUTES: z.coerce.number().int().min(1).max(1440).default(30),
  MONITORING_BATCH_SIZE: z.coerce.number().int().min(1).max(200).default(50),
  PASSWORD_RESET_URL: z.url().default('http://localhost:5173/redefinir-senha'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  TWO_FACTOR_CHALLENGE_TTL_MINUTES: z.coerce.number().int().positive().default(5),
  MAX_ACTIVE_SESSIONS: z.coerce.number().int().min(1).max(100).default(10),
  TWO_FACTOR_ENCRYPTION_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.url().default('http://localhost:3333/api/auth/google/callback'),
  GOOGLE_OAUTH_SUCCESS_URL: z.url().default('http://localhost:5173/app'),
  GOOGLE_OAUTH_ERROR_URL: z.url().default('http://localhost:5173/entrar'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().default('I Want It <no-reply@example.com>'),
});

export const env = envSchema.parse(process.env);

if (env.NODE_ENV === 'production' && !process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
if (env.NODE_ENV === 'production' && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production');
if (env.NODE_ENV === 'production' && (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD)) throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required in production');
if (env.NODE_ENV === 'production') {
  for (const [name, value] of [['WEB_ORIGIN', env.WEB_ORIGIN], ['PASSWORD_RESET_URL', env.PASSWORD_RESET_URL], ['GOOGLE_REDIRECT_URI', env.GOOGLE_REDIRECT_URI], ['GOOGLE_OAUTH_SUCCESS_URL', env.GOOGLE_OAUTH_SUCCESS_URL], ['GOOGLE_OAUTH_ERROR_URL', env.GOOGLE_OAUTH_ERROR_URL]] as const) {
    if (new URL(value).protocol !== 'https:') throw new Error(`${name} must use HTTPS in production`);
  }
}
