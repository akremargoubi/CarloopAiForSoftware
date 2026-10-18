import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { config } from '../../../core/config.js';
import { closeTestDb, connectTestDb, createUser, resetAiConfig, testApp } from '../../../core/tests/helpers.js';
import { todayInTunis } from '../service.js';

const app = testApp();
const vehicle = { marque: 'Peugeot', modele: '208', annee: 2019, kilometrage: 68000, carburant: 'essence', usage: 'urbain', plaque: '215 TU 4821', surnom: 'La voiture de Amel' };

let client: Awaited<ReturnType<typeof createUser>>;
let vehicleId: string;

beforeAll(async () => {
  await connectTestDb();
  client = await createUser('client', { name: 'Amel Zouari' });
});
afterAll(closeTestDb);
afterEach(() => {
  vi.unstubAllGlobals();
  resetAiConfig();
});

describe('vehicles and maintenance history', () => {
  it('creates a vehicle, records interventions and updates the mileage', async () => {
    const created = await request(app).post('/api/vehicles').set(client.auth).send(vehicle);
    expect(created.status).toBe(201);
    vehicleId = created.body.vehicle.id;

    const record = await request(app)
      .post(`/api/vehicles/${vehicleId}/records`)
      .set(client.auth)
      .send({ date: '2025-06-01', kilometrage: 70500, intervention: 'Vidange + filtre à huile', categorie: 'vidange', coutTnd: 140 });
    expect(record.status).toBe(201);

    const detail = await request(app).get(`/api/vehicles/${vehicleId}`).set(client.auth);
    expect(detail.body.vehicle.kilometrage).toBe(70500);
    expect(detail.body.records).toHaveLength(1);
    expect(detail.body.plan).toBeNull();
    expect((await request(app).get('/api/vehicles').set(client.auth)).body.vehicles).toHaveLength(1);
  });

  it('isolates vehicles between clients and refuses pros and anonymous users', async () => {
    const other = await createUser('client');
    expect((await request(app).get(`/api/vehicles/${vehicleId}`).set(other.auth)).status).toBe(404);
    expect((await request(app).post(`/api/ai/maintenance-plan/${vehicleId}`).set(other.auth)).status).toBe(404);
    expect((await request(app).get('/api/vehicles').set(other.auth)).body.vehicles).toHaveLength(0);
    const pro = await createUser('pro');
    expect((await request(app).get('/api/vehicles').set(pro.auth)).status).toBe(403);
    expect((await request(app).get('/api/vehicles')).status).toBe(401);
  });

  it('validates the input', async () => {
    expect((await request(app).post('/api/vehicles').set(client.auth).send({ ...vehicle, carburant: 'kerosene' })).status).toBe(400);
    expect((await request(app).get('/api/vehicles/not-an-id').set(client.auth)).status).toBe(400);
  });
});

describe('POST /api/ai/maintenance-plan/:vehicleId', () => {
  it('generates a plan in mock mode and keeps it on the vehicle', async () => {
    const res = await request(app).post(`/api/ai/maintenance-plan/${vehicleId}`).set(client.auth);
    expect(res.status).toBe(200);
    const items = res.body.plan.prochains_entretiens as { echeance_km: number; echeance_date: string }[];
    expect(items.length).toBeGreaterThan(0);
    const today = todayInTunis();
    for (const item of items) {
      expect(item.echeance_km).toBeGreaterThanOrEqual(70500);
      expect(item.echeance_date >= today).toBe(true);
    }
    const detail = await request(app).get(`/api/vehicles/${vehicleId}`).set(client.auth);
    expect(detail.body.plan).toEqual(res.body.plan);
    expect(detail.body.vehicle.lastPlanAt).not.toBeNull();
  });

  it('sends only technical data and rejects a deadline in the past', async () => {
    config.ai.apiKey = 'sk-test';
    const bad = {
      prochains_entretiens: [{ intervention: 'Vidange moteur', echeance_km: 50000, echeance_date: '2020-01-01', priorite: 'haute', categorie_service: 'vidange' }],
      conseils: [],
      resume: 'Plan généré pour ce véhicule de test.',
    };
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(bad) } }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await request(app).post(`/api/ai/maintenance-plan/${vehicleId}`).set(client.auth);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_INVALID_OUTPUT');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sent: string = JSON.parse(fetchMock.mock.calls[0][1].body).messages[1].content;
    expect(sent).toContain('Peugeot 208 (2019)');
    expect(sent).toContain('Vidange + filtre à huile');
    expect(sent).not.toContain('215 TU');
    expect(sent).not.toContain('Amel');
    expect(sent).not.toContain('140');
  });

  it('deletes a record, then the vehicle with its history', async () => {
    const detail = await request(app).get(`/api/vehicles/${vehicleId}`).set(client.auth);
    const recordId = detail.body.records[0].id;
    expect((await request(app).delete(`/api/vehicles/${vehicleId}/records/${recordId}`).set(client.auth)).status).toBe(204);
    expect((await request(app).delete(`/api/vehicles/${vehicleId}/records/${recordId}`).set(client.auth)).status).toBe(404);
    expect((await request(app).delete(`/api/vehicles/${vehicleId}`).set(client.auth)).status).toBe(204);
    expect((await request(app).get(`/api/vehicles/${vehicleId}`).set(client.auth)).status).toBe(404);
  });
});
