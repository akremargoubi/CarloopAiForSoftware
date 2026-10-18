import { runAiTask } from '../../ai/index.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors.js';
import { ProviderModel, type ProviderDoc } from '../../core/models/Provider.js';
import { UserModel } from '../../core/models/User.js';
import type { AuthUser } from '../../core/types/express.js';
import { mockEstimate } from './mock.js';
import { BookingModel, QuoteModel, type BookingDoc } from './model.js';
import { QUOTE_SYSTEM_PROMPT, buildEstimateMessage } from './prompt.js';
import {
  quoteEstimateSchema,
  type BookingStatus,
  type CreateBookingInput,
  type EstimateRequest,
  type QuoteEstimate,
} from './schema.js';

/** Tunisia is UTC+1 all year long (no daylight saving time). */
const TUNIS_OFFSET_MS = 60 * 60 * 1000;
const toTunis = (d: Date) => new Date(d.getTime() + TUNIS_OFFSET_MS);
const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

// ---------------------------------------------------------------------------
// AI estimation
// ---------------------------------------------------------------------------

/** POST /api/ai/quote-estimate: vehicle + service → price range validated by Zod. */
export async function estimateQuote(input: EstimateRequest, knownNames: string[]): Promise<QuoteEstimate> {
  let catalog: { name: string; priceTnd: number } | undefined;
  if (input.providerId) {
    const provider = await ProviderModel.findOne({ _id: input.providerId, isActive: true });
    const service =
      provider?.services.find((s) => s.category === input.categorie && (!input.service || s.name === input.service)) ??
      provider?.services.find((s) => s.category === input.categorie);
    if (service) catalog = { name: service.name, priceTnd: service.priceTnd };
  }
  return runAiTask('quotes', QUOTE_SYSTEM_PROMPT, buildEstimateMessage(input, catalog), quoteEstimateSchema, {
    mock: () => mockEstimate(input, catalog?.priceTnd),
    knownNames,
    temperature: 0.2,
  });
}

// ---------------------------------------------------------------------------
// Slots and bookings
// ---------------------------------------------------------------------------

function isWithinOpeningHours(provider: ProviderDoc, start: Date, durationMin: number): boolean {
  const local = toTunis(start);
  const hours = provider.openingHours.find((h) => h.day === local.getUTCDay());
  if (!hours) return false;
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();
  return minutes >= toMinutes(hours.open) && minutes + Math.min(durationMin, 60) <= toMinutes(hours.close);
}

/** Free one-hour slots of a provider for a given day (Tunis time). */
export async function getAvailableSlots(providerId: string, date: string): Promise<string[]> {
  const provider = await ProviderModel.findOne({ _id: providerId, isActive: true });
  if (!provider) throw notFound('Prestataire introuvable');
  const [y, m, d] = date.split('-').map(Number);
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const hours = provider.openingHours.find((h) => h.day === day);
  if (!hours) return [];

  const dayStart = new Date(Date.UTC(y, m - 1, d) - TUNIS_OFFSET_MS);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const taken = await BookingModel.find({
    provider: providerId,
    status: { $in: ['pending', 'accepted'] },
    scheduledAt: { $gte: dayStart, $lt: dayEnd },
  }).select('scheduledAt');
  const takenTimes = new Set(taken.map((b) => b.scheduledAt.getTime()));

  const slots: string[] = [];
  const now = Date.now();
  for (let t = toMinutes(hours.open); t + 60 <= toMinutes(hours.close); t += 60) {
    const start = new Date(dayStart.getTime() + t * 60_000);
    if (start.getTime() > now && !takenTimes.has(start.getTime())) slots.push(start.toISOString());
  }
  return slots;
}

/** Creates a booking request (client). The AI estimation, when present, is attached to it. */
export async function createBooking(clientId: string, input: CreateBookingInput): Promise<BookingDoc> {
  const provider = await ProviderModel.findOne({ _id: input.providerId, isActive: true });
  if (!provider) throw notFound('Prestataire introuvable');
  const service = provider.services.id(input.serviceId);
  if (!service) throw badRequest('Ce service n’est pas proposé par ce prestataire');
  if (input.scheduledAt.getTime() <= Date.now()) throw badRequest('Le créneau doit être dans le futur');
  if (!isWithinOpeningHours(provider, input.scheduledAt, service.durationMin)) {
    throw badRequest('Le créneau choisi est en dehors des horaires d’ouverture');
  }
  const clash = await BookingModel.exists({
    provider: provider._id,
    scheduledAt: input.scheduledAt,
    status: { $in: ['pending', 'accepted'] },
  });
  if (clash) throw conflict('Ce créneau vient d’être réservé, choisissez-en un autre');

  return BookingModel.create({
    client: clientId,
    provider: provider._id,
    serviceId: service._id,
    category: service.category,
    serviceName: service.name,
    catalogPriceTnd: service.priceTnd,
    durationMin: service.durationMin,
    scheduledAt: input.scheduledAt,
    vehicle: input.vehicule,
    description: input.description,
    aiEstimate: input.estimation,
  });
}

