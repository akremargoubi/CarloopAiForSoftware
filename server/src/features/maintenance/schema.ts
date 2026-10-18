import { z } from 'zod';
import { FUEL_TYPES, SERVICE_CATEGORIES } from '../../core/constants.js';

export const USAGES = ['urbain', 'autoroute', 'mixte'] as const;
export type Usage = (typeof USAGES)[number];

export const PRIORITIES = ['faible', 'moyenne', 'haute'] as const;
export type Priority = (typeof PRIORITIES)[number];

const currentYear = new Date().getFullYear();
const plain = (v: unknown) =>
  typeof v === 'string' ? v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim() : v;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ attendu');

/** Body of POST /api/vehicles and PUT /api/vehicles/:id. */
export const vehicleBodySchema = z.object({
  marque: z.string().trim().min(2).max(40),
  modele: z.string().trim().min(1).max(40),
  annee: z.coerce.number().int().min(1970).max(currentYear + 1),
  kilometrage: z.coerce.number().int().min(0).max(2_000_000),
  carburant: z.enum(FUEL_TYPES),
  usage: z.enum(USAGES).default('mixte'),
  // Stored for the owner only, never sent to the LLM.
  plaque: z.string().trim().max(20).optional(),
  surnom: z.string().trim().max(40).optional(),
});

export type VehicleBody = z.infer<typeof vehicleBodySchema>;

/** Body of POST /api/vehicles/:id/records (maintenance history). */
export const recordBodySchema = z.object({
  date: isoDate,
  kilometrage: z.coerce.number().int().min(0).max(2_000_000),
  intervention: z.string().trim().min(3).max(120),
  categorie: z.enum(SERVICE_CATEGORIES),
  coutTnd: z.coerce.number().min(0).max(100_000).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type RecordBody = z.infer<typeof recordBodySchema>;

const planItemSchema = z.object({
  intervention: z.string().trim().min(3).max(150),
  echeance_km: z.number().int().min(0).max(3_000_000),
  echeance_date: isoDate,
  priorite: z.preprocess(plain, z.enum(PRIORITIES)),
  categorie_service: z.preprocess(plain, z.enum(SERVICE_CATEGORIES)),
});

/** LLM output: personalised maintenance plan (generic shape, without context checks). */
export const maintenancePlanSchema = z.object({
  prochains_entretiens: z.array(planItemSchema).min(1).max(10),
  conseils: z.array(z.string().trim().min(5).max(300)).max(6),
  resume: z.string().trim().min(20).max(1000),
});

export type MaintenancePlan = z.infer<typeof maintenancePlanSchema>;
export type PlanItem = MaintenancePlan['prochains_entretiens'][number];

/**
 * Plan schema checked against the vehicle: every deadline must be at or after the current
 * mileage and today's date (an overdue intervention is scheduled "now").
 */
export function planSchemaFor(currentKm: number, today: string) {
  return maintenancePlanSchema.superRefine((plan, ctx) => {
    plan.prochains_entretiens.forEach((item, i) => {
      if (item.echeance_km < currentKm) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['prochains_entretiens', i, 'echeance_km'],
          message: `echeance_km doit être >= au kilométrage actuel (${currentKm})`,
        });
      }
      if (Number.isNaN(Date.parse(item.echeance_date)) || item.echeance_date < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['prochains_entretiens', i, 'echeance_date'],
          message: `echeance_date doit être une date valide >= ${today}`,
        });
      }
    });
  });
}
