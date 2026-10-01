import type { Prisma, ServiceCategory } from '@prisma/client';

/** Champs publics d'un service : l'embedding n'est jamais renvoyé par l'API. */
export const serviceSelect = {
  id: true,
  garageId: true,
  category: true,
  title: true,
  description: true,
  price: true,
  durationMinutes: true,
  createdAt: true,
  updatedAt: true,
  garage: { select: { id: true, name: true, city: true, address: true } },
} satisfies Prisma.ServiceSelect;

/** Ligne Prisma correspondant à `serviceSelect`. */
export type ServiceRow = Prisma.ServiceGetPayload<{ select: typeof serviceSelect }>;

/** Service tel que renvoyé par l'API (prix en number). */
export interface ServiceDto {
  id: string;
  garageId: string;
  category: ServiceCategory;
  title: string;
  description: string;
  price: number;
  durationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
  garage: { id: string; name: string; city: string; address: string };
}

/**
 * Convertit une ligne Prisma en DTO (Decimal → number).
 * @param row Service sélectionné avec `serviceSelect`.
 */
export function toServiceDto(row: ServiceRow): ServiceDto {
  return { ...row, price: row.price.toNumber() };
}
