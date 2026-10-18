import type { ClientFeature } from '@/core/types/feature';
import { VehiclePage } from './pages/VehiclePage';
import { VehiclesPage } from './pages/VehiclesPage';

/** Module 5 - Personalised maintenance plan + vehicles (front-end). */
const maintenanceModule: ClientFeature = {
  name: 'maintenance',
  routes: [
    { path: 'vehicules', element: <VehiclesPage />, roles: ['client'] },
    { path: 'vehicules/:id', element: <VehiclePage />, roles: ['client'] },
  ],
  navLinks: [{ to: '/vehicules', label: 'Mes véhicules', roles: ['client'] }],
};

export default maintenanceModule;
