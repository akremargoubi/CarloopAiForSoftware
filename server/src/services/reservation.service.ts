import type { Prisma, ReservationStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import type { CreateReservationInput, ListReservationsQuery } from '../schemas/reservation.schema';
import type { AuthUser } from '../types/express';
import { HttpError } from '../utils/http-error';

/** Transitions autorisées pour le PRO propriétaire du service. */
const PRO_TRANSITIONS: Readonly<Record<ReservationStatus, readonly ReservationStatus[]>> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['DONE', 'CANCELLED'],
  CANCELLED: [],
  DONE: [],
};

const reservationSelect = {
  id: true,
  scheduledAt: true,
  status: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, firstName: true, lastName: true, phone: true } },
  service: {
    select: {
      id: true,
      title: true,
      category: true,
      price: true,
      durationMinutes: true,
      garage: { select: { id: true, name: true, city: true, address: true } },
    },
  },
} satisfies Prisma.ReservationSelect;

type ReservationRow = Prisma.ReservationGetPayload<{ select: typeof reservationSelect }>;

/** Réservation telle que renvoyée par l'API (prix en number). */
export type ReservationDto = Omit<ReservationRow, 'service'> & {
  service: Omit<ReservationRow['service'], 'price'> & { price: number };
};

/** Convertit une ligne Prisma en DTO. */
function toReservationDto(row: ReservationRow): ReservationDto {
  return { ...row, service: { ...row.service, price: row.service.price.toNumber() } };
}

/**
 * Crée une réservation PENDING pour le client courant.
 * @param clientId Identifiant du CLIENT.
 * @param input Données validées (date future).
 * @throws HttpError 404 si le service n'existe pas.
 */
export async function createReservation(clientId: string, input: CreateReservationInput): Promise<ReservationDto> {
  const service = await prisma.service.findUnique({ where: { id: input.serviceId }, select: { id: true } });
  if (!service) {
    throw HttpError.notFound('Service introuvable');
  }
  const row = await prisma.reservation.create({
    data: { clientId, serviceId: input.serviceId, scheduledAt: input.scheduledAt, note: input.note ?? null },
    select: reservationSelect,
  });
  return toReservationDto(row);
}

/**
 * Réservations visibles par l'utilisateur : les siennes (CLIENT), celles de ses garages (PRO),
 * toutes (ADMIN).
 * @param user Utilisateur courant.
 * @param query Filtre de statut optionnel.
 */
export async function listReservations(user: AuthUser, query: ListReservationsQuery): Promise<ReservationDto[]> {
  const scope: Prisma.ReservationWhereInput =
    user.role === 'CLIENT'
      ? { clientId: user.id }
      : user.role === 'PRO'
        ? { service: { garage: { ownerId: user.id } } }
        : {};
  const rows = await prisma.reservation.findMany({
    where: { ...scope, ...(query.status ? { status: query.status } : {}) },
    select: reservationSelect,
    orderBy: { scheduledAt: 'asc' },
  });
  return rows.map(toReservationDto);
}

/**
 * Change le statut d'une réservation.
 * - PRO propriétaire du service (ou ADMIN) : PENDING→CONFIRMED|CANCELLED, CONFIRMED→DONE|CANCELLED.
 * - CLIENT auteur de la réservation : uniquement PENDING→CANCELLED.
 * @param user Utilisateur courant.
 * @param id Identifiant de la réservation.
 * @param status Nouveau statut.
 * @throws HttpError 404 / 403 (non autorisé) / 409 (transition invalide ou modification concurrente).
 */
export async function updateReservationStatus(
  user: AuthUser,
  id: string,
  status: ReservationStatus,
): Promise<ReservationDto> {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    select: { status: true, clientId: true, service: { select: { garage: { select: { ownerId: true } } } } },
  });
  if (!reservation) {
    throw HttpError.notFound('Réservation introuvable');
  }

  const isServiceOwner = user.role === 'ADMIN' || (user.role === 'PRO' && reservation.service.garage.ownerId === user.id);
  const isReservationClient = user.role === 'CLIENT' && reservation.clientId === user.id;

  if (isServiceOwner) {
    if (!PRO_TRANSITIONS[reservation.status].includes(status)) {
      throw HttpError.conflict(`Transition ${reservation.status} → ${status} non autorisée`);
    }
  } else if (isReservationClient) {
    if (reservation.status !== 'PENDING' || status !== 'CANCELLED') {
      throw HttpError.forbidden('Un client ne peut qu’annuler une réservation en attente');
    }
  } else {
    throw HttpError.forbidden('Vous n’avez pas accès à cette réservation');
  }

  // Mise à jour conditionnelle : échoue si le statut a changé entre-temps.
  const { count } = await prisma.reservation.updateMany({
    where: { id, status: reservation.status },
    data: { status },
  });
  if (count === 0) {
    throw HttpError.conflict('La réservation a été modifiée entre-temps, réessayez');
  }
  const row = await prisma.reservation.findUniqueOrThrow({ where: { id }, select: reservationSelect });
  return toReservationDto(row);
}
