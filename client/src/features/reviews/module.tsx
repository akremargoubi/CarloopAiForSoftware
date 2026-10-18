import type { ClientFeature } from '@/core/types/feature';
import { ReviewsBlock } from './components/ReviewsBlock';
import { LeaveReviewPage } from './pages/LeaveReviewPage';
import { ProReviewsPage } from './pages/ProReviewsPage';

/** Module 4 - Reviews analysis (front-end). */
const reviewsModule: ClientFeature = {
  name: 'reviews',
  routes: [
    { path: 'avis', element: <LeaveReviewPage />, roles: ['client'] },
    { path: 'pro/avis', element: <ProReviewsPage />, roles: ['pro'] },
  ],
  navLinks: [
    { to: '/avis', label: 'Laisser un avis', roles: ['client'] },
    { to: '/pro/avis', label: 'Mes avis', roles: ['pro'] },
  ],
  slots: { 'provider.sections': ReviewsBlock },
};

export default reviewsModule;
