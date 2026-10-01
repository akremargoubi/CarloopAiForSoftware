import request from 'supertest';
import { prisma } from '../src/config/prisma';
import { app, resetDatabase } from './helpers';

const validUser = {
  email: 'Sana.Ben@Example.tn',
  password: 'MotDePasse123',
  firstName: 'Sana',
  lastName: 'Ben Ali',
  phone: '+216 20 123 456',
};

beforeAll(resetDatabase);
afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('crée un CLIENT, renvoie un token et jamais le hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'sana.ben@example.tn', role: 'CLIENT' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('$2b$');
  });

  it('refuse un email déjà utilisé (409)', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('refuse une entrée invalide (400) et l’auto-inscription ADMIN', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'pas-un-email', password: '123', role: 'ADMIN' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = (res.body.error.details as { path: string }[]).map((detail) => detail.path);
    expect(paths).toEqual(expect.arrayContaining(['email', 'password', 'role']));
  });
});

describe('POST /api/auth/login', () => {
  it('connecte avec les bons identifiants', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('refuse un mauvais mot de passe avec un message générique (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'mauvais-mdp' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Email ou mot de passe incorrect');
  });
});

describe('GET /api/auth/me', () => {
  it('renvoie le profil avec un token valide', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('sana.ben@example.tn');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('refuse une requête sans token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('refuse un token invalide (401) sans exposer de détail interne', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer abc.def.ghi');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: { code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' } });
  });
});
