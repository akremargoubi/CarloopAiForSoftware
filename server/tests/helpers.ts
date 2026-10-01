import type { Role } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/app';
import { clearDatabase } from '../src/scripts/clear-database';
import { prisma } from '../src/config/prisma';
import { signToken } from '../src/services/token.service';

/** Application partagée par les tests. */
export const app = createApp();

/** Utilisateur de test et son token. */
export interface TestUser {
  id: string;
  email: string;
  token: string;
}

let counter = 0;

/** Vide toutes les tables de la base de test. */
export const resetDatabase = clearDatabase;

/**
 * Crée un utilisateur via l'API (CLIENT/PRO) ou directement en base (ADMIN).
 * @param role Rôle souhaité.
 */
export async function createUser(role: Role): Promise<TestUser> {
  counter += 1;
  const email = `${role.toLowerCase()}${counter}@test.carloop.tn`;
  if (role === 'ADMIN') {
    const admin = await prisma.user.create({
      data: { email, passwordHash: 'not-used', firstName: 'Admin', lastName: 'Test', role },
    });
    return { id: admin.id, email, token: signToken({ id: admin.id, role }) };
  }
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'Password123', firstName: 'Test', lastName: role, role });
  const body = res.body as { user: { id: string }; token: string };
  return { id: body.user.id, email, token: body.token };
}

/** Header d'authentification pour Supertest. */
export function bearer(user: TestUser): [string, string] {
  return ['Authorization', `Bearer ${user.token}`];
}
