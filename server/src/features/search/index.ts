import type { FeatureModule } from '../../core/types/feature.js';
import { searchRouter } from './routes.js';

/** Module 2 - Smart search (natural language → filters → MongoDB → AI ranking). */
const searchFeature: FeatureModule = {
  name: 'search',
  router: searchRouter,
};

export default searchFeature;
