import { Router } from 'express';
import { authenticate, optionalAuth, requireApprovedPro, requireRole } from '../../core/middlewares/auth.js';
import { asyncHandler, validateBody } from '../../core/middlewares/validate.js';
import {
  createBookingController,
  decideQuoteController,
  estimateController,
  myBookingsController,
  proBookingsController,
  sendQuoteController,
  slotsController,
  updateStatusController,
} from './controller.js';
import { createBookingSchema, estimateRequestSchema, quoteDecisionSchema, sendQuoteSchema, statusUpdateSchema } from './schema.js';

export const quotesRouter = Router();

quotesRouter.post('/ai/quote-estimate', optionalAuth, validateBody(estimateRequestSchema), asyncHandler(estimateController));

quotesRouter.get('/bookings/slots', asyncHandler(slotsController));
quotesRouter.post('/bookings', authenticate, requireRole('client'), validateBody(createBookingSchema), asyncHandler(createBookingController));
quotesRouter.get('/bookings/mine', authenticate, requireRole('client'), asyncHandler(myBookingsController));
quotesRouter.get('/bookings/pro', authenticate, requireApprovedPro, asyncHandler(proBookingsController));
quotesRouter.patch(
  '/bookings/:id/status',
  authenticate,
  requireRole('client', 'pro'),
  validateBody(statusUpdateSchema),
  asyncHandler(updateStatusController),
);
quotesRouter.post('/bookings/:id/quotes', authenticate, requireApprovedPro, validateBody(sendQuoteSchema), asyncHandler(sendQuoteController));
quotesRouter.patch('/quotes/:id', authenticate, requireRole('client'), validateBody(quoteDecisionSchema), asyncHandler(decideQuoteController));
