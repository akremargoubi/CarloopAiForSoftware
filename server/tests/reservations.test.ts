import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { app, bearer, createUser, resetDatabase, type TestUser } from './helpers';

let pro: TestUser;
let otherPro: TestUser;
let client: TestUser;
let otherClient: TestUser;
let serviceId: string;

const tomorrow = (): string => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

/** Crée une réservation PENDING pour `client` et renvoie son id. */
async function book(by: TestUser): Promise<string> {
  const res = await request(app).post('/api/reservations').set(...bearer(by)).send({ serviceId, scheduledAt: tomorrow() });
  return (res.body as { id: string }).id;
}

beforeAll(async () => {
  await resetDatabase();
  [pro, otherPro, client, otherClient] = await Promise.all([
    createUser('PRO'),
    createUser('PRO'),
    createUser('CLIENT'),
    createUser('CLIENT'),
  ]);
  const garage = await request(app)
    .post('/api/garages')
    .set(...bearer(pro))
    .send({ name: 'Auto Sfax', address: 'Route de Tunis km 3', city: 'Sfax', description: 'Entretien toutes marques.' });
  const service = await request(app)
    .post('/api/services')
    .set(...bearer(pro))
    .send({
      garageId: garage.body.id,
      category: 'VIDANGE',
      title: 'Vidange complète',
      description: 'Huile moteur 5W30 et filtre à huile.',
      price: 120.5,
      durationMinutes: 45,
    });
  serviceId = service.body.id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Réservations', () => {
  it('un CLIENT réserve un service (201, PENDING)', async () => {
    const res = await request(app)
      .post('/api/reservations')
      .set(...bearer(client))
      .send({ serviceId, scheduledAt: tomorrow(), note: 'Avant 10h si possible' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'PENDING', service: { id: serviceId, price: 120.5 } });
  });

  it('refuse une date passée (400) et un PRO qui réserve (403)', async () => {
    const past = await request(app)
      .post('/api/reservations')
      .set(...bearer(client))
      .send({ serviceId, scheduledAt: '2020-01-01T10:00:00Z' });
    const asPro = await request(app).post('/api/reservations').set(...bearer(pro)).send({ serviceId, scheduledAt: tomorrow() });

    expect(past.status).toBe(400);
    expect(asPro.status).toBe(403);
  });

  it('un CLIENT ne voit que ses réservations, le PRO celles de ses garages', async () => {
    await book(otherClient);

    const mine = await request(app).get('/api/reservations/mine').set(...bearer(client));
    const proView = await request(app).get('/api/reservations/mine').set(...bearer(pro));
    const otherProView = await request(app).get('/api/reservations/mine').set(...bearer(otherPro));

    const clientIds = (mine.body.items as { client: { id: string } }[]).map((item) => item.client.id);
    expect(clientIds.length).toBeGreaterThan(0);
    expect(clientIds.every((id) => id === client.id)).toBe(true);
    expect(proView.body.items.length).toBeGreaterThanOrEqual(2);
    expect(otherProView.body.items).toHaveLength(0);
  });

  it('le PRO propriétaire confirme puis termine ; transition invalide → 409', async () => {
    const id = await book(client);
    const confirm = await request(app).patch(`/api/reservations/${id}/status`).set(...bearer(pro)).send({ status: 'CONFIRMED' });
    const done = await request(app).patch(`/api/reservations/${id}/status`).set(...bearer(pro)).send({ status: 'DONE' });
    const invalid = await request(app).patch(`/api/reservations/${id}/status`).set(...bearer(pro)).send({ status: 'PENDING' });

    expect(confirm.body.status).toBe('CONFIRMED');
    expect(done.body.status).toBe('DONE');
    expect(invalid.status).toBe(409);
  });

  it('un autre PRO ne peut pas changer le statut (403)', async () => {
    const id = await book(client);
    const res = await request(app).patch(`/api/reservations/${id}/status`).set(...bearer(otherPro)).send({ status: 'CONFIRMED' });
    expect(res.status).toBe(403);
  });

  it('le CLIENT peut annuler SA réservation PENDING, rien d’autre (403)', async () => {
    const id = await book(client);
    const confirmByClient = await request(app)
      .patch(`/api/reservations/${id}/status`)
      .set(...bearer(client))
      .send({ status: 'CONFIRMED' });
    const cancelByOther = await request(app)
      .patch(`/api/reservations/${id}/status`)
      .set(...bearer(otherClient))
      .send({ status: 'CANCELLED' });
    const cancel = await request(app).patch(`/api/reservations/${id}/status`).set(...bearer(client)).send({ status: 'CANCELLED' });
    const cancelAgain = await request(app)
      .patch(`/api/reservations/${id}/status`)
      .set(...bearer(client))
      .send({ status: 'CANCELLED' });

    expect(confirmByClient.status).toBe(403);
    expect(cancelByOther.status).toBe(403);
    expect(cancel.body.status).toBe('CANCELLED');
    expect(cancelAgain.status).toBe(403);
  });
});
