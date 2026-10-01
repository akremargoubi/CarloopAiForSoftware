import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { configureTestEnv } from './test-env';

/**
 * Applique les migrations sur la base de test (créée si absente) avant toute la suite.
 * Non destructif : chaque fichier de test vide lui-même les tables (`resetDatabase`).
 */
export default function globalSetup(): void {
  configureTestEnv();
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'pipe',
  });
}
