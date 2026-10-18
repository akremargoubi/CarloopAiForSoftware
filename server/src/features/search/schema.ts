import { z } from 'zod';
import { CITIES, SERVICE_CATEGORIES } from '../../core/constants.js';

export const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;
export const MOMENTS = ['matin', 'apres-midi', 'soir'] as const;

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/^(l'|l’|la |le )/, '')
    .trim();

const CITY_BY_KEY = new Map<string, (typeof CITIES)[number]>(CITIES.map((c) => [normalize(c), c]));
CITY_BY_KEY.set('marsa', 'La Marsa');

/** Accepts "l'Ariana", "ARIANA", "Gabes"... and maps them to the canonical city, or null. */
const citySchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  return CITY_BY_KEY.get(normalize(value)) ?? null;
}, z.enum(CITIES).nullable());

const categorySchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalize(value) : value),
  z.enum(SERVICE_CATEGORIES).nullable(),
);

const momentSchema = z.preprocess(
  (value) => (typeof value === 'string' ? normalize(value).replace(' ', '-') : value),
  z.enum(MOMENTS).nullable(),
);

/** Step 1 output: filters extracted from the natural language query. */
export const extractionSchema = z.object({
  categorie: categorySchema,
  ville: citySchema,
  budget_max: z.number().positive().max(100000).nullable(),
  disponibilite: z
    .object({
      jour: z.preprocess((v) => (typeof v === 'string' ? normalize(v) : v), z.enum(DAYS).nullable()),
      moment: momentSchema,
    })
    .nullable(),
  criteres: z.array(z.string().trim().min(1).max(60)).max(8),
});

export type SearchFilters = z.infer<typeof extractionSchema>;

/** Step 3 output: ranking of the candidate providers. */
export const rankingSchema = z.object({
  resultats: z
    .array(
      z.object({
        providerId: z.string().min(1),
        justification: z.string().trim().min(3).max(300),
      }),
    )
    .max(20),
});

export type SearchRanking = z.infer<typeof rankingSchema>;

/** Request body of POST /api/ai/search. When `filtres` is given, step 1 (extraction) is skipped. */
export const searchRequestSchema = z.object({
  query: z.string().trim().min(3, 'Décrivez votre besoin en quelques mots').max(300),
  filtres: z
    .object({
      categorie: z.enum(SERVICE_CATEGORIES).nullable().default(null),
      ville: z.enum(CITIES).nullable().default(null),
      budget_max: z.number().positive().max(100000).nullable().default(null),
      disponibilite: z
        .object({ jour: z.enum(DAYS).nullable().default(null), moment: z.enum(MOMENTS).nullable().default(null) })
        .nullable()
        .default(null),
      criteres: z.array(z.string().trim().min(1).max(60)).max(8).default([]),
    })
    .optional(),
});

export type SearchRequest = z.infer<typeof searchRequestSchema>;
