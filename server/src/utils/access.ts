import type { AuthUser } from '../types/express';
import { HttpError } from './http-error';

/**
 * Vérifie que l'utilisateur est propriétaire de la ressource (un ADMIN passe toujours).
 * @param user Utilisateur courant.
 * @param ownerId Identifiant du propriétaire de la ressource.
 * @throws HttpError 403 si l'utilisateur n'est pas propriétaire.
 */
export function assertOwner(user: AuthUser, ownerId: string): void {
  if (user.role !== 'ADMIN' && user.id !== ownerId) {
    throw HttpError.forbidden('Vous n’êtes pas propriétaire de cette ressource');
  }
}
