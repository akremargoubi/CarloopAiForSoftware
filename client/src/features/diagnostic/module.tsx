import type { ClientFeature } from '@/core/types/feature';
import { ChatWidget } from './components/ChatWidget';

/** Module 1 - Diagnostic chatbot (floating widget on every page). */
const diagnosticModule: ClientFeature = {
  name: 'diagnostic',
  globalWidgets: [ChatWidget],
};

export default diagnosticModule;
