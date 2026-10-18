import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../../../core/config.js';
import type { ProviderDoc } from '../../../core/models/Provider.js';
import { closeTestDb, connectTestDb, createProvider, createUser, resetAiConfig, testApp } from '../../../core/tests/helpers.js';

const app = testApp();
const vehicule = { marque: 'Renault', modele: 'Clio', annee: 2015, kilometrage: 120000, carburant: 'diesel' };

/** Next Saturday at the given hour, Tunis time (test providers open on Saturday 08:00-13:00). */
function nextSaturdayAt(hour: number, weeksAhead = 1): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + ((6 - d.getUTCDay() + 7) % 7 || 7) + (weeksAhead - 1) * 7);
  d.setUTCHours(hour - 1, 0, 0, 0);
  return d;
}

let provider: ProviderDoc;
let pro: Awaited<ReturnType<typeof createUser>>;
let client: Awaited<ReturnType<typeof createUser>>;

beforeAll(async () => {
  await connectTestDb();
  pro = await createUser('pro');
  client = await createUser('client');
  provider = await createProvider({ owner: pro.user._id, categories: ['vidange'], price: 100 });
});
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('POST /api/ai/quote-estimate', () => {
  it('returns a validated estimation in mock mode, using the provider catalogue price', async () => {
    const res = await request(app)
      .post('/api/ai/quote-estimate')
      .send({ vehicule, categorie: 'vidange', description: 'vidange + filtres', providerId: provider.id });
    expect(res.status).toBe(200);
    expect(res.body.estimation.prix_min_tnd).toBe(90);
    expect(res.body.estimation.prix_max_tnd).toBe(130);
  });

  it('rejects an LLM answer where prix_min > prix_max (after one corrective retry)', async () => {
    config.ai.apiKey = 'sk-test';
    const bad = { prix_min_tnd: 300, prix_max_tnd: 100, pieces_probables: [], main_oeuvre_heures: 1, hypotheses: [], avertissement: 'Indicatif.' };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(bad) } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post('/api/ai/quote-estimate').send({ vehicule, categorie: 'vidange' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Only vehicle data is sent, never the user identity.
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('Renault Clio, 2015, 120000 km, diesel');
  });

  it('returns 400 on invalid input', async () => {
    expect((await request(app).post('/api/ai/quote-estimate').send({ vehicule: {}, categorie: 'vidange' })).status).toBe(400);
  });
});

describe('booking workflow', () => {
  it('runs the full flow: slots → booking with estimate → accept → quote → complete', async () => {
    const date = nextSaturdayAt(9).toISOString().slice(0, 10);
    const slots = await request(app).get(`/api/bookings/slots?providerId=${provider.id}&date=${date}`);
    expect(slots.status).toBe(200);
    expect(slots.body.slots).toHaveLength(5); // 08:00 → 12:00

    const estimation = (await request(app).post('/api/ai/quote-estimate').send({ vehicule, categorie: 'vidange' })).body.estimation;
    const serviceId = provider.services[0].id;
    const created = await request(app)
      .post('/api/bookings')
      .set(client.auth)
      .send({ providerId: provider.id, serviceId, scheduledAt: slots.body.slots[1], vehicule, description: 'Bruit', estimation });
    expect(created.status).toBe(201);
    const bookingId = created.body.booking.id;

    // Same slot again → 409, and the slot disappears from the list.
    const clash = await request(app).post('/api/bookings').set(client.auth).send({ providerId: provider.id, serviceId, scheduledAt: slots.body.slots[1], vehicule });
    expect(clash.status).toBe(409);
    const after = await request(app).get(`/api/bookings/slots?providerId=${provider.id}&date=${date}`);
    expect(after.body.slots).toHaveLength(4);

    const agenda = await request(app).get('/api/bookings/pro').set(pro.auth);
    expect(agenda.body.bookings[0]).toMatchObject({ id: bookingId, status: 'pending', aiEstimate: { prix_min_tnd: estimation.prix_min_tnd } });

    // The pro cannot complete a pending booking.
    expect((await request(app).patch(`/api/bookings/${bookingId}/status`).set(pro.auth).send({ status: 'completed' })).status).toBe(400);
    expect((await request(app).patch(`/api/bookings/${bookingId}/status`).set(pro.auth).send({ status: 'accepted' })).body.booking.status).toBe('accepted');

    const quoted = await request(app)
      .post(`/api/bookings/${bookingId}/quotes`)
      .set(pro.auth)
      .send({ items: [{ label: 'Vidange', amountTnd: 100 }, { label: 'Filtre', amountTnd: 25.5 }], message: 'OK' });
    expect(quoted.status).toBe(201);
    expect(quoted.body.booking.quotes[0]).toMatchObject({ totalTnd: 125.5, status: 'sent' });

    const quoteId = quoted.body.booking.quotes[0].id;
    const decided = await request(app).patch(`/api/quotes/${quoteId}`).set(client.auth).send({ decision: 'accepted' });
    expect(decided.body.booking.quotes[0].status).toBe('accepted');

    expect((await request(app).patch(`/api/bookings/${bookingId}/status`).set(pro.auth).send({ status: 'completed' })).body.booking.status).toBe('completed');
    const mine = await request(app).get('/api/bookings/mine').set(client.auth);
    expect(mine.body.bookings[0].status).toBe('completed');
  });

  it('rejects slots outside opening hours or in the past', async () => {
    const serviceId = provider.services[0].id;
    const sundayish = nextSaturdayAt(9);
    sundayish.setUTCDate(sundayish.getUTCDate() + 1);
    expect((await request(app).post('/api/bookings').set(client.auth).send({ providerId: provider.id, serviceId, scheduledAt: sundayish, vehicule })).status).toBe(400);
    expect((await request(app).post('/api/bookings').set(client.auth).send({ providerId: provider.id, serviceId, scheduledAt: nextSaturdayAt(18), vehicule })).status).toBe(400);
    expect((await request(app).post('/api/bookings').set(client.auth).send({ providerId: provider.id, serviceId, scheduledAt: '2020-01-04T08:00:00Z', vehicule })).status).toBe(400);
  });

  it('enforces roles and ownership', async () => {
    const otherClient = await createUser('client');
    const otherPro = await createUser('pro');
    await createProvider({ owner: otherPro.user._id });
    const serviceId = provider.services[0].id;
    const created = await request(app)
      .post('/api/bookings')
      .set(client.auth)
      .send({ providerId: provider.id, serviceId, scheduledAt: nextSaturdayAt(10, 2), vehicule });
    const id = created.body.booking.id;

    expect((await request(app).post('/api/bookings').set(pro.auth).send({})).status).toBe(403);
    expect((await request(app).patch(`/api/bookings/${id}/status`).set(otherClient.auth).send({ status: 'cancelled' })).status).toBe(404);
    expect((await request(app).patch(`/api/bookings/${id}/status`).set(otherPro.auth).send({ status: 'accepted' })).status).toBe(404);
    expect((await request(app).patch(`/api/bookings/${id}/status`).set(client.auth).send({ status: 'accepted' })).status).toBe(403);
    expect((await request(app).patch(`/api/bookings/${id}/status`).set(client.auth).send({ status: 'cancelled' })).body.booking.status).toBe('cancelled');

    const pending = await createUser('pro', { proStatus: 'pending' });
    expect((await request(app).get('/api/bookings/pro').set(pending.auth)).status).toBe(403);
  });
});
