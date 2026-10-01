import { ServiceCategory } from '@prisma/client';
import { z } from 'zod';

/** Catégories de services (source unique : l'enum Prisma). */
export const SERVICE_CATEGORIES: readonly ServiceCategory[] = Object.values(ServiceCategory);

/** Catégorie de service validée. */
export const categorySchema = z.enum(ServiceCategory);

/** Paramètre de route `:id` (cuid généré par Prisma). */
export const idParamSchema = z.object({
  id: z.cuid('Identifiant invalide'),
});

/** Paramètres de pagination communs (`page` ≥ 1, `pageSize` 1..50). */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

/** Filtre ville (insensible à la casse côté service). */
export const citySchema = z.string().trim().min(2).max(60);

/** Pagination validée. */
export type Pagination = z.output<typeof paginationSchema>;
