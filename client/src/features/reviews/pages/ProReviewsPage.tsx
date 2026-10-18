import { useState } from 'react';
import { AiErrorDisplay, ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Button } from '@/core/components/Button';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { Textarea } from '@/core/components/Form';
import { AiLoader, Loader } from '@/core/components/Loader';
import { formatDate } from '@/core/constants';
import { useProReviews, useSaveReply, useSuggestReplies, type Review } from '../api';
import { Stars } from '../components/Stars';

function ReviewItem({ review }: { review: Review }) {
  const suggest = useSuggestReplies();
  const save = useSaveReply();
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <li className="space-y-3 py-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Stars value={review.rating} />
          <span className="font-medium text-slate-800">{review.author}</span>
          {review.serviceName && <span className="text-sm text-slate-500">· {review.serviceName}</span>}
        </span>
        <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
      </div>
      <p className="text-slate-700">{review.comment}</p>

      {review.proReply && draft === null && (
        <div className="border-l-2 border-primary-300 pl-3 text-sm text-slate-600">
          <span className="font-medium text-primary-700">Votre réponse : </span>
          {review.proReply.text}
          <button type="button" className="ml-2 text-primary-600 hover:underline" onClick={() => setDraft(review.proReply?.text ?? '')}>
            Modifier
          </button>
        </div>
      )}

      {draft === null && !review.proReply && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={suggest.isPending} onClick={() => suggest.mutate(review.id)}>
            Suggérer une réponse
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDraft('')}>
            Répondre moi-même
          </Button>
        </div>
      )}

      {suggest.isPending && <AiLoader label="Rédaction de propositions…" />}
      {suggest.error && <AiErrorDisplay error={suggest.error} onRetry={() => suggest.mutate(review.id)} />}
      {suggest.data && draft === null && (
        <div className="grid gap-3 md:grid-cols-2">
          {suggest.data.propositions.map((p) => (
            <div key={p.ton} className="flex flex-col rounded-lg border border-primary-200 bg-primary-50/50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Ton {p.ton}</p>
              <p className="mt-1 flex-1 text-slate-700">{p.texte}</p>
              <Button size="sm" className="mt-3 self-start" onClick={() => setDraft(p.texte)}>
                Utiliser cette réponse
              </Button>
            </div>
          ))}
        </div>
      )}

      {draft !== null && (
        <div className="space-y-2">
          <Textarea rows={4} value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} aria-label="Votre réponse" />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={draft.trim().length < 5}
              loading={save.isPending}
              onClick={() => save.mutate({ id: review.id, text: draft.trim() }, { onSuccess: () => setDraft(null) })}
            >
              Publier la réponse
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              Annuler
            </Button>
          </div>
          <ErrorMessage error={save.error} />
        </div>
      )}
    </li>
  );
}

/** Pro space: reviews of the garage with AI reply suggestions. */
export function ProReviewsPage() {
  const { data, isLoading, error } = useProReviews();
  const reviews = data?.reviews ?? [];
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Mes avis"
        subtitle={reviews.length ? `${reviews.length} avis · moyenne ${avg.toFixed(1)}/5 · ${reviews.filter((r) => !r.proReply).length} sans réponse` : undefined}
      />
      <ErrorMessage error={error} />
      {isLoading ? (
        <Loader />
      ) : reviews.length === 0 ? (
        <EmptyState title="Aucun avis pour le moment" />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <ReviewItem key={r.id} review={r} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
