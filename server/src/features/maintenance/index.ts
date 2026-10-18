import type { FeatureModule } from '../../core/types/feature.js';
import { maintenanceRouter } from './routes.js';
import { seedMaintenance } from './seed.js';

/** Module 5 - Personalised maintenance plan + vehicles. */
const maintenanceFeature: FeatureModule = {
  name: 'maintenance',
  router: maintenanceRouter,
  seed: seedMaintenance,
};

export default maintenanceFeature;
