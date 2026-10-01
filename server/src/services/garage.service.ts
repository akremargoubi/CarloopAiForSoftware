import type { Garage, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { CreateGarageInput, ListGaragesQuery, UpdateGarageInput } from '../schemas/garage.schema';
import type { AuthUser } from '../types/express';
import { assertOwner } from '../utils/access';
import { garageCityFilter } from '../utils/filters';
import { HttpError } from '../utils/http-error';
import { paginate, toPrismaPage, type Paginated } from '../utils/pagination';
import { serviceSelect, toServiceDto, type ServiceDto } from './service.mapper';

const garageSelect = {
  id: true,
  name: true,
  address: true,
  city: true,
  description: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { services: true } },
} satisfies Prisma.GarageSelect;

/** Garage tel que renvoyé par les listes. */
export type GarageDto = Prisma.GarageGetPayload<{ select: typeof garageSelect }>;

/** Garage détaillé avec ses services. */
export type GarageDetailDto = GarageDto & { services: ServiceDto[] };

/** Charge un garage ou lève 404. */
async function findGarageOrThrow(id: string): Promise<Pick<Garage, 'id' | 'ownerId'>> {
  const garage = await prisma.garage.findUnique({ where: { id }, select: { id: true, ownerId: true } });
  if (!garage) {
    throw HttpError.notFound('Garage introuvable');
  }
  return garage;
}

/**
 * Liste paginée des garages, filtrable par ville.
 * @param query Filtres et pagination validés.
 */
export async function listGarages(query: ListGaragesQuery): Promise<Paginated<GarageDto>> {
  const where = garageCityFilter(query.ville);
  const [items, total] = await prisma.$transaction([
    prisma.garage.findMany({ where, select: garageSelect, orderBy: { createdAt: 'desc' }, ...toPrismaPage(query) }),
    prisma.garage.count({ where }),
  ]);
  return paginate(items, total, query);
}

/**
 * Garages appartenant à l'utilisateur PRO courant.
 * @param ownerId Identifiant du PRO.
 */
export async function listOwnGarages(ownerId: string): Promise<GarageDto[]> {
  return prisma.garage.findMany({ where: { ownerId }, select: garageSelect, orderBy: { createdAt: 'desc' } });
}

/**
 * Détail d'un garage avec ses services.
 * @param id Identifiant du garage.
 * @throws HttpError 404 si le garage n'existe pas.
 */
export async function getGarage(id: string): Promise<GarageDetailDto> {
  const garage = await prisma.garage.findUnique({
    where: { id },
    select: { ...garageSelect, services: { select: serviceSelect, orderBy: { category: 'asc' } } },
  });
  if (!garage) {
    throw HttpError.notFound('Garage introuvable');
  }
  return { ...garage, services: garage.services.map(toServiceDto) };
}

/**
 * Crée un garage pour le PRO courant.
 * @param ownerId Identifiant du PRO propriétaire.
 * @param input Données validées.
 */
export async function createGarage(ownerId: string, input: CreateGarageInput): Promise<GarageDto> {
  return prisma.garage.create({ data: { ...input, ownerId }, select: garageSelect });
}

/**
 * Modifie un garage (propriétaire uniquement).
 * @param user Utilisateur courant.
 * @param id Identifiant du garage.
 * @param input Champs à modifier.
 * @throws HttpError 404 / 403.
 */
export async function updateGarage(user: AuthUser, id: string, input: UpdateGarageInput): Promise<GarageDto> {
  const garage = await findGarageOrThrow(id);
  assertOwner(user, garage.ownerId);
  return prisma.garage.update({ where: { id }, data: input, select: garageSelect });
}

/**
 * Supprime un garage et ses services (refusé si des réservations existent → 409).
 * @param user Utilisateur courant.
 * @param id Identifiant du garage.
 * @throws HttpError 404 / 403 / 409.
 */
export async function deleteGarage(user: AuthUser, id: string): Promise<void> {
  const garage = await findGarageOrThrow(id);
  assertOwner(user, garage.ownerId);
  await prisma.garage.delete({ where: { id } });
}
