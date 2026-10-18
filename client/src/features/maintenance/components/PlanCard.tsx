import { Link } from 'react-router-dom';
import { Badge, type BadgeTone } from '@/core/components/Card';
import { CATEGORY_ICONS, CATEGORY_LABELS, formatDate } from '@/core/constants';
import type { MaintenancePlan, Priority } from '../api';

const PRIORITY: Record<Priority, { label: string; tone: BadgeTone }> = {
  haute: { label: 'Priorité haute', tone: 'red' },
  moyenne: { label: 'Priorité moyenne', tone: 'yellow' },
  faible: { label: 'Priorité faible', tone: 'gray' },
};

const formatKm = (km: number) => `${new Intl.NumberFormat('fr-FR').format(km)} km`;

/** AI maintenance plan: upcoming interventions (with a booking shortcut), advice and summary. */
export function PlanCard({ plan, vehicleId, generatedAt }: { plan: MaintenancePlan; vehicleId: string; generatedAt?: string | null }) {
  return (
    <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/60 p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Plan d’entretien IA</p>
        {generatedAt && <p className="text-xs text-slate-500">Généré le {formatDate(generatedAt)}</p>}
      </div>
      <p className="text-slate-700">{plan.resume}</p>

      <ol className="space-y-2">
        {plan.prochains_entretiens.map((item) => {
          const params = new URLSearchParams({ categorie: item.categorie_service, vehicule: vehicleId, description: item.intervention });
          return (
            <li
              key={`${item.intervention}-${item.echeance_date}`}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-slate-900">
                  <span aria-hidden>{CATEGORY_ICONS[item.categorie_service]} </span>
                  {item.intervention}
                </p>
                <p className="text-slate-600">
                  Avant le {formatDate(item.echeance_date)} ou à {formatKm(item.echeance_km)} · {CATEGORY_LABELS[item.categorie_service]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={PRIORITY[item.priorite].tone}>{PRIORITY[item.priorite].label}</Badge>
                <Link to={`/reserver?${params.toString()}`} className="whitespace-nowrap font-medium text-primary-600 hover:underline">
                  Réserver →
                </Link>
              </div>
            </li>
          );
        })}
      </ol>

      {plan.conseils.length > 0 && (
        <div>
          <p className="font-medium text-slate-800">Conseils</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-600">
            {plan.conseils.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">Plan indicatif : suivez aussi le carnet d’entretien du constructeur et l’avis de votre garagiste.</p>
    </div>
  );
}
