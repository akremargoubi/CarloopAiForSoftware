import type { Role } from '@prisma/client';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from '../utils/http-error';

/**
 * Restreint une route à certains rôles. À placer après `authenticate`.
 * @param roles Rôles autorisés.
 * @returns Middleware qui lève 401 (non authentifié) ou 403 (rôle non autorisé).
 */
export function authorize(...roles: readonly Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw HttpError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw HttpError.forbidden('Rôle non autorisé pour cette action');
    }
    next();
  };
}
