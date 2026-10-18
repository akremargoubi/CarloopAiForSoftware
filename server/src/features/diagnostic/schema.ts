import { z } from 'zod';
import { SERVICE_CATEGORIES } from '../../core/constants.js';

export const PROBABILITIES = ['faible', 'moyenne', 'elevee'] as const;
export const URGENCIES = ['faible', 'moyenne', 'critique'] as const;

const plain = (v: unknown) =>
  typeof v === 'string' ? v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim() : v;

/** Output of the LLM, validated before being shown to the user. */
export const diagnosticSchema = z.object({
  reponse: z.string().trim().min(10).max(1500),
  causes_probables: z
    .array(
      z.object({
        cause: z.string().trim().min(3).max(200),
        probabilite: z.preprocess(plain, z.enum(PROBABILITIES)),
      }),
    )
    .min(1)
    .max(5),
  urgence: z.preprocess(plain, z.enum(URGENCIES)),
  service_recommande: z.preprocess(plain, z.enum(SERVICE_CATEGORIES)),
  conseil_securite: z.string().trim().min(5).max(500),
});

export type DiagnosticResult = z.infer<typeof diagnosticSchema>;

export const vehicleContextSchema = z
  .object({
    marque: z.string().trim().max(40).optional(),
    modele: z.string().trim().max(40).optional(),
    annee: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  })
  .strict();

/** Request body of POST /api/ai/diagnostic. */
export const diagnosticRequestSchema = z.object({
  message: z.string().trim().min(3, 'Décrivez le symptôme en quelques mots').max(1000),
  conversationId: z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide').optional(),
  vehicule: vehicleContextSchema.optional(),
  // Used only for visitors (not logged in): previous messages kept by the browser.
  historique: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(2000) }))
    .max(20)
    .optional(),
});

export type DiagnosticRequest = z.infer<typeof diagnosticRequestSchema>;
export type VehicleContext = z.infer<typeof vehicleContextSchema>;
