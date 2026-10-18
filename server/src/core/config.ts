import 'dotenv/config';
import { z } from 'zod';

const booleanString = z
  .string()
  .optional()
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/carloop'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must contain at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OPENROUTER_API_KEY: z.string().optional().default(''),
  OPENROUTER_MODEL: z.string().optional().default(''),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  AI_MOCK: booleanString,
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  AI_RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}
const env = parsed.data;

/**
 * Application configuration, validated once at startup.
 * The `ai` section is intentionally mutable so that tests can switch modes.
 */
export const config = {
  env: env.NODE_ENV,
  isTest: env.NODE_ENV === 'test',
  /** Tests disable rate limits; the auth rate-limit test turns this on. */
  authRateLimitInTests: false,
  port: env.PORT,
  corsOrigins: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  mongoUri: env.MONGODB_URI,
  jwt: { secret: env.JWT_SECRET, expiresIn: env.JWT_EXPIRES_IN },
  ai: {
    apiKey: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL,
    baseUrl: env.OPENROUTER_BASE_URL,
    mock: env.AI_MOCK,
    timeoutMs: env.AI_TIMEOUT_MS,
    rateLimitPerMin: env.AI_RATE_LIMIT_PER_MIN,
  },
};
