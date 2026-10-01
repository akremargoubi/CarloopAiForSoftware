import { Role } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import type { AuthUser } from '../types/express';
import { HttpError } from '../utils/http-error';

const ALGORITHM = 'HS256';

const payloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(Role),
});

/**
 * Signe un JWT pour un utilisateur.
 * @param user Utilisateur (id + rôle).
 * @returns Le token signé (HS256, expiration `JWT_EXPIRES_IN`).
 */
export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

/**
 * Vérifie un JWT et en extrait l'utilisateur.
 * @param token Token brut (sans le préfixe "Bearer").
 * @returns L'utilisateur authentifié.
 * @throws HttpError 401 si le token est invalide, expiré ou mal formé.
 */
export function verifyToken(token: string): AuthUser {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
    const payload = payloadSchema.parse(decoded);
    return { id: payload.sub, role: payload.role };
  } catch {
    throw HttpError.unauthorized('Token invalide ou expiré');
  }
}
