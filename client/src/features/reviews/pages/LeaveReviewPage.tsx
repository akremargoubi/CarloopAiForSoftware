import { useState } from 'react';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Field, Textarea } from '@/core/components/Form';
import { Loader } from '@/core/components/Loader';
import { formatDate } from '@/core/constants';
import { useCreateReview, useReviewableBookings, type ReviewableBooking } from '../api';
import { Stars } from '../components/Stars';

function ReviewForm({ booking }: { booking: ReviewableBooking }) {
  const create = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-semibold text-slate-900">{booking.provider.name}</p>
        <p className="text-sm text-slate-500">
          {booking.serviceName} · {booking.provider.city}
          {booking.scheduledAt && ` · ${formatDate(booking.scheduledAt)}`}
        </p>
      </div>
      <Stars value={rating} onChange={setRating} size="text-2xl" />
      <Field label="Votre avis" htmlFor={`c-${booking.bookingId}`} hint="10 caractères minimum. Votre nom sera affiché sous la forme « Prénom N. ».">
        <Textarea id={`c-${booking.bookingId}`} rows={3} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </Field>
      <ErrorMessage error={create.error} />
      <Button
        disabled={comment.trim().length < 10}
        loading={create.isPending}
        onClick={() => create.mutate({ bookingId: booking.bookingId, rating, comment: comment.trim() })}
      >
        Publier mon avis
      </Button>
    </Card>
  );
}

/** Client space: leave a review for each completed booking. */
export function LeaveReviewPage() {
  const { data, isLoading, error } = useReviewableBookings();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Laisser un avis" subtitle="Un avis par prestation terminée." />
      <ErrorMessage error={error} />
      {isLoading ? (
        <Loader />
      ) : data?.bookings.length ? (
        data.bookings.map((b) => <ReviewForm key={b.bookingId} booking={b} />)
      ) : (
        <EmptyState title="Aucune prestation en attente d’avis" />
      )}
    </div>
  );
}
