import { env } from '../config/env';

const silent = env.NODE_ENV === 'test';

/** Logger minimal (console), silencieux pendant les tests. */
export const logger = {
  /** Message informatif. */
  info(message: string): void {
    if (!silent) console.info(`[info] ${message}`);
  },
  /** Avertissement (fonctionnement dégradé). */
  warn(message: string): void {
    if (!silent) console.warn(`[warn] ${message}`);
  },
  /** Erreur interne : journalisée côté serveur uniquement, jamais renvoyée au client. */
  error(message: string, error?: unknown): void {
    if (!silent) console.error(`[error] ${message}`, error ?? '');
  },
};
