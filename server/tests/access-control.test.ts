import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { app, bearer, createUser, resetDatabase, type TestUser } from './helpers';

let owner: TestUser;
let otherPro: TestUser;
let client: TestUser;
let garageId: string;

const garage = {
  name: 'Garage El Amen',
  address: '12 rue de Marseille',
  city: 'Tunis',
  description: 'Garage multi-services au centre-ville.',
};

beforeAll(async () => {
  await resetDatabase();
  [owner, otherPro, client] = await Promise.all([createUser('PRO'), createUser('PRO'), createUser('CLIENT')]);
  const res = await request(app).post('/api/garages').set(...bearer(owner)).send(garage);
  garageId = (res.body as { id: string }).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Contrôle d’accès garages / services', () => {
  it('le PRO propriétaire peut modifier son garage', async () => {
    const res = await request(app)
      .patch(`/api/garages/${garageId}`)
      .set(...bearer(owner))
      .send({ city: 'Ariana' });

    expect(res.status).toBe(200);
    expect(res.body.city).toBe('Ariana');
  });

  it('un autre PRO ne peut pas modifier le garage (403)', async () => {
    const res = await request(app)
      .patch(`/api/garages/${garageId}`)
      .set(...bearer(otherPro))
      .send({ name: 'Garage piraté' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('un autre PRO ne peut pas ajouter de service dans ce garage (403)', async () => {
    const res = await request(app)
      .post('/api/services')
      .set(...bearer(otherPro))
      .send({
        garageId,
        category: 'VIDANGE',
        title: 'Vidange express',
        description: 'Vidange moteur avec filtre à huile.',
        price: 90,
        durationMinutes: 30,
      });

    expect(res.status).toBe(403);
  });

  it('un CLIENT ne peut pas créer de garage (403)', async () => {
    const res = await request(app).post('/api/garages').set(...bearer(client)).send(garage);
    expect(res.status).toBe(403);
  });

  it('un id mal formé est rejeté (400) et un garage inconnu renvoie 404', async () => {
    const invalid = await request(app).get('/api/garages/123');
    const unknown = await request(app).get('/api/garages/clxxxxxxxxxxxxxxxxxxxxxxx');

    expect(invalid.status).toBe(400);
    expect(unknown.status).toBe(404);
  });
});
