import { AiErrorDisplay } from '@/core/components/AiErrorDisplay';
import { Badge, Card, type BadgeTone } from '@/core/components/Card';
import { AiLoader, Loader } from '@/core/components/Loader';
import { formatDate } from '@/core/constants';
import { useProviderReviews, useReviewsSummary, type ReviewsSummary } from '../api';
import { Stars } from './Stars';

const SENTIMENT: Record<ReviewsSummary['sentiment_global'], { label: string; tone: BadgeTone }> = {
  positif: { label: 'Avis positifs', tone: 'green' },
  mitige: { label: 'Avis mitigés', tone: 'yellow' },
  negatif: { label: 'Avis négatifs', tone: 'red' },
};

/** "Ce qu'en disent les clients": AI summary + list of reviews (slot "provider.sections"). */
export function ReviewsBlock({ providerId }: { providerId: string }) {
  const summary = useReviewsSummary(providerId);
  const reviews = useProviderReviews(providerId);

  return (
    <Card className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900">Ce qu’en disent les clients</h2>

      {summary.isLoading && <AiLoader label="L’IA analyse les avis…" />}
      {summary.error && <AiErrorDisplay error={summary.error} onRetry={() => summary.refetch()} />}
      {summary.data?.summary && (
        <div className="rounded-xl bg-primary-50/70 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={SENTIMENT[summary.data.summary.sentiment_global].tone}>{SENTIMENT[summary.data.summary.sentiment_global].label}</Badge>
            <span className="text-xs text-slate-500">
              Synthèse IA de {summary.data.reviewsCount} avis · confiance {summary.data.summary.score_confiance} %
            </span>
          </div>
          <p className="mt-2 text-slate-800">{summary.data.summary.resume}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {summary.data.summary.points_forts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-700">Points forts</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {summary.data.summary.points_forts.map((p) => (
                    <li key={p}>+ {p}</li>
                  ))}
                </ul>
              </div>
            )}
            {summary.data.summary.points_faibles.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700">Points faibles</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-700">
                  {summary.data.summary.points_faibles.map((p) => (
                    <li key={p}>− {p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {reviews.isLoading ? (
        <Loader />
      ) : reviews.data?.reviews.length ? (
        <ul className="divide-y divide-slate-100">
          {reviews.data.reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Stars value={r.rating} size="text-sm" />
                  <span className="text-sm font-medium text-slate-800">{r.author}</span>
                </span>
                <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700">{r.comment}</p>
              {r.proReply && (
                <p className="mt-2 border-l-2 border-primary-300 pl-3 text-sm text-slate-600">
                  <span className="font-medium text-primary-700">Réponse du garage : </span>
                  {r.proReply.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">Aucun avis pour le moment.</p>
      )}
    </Card>
  );
}
