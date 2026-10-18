import { Router } from 'express';
import { authenticate, requireApprovedPro, requireRole } from '../../core/middlewares/auth.js';
import { asyncHandler, validateBody } from '../../core/middlewares/validate.js';
import {
  createReviewController,
  proReplyController,
  proReviewsController,
  providerReviewsController,
  replySuggestionsController,
  reviewableController,
  summaryController,
} from './controller.js';
import { createReviewSchema, proReplySchema, replyRequestSchema } from './schema.js';

export const reviewsRouter = Router();

// AI endpoints
reviewsRouter.post('/ai/reviews-summary/:providerId', asyncHandler(summaryController));
reviewsRouter.post('/ai/review-reply', authenticate, requireApprovedPro, validateBody(replyRequestSchema), asyncHandler(replySuggestionsController));

// Business endpoints
reviewsRouter.get('/reviews/provider/:providerId', asyncHandler(providerReviewsController));
reviewsRouter.get('/reviews/reviewable', authenticate, requireRole('client'), asyncHandler(reviewableController));
reviewsRouter.post('/reviews', authenticate, requireRole('client'), validateBody(createReviewSchema), asyncHandler(createReviewController));
reviewsRouter.get('/reviews/pro', authenticate, requireApprovedPro, asyncHandler(proReviewsController));
reviewsRouter.put('/reviews/:id/reply', authenticate, requireApprovedPro, validateBody(proReplySchema), asyncHandler(proReplyController));
