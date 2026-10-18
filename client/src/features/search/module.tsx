import type { ClientFeature } from '@/core/types/feature';
import { SearchBar } from './components/SearchBar';
import { ProviderPage } from './pages/ProviderPage';
import { ResultsPage } from './pages/ResultsPage';

/** Module 2 - Smart search (front-end). */
const searchModule: ClientFeature = {
  name: 'search',
  routes: [
    { path: 'recherche', element: <ResultsPage /> },
    { path: 'prestataires/:id', element: <ProviderPage /> },
  ],
  navLinks: [{ to: '/recherche', label: 'Rechercher' }],
  slots: { 'home.hero': () => <SearchBar /> },
};

export default searchModule;
