import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireUser } from '../../core/middlewares/auth.js';
import {
  createReview,
  getReviewsSummary,
  listProReviews,
  listProviderReviews,
  listReviewableBookings,
  replyToReview,
  suggestReplies,
} from './service.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

/** POST /api/ai/reviews-summary/:providerId */
export async function summaryController(req: Request, res: Response) {
  res.json(await getReviewsSummary(objectId.parse(req.params.providerId)));
}

/** POST /api/ai/review-reply */
export async function replySuggestionsController(req: Request, res: Response) {
  res.json(await suggestReplies(requireUser(req).id, (req.body as { reviewId: string }).reviewId));
}

/** GET /api/reviews/provider/:providerId */
export async function providerReviewsController(req: Request, res: Response) {
  res.json({ reviews: await listProviderReviews(objectId.parse(req.params.providerId)) });
}

/** GET /api/reviews/reviewable */
export async function reviewableController(req: Request, res: Response) {
  res.json({ bookings: await listReviewableBookings(requireUser(req).id) });
}

/** POST /api/reviews */
export async function createReviewController(req: Request, res: Response) {
  res.status(201).json({ review: await createReview(requireUser(req).id, req.body) });
}

/** GET /api/reviews/pro */
export async function proReviewsController(req: Request, res: Response) {
  res.json({ reviews: await listProReviews(requireUser(req).id) });
}

/** PUT /api/reviews/:id/reply */
export async function proReplyController(req: Request, res: Response) {
  res.json({ review: await replyToReview(requireUser(req).id, objectId.parse(req.params.id), (req.body as { text: string }).text) });
}
