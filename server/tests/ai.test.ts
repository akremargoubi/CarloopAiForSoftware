import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { app, bearer, createUser, resetDatabase, type TestUser } from './helpers';

let client: TestUser;
let pro: TestUser;

beforeAll(async () => {
  await resetDatabase();
  [client, pro] = await Promise.all([createUser('CLIENT'), createUser('PRO')]);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/ai/diagnose (stub)', () => {
  const body = { symptom: 'Bruit métallique à l’avant quand je freine', vehicle: { brand: 'Peugeot', year: 2016 } };

  it('renvoie 501 pour un CLIENT avec une entrée valide', async () => {
    const res = await request(app).post('/api/ai/diagnose').set(...bearer(client)).send(body);

    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  it('valide l’entrée (400), exige l’authentification (401) et le rôle CLIENT (403)', async () => {
    const invalid = await request(app).post('/api/ai/diagnose').set(...bearer(client)).send({ symptom: 'court' });
    const anonymous = await request(app).post('/api/ai/diagnose').send(body);
    const asPro = await request(app).post('/api/ai/diagnose').set(...bearer(pro)).send(body);

    expect(invalid.status).toBe(400);
    expect(anonymous.status).toBe(401);
    expect(asPro.status).toBe(403);
  });
});
