import { z } from 'zod';
import { citySchema, paginationSchema } from './common.schema';

/** Body de POST /api/garages. */
export const createGarageSchema = z.object({
  name: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  city: citySchema,
  description: z.string().trim().min(10).max(1000),
});

/** Body de PATCH /api/garages/:id (au moins un champ). */
export const updateGarageSchema = createGarageSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Au moins un champ à modifier');

/** Query de GET /api/garages. */
export const listGaragesQuerySchema = paginationSchema.extend({
  ville: citySchema.optional(),
});

/** Création de garage validée. */
export type CreateGarageInput = z.output<typeof createGarageSchema>;
/** Modification de garage validée. */
export type UpdateGarageInput = z.output<typeof updateGarageSchema>;
/** Filtres de liste de garages validés. */
export type ListGaragesQuery = z.output<typeof listGaragesQuerySchema>;
