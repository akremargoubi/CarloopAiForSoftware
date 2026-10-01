import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { embeddingService } from '../services/embedding.service';
import { reindexAllServices } from '../services/indexing.service';
import { clearDatabase } from './clear-database';
import { SEED_CLIENTS, SEED_GARAGES, SEED_PROS, SEED_SERVICES } from './seed-data';

const EMAIL_DOMAIN = 'carloop.test';
const DAY_MS = 24 * 3600 * 1000;

/** Récupère une valeur d'un index ou lève une erreur explicite (données de seed incohérentes). */
function pick<T>(map: ReadonlyMap<string, T>, key: string): T {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`Clé de seed inconnue : ${key}`);
  }
  return value;
}

/** Insère utilisateurs, garages, services, réservations et un avis. */
async function insertData(password: string): Promise<void> {
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

  await prisma.user.create({
    data: { email: `admin@${EMAIL_DOMAIN}`, passwordHash, firstName: 'Admin', lastName: 'CarLoop', role: 'ADMIN' },
  });

  const proIds = new Map<string, string>();
  for (const { key, ...pro } of SEED_PROS) {
    const user = await prisma.user.create({
      data: { ...pro, email: `${key}@${EMAIL_DOMAIN}`, passwordHash, role: 'PRO' },
    });
    proIds.set(key, user.id);
  }

  const clientIds = new Map<string, string>();
  for (const { key, ...client } of SEED_CLIENTS) {
    const user = await prisma.user.create({
      data: { ...client, email: `${key}@${EMAIL_DOMAIN}`, passwordHash, role: 'CLIENT' },
    });
    clientIds.set(key, user.id);
  }

  const garageIds = new Map<string, string>();
  for (const { key, ownerKey, ...garage } of SEED_GARAGES) {
    const created = await prisma.garage.create({ data: { ...garage, ownerId: pick(proIds, ownerKey) } });
    garageIds.set(key, created.id);
  }

  const serviceIds: string[] = [];
  for (const { garageKey, ...service } of SEED_SERVICES) {
    const created = await prisma.service.create({ data: { ...service, garageId: pick(garageIds, garageKey) } });
    serviceIds.push(created.id);
  }

  // Quelques réservations dans tous les statuts, et un avis sur une réservation terminée.
  const now = Date.now();
  const plan = [
    { client: 'client1', service: 0, offsetDays: 2, status: 'PENDING' },
    { client: 'client1', service: 36, offsetDays: 5, status: 'CONFIRMED' },
    { client: 'client2', service: 18, offsetDays: -10, status: 'DONE' },
    { client: 'client2', service: 6, offsetDays: 3, status: 'CANCELLED' },
    { client: 'client3', service: 12, offsetDays: 1, status: 'PENDING' },
    { client: 'client4', service: 24, offsetDays: -3, status: 'DONE' },
  ] as const;

  for (const entry of plan) {
    const serviceId = serviceIds[entry.service];
    if (!serviceId) {
      throw new Error(`Index de service invalide : ${entry.service}`);
    }
    const reservation = await prisma.reservation.create({
      data: {
        clientId: pick(clientIds, entry.client),
        serviceId,
        scheduledAt: new Date(now + entry.offsetDays * DAY_MS),
        status: entry.status,
        note: entry.status === 'PENDING' ? 'Merci de m’appeler avant de commencer.' : null,
      },
      select: { id: true, clientId: true, service: { select: { garageId: true } } },
    });
    if (entry.status === 'DONE') {
      await prisma.review.create({
        data: {
          clientId: reservation.clientId,
          garageId: reservation.service.garageId,
          reservationId: reservation.id,
          rating: 5,
          comment: 'Travail rapide et soigné, je recommande.',
        },
      });
    }
  }
}

/** `npm run seed` : réinitialise la base de développement avec des données factices puis indexe. */
async function main(): Promise<void> {
  try {
    if (env.NODE_ENV === 'production') {
      throw new Error('Le seed est interdit en production.');
    }
    if (!env.SEED_USER_PASSWORD) {
      throw new Error('SEED_USER_PASSWORD est requis (voir .env.example).');
    }
    await clearDatabase();
    await insertData(env.SEED_USER_PASSWORD);
    console.info(
      `Seed : ${SEED_PROS.length} PRO, ${SEED_CLIENTS.length} clients, 1 admin, ` +
        `${SEED_GARAGES.length} garages, ${SEED_SERVICES.length} services (emails *@${EMAIL_DOMAIN}).`,
    );

    console.info('Indexation des embeddings…');
    const status = await embeddingService.init();
    if (status === 'ready') {
      const report = await reindexAllServices();
      console.info(`Embeddings : ${report.indexed}/${report.total} services indexés en ${report.durationMs} ms.`);
    } else {
      console.warn(`Modèle indisponible (${status}) : lancez « npm run reindex » plus tard. La recherche fonctionnera en mode mots-clés.`);
    }
  } catch (error: unknown) {
    console.error('Échec du seed :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
