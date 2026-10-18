import { useSearchParams } from 'react-router-dom';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button, ButtonLink } from '@/core/components/Button';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Loader } from '@/core/components/Loader';
import { CATEGORY_LABELS, formatDateTime, formatTnd } from '@/core/constants';
import { useDecideQuote, useMyBookings, useUpdateBookingStatus } from '../api';
import { EstimateCard } from '../components/EstimateCard';
import { StatusBadge } from '../components/StatusBadge';

/** Client space: follow-up of the bookings, quotes received, cancellation. */
export function MyBookingsPage() {
  const [params] = useSearchParams();
  const { data, isLoading, error } = useMyBookings();
  const updateStatus = useUpdateBookingStatus();
  const decide = useDecideQuote();

  return (
    <div className="space-y-5">
      <PageHeader title="Mes réservations" actions={<ButtonLink to="/reserver">Nouvelle réservation</ButtonLink>} />
      {params.get('nouvelle') && (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Votre demande a été envoyée. Le professionnel va la confirmer.
        </p>
      )}
      <ErrorMessage error={error || updateStatus.error || decide.error} />
      {isLoading ? (
        <Loader />
      ) : !data?.bookings.length ? (
        <EmptyState title="Aucune réservation pour le moment" />
      ) : (
        data.bookings.map((b) => (
          <Card key={b.id} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-slate-900">
                  {CATEGORY_LABELS[b.category]} – {b.serviceName}
                </p>
                <p className="text-sm text-slate-600">
                  {b.provider?.name} ({b.provider?.city}) · {formatDateTime(b.scheduledAt)}
                </p>
                <p className="text-sm text-slate-500">
                  {b.vehicle.marque} {b.vehicle.modele} {b.vehicle.annee} · prix catalogue {formatTnd(b.catalogPriceTnd)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} />
                {['pending', 'accepted'].includes(b.status) && (
                  <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: b.id, status: 'cancelled' })}>
                    Annuler
                  </Button>
                )}
              </div>
            </div>
            {b.proNote && <p className="text-sm text-slate-600">Note du professionnel : {b.proNote}</p>}
            {b.aiEstimate && (
              <details>
                <summary className="cursor-pointer text-sm font-medium text-primary-600">Estimation IA jointe à la demande</summary>
                <div className="mt-2">
                  <EstimateCard estimate={b.aiEstimate} compact />
                </div>
              </details>
            )}
            {b.quotes.map((q) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">Devis du professionnel : {formatTnd(q.totalTnd)}</p>
                  <span className="text-xs text-slate-500">
                    {q.status === 'sent' ? 'En attente de votre réponse' : q.status === 'accepted' ? 'Accepté' : 'Refusé'}
                  </span>
                </div>
                <ul className="mt-1 text-slate-600">
                  {q.items.map((i) => (
                    <li key={i.label} className="flex justify-between">
                      <span>{i.label}</span>
                      <span className="tabular-nums">{formatTnd(i.amountTnd)}</span>
                    </li>
                  ))}
                </ul>
                {q.message && <p className="mt-1 italic text-slate-500">« {q.message} »</p>}
                {q.status === 'sent' && (
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => decide.mutate({ id: q.id, decision: 'accepted' })}>
                      Accepter
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => decide.mutate({ id: q.id, decision: 'declined' })}>
                      Refuser
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        ))
      )}
    </div>
  );
}
