import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { HttpError } from '../http.js';
import { getProvider, listProviders } from '../providers.service.js';

export const catalogue = Router();

const bool = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true');

const listQuery = z.object({
  category: z.string().trim().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  maxPrice: z.coerce.number().positive().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  maxDistance: z.coerce.number().positive().optional(),
  available: bool,
  favorites: bool,
  sort: z.enum(['distance', 'price', 'rating']).default('distance'),
  lat: z.coerce.number().min(-90).max(90).default(36.8065),
  lng: z.coerce.number().min(-180).max(180).default(10.1815),
});

const locationQuery = listQuery.pick({ lat: true, lng: true });
const idParam = z.coerce.number().int().positive();

catalogue.get('/categories', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, slug, nom, icone FROM categories ORDER BY id');
  res.json(rows);
});

catalogue.get('/providers', async (req, res) => {
  const { favorites, available, ...rest } = listQuery.parse(req.query);
  res.json(
    await listProviders({ ...rest, available, favoritesOnly: favorites }, res.locals.userId),
  );
});

catalogue.get('/providers/:id', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { lat, lng } = locationQuery.parse(req.query);
  const provider = await getProvider(id, res.locals.userId, lat, lng);
  if (!provider) throw new HttpError(404, 'NOT_FOUND', 'Prestataire introuvable.');
  res.json(provider);
});

// ---- Favorites ----------------------------------------------------------

catalogue.put('/favorites/:providerId', async (req, res) => {
  const providerId = idParam.parse(req.params.providerId);
  const exists = await pool.query('SELECT 1 FROM providers WHERE id = $1', [providerId]);
  if (exists.rowCount === 0) throw new HttpError(404, 'NOT_FOUND', 'Prestataire introuvable.');
  await pool.query(
    'INSERT INTO favorites (user_id, provider_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
    [res.locals.userId, providerId],
  );
  res.status(204).end();
});

catalogue.delete('/favorites/:providerId', async (req, res) => {
  const providerId = idParam.parse(req.params.providerId);
  await pool.query('DELETE FROM favorites WHERE user_id = $1 AND provider_id = $2', [
    res.locals.userId,
    providerId,
  ]);
  res.status(204).end();
});

// ---- Reviews ------------------------------------------------------------

catalogue.get('/providers/:id/reviews', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { rows } = await pool.query(
    `SELECT r.id, r.note, r.commentaire, r.created_at, u.nom AS auteur
     FROM reviews r JOIN users u ON u.id = r.user_id
     WHERE r.provider_id = $1 ORDER BY r.created_at DESC`,
    [id],
  );
  res.json(rows);
});

const reviewBody = z.object({
  note: z.number().int().min(1, 'Note entre 1 et 5.').max(5, 'Note entre 1 et 5.'),
  commentaire: z.string().trim().max(500, 'Commentaire limité à 500 caractères.').default(''),
});

// One review per client and provider: posting again updates it.
catalogue.post('/providers/:id/reviews', async (req, res) => {
  const id = idParam.parse(req.params.id);
  const { note, commentaire } = reviewBody.parse(req.body);
  const exists = await pool.query('SELECT 1 FROM providers WHERE id = $1', [id]);
  if (exists.rowCount === 0) throw new HttpError(404, 'NOT_FOUND', 'Prestataire introuvable.');
  const { rows } = await pool.query(
    `INSERT INTO reviews (provider_id, user_id, note, commentaire) VALUES ($1,$2,$3,$4)
     ON CONFLICT (provider_id, user_id)
     DO UPDATE SET note = EXCLUDED.note, commentaire = EXCLUDED.commentaire, created_at = now()
     RETURNING id, note, commentaire, created_at`,
    [id, res.locals.userId, note, commentaire],
  );
  res.status(201).json(rows[0]);
});
