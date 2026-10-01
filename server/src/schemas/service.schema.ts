import { z } from 'zod';
import { categorySchema, citySchema, paginationSchema } from './common.schema';

const serviceFields = {
  category: categorySchema,
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  /** Prix en TND, arrondi au millime. */
  price: z
    .number()
    .positive()
    .max(100_000)
    .transform((value) => Math.round(value * 1000) / 1000),
  durationMinutes: z.number().int().min(5).max(24 * 60),
};

/** Body de POST /api/services. */
export const createServiceSchema = z.object({
  garageId: z.cuid('Identifiant de garage invalide'),
  ...serviceFields,
});

/** Body de PATCH /api/services/:id (au moins un champ ; le garage ne change pas). */
export const updateServiceSchema = z
  .object(serviceFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Au moins un champ à modifier');

/** Query de GET /api/services. */
export const listServicesQuerySchema = paginationSchema.extend({
  categorie: categorySchema.optional(),
  ville: citySchema.optional(),
  garageId: z.cuid().optional(),
});

/** Création de service validée. */
export type CreateServiceInput = z.output<typeof createServiceSchema>;
/** Modification de service validée. */
export type UpdateServiceInput = z.output<typeof updateServiceSchema>;
/** Filtres de liste de services validés. */
export type ListServicesQuery = z.output<typeof listServicesQuerySchema>;
