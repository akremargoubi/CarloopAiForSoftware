import mongoose, { Types } from 'mongoose';
import { runAiTask } from '../../ai/index.js';
import { badRequest, conflict, notFound } from '../../core/errors.js';
import { ProviderModel } from '../../core/models/Provider.js';
import { UserModel } from '../../core/models/User.js';
import { mockReply, mockSummary } from './mock.js';
import { ReviewModel, ReviewSummaryModel } from './model.js';
import { REPLY_SYSTEM_PROMPT, SUMMARY_SYSTEM_PROMPT, buildReplyMessage, buildSummaryMessage } from './prompt.js';
import { reviewReplySchema, reviewsSummarySchema, type ReviewReplySuggestions, type ReviewsSummary } from './schema.js';

const MAX_REVIEWS_FOR_SUMMARY = 40;

interface RawBooking {
  _id: Types.ObjectId;
  client: Types.ObjectId;
  provider: Types.ObjectId;
  status: string;
  serviceName?: string;
  category?: string;
  scheduledAt?: Date;
}

/**
 * Bookings are owned by the quotes module. They are read through the raw collection
 * so that this module does not import another feature folder.
 */
function bookingsCollection() {
  return mongoose.connection.collection<RawBooking>('bookings');
}

/** "Sami Ben Ali" → "Sami B." (public display without the full name). */
function shortName(name: string | undefined): string {
  if (!name) return 'Client';
  const [first, second] = name.trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}.` : first;
}

/** Recomputes the average rating stored on the provider. */
export async function refreshProviderRating(providerId: Types.ObjectId | string): Promise<void> {
  const [stats] = await ReviewModel.aggregate<{ avg: number; count: number }>([
    { $match: { provider: new Types.ObjectId(String(providerId)) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await ProviderModel.updateOne(
    { _id: providerId },
    { ratingAvg: stats ? Math.round(stats.avg * 10) / 10 : 0, ratingCount: stats?.count ?? 0 },
  );
}

// ---------------------------------------------------------------------------
// Client side
// ---------------------------------------------------------------------------

/** Completed bookings of the client that have not been reviewed yet. */
export async function listReviewableBookings(clientId: string) {
  const bookings = await bookingsCollection()
    .find({ client: new Types.ObjectId(clientId), status: 'completed' })
    .sort({ scheduledAt: -1 })
    .limit(50)
    .toArray();
  const reviewed = new Set((await ReviewModel.find({ booking: { $in: bookings.map((b) => b._id) } }).select('booking')).map((r) => String(r.booking)));
  const pending = bookings.filter((b) => !reviewed.has(String(b._id)));
  const providers = await ProviderModel.find({ _id: { $in: pending.map((b) => b.provider) } }).select('name city');
  const byId = new Map(providers.map((p) => [p.id as string, p]));
  return pending.map((b) => ({
    bookingId: String(b._id),
    provider: { id: String(b.provider), name: byId.get(String(b.provider))?.name ?? 'Prestataire', city: byId.get(String(b.provider))?.city ?? '' },
    serviceName: b.serviceName ?? '',
    scheduledAt: b.scheduledAt ?? null,
  }));
}

/** A client reviews one of his completed bookings (one review per booking). */
export async function createReview(clientId: string, input: { bookingId: string; rating: number; comment: string }) {
  const booking = await bookingsCollection().findOne({ _id: new Types.ObjectId(input.bookingId), client: new Types.ObjectId(clientId) });
  if (!booking) throw notFound('Réservation introuvable');
  if (booking.status !== 'completed') throw badRequest('Vous pourrez laisser un avis une fois la prestation terminée');
  if (await ReviewModel.exists({ booking: booking._id })) throw conflict('Vous avez déjà laissé un avis pour cette réservation');
  const review = await ReviewModel.create({
    booking: booking._id,
    provider: booking.provider,
    client: clientId,
    rating: input.rating,
    comment: input.comment,
    serviceName: booking.serviceName,
  });
  await refreshProviderRating(booking.provider);
  return { id: review.id as string };
}

/** Public list of the reviews of a provider. */
export async function listProviderReviews(providerId: string) {
  const reviews = await ReviewModel.find({ provider: providerId }).sort({ createdAt: -1 }).limit(50);
  const clients = await UserModel.find({ _id: { $in: reviews.map((r) => r.client) } }).select('name');
  const names = new Map(clients.map((c) => [c.id as string, c.name]));
  return reviews.map((r) => ({
    id: r.id as string,
    author: shortName(names.get(String(r.client))),
    rating: r.rating,
    comment: r.comment,
    serviceName: r.serviceName ?? null,
    proReply: r.proReply?.text ? { text: r.proReply.text, repliedAt: r.proReply.repliedAt } : null,
    createdAt: r.createdAt,
  }));
}

// ---------------------------------------------------------------------------
// AI: summary (cached) and reply suggestions
// ---------------------------------------------------------------------------

export interface SummaryResponse {
  summary: ReviewsSummary | null;
  reviewsCount: number;
  cached: boolean;
  generatedAt: Date | null;
}

/**
 * Returns the AI summary of the reviews of a provider.
 * The result is cached and regenerated only when the number of reviews or the latest review changed.
 */
export async function getReviewsSummary(providerId: string): Promise<SummaryResponse> {
  const provider = await ProviderModel.findOne({ _id: providerId, isActive: true });
  if (!provider) throw notFound('Prestataire introuvable');

  const reviewsCount = await ReviewModel.countDocuments({ provider: provider._id });
  if (reviewsCount === 0) return { summary: null, reviewsCount: 0, cached: false, generatedAt: null };
  const latest = await ReviewModel.findOne({ provider: provider._id }).sort({ createdAt: -1 }).select('createdAt');

  const cache = await ReviewSummaryModel.findOne({ provider: provider._id });
  if (cache && cache.reviewsCount === reviewsCount && cache.lastReviewAt?.getTime() === latest?.createdAt.getTime()) {
    return { summary: cache.summary as ReviewsSummary, reviewsCount, cached: true, generatedAt: cache.updatedAt };
  }

  const reviews = await ReviewModel.find({ provider: provider._id }).sort({ createdAt: -1 }).limit(MAX_REVIEWS_FOR_SUMMARY);
  const summary = await runAiTask('reviews-summary', SUMMARY_SYSTEM_PROMPT, buildSummaryMessage(reviews), reviewsSummarySchema, {
    mock: () => mockSummary(reviews),
    temperature: 0.2,
  });

  const saved = await ReviewSummaryModel.findOneAndUpdate(
    { provider: provider._id },
    { summary, reviewsCount, lastReviewAt: latest?.createdAt },
    { upsert: true, new: true },
  );
  return { summary, reviewsCount, cached: false, generatedAt: saved.updatedAt };
}

async function findProProvider(proId: string) {
  const provider = await ProviderModel.findOne({ owner: proId });
  if (!provider) throw notFound('Aucun garage associé à ce compte');
  return provider;
}

/** Two reply suggestions for a review of the pro's garage. */
export async function suggestReplies(proId: string, reviewId: string): Promise<ReviewReplySuggestions> {
  const provider = await findProProvider(proId);
  const review = await ReviewModel.findOne({ _id: reviewId, provider: provider._id });
  if (!review) throw notFound('Avis introuvable');
  const client = await UserModel.findById(review.client).select('name');
  return runAiTask('reviews-reply', REPLY_SYSTEM_PROMPT, buildReplyMessage(provider.name, review), reviewReplySchema, {
    mock: () => mockReply(provider.name, review),
    // The client may have signed the comment with his name.
    knownNames: client ? [client.name] : [],
    temperature: 0.6,
  });
}

/** Reviews of the pro's garage. */
export async function listProReviews(proId: string) {
  const provider = await findProProvider(proId);
  return listProviderReviews(provider.id as string);
}

/** The pro publishes (or edits) his reply. */
export async function replyToReview(proId: string, reviewId: string, text: string) {
  const provider = await findProProvider(proId);
  const review = await ReviewModel.findOneAndUpdate(
    { _id: reviewId, provider: provider._id },
    { proReply: { text, repliedAt: new Date() } },
    { new: true },
  );
  if (!review) throw notFound('Avis introuvable');
  return { id: review.id as string, proReply: review.proReply };
}
