import { prisma } from '../config/prisma';

/**
 * Vide toutes les tables (ordre compatible avec les clés étrangères).
 * Réservé au seed (base de développement) et aux tests (base de test) — jamais appelé par l'API.
 */
export async function clearDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.diagnostic.deleteMany(),
    prisma.reservation.deleteMany(),
    prisma.service.deleteMany(),
    prisma.garage.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
