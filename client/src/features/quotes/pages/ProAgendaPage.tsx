import { useState } from 'react';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Select } from '@/core/components/Form';
import { Loader } from '@/core/components/Loader';
import { CATEGORY_LABELS, formatTnd } from '@/core/constants';
import { useProBookings, useUpdateBookingStatus, type Booking, type BookingStatus } from '../api';
import { EstimateCard } from '../components/EstimateCard';
import { QuoteForm } from '../components/QuoteForm';
import { StatusBadge } from '../components/StatusBadge';

const dayKey = (iso: string) => new Date(iso).toDateString();
const dayLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
const timeLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

function BookingRow({ booking }: { booking: Booking }) {
  const update = useUpdateBookingStatus();
  const [quoting, setQuoting] = useState(false);
  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">
            <span className="tabular-nums text-primary-700">{timeLabel(booking.scheduledAt)}</span> · {CATEGORY_LABELS[booking.category]} – {booking.serviceName}
          </p>
          <p className="text-sm text-slate-600">
            {booking.client?.name}
            {booking.client?.phone && ` · ${booking.client.phone}`} · {booking.vehicle.marque} {booking.vehicle.modele} {booking.vehicle.annee} ·{' '}
            {booking.vehicle.kilometrage?.toLocaleString('fr-FR')} km
          </p>
          {booking.description && <p className="mt-1 text-sm italic text-slate-500">« {booking.description} »</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} />
          {booking.status === 'pending' && (
            <>
              <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ id: booking.id, status: 'accepted' })}>
                Accepter
              </Button>
              <Button size="sm" variant="secondary" disabled={update.isPending} onClick={() => update.mutate({ id: booking.id, status: 'rejected' })}>
                Refuser
              </Button>
            </>
          )}
          {booking.status === 'accepted' && (
            <Button size="sm" loading={update.isPending} onClick={() => update.mutate({ id: booking.id, status: 'completed' })}>
              Terminer
            </Button>
          )}
          {['pending', 'accepted'].includes(booking.status) && !quoting && (
            <Button size="sm" variant="ghost" onClick={() => setQuoting(true)}>
              Envoyer un devis
            </Button>
          )}
        </div>
      </div>
      <ErrorMessage error={update.error} />
      {booking.aiEstimate && (
        <details>
          <summary className="cursor-pointer text-sm text-primary-600">
            Estimation IA du client : {formatTnd(booking.aiEstimate.prix_min_tnd)} – {formatTnd(booking.aiEstimate.prix_max_tnd)}
          </summary>
          <div className="mt-2">
            <EstimateCard estimate={booking.aiEstimate} />
          </div>
        </details>
      )}
      {booking.quotes.map((q) => (
        <p key={q.id} className="text-sm text-slate-600">
          Devis envoyé : <span className="font-medium">{formatTnd(q.totalTnd)}</span> (
          {q.status === 'sent' ? 'en attente' : q.status === 'accepted' ? 'accepté' : 'refusé'})
        </p>
      ))}
      {quoting && <QuoteForm booking={booking} onDone={() => setQuoting(false)} />}
    </li>
  );
}

/** Pro space: agenda of the bookings grouped by day. */
export function ProAgendaPage() {
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const { data, isLoading, error } = useProBookings(status);

  const groups = new Map<string, Booking[]>();
  for (const b of data?.bookings ?? []) {
    const key = dayKey(b.scheduledAt);
    groups.set(key, [...(groups.get(key) ?? []), b]);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Agenda des réservations"
        actions={
          <Select aria-label="Filtrer par statut" value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | '')} className="w-48">
            <option value="">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="accepted">Acceptées</option>
            <option value="completed">Terminées</option>
            <option value="rejected">Refusées</option>
            <option value="cancelled">Annulées</option>
          </Select>
        }
      />
      <ErrorMessage error={error} />
      {isLoading ? (
        <Loader />
      ) : groups.size === 0 ? (
        <EmptyState title="Aucune réservation" />
      ) : (
        [...groups.values()].map((bookings) => (
          <Card key={bookings[0].id}>
            <h2 className="font-semibold capitalize text-slate-900">{dayLabel(bookings[0].scheduledAt)}</h2>
            <ul className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <BookingRow key={b.id} booking={b} />
              ))}
            </ul>
          </Card>
        ))
      )}
    </div>
  );
}
