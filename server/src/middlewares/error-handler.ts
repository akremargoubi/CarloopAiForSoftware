import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/http-error';
import { logger } from '../utils/logger';

interface BodyParserError {
  type: string;
}

/** Détecte les erreurs levées par `express.json()` (JSON invalide, corps trop gros). */
function isBodyParserError(error: unknown): error is BodyParserError {
  return typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string';
}

/** Traduit n'importe quelle erreur en HttpError sûre (aucun détail interne exposé). */
function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return HttpError.conflict('Cette ressource existe déjà');
      case 'P2003':
        return HttpError.conflict('Ressource liée à d’autres données');
      case 'P2025':
        return HttpError.notFound();
      default:
        break;
    }
  }
  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      return HttpError.badRequest('JSON invalide');
    }
    if (error.type === 'entity.too.large') {
      return new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Corps de requête trop volumineux');
    }
  }
  return new HttpError(500, 'INTERNAL_ERROR', 'Erreur interne du serveur');
}

/**
 * Middleware d'erreurs centralisé : réponse `{ error: { code, message, details? } }`,
 * jamais de stack trace. Les erreurs 5xx sont journalisées côté serveur.
 */
export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const httpError = toHttpError(error);
  if (httpError.status >= 500 && httpError.status !== 501) {
    logger.error(`${req.method} ${req.originalUrl}`, error);
  }
  res.status(httpError.status).json({
    error: {
      code: httpError.code,
      message: httpError.message,
      ...(httpError.details ? { details: httpError.details } : {}),
    },
  });
}

/** Middleware 404 pour les routes inexistantes. */
export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(HttpError.notFound('Route introuvable'));
}
