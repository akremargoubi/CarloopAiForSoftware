import type { Request } from 'express';
import type { AuthUser } from '../types/express';
import { HttpError } from './http-error';

/**
 * Renvoie l'utilisateur authentifié de la requête.
 * @param req Requête Express (après `authenticate`).
 * @returns L'utilisateur courant.
 * @throws HttpError 401 si la requête n'est pas authentifiée.
 */
export function requireUser(req: Request): AuthUser {
  if (!req.user) {
    throw HttpError.unauthorized();
  }
  return req.user;
}
