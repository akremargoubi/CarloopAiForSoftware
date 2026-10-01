import type { Pagination } from '../schemas/common.schema';

/** Réponse paginée standard de l'API. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Convertit une pagination en arguments Prisma `skip` / `take`.
 * @param pagination Page et taille validées.
 */
export function toPrismaPage(pagination: Pagination): { skip: number; take: number } {
  return { skip: (pagination.page - 1) * pagination.pageSize, take: pagination.pageSize };
}

/**
 * Construit une réponse paginée.
 * @param items Éléments de la page.
 * @param total Nombre total d'éléments.
 * @param pagination Page et taille demandées.
 */
export function paginate<T>(items: T[], total: number, pagination: Pagination): Paginated<T> {
  return {
    items,
    total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(total / pagination.pageSize),
  };
}
