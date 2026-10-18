import type { FeatureModule } from '../../core/types/feature.js';
import { quotesRouter } from './routes.js';
import { seedQuotes } from './seed.js';

/** Module 3 - Quote estimation + bookings. */
const quotesFeature: FeatureModule = {
  name: 'quotes',
  router: quotesRouter,
  seed: seedQuotes,
};

export default quotesFeature;
