import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { config } from '../config.js';

/** Rate limiter applied to every /api/ai/* route (per user when logged in, per IP otherwise). */
export const aiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: () => config.ai.rateLimitPerMin,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest,
  keyGenerator: (req: Request) => req.user?.id ?? ipKeyGenerator(req.ip ?? 'unknown'),
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Trop de requêtes vers l’assistant IA. Réessayez dans une minute.',
      },
    });
  },
});
