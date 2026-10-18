import mongoose, { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AiLogModel } from '../../../ai/AiLog.model.js';
import { config } from '../../../core/config.js';
import { ProviderModel, type ProviderDoc } from '../../../core/models/Provider.js';
import { closeTestDb, connectTestDb, createProvider, createUser, resetAiConfig, testApp } from '../../../core/tests/helpers.js';

const app = testApp();
let provider: ProviderDoc;
let pro: Awaited<ReturnType<typeof createUser>>;
let client: Awaited<ReturnType<typeof createUser>>;

/** Inserts a booking directly in the shared collection (owned by the quotes module). */
async function insertBooking(status: string, clientId = client.user._id) {
  const _id = new Types.ObjectId();
  await mongoose.connection.collection('bookings').insertOne({ _id, client: clientId, provider: provider._id, status, serviceName: 'Vidange', scheduledAt: new Date() });
  return String(_id);
}

beforeAll(async () => {
  await connectTestDb();
  pro = await createUser('pro');
  client = await createUser('client', { name: 'Amel Zouari' });
  provider = await createProvider({ owner: pro.user._id, name: 'Garage Avis' });
});
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('reviews business rules', () => {
  it('lets a client review a completed booking once and updates the provider rating', async () => {
    const bookingId = await insertBooking('completed');
    const reviewable = await request(app).get('/api/reviews/reviewable').set(client.auth);
    expect(reviewable.body.bookings.map((b: { bookingId: string }) => b.bookingId)).toContain(bookingId);

    const res = await request(app).post('/api/reviews').set(client.auth).send({ bookingId, rating: 4, comment: 'Accueil aimable, travail rapide.' });
    expect(res.status).toBe(201);
    expect((await request(app).post('/api/reviews').set(client.auth).send({ bookingId, rating: 5, comment: 'Encore un avis' })).status).toBe(409);

    const updated = await ProviderModel.findById(provider._id);
    expect(updated).toMatchObject({ ratingAvg: 4, ratingCount: 1 });

    const list = await request(app).get(`/api/reviews/provider/${provider.id}`);
    expect(list.body.reviews[0]).toMatchObject({ author: 'Amel Z.', rating: 4 });
  });

  it('refuses reviews for bookings that are not completed or belong to someone else', async () => {
    const pending = await insertBooking('accepted');
    expect((await request(app).post('/api/reviews').set(client.auth).send({ bookingId: pending, rating: 4, comment: 'Trop tôt pour juger' })).status).toBe(400);
    const other = await createUser('client');
    const foreign = await insertBooking('completed', other.user._id);
    expect((await request(app).post('/api/reviews').set(client.auth).send({ bookingId: foreign, rating: 4, comment: 'Pas ma réservation' })).status).toBe(404);
  });
});

describe('POST /api/ai/reviews-summary/:providerId', () => {
  it('generates the summary, caches it, and regenerates it when a new review arrives', async () => {
    const first = await request(app).post(`/api/ai/reviews-summary/${provider.id}`);
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ cached: false, reviewsCount: 1, summary: { sentiment_global: 'positif' } });

    const second = await request(app).post(`/api/ai/reviews-summary/${provider.id}`);
    expect(second.body.cached).toBe(true);
    expect(await AiLogModel.countDocuments({ module: 'reviews-summary' })).toBe(1);

    const bookingId = await insertBooking('completed');
    await request(app).post('/api/reviews').set(client.auth).send({ bookingId, rating: 1, comment: 'Attente interminable et facture plus élevée que prévu.' });
    const third = await request(app).post(`/api/ai/reviews-summary/${provider.id}`);
    expect(third.body).toMatchObject({ cached: false, reviewsCount: 2 });
    expect(third.body.summary.points_faibles.length).toBeGreaterThan(0);
  });

  it('returns a null summary for a provider without reviews and 404 for an unknown provider', async () => {
    const empty = await createProvider({ name: 'Sans avis' });
    expect((await request(app).post(`/api/ai/reviews-summary/${empty.id}`)).body).toMatchObject({ summary: null, reviewsCount: 0 });
    expect((await request(app).post('/api/ai/reviews-summary/65f000000000000000000000')).status).toBe(404);
  });
});

describe('POST /api/ai/review-reply', () => {
  it('suggests 2 replies to the pro and lets him publish one', async () => {
    const reviews = await request(app).get('/api/reviews/pro').set(pro.auth);
    const reviewId = reviews.body.reviews[0].id;
    const res = await request(app).post('/api/ai/review-reply').set(pro.auth).send({ reviewId });
    expect(res.status).toBe(200);
    expect(res.body.propositions).toHaveLength(2);

    const saved = await request(app).put(`/api/reviews/${reviewId}/reply`).set(pro.auth).send({ text: res.body.propositions[0].texte });
    expect(saved.status).toBe(200);
    const list = await request(app).get(`/api/reviews/provider/${provider.id}`);
    expect(list.body.reviews.find((r: { id: string }) => r.id === reviewId).proReply.text).toBe(res.body.propositions[0].texte);
  });

  it('refuses another pro and clients', async () => {
    const reviews = await request(app).get('/api/reviews/pro').set(pro.auth);
    const reviewId = reviews.body.reviews[0].id;
    const otherPro = await createUser('pro');
    await createProvider({ owner: otherPro.user._id });
    expect((await request(app).post('/api/ai/review-reply').set(otherPro.auth).send({ reviewId })).status).toBe(404);
    expect((await request(app).post('/api/ai/review-reply').set(client.auth).send({ reviewId })).status).toBe(403);
  });

  it('masks the client name and rejects an answer with a single proposition', async () => {
    config.ai.apiKey = 'sk-test';
    const reviews = await request(app).get('/api/reviews/pro').set(pro.auth);
    const reviewId = reviews.body.reviews[0].id;
    await mongoose.connection.collection('reviews').updateOne({ _id: new Types.ObjectId(reviewId) }, { $set: { comment: 'Signé Amel Zouari, 22 333 444' } });
    const one = { propositions: [{ ton: 'formel', texte: 'Merci pour votre avis, nous restons disponibles.' }] };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(one) } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/ai/review-reply').set(pro.auth).send({ reviewId });
    expect(res.status).toBe(502);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('Signé [NOM], [TELEPHONE]');
  });
});
