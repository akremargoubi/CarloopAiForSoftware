import { ReservationStatus } from '@prisma/client';
import { z } from 'zod';

/** Body de POST /api/reservations (date ISO 8601 avec fuseau, dans le futur). */
export const createReservationSchema = z.object({
  serviceId: z.cuid('Identifiant de service invalide'),
  scheduledAt: z.iso
    .datetime({ offset: true, message: 'Date ISO 8601 attendue, ex. 2026-11-05T09:30:00+01:00' })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() > Date.now(), 'La date doit être dans le futur'),
  note: z.string().trim().max(500).optional(),
});

/** Query de GET /api/reservations/mine. */
export const listReservationsQuerySchema = z.object({
  status: z.enum(ReservationStatus).optional(),
});

/** Body de PATCH /api/reservations/:id/status. */
export const updateReservationStatusSchema = z.object({
  status: z.enum(ReservationStatus),
});

/** Création de réservation validée. */
export type CreateReservationInput = z.output<typeof createReservationSchema>;
/** Filtres de liste de réservations validés. */
export type ListReservationsQuery = z.output<typeof listReservationsQuerySchema>;
