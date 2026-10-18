import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');
const plain = (v: unknown) =>
  typeof v === 'string' ? v.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim() : v;

/** LLM output: summary of the reviews of a provider. */
export const reviewsSummarySchema = z.object({
  resume: z.string().trim().min(20).max(1200),
  sentiment_global: z.preprocess(plain, z.enum(['positif', 'mitige', 'negatif'])),
  points_forts: z.array(z.string().trim().min(2).max(150)).max(6),
  points_faibles: z.array(z.string().trim().min(2).max(150)).max(6),
  // Confidence of the analysis from 0 to 100 (depends on the number and consistency of the reviews).
  score_confiance: z.number().int().min(0).max(100),
});

export type ReviewsSummary = z.infer<typeof reviewsSummarySchema>;

/** LLM output: two professional replies suggested to the pro. */
export const reviewReplySchema = z.object({
  propositions: z
    .array(
      z.object({
        ton: z.string().trim().min(3).max(40),
        texte: z.string().trim().min(20).max(800),
      }),
    )
    .length(2),
});

export type ReviewReplySuggestions = z.infer<typeof reviewReplySchema>;

export const createReviewSchema = z.object({
  bookingId: objectId,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10, 'Votre avis doit contenir au moins 10 caractères').max(1000),
});

export const replyRequestSchema = z.object({ reviewId: objectId });

export const proReplySchema = z.object({ text: z.string().trim().min(5).max(1000) });