async function toBookingDto(bookings: BookingDoc[], withClient: boolean) {
  const providerIds = [...new Set(bookings.map((b) => String(b.provider)))];
  const [providers, quotes, clients] = await Promise.all([
    ProviderModel.find({ _id: { $in: providerIds } }).select('name city address'),
    QuoteModel.find({ booking: { $in: bookings.map((b) => b._id) } }).sort({ createdAt: -1 }),
    withClient ? UserModel.find({ _id: { $in: bookings.map((b) => b.client) } }).select('name phone') : Promise.resolve([]),
  ]);
  const providerById = new Map(providers.map((p) => [p.id as string, p]));
  const clientById = new Map(clients.map((c) => [c.id as string, c]));
  return bookings.map((b) => {
    const provider = providerById.get(String(b.provider));
    const client = clientById.get(String(b.client));
    return {
      id: b.id as string,
      provider: provider ? { id: provider.id as string, name: provider.name, city: provider.city, address: provider.address } : null,
      client: withClient && client ? { name: client.name, phone: client.phone ?? null } : undefined,
      category: b.category,
      serviceName: b.serviceName,
      catalogPriceTnd: b.catalogPriceTnd,
      scheduledAt: b.scheduledAt,
      durationMin: b.durationMin,
      vehicle: b.vehicle,
      description: b.description,
      status: b.status,
      aiEstimate: (b.aiEstimate as QuoteEstimate | undefined) ?? null,
      proNote: b.proNote ?? null,
      quotes: quotes
        .filter((q) => String(q.booking) === b.id)
        .map((q) => ({ id: q.id as string, items: q.items, totalTnd: q.totalTnd, message: q.message, status: q.status, createdAt: q.createdAt })),
      createdAt: b.createdAt,
    };
  });
}

/** Bookings of the logged-in client. */
export async function listClientBookings(clientId: string) {
  const bookings = await BookingModel.find({ client: clientId }).sort({ scheduledAt: -1 }).limit(100);
  return toBookingDto(bookings, false);
}

async function findOwnedProvider(proId: string) {
  const provider = await ProviderModel.findOne({ owner: proId });
  if (!provider) throw notFound('Aucun garage associé à ce compte');
  return provider;
}

/** Agenda of the pro (bookings of his garage). */
export async function listProBookings(proId: string, status?: BookingStatus) {
  const provider = await findOwnedProvider(proId);
  const bookings = await BookingModel.find({ provider: provider._id, ...(status ? { status } : {}) })
    .sort({ scheduledAt: 1 })
    .limit(200);
  return toBookingDto(bookings, true);
}

const PRO_TRANSITIONS: Record<string, BookingStatus[]> = {
  accepted: ['pending'],
  rejected: ['pending'],
  completed: ['accepted'],
};

/** Status change: the pro accepts / rejects / completes, the client cancels. */
export async function updateBookingStatus(user: AuthUser, bookingId: string, status: BookingStatus, note?: string) {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw notFound('Réservation introuvable');

  if (user.role === 'client') {
    if (String(booking.client) !== user.id) throw notFound('Réservation introuvable');
    if (status !== 'cancelled') throw forbidden('Un client peut uniquement annuler sa réservation');
    if (!['pending', 'accepted'].includes(booking.status)) throw badRequest('Cette réservation ne peut plus être annulée');
  } else {
    const provider = await findOwnedProvider(user.id);
    if (String(booking.provider) !== provider.id) throw notFound('Réservation introuvable');
    const allowedFrom = PRO_TRANSITIONS[status];
    if (!allowedFrom) throw forbidden('Action non autorisée');
    if (!allowedFrom.includes(booking.status)) throw badRequest(`Transition impossible : ${booking.status} → ${status}`);
    if (note) booking.proNote = note;
  }
  booking.status = status;
  await booking.save();
  return (await toBookingDto([booking], user.role === 'pro'))[0];
}

/** The pro sends a real quote for one of his bookings. */
export async function sendQuote(proId: string, bookingId: string, items: { label: string; amountTnd: number }[], message: string) {
  const provider = await findOwnedProvider(proId);
  const booking = await BookingModel.findOne({ _id: bookingId, provider: provider._id });
  if (!booking) throw notFound('Réservation introuvable');
  if (!['pending', 'accepted'].includes(booking.status)) throw badRequest('Impossible d’envoyer un devis pour cette réservation');
  const totalTnd = Math.round(items.reduce((sum, i) => sum + i.amountTnd, 0) * 1000) / 1000;
  await QuoteModel.updateMany({ booking: booking._id, status: 'sent' }, { status: 'declined' });
  await QuoteModel.create({ booking: booking._id, provider: provider._id, items, totalTnd, message });
  return (await toBookingDto([booking], true))[0];
}

/** The client accepts or declines a quote. */
export async function decideQuote(clientId: string, quoteId: string, decision: 'accepted' | 'declined') {
  const quote = await QuoteModel.findById(quoteId);
  if (!quote) throw notFound('Devis introuvable');
  const booking = await BookingModel.findOne({ _id: quote.booking, client: clientId });
  if (!booking) throw notFound('Devis introuvable');
  if (quote.status !== 'sent') throw badRequest('Ce devis a déjà reçu une réponse');
  quote.status = decision;
  await quote.save();
  return (await toBookingDto([booking], false))[0];
}
