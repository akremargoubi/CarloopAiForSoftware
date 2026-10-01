import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Prépare l'environnement de test : base PostgreSQL dédiée (TEST_DATABASE_URL),
 * secret JWT éphémère et modèle d'embeddings désactivé (jamais téléchargé en test).
 * @throws Error si TEST_DATABASE_URL manque ou pointe vers la base de développement.
 */
export function configureTestEnv(): void {
  if (process.env.CARLOOP_TEST_ENV === 'ready') {
    return; // déjà configuré par le globalSetup (les workers héritent de son environnement)
  }
  const envFile = resolve(__dirname, '..', '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL est requis pour lancer les tests');
  }
  if (testUrl === process.env.DATABASE_URL && !process.env.CI) {
    throw new Error('TEST_DATABASE_URL doit être différent de DATABASE_URL (la base de test est vidée)');
  }
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testUrl;
  process.env.JWT_SECRET ??= randomBytes(48).toString('hex');
  process.env.BCRYPT_ROUNDS = '10';
  process.env.EMBEDDING_ENABLED = 'false';
  process.env.CARLOOP_TEST_ENV = 'ready';
}
