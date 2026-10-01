import type { Role } from '@prisma/client';

/** Utilisateur authentifié extrait du JWT. */
export interface AuthUser {
  id: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      /** Renseigné par le middleware `authenticate`. */
      user?: AuthUser;
    }
  }
}
