import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { config } from '../config.js';
import { HttpError } from '../errors.js';

/** 404 handler for unknown API routes. */
export function notFoundHandler(req: Request, res: Response) {
  res
    .status(404)
    .json({ error: { code: 'NOT_FOUND', message: `Route introuvable : ${req.method} ${req.path}` } });
}

/**
 * Centralised error handler. Responses never expose stack traces.
 * Format: { error: { code, message, details? } }
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Identifiant invalide' } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
  }
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return res
      .status(409)
      .json({ error: { code: 'CONFLICT', message: 'Cette ressource existe déjà' } });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON invalide' } });
  }
  if (!config.isTest) console.error('[error]', err);
  return res
    .status(500)
    .json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
}
