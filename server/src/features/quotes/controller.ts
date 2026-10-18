import type { Request, Response } from 'express';
import { z } from 'zod';
import { requireUser } from '../../core/middlewares/auth.js';
import {
  BOOKING_STATUSES,
  slotsQuerySchema,
  type CreateBookingInput,
  type EstimateRequest,
} from './schema.js';
import {
  createBooking,
  decideQuote,
  estimateQuote,
  getAvailableSlots,
  listClientBookings,
  listProBookings,
  sendQuote,
  updateBookingStatus,
} from './service.js';

/** POST /api/ai/quote-estimate */
export async function estimateController(req: Request, res: Response) {
  const knownNames = req.user ? [req.user.name] : [];
  res.json({ estimation: await estimateQuote(req.body as EstimateRequest, knownNames) });
}

/** GET /api/bookings/slots?providerId=&date= */
export async function slotsController(req: Request, res: Response) {
  const { providerId, date } = slotsQuerySchema.parse(req.query);
  res.json({ slots: await getAvailableSlots(providerId, date) });
}

/** POST /api/bookings */
export async function createBookingController(req: Request, res: Response) {
  const booking = await createBooking(requireUser(req).id, req.body as CreateBookingInput);
  res.status(201).json({ booking: { id: booking.id as string, status: booking.status } });
}

/** GET /api/bookings/mine */
export async function myBookingsController(req: Request, res: Response) {
  res.json({ bookings: await listClientBookings(requireUser(req).id) });
}

/** GET /api/bookings/pro?status= */
export async function proBookingsController(req: Request, res: Response) {
  const status = z.enum(BOOKING_STATUSES).optional().parse(req.query.status || undefined);
  res.json({ bookings: await listProBookings(requireUser(req).id, status) });
}

/** PATCH /api/bookings/:id/status */
export async function updateStatusController(req: Request, res: Response) {
  const { status, note } = req.body as { status: 'accepted' | 'rejected' | 'completed' | 'cancelled'; note?: string };
  res.json({ booking: await updateBookingStatus(requireUser(req), req.params.id, status, note) });
}

/** POST /api/bookings/:id/quotes */
export async function sendQuoteController(req: Request, res: Response) {
  const { items, message } = req.body as { items: { label: string; amountTnd: number }[]; message: string };
  res.status(201).json({ booking: await sendQuote(requireUser(req).id, req.params.id, items, message) });
}

/** PATCH /api/quotes/:id */
export async function decideQuoteController(req: Request, res: Response) {
  const { decision } = req.body as { decision: 'accepted' | 'declined' };
  res.json({ booking: await decideQuote(requireUser(req).id, req.params.id, decision) });
}
