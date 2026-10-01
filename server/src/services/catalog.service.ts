import type { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { CreateServiceInput, ListServicesQuery, UpdateServiceInput } from '../schemas/service.schema';
import type { AuthUser } from '../types/express';
import { assertOwner } from '../utils/access';
import { serviceCityFilter } from '../utils/filters';
import { HttpError } from '../utils/http-error';
import { paginate, toPrismaPage, type Paginated } from '../utils/pagination';
import { computeServiceEmbedding } from './indexing.service';
import { serviceSelect, toServiceDto, type ServiceDto } from './service.mapper';

/** Charge un service avec le propriétaire de son garage, ou lève 404. */
async function findServiceOrThrow(
  id: string,
): Promise<{ id: string; title: string; category: ServiceDto['category']; description: string; ownerId: string }> {
  const service = await prisma.service.findUnique({
    where: { id },
    select: { id: true, title: true, category: true, description: true, garage: { select: { ownerId: true } } },
  });
  if (!service) {
    throw HttpError.notFound('Service introuvable');
  }
  return { ...service, ownerId: service.garage.ownerId };
}

/**
 * Liste paginée des services, filtrable par catégorie, ville et garage.
 * @param query Filtres et pagination validés.
 */
export async function listServices(query: ListServicesQuery): Promise<Paginated<ServiceDto>> {
  const where: Prisma.ServiceWhereInput = {
    ...(query.categorie ? { category: query.categorie } : {}),
    ...(query.garageId ? { garageId: query.garageId } : {}),
    ...serviceCityFilter(query.ville),
  };
  const [rows, total] = await prisma.$transaction([
    prisma.service.findMany({ where, select: serviceSelect, orderBy: { createdAt: 'desc' }, ...toPrismaPage(query) }),
    prisma.service.count({ where }),
  ]);
  return paginate(rows.map(toServiceDto), total, query);
}

/**
 * Détail d'un service.
 * @param id Identifiant du service.
 * @throws HttpError 404 si le service n'existe pas.
 */
export async function getService(id: string): Promise<ServiceDto> {
  const row = await prisma.service.findUnique({ where: { id }, select: serviceSelect });
  if (!row) {
    throw HttpError.notFound('Service introuvable');
  }
  return toServiceDto(row);
}

/**
 * Crée un service dans un garage du PRO courant.
 * @param user Utilisateur courant.
 * @param input Données validées.
 * @throws HttpError 404 (garage) / 403 (pas propriétaire).
 */
export async function createService(user: AuthUser, input: CreateServiceInput): Promise<ServiceDto> {
  const garage = await prisma.garage.findUnique({ where: { id: input.garageId }, select: { ownerId: true } });
  if (!garage) {
    throw HttpError.notFound('Garage introuvable');
  }
  assertOwner(user, garage.ownerId);
  const embedding = await computeServiceEmbedding(input);
  const row = await prisma.service.create({ data: { ...input, embedding }, select: serviceSelect });
  return toServiceDto(row);
}

/**
 * Modifie un service (propriétaire du garage uniquement).
 * @param user Utilisateur courant.
 * @param id Identifiant du service.
 * @param input Champs à modifier.
 * @throws HttpError 404 / 403.
 */
export async function updateService(user: AuthUser, id: string, input: UpdateServiceInput): Promise<ServiceDto> {
  const existing = await findServiceOrThrow(id);
  assertOwner(user, existing.ownerId);
  const textChanged = input.title !== undefined || input.category !== undefined || input.description !== undefined;
  // Si le texte change, l'ancien embedding est obsolète : recalculé (ou vidé si le modèle est indisponible).
  const embedding = textChanged
    ? await computeServiceEmbedding({
        title: input.title ?? existing.title,
        category: input.category ?? existing.category,
        description: input.description ?? existing.description,
      })
    : undefined;
  const row = await prisma.service.update({
    where: { id },
    data: { ...input, ...(embedding ? { embedding } : {}) },
    select: serviceSelect,
  });
  return toServiceDto(row);
}

/**
 * Supprime un service (refusé s'il a des réservations → 409).
 * @param user Utilisateur courant.
 * @param id Identifiant du service.
 * @throws HttpError 404 / 403 / 409.
 */
export async function deleteService(user: AuthUser, id: string): Promise<void> {
  const existing = await findServiceOrThrow(id);
  assertOwner(user, existing.ownerId);
  await prisma.service.delete({ where: { id } });
}
