import { useParams } from 'react-router-dom';
import { ErrorMessage } from '@/core/components/AiErrorDisplay';
import { Badge, Card } from '@/core/components/Card';
import { Loader } from '@/core/components/Loader';
import { CATEGORY_ICONS, CATEGORY_LABELS, DAY_LABELS, formatTnd } from '@/core/constants';
import { Slot } from '@/core/slots/Slot';
import { useProvider } from '../api';

/** Provider page: services, prices, opening hours + slots filled by other modules. */
export function ProviderPage() {
  const { id } = useParams();
  const { data, isLoading, error } = useProvider(id);

  if (isLoading) return <Loader />;
  if (error || !data) return <ErrorMessage error={error ?? new Error('Prestataire introuvable')} />;
  const p = data.provider;
  const byCategory = p.categories.map((c) => ({ category: c, services: p.services.filter((s) => s.category === c) }));
  const today = new Date().getDay();

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{p.name}</h1>
            <p className="mt-1 text-slate-600">
              {p.address ? `${p.address} · ` : ''}
              {p.city}
            </p>
            <p className="mt-1 text-amber-600">
              ★ {p.ratingAvg.toFixed(1)} <span className="text-sm text-slate-500">({p.ratingCount} avis)</span>
            </p>
            {p.description && <p className="mt-3 max-w-2xl text-slate-700">{p.description}</p>}
            <div className="mt-3 flex flex-wrap gap-1">
              {p.categories.map((c) => (
                <Badge key={c}>{CATEGORY_LABELS[c]}</Badge>
              ))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Slot name="provider.actions" props={{ providerId: p.id }} />
            {p.phone && (
              <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-center text-sm font-medium text-primary-600 hover:underline">
                Appeler : {p.phone}
              </a>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Services et tarifs</h2>
          <div className="mt-4 space-y-5">
            {byCategory.map(({ category, services }) => (
              <div key={category}>
                <h3 className="flex items-center gap-2 font-medium text-slate-800">
                  <span aria-hidden>{CATEGORY_ICONS[category]}</span> {CATEGORY_LABELS[category]}
                </h3>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {services.map((s) => (
                    <li key={s.id || s.name} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="text-slate-700">
                        {s.name} <span className="text-xs text-slate-400">· {s.durationMin} min</span>
                      </span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatTnd(s.priceTnd)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Horaires</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {[1, 2, 3, 4, 5, 6, 0].map((day) => {
              const h = p.openingHours.find((x) => x.day === day);
              return (
                <li key={day} className={`flex justify-between rounded px-2 py-1 ${day === today ? 'bg-primary-50 font-medium' : ''}`}>
                  <span>{DAY_LABELS[day]}</span>
                  <span className={h ? 'text-slate-800' : 'text-slate-400'}>{h ? `${h.open} – ${h.close}` : 'Fermé'}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Slot name="provider.sections" props={{ providerId: p.id }} />
    </div>
  );
}
