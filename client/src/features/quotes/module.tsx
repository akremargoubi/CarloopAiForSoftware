import { ButtonLink } from '@/core/components/Button';
import type { ClientFeature } from '@/core/types/feature';
import { BookingPage } from './pages/BookingPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { ProAgendaPage } from './pages/ProAgendaPage';

/** "Réserver" button injected in the provider page (slot "provider.actions"). */
function BookButton({ providerId }: { providerId: string }) {
  return (
    <ButtonLink to={`/reserver?prestataire=${providerId}`} size="lg">
      Réserver
    </ButtonLink>
  );
}

/** Module 3 - Quote estimation + bookings (front-end). */
const quotesModule: ClientFeature = {
  name: 'quotes',
  routes: [
    // Public: visitors can get an estimation, login is requested at confirmation.
    { path: 'reserver', element: <BookingPage /> },
    { path: 'mes-reservations', element: <MyBookingsPage />, roles: ['client'] },
    { path: 'pro/agenda', element: <ProAgendaPage />, roles: ['pro'] },
  ],
  navLinks: [
    { to: '/mes-reservations', label: 'Mes réservations', roles: ['client'] },
    { to: '/pro/agenda', label: 'Agenda', roles: ['pro'] },
  ],
  slots: { 'provider.actions': BookButton },
};

export default quotesModule;
