import { Router, type Request, type Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { z } from 'zod';
import { CATEGORY_LABELS, CITIES, SERVICE_CATEGORIES } from '../constants.js';
import { notFound } from '../errors.js';
import { authenticate, requireRole, requireUser } from '../middlewares/auth.js';
import { asyncHandler, validateBody } from '../middlewares/validate.js';
import { ProviderModel, toPublicProvider, type Provider } from '../models/Provider.js';

const listQuerySchema = z.object({
  categorie: z.enum(SERVICE_CATEGORIES).optional(),
  ville: z.enum(CITIES).optional(),
  budget_max: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const timeString = z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM attendu');

const updateProviderSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  city: z.enum(CITIES).optional(),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(20).optional(),
  services: z
    .array(
      z.object({
        category: z.enum(SERVICE_CATEGORIES),
        name: z.string().trim().min(2).max(100),
        priceTnd: z.number().min(0).max(100000),
        durationMin: z.number().int().min(5).max(24 * 60),
      }),
    )
    .max(50)
    .optional(),
  openingHours: z
    .array(z.object({ day: z.number().int().min(0).max(6), open: timeString, close: timeString }))
    .max(7)
    .optional(),
});

/** Builds the MongoDB filter shared by the public list and the AI search module. */
export function buildProviderFilter(filters: {
  categorie?: string;
  ville?: string;
  budget_max?: number;
}): FilterQuery<Provider> {
  const query: FilterQuery<Provider> = { isActive: true };
  if (filters.ville) query.city = filters.ville;
  if (filters.categorie && filters.budget_max) {
    query.services = {
      $elemMatch: { category: filters.categorie, priceTnd: { $lte: filters.budget_max } },
    };
  } else if (filters.categorie) {
    query.categories = filters.categorie;
  } else if (filters.budget_max) {
    query['services.priceTnd'] = { $lte: filters.budget_max };
  }
  return query;
}

async function listProviders(req: Request, res: Response) {
  const q = listQuerySchema.parse(req.query);
  const providers = await ProviderModel.find(buildProviderFilter(q))
    .sort({ ratingAvg: -1 })
    .limit(q.limit);
  res.json({ providers: providers.map(toPublicProvider) });
}

async function getProvider(req: Request, res: Response) {
  const provider = await ProviderModel.findOne({ _id: req.params.id, isActive: true });
  if (!provider) throw notFound('Prestataire introuvable');
  res.json({ provider: toPublicProvider(provider) });
}

async function getMyProvider(req: Request, res: Response) {
  const provider = await ProviderModel.findOne({ owner: requireUser(req).id });
  if (!provider) throw notFound('Aucun garage associé à ce compte');
  res.json({ provider: toPublicProvider(provider) });
}

async function updateMyProvider(req: Request, res: Response) {
  const input = req.body as z.infer<typeof updateProviderSchema>;
  const provider = await ProviderModel.findOne({ owner: requireUser(req).id });
  if (!provider) throw notFound('Aucun garage associé à ce compte');
  provider.set(input);
  if (input.services) provider.categories = [...new Set(input.services.map((s) => s.category))];
  await provider.save();
  res.json({ provider: toPublicProvider(provider) });
}

export const providerRouter = Router();

providerRouter.get('/', asyncHandler(listProviders));
providerRouter.get(
  '/mine',
  authenticate,
  requireRole('pro'),
  asyncHandler(getMyProvider),
);
providerRouter.put(
  '/mine',
  authenticate,
  requireRole('pro'),
  validateBody(updateProviderSchema),
  asyncHandler(updateMyProvider),
);
providerRouter.get('/:id', asyncHandler(getProvider));

/** GET /api/meta: static reference data for the front-end. */
export const metaRouter = Router();
metaRouter.get('/', (_req, res) => {
  res.json({
    categories: SERVICE_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABELS[value] })),
    cities: CITIES,
  });
});
