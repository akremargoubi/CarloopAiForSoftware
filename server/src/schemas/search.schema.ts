import { z } from 'zod';
import { citySchema } from './common.schema';

/** Longueur maximale d'une requête de recherche. */
export const MAX_QUERY_LENGTH = 300;

/** Query de GET /api/services/search. */
export const searchQuerySchema = z.object({
  q: z
    .string('Le paramètre q est requis')
    .trim()
    .min(1, 'La requête ne peut pas être vide')
    .max(MAX_QUERY_LENGTH, `La requête ne doit pas dépasser ${MAX_QUERY_LENGTH} caractères`),
  ville: citySchema.optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  /** `auto` : sémantique avec repli ; `keyword` : force les mots-clés (comparaison, démo). */
  mode: z.enum(['auto', 'keyword']).default('auto'),
});

/** Paramètres de recherche validés. */
export type SearchQuery = z.output<typeof searchQuerySchema>;
