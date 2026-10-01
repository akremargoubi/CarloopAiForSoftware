import type { Request, Response } from 'express';
import { idParamSchema } from '../schemas/common.schema';
import {
  createReservationSchema,
  listReservationsQuerySchema,
  updateReservationStatusSchema,
} from '../schemas/reservation.schema';
import * as reservationService from '../services/reservation.service';
import { requireUser } from '../utils/request-user';
import { validate } from '../utils/validate';

/** POST /api/reservations — réservation d'un service (CLIENT). */
export async function create(req: Request, res: Response): Promise<void> {
  const input = validate(createReservationSchema, req.body);
  res.status(201).json(await reservationService.createReservation(requireUser(req).id, input));
}

/** GET /api/reservations/mine — réservations visibles par l'utilisateur. */
export async function listMine(req: Request, res: Response): Promise<void> {
  const query = validate(listReservationsQuerySchema, req.query);
  res.json({ items: await reservationService.listReservations(requireUser(req), query) });
}

/** PATCH /api/reservations/:id/status — changement de statut. */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = validate(idParamSchema, req.params);
  const { status } = validate(updateReservationStatusSchema, req.body);
  res.json(await reservationService.updateReservationStatus(requireUser(req), id, status));
}
