import { Link } from 'react-router-dom';
import { CATEGORY_LABELS } from '@/core/constants';
import type { Diagnostic, Probability, Urgency } from '../api';

const URGENCY_STYLE: Record<Urgency, { label: string; className: string }> = {
  faible: { label: 'Urgence faible', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  moyenne: { label: 'Urgence moyenne', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  critique: { label: 'Urgence critique', className: 'bg-red-50 text-red-700 ring-red-200' },
};

const PROBABILITY: Record<Probability, { label: string; width: string }> = {
  faible: { label: 'Faible', width: 'w-1/3' },
  moyenne: { label: 'Moyenne', width: 'w-2/3' },
  elevee: { label: 'Élevée', width: 'w-full' },
};

/** Builds the link that opens the search module pre-filled with the recommended category. */
export function searchLinkFor(diagnostic: Diagnostic): string {
  const params = new URLSearchParams({
    q: `${CATEGORY_LABELS[diagnostic.service_recommande]} : ${diagnostic.causes_probables[0]?.cause ?? ''}`.slice(0, 200),
    categorie: diagnostic.service_recommande,
  });
  return `/recherche?${params.toString()}`;
}

/** Structured diagnosis rendered inside the chat. */
export function DiagnosticCard({ diagnostic, onNavigate }: { diagnostic: Diagnostic; onNavigate?: () => void }) {
  const urgency = URGENCY_STYLE[diagnostic.urgence];
  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-800">{diagnostic.reponse}</p>
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${urgency.className}`}>
        {urgency.label}
      </span>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Causes probables</p>
        <ul className="space-y-2">
          {diagnostic.causes_probables.map((c) => (
            <li key={c.cause}>
              <div className="flex justify-between gap-2">
                <span className="text-slate-700">{c.cause}</span>
                <span className="shrink-0 text-xs text-slate-500">{PROBABILITY[c.probabilite].label}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full bg-primary-500 ${PROBABILITY[c.probabilite].width}`} />
              </div>
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
        <span className="font-semibold">Sécurité : </span>
        {diagnostic.conseil_securite}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-slate-500">Service conseillé : {CATEGORY_LABELS[diagnostic.service_recommande]}</span>
        <Link
          to={searchLinkFor(diagnostic)}
          onClick={onNavigate}
          className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-600"
        >
          Trouver un prestataire
        </Link>
      </div>
    </div>
  );
}
