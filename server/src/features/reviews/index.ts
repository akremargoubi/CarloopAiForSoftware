import type { FeatureModule } from '../../core/types/feature.js';
import { reviewsRouter } from './routes.js';
import { seedReviews } from './seed.js';

/** Module 4 - Reviews analysis. */
const reviewsFeature: FeatureModule = {
  name: 'reviews',
  router: reviewsRouter,
  seed: seedReviews,
};

export default reviewsFeature;
