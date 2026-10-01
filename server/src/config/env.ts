import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const ENV_FILE = resolve(process.cwd(), '.env');
if (existsSync(ENV_FILE)) {
  // Les variables déjà définies (CI, tests, shell) restent prioritaires sur le fichier.
  process.loadEnvFile(ENV_FILE);
}

const DURATION_UNITS_IN_SECONDS: Readonly<Record<string, number>> = { s: 1, m: 60, h: 3600, d: 86400 };

/** Convertit une durée au format "15m", "12h", "7d" en secondes. */
const durationToSeconds = z
  .string()
  .regex(/^\d+[smhd]$/, 'Format attendu : <nombre><s|m|h|d>, ex. "1d"')
  .transform((value) => {
    const amount = Number.parseInt(value.slice(0, -1), 10);
    const unit = DURATION_UNITS_IN_SECONDS[value.slice(-1)] ?? 1;
    return amount * unit;
  });

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const modelList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((model) => model.trim())
      .filter((model) => model.length > 0),
  )
  .pipe(z.array(z.string().endsWith(':free', 'Seuls les modèles OpenRouter ":free" sont autorisés')));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  TRUST_PROXY: booleanFromString.default(false),

  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET doit contenir au moins 32 caractères'),
  JWT_EXPIRES_IN: durationToSeconds.default(86400),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  EMBEDDING_MODEL: z.string().min(1).default('Xenova/multilingual-e5-small'),
  EMBEDDING_DTYPE: z.enum(['fp32', 'fp16', 'q8', 'q4']).default('q8'),
  EMBEDDING_TIMEOUT_MS: z.coerce.number().int().min(100).max(60000).default(3000),
  EMBEDDING_ENABLED: booleanFromString.default(true),
  MODEL_CACHE_DIR: z.string().min(1).default('.model-cache'),
  SEARCH_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.83),

  SEED_USER_PASSWORD: z.string().min(8).optional(),

  OPENROUTER_API_KEY: z.string().min(1).optional(),
  OPENROUTER_MODELS: modelList.default([]),
});

/** Variables d'environnement validées et typées. */
export type Env = z.infer<typeof envSchema>;

/**
 * Valide les variables d'environnement. Arrête le processus si une variable
 * obligatoire manque ou est invalide (sans jamais afficher les valeurs).
 * @param source Source des variables (par défaut `process.env`).
 * @returns La configuration validée.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Une variable vide (`KEY=`) est considérée comme absente.
  const defined = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const parsed = envSchema.safeParse(defined);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Configuration invalide, démarrage annulé :\n${problems}`);
    process.exit(1);
  }
  return parsed.data;
}

/** Configuration de l'application, validée au chargement du module. */
export const env: Env = loadEnv();
