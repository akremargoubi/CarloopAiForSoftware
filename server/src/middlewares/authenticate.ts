import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../services/token.service';
import { HttpError } from '../utils/http-error';

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/;

/**
 * Vérifie le header `Authorization: Bearer <jwt>` et renseigne `req.user`.
 * @throws HttpError 401 si le token est absent, mal formé, invalide ou expiré.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header) {
    throw HttpError.unauthorized();
  }
  const match = BEARER_PATTERN.exec(header);
  if (!match?.[1]) {
    throw HttpError.unauthorized('Token invalide ou expiré');
  }
  req.user = verifyToken(match[1]);
  next();
}
