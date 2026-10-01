import { PrismaClient } from '@prisma/client';
import { env } from './env';

/** Client Prisma unique partagé par toute l'application (une seule pool de connexions). */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
