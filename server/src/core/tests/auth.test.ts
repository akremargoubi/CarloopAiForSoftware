import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProviderModel } from '../models/Provider.js';
import { closeTestDb, connectTestDb, createProvider, createUser, testApp } from './helpers.js';

const app = testApp();

beforeAll(connectTestDb);
afterAll(closeTestDb);

describe('auth', () => {
  it('registers a client, logs in and returns /me without the password hash', async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Leila Test', email: 'leila@test.tn', password: 'Secret123!' });
    expect(reg.status).toBe(201);
    expect(reg.body.token).toBeTypeOf('string');
    expect(reg.body.user.role).toBe('client');
    expect(reg.body.user.passwordHash).toBeUndefined();

    const login = await request(app).post('/api/auth/login').send({ email: 'LEILA@test.tn', password: 'Secret123!' });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('leila@test.tn');
  });

  it('rejects a duplicate email with 409 and a wrong password with 401', async () => {
    const body = { name: 'Dup', email: 'dup@test.tn', password: 'Secret123!' };
    await request(app).post('/api/auth/register').send(body);
    expect((await request(app).post('/api/auth/register').send(body)).status).toBe(409);
    const bad = await request(app).post('/api/auth/login').send({ email: 'dup@test.tn', password: 'nope' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');
  });

  it('validates the input with Zod (400)', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'x', email: 'bad', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates a pending pro with an inactive provider', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Pro Test',
      email: 'pro@test.tn',
      password: 'Secret123!',
      role: 'pro',
      businessName: 'Garage Test',
      city: 'Sfax',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.proStatus).toBe('pending');
    const provider = await ProviderModel.findOne({ name: 'Garage Test' });
    expect(provider?.isActive).toBe(false);
  });

  it('rejects requests without a valid token', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid')).status).toBe(401);
  });
});

describe('admin and roles', () => {
  it('forbids non-admin users and lets an admin validate a pro', async () => {
    const client = await createUser('client');
    expect((await request(app).get('/api/admin/stats').set(client.auth)).status).toBe(403);

    const admin = await createUser('admin');
    const pro = await createUser('pro', { proStatus: 'pending' });
    await createProvider({ owner: pro.user._id });
    await ProviderModel.updateMany({ owner: pro.user._id }, { isActive: false });

    const pending = await request(app).get('/api/admin/pros?status=pending').set(admin.auth);
    expect(pending.status).toBe(200);
    expect(pending.body.pros.some((p: { id: string }) => p.id === pro.user.id)).toBe(true);

    const decision = await request(app).patch(`/api/admin/pros/${pro.user.id}`).set(admin.auth).send({ approved: true });
    expect(decision.status).toBe(200);
    expect(decision.body.user.proStatus).toBe('approved');
    expect((await ProviderModel.findOne({ owner: pro.user._id }))?.isActive).toBe(true);

    const stats = await request(app).get('/api/admin/stats').set(admin.auth);
    expect(stats.status).toBe(200);
    expect(stats.body.users.admin).toBeGreaterThanOrEqual(1);
    expect(stats.body.bookings.total).toBe(0);
  });
});

describe('providers', () => {
  it('lists active providers with filters and returns 404 for unknown ids', async () => {
    await createProvider({ name: 'Clim Sousse', city: 'Sousse', categories: ['climatisation'] });
    const res = await request(app).get('/api/providers?categorie=climatisation&ville=Sousse');
    expect(res.status).toBe(200);
    expect(res.body.providers.map((p: { name: string }) => p.name)).toContain('Clim Sousse');
    expect((await request(app).get('/api/providers/65f000000000000000000000')).status).toBe(404);
    expect((await request(app).get('/api/providers/not-an-id')).status).toBe(400);
  });

  it('exposes the health endpoint with the AI mode', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body.ai).toEqual({ configured: false, mock: true });
  });
});
