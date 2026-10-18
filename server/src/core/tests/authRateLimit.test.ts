import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../config.js';
import { closeTestDb, connectTestDb, createUser, testApp } from './helpers.js';

const app = testApp();

beforeAll(async () => {
  await connectTestDb();
  config.authRateLimitInTests = true;
});
afterAll(async () => {
  config.authRateLimitInTests = false;
  await closeTestDb();
});

describe('auth rate limit (brute-force protection)', () => {
  it('blocks the 11th failed login from the same IP with 429, without counting successful logins', async () => {
    const { user } = await createUser('client');
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password123!' })).status).toBe(200);
    }
    for (let i = 0; i < 10; i++) {
      expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'mauvais' })).status).toBe(401);
    }
    const blocked = await request(app).post('/api/auth/login').send({ email: user.email, password: 'Password123!' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});
