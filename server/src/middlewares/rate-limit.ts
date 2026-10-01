import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { HttpError } from '../utils/http-error';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Clé de limitation : par utilisateur ou par IP, ou un compteur global unique. */
export type RateLimitKey = 'ip' | 'user' | 'global';

/** Options d'un limiteur réutilisable. */
export interface RateLimiterOptions {
  /** Fenêtre de temps en millisecondes. */
  windowMs: number;
  /** Nombre maximal de requêtes par fenêtre et par clé. */
  limit: number;
  /** Message renvoyé avec le code 429. */
  message: string;
  /** Clé de comptage (défaut : `ip`). `user` nécessite `authenticate` avant le limiteur. */
  key?: RateLimitKey;
}

/** Calcule la clé de comptage d'une requête. */
function resolveKey(req: Request, key: RateLimitKey): string {
  if (key === 'global') {
    return 'global';
  }
  if (key === 'user' && req.user) {
    return `user:${req.user.id}`;
  }
  return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
}

/**
 * Crée un middleware de limitation de débit qui renvoie une erreur 429 standard.
 * Désactivé quand `NODE_ENV=test`.
 * @param options Fenêtre, limite, message et clé.
 * @returns Middleware Express.
 */
export function createRateLimiter(options: RateLimiterOptions): RequestHandler {
  const key = options.key ?? 'ip';
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    keyGenerator: (req: Request) => resolveKey(req, key),
    handler: (_req: Request, _res: Response, next: NextFunction) => {
      next(new HttpError(429, 'TOO_MANY_REQUESTS', options.message));
    },
  });
}

/** Login / register : 10 tentatives par IP et par 15 minutes (anti brute force). */
export const authLimiter = createRateLimiter({
  windowMs: 15 * MINUTE_MS,
  limit: 10,
  message: 'Trop de tentatives, réessayez dans quelques minutes',
});

/** Recherche sémantique : 30 requêtes par IP et par minute (calcul d'embedding coûteux). */
export const searchLimiter = createRateLimiter({
  windowMs: MINUTE_MS,
  limit: 30,
  message: 'Trop de recherches, réessayez dans une minute',
});

/**
 * Diagnostic IA (LLM OpenRouter, quota limité) : chaîne de limiteurs plus stricte.
 * À placer après `authenticate` :
 * `router.post('/diagnose', authenticate, authorize('CLIENT'), ...aiLimiter, handler)`.
 * - 3 requêtes / minute / utilisateur
 * - 20 requêtes / jour / utilisateur
 * - 45 requêtes / jour pour toute l'application (quota gratuit OpenRouter ≈ 50/jour)
 */
export const aiLimiter: readonly RequestHandler[] = [
  createRateLimiter({
    windowMs: MINUTE_MS,
    limit: 3,
    key: 'user',
    message: 'Trop de diagnostics, réessayez dans une minute',
  }),
  createRateLimiter({
    windowMs: DAY_MS,
    limit: 20,
    key: 'user',
    message: 'Quota quotidien de diagnostics atteint',
  }),
  createRateLimiter({
    windowMs: DAY_MS,
    limit: 45,
    key: 'global',
    message: 'Le service de diagnostic est saturé aujourd’hui, réessayez demain',
  }),
];
