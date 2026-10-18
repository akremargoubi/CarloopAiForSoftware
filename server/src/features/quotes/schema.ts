import { z } from 'zod';
import { FUEL_TYPES, SERVICE_CATEGORIES } from '../../core/constants.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');
const currentYear = new Date().getFullYear();

export const vehicleSchema = z.object({
  marque: z.string().trim().min(2).max(40),
  modele: z.string().trim().min(1).max(40),
  annee: z.coerce.number().int().min(1970).max(currentYear + 1),
  kilometrage: z.coerce.number().int().min(0).max(2_000_000),
  carburant: z.enum(FUEL_TYPES),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;

/** LLM output: price estimation. Prices must be positive and prix_min <= prix_max. */
export const quoteEstimateSchema = z
  .object({
    prix_min_tnd: z.number().positive().max(100000),
    prix_max_tnd: z.number().positive().max(100000),
    pieces_probables: z
      .array(z.object({ piece: z.string().trim().min(2).max(120), prix_estime_tnd: z.number().positive().max(50000) }))
      .max(10),
    main_oeuvre_heures: z.number().min(0).max(100),
    hypotheses: z.array(z.string().trim().min(3).max(300)).max(8),
    avertissement: z.string().trim().min(5).max(500),
  })
  .refine((q) => q.prix_min_tnd <= q.prix_max_tnd, {
    message: 'prix_min_tnd doit être inférieur ou égal à prix_max_tnd',
    path: ['prix_min_tnd'],
  });

export type QuoteEstimate = z.infer<typeof quoteEstimateSchema>;

/** Request body of POST /api/ai/quote-estimate. */
export const estimateRequestSchema = z.object({
  vehicule: vehicleSchema,
  categorie: z.enum(SERVICE_CATEGORIES),
  service: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).default(''),
  providerId: objectId.optional(),
});

export type EstimateRequest = z.infer<typeof estimateRequestSchema>;

export const createBookingSchema = z.object({
  providerId: objectId,
  serviceId: objectId,
  scheduledAt: z.coerce.date(),
  vehicule: vehicleSchema.extend({ vehicleId: objectId.optional() }),
  description: z.string().trim().max(1000).default(''),
  estimation: quoteEstimateSchema.optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const BOOKING_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const statusUpdateSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'completed', 'cancelled']),
  note: z.string().trim().max(500).optional(),
});

export const sendQuoteSchema = z.object({
  items: z
    .array(z.object({ label: z.string().trim().min(2).max(120), amountTnd: z.number().positive().max(100000) }))
    .min(1)
    .max(20),
  message: z.string().trim().max(1000).default(''),
});

export const quoteDecisionSchema = z.object({ decision: z.enum(['accepted', 'declined']) });

export const slotsQuerySchema = z.object({
  providerId: objectId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format AAAA-MM-JJ attendu'),
});
