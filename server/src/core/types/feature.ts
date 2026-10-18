import type { Router } from 'express';
import type { ProviderDoc } from '../models/Provider.js';
import type { UserDoc } from '../models/User.js';

/** Data created by the core seed and handed to each feature seed. */
export interface SeedContext {
  admin: UserDoc;
  clients: UserDoc[];
  pros: UserDoc[];
  providers: ProviderDoc[];
}

/**
 * Contract implemented by every feature folder (server/src/features/<name>/index.ts).
 * The router is mounted under /api; routes declare their full sub-path (e.g. /ai/search).
 */
export interface FeatureModule {
  name: string;
  router: Router;
  seed?: (ctx: SeedContext) => Promise<void>;
}
