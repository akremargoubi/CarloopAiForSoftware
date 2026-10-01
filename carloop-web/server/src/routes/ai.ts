import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { chatJson } from '../ai/openrouter.js';
import {
  REVIEW_SUMMARY_SYSTEM,
  assistantSchema,
  assistantSystem,
  reviewSummarySchema,
  type ReviewSummary,
} from '../ai/prompts.js';
import { redactPII } from '../ai/privacy.js';
import { pool } from '../db.js';
import { HttpError } from '../http.js';

export const ai = Router();

// Protects the OpenRouter quota.
ai.use(
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMIT', message: 'Trop de requêtes, patientez une minute.' } },
  }),
);

// Same reviews => same summary: avoids paying for identical calls.
const summaryCache = new Map<string, ReviewSummary>();

ai.post('/review-summary', async (req, res) => {
  const { providerId } = z.object({ providerId: z.number().int().positive() }).parse(req.body);

  // Only note + comment leave the server: no author name, no user id.
  const { rows } = await pool.query(
    `SELECT note, commentaire FROM reviews WHERE provider_id = $1
     ORDER BY created_at DESC LIMIT 30`,
    [providerId],
  );
  if (rows.length < 2) {
    throw new HttpError(422, 'NOT_ENOUGH_REVIEWS', 'Pas assez d’avis pour générer un résumé.');
  }

  const lines = rows.map((r) => `[${r.note}/5] ${redactPII(r.commentaire, 300)}`);
  const user = `<avis>\n${lines.join('\n')}\n</avis>`;

  const key = `${providerId}:${user}`;
  const cached = summaryCache.get(key);
  if (cached) {
    res.json({ ...cached, nb_avis: rows.length, cached: true });
    return;
  }

  const summary = await chatJson(REVIEW_SUMMARY_SYSTEM, user, reviewSummarySchema);
  if (summaryCache.size > 200) summaryCache.clear();
  summaryCache.set(key, summary);
  res.json({ ...summary, nb_avis: rows.length, cached: false });
});

ai.post('/assistant', async (req, res) => {
  const { message } = z
    .object({ message: z.string().trim().min(3, 'Décrivez votre besoin.').max(500) })
    .parse(req.body);

  const { rows: categories } = await pool.query('SELECT slug, nom FROM categories ORDER BY id');
  const result = await chatJson(
    assistantSystem(categories),
    `<message>${redactPII(message)}</message>`,
    assistantSchema,
  );

  // Output validation: the model may only answer with a category we actually have.
  const known = categories.find((c) => c.slug === result.category_slug);
  res.json({
    category_slug: known?.slug ?? null,
    category_nom: known?.nom ?? null,
    mots_cles: result.mots_cles,
    urgence: result.urgence,
    explication: result.explication,
  });
});
