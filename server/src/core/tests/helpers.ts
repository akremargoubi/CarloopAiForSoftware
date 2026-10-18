import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { inject } from 'vitest';
import { createApp } from '../../app.js';
import { config } from '../config.js';
import type { Role } from '../constants.js';
import { signToken } from '../middlewares/auth.js';
import { ProviderModel } from '../models/Provider.js';
import { UserModel } from '../models/User.js';

/** Connects to a fresh, uniquely named database on the shared in-memory server. */
export async function connectTestDb(): Promise<void> {
  const base = inject('mongoUri');
  const dbName = `carloop-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  await mongoose.connect(`${base}${dbName}`);
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
}

/** Drops the test database and disconnects. */
export async function closeTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

/** Restores the default AI configuration of the test environment (demo mode). */
export function resetAiConfig(): void {
  config.ai.apiKey = '';
  config.ai.mock = true;
  config.ai.model = 'test/model';
  config.ai.timeoutMs = 15000;
}

export const testApp = () => createApp();

let counter = 0;

/** Creates a user of the given role and returns it with a valid JWT. */
export async function createUser(role: Role, overrides: { name?: string; proStatus?: 'pending' | 'approved' } = {}) {
  counter++;
  const user = await UserModel.create({
    name: overrides.name ?? `Test ${role} ${counter}`,
    email: `${role}${counter}-${Date.now()}@test.tn`,
    passwordHash: await bcrypt.hash('Password123!', 4),
    role,
    proStatus: role === 'pro' ? (overrides.proStatus ?? 'approved') : undefined,
  });
  return { user, token: signToken(user.id, role), auth: { Authorization: `Bearer ${signToken(user.id, role)}` } };
}

/** Creates an active provider, optionally owned by a pro user. */
export async function createProvider(overrides: Partial<{ name: string; city: string; owner: mongoose.Types.ObjectId; categories: string[]; price: number }> = {}) {
  const categories = overrides.categories ?? ['vidange'];
  return ProviderModel.create({
    name: overrides.name ?? `Garage test ${++counter}`,
    city: overrides.city ?? 'Ariana',
    owner: overrides.owner,
    categories,
    services: categories.map((category) => ({
      category,
      name: `Service ${category}`,
      priceTnd: overrides.price ?? 100,
      durationMin: 60,
    })),
    openingHours: [{ day: 6, open: '08:00', close: '13:00' }],
    isActive: true,
  });
}
