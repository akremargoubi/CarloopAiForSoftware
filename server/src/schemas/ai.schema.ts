import { z } from 'zod';

const currentYear = new Date().getFullYear();

/** Body de POST /api/ai/diagnose (correspond à `DiagnoseInput`). */
export const diagnoseSchema = z.object({
  symptom: z.string().trim().min(10, 'Décrivez le problème en au moins 10 caractères').max(1000),
  vehicle: z
    .object({
      brand: z.string().trim().min(1).max(50).optional(),
      model: z.string().trim().min(1).max(50).optional(),
      year: z.number().int().min(1950).max(currentYear + 1).optional(),
      mileageKm: z.number().int().min(0).max(2_000_000).optional(),
      fuel: z.enum(['ESSENCE', 'DIESEL', 'HYBRIDE', 'ELECTRIQUE', 'GPL']).optional(),
    })
    .optional(),
});

/** Entrée du diagnostic validée. */
export type DiagnoseBody = z.output<typeof diagnoseSchema>;
