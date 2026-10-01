import type { Prisma } from '@prisma/client';

/**
 * Filtre Prisma « service dont le garage est dans cette ville » (insensible à la casse).
 * @param ville Ville demandée, ou undefined pour ne pas filtrer.
 * @returns Un fragment `where` à étaler dans une requête sur `Service`.
 */
export function serviceCityFilter(ville: string | undefined): Prisma.ServiceWhereInput {
  return ville ? { garage: { city: { equals: ville, mode: 'insensitive' } } } : {};
}

/**
 * Filtre Prisma « garage situé dans cette ville » (insensible à la casse).
 * @param ville Ville demandée, ou undefined pour ne pas filtrer.
 */
export function garageCityFilter(ville: string | undefined): Prisma.GarageWhereInput {
  return ville ? { city: { equals: ville, mode: 'insensitive' } } : {};
}
