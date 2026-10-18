import { formatTnd } from '@/core/constants';
import type { QuoteEstimate } from '../api';

/** AI price estimation displayed before the booking is confirmed. */
export function EstimateCard({ estimate, compact = false }: { estimate: QuoteEstimate; compact?: boolean }) {
  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Estimation IA</p>
      <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
        {formatTnd(estimate.prix_min_tnd)} – {formatTnd(estimate.prix_max_tnd)}
      </p>
      <p className="text-slate-600">Main d’œuvre estimée : {estimate.main_oeuvre_heures} h</p>
      {!compact && (
        <>
          {estimate.pieces_probables.length > 0 && (
            <div className="mt-3">
              <p className="font-medium text-slate-800">Pièces probables</p>
              <ul className="mt-1 divide-y divide-primary-100">
                {estimate.pieces_probables.map((p) => (
                  <li key={p.piece} className="flex justify-between py-1">
                    <span className="text-slate-700">{p.piece}</span>
                    <span className="tabular-nums text-slate-900">~ {formatTnd(p.prix_estime_tnd)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {estimate.hypotheses.length > 0 && (
            <div className="mt-3">
              <p className="font-medium text-slate-800">Hypothèses</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
                {estimate.hypotheses.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <p className="mt-3 text-xs text-slate-500">{estimate.avertissement}</p>
    </div>
  );
}
