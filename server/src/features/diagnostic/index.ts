import type { FeatureModule } from '../../core/types/feature.js';
import { diagnosticRouter } from './routes.js';

/** Module 1 - Diagnostic chatbot. */
const diagnosticFeature: FeatureModule = {
  name: 'diagnostic',
  router: diagnosticRouter,
};

export default diagnosticFeature;
