import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

/**
 * Brute-force protection on /api/auth/login and /api/auth/register:
 * 10 attempts per IP every 15 minutes (successful logins are not counted).
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => config.isTest && !config.authRateLimitInTests,
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
    });
  },
});
