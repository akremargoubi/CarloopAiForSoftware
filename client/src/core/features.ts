import * as registry from '../features/routes';
import type { ClientFeature } from './types/feature';

/** Feature modules enabled in client/src/features/routes.tsx. */
export const features = Object.values(registry) as ClientFeature[];
