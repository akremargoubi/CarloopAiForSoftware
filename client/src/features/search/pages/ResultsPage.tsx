import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AiErrorDisplay } from '@/core/components/AiErrorDisplay';
import { Card, EmptyState, PageHeader } from '@/core/components/Card';
import { AiLoader } from '@/core/components/Loader';
import { CATEGORY_LABELS, isServiceCategory } from '@/core/constants';
import { DAYS, MOMENTS, useSmartSearch, type Day, type Moment, type SearchFilters } from '../api';
import { FiltersPanel } from '../components/FiltersPanel';
import { ProviderCard } from '../components/ProviderCard';
import { SearchBar } from '../components/SearchBar';

const FILTER_PARAMS = ['categorie', 'ville', 'budget_max', 'jour', 'moment'] as const;

const RELAXED_LABELS = { budget_max: 'le budget', disponibilite: 'la disponibilité', ville: 'la ville' };

/** Reads manual filters from the URL (?categorie=...&ville=...). Returns null when there are none. */
export function filtersFromParams(params: URLSearchParams): SearchFilters | null {
  if (!params.has('manuel') && !FILTER_PARAMS.some((k) => params.get(k))) return null;
  const categorie = params.get('categorie');
  const jour = params.get('jour');
  const moment = params.get('moment');
  const budget = Number(params.get('budget_max'));
  return {
    categorie: isServiceCategory(categorie) ? categorie : null,
    ville: params.get('ville') || null,
    budget_max: budget > 0 ? budget : null,
    disponibilite:
      jour || moment
        ? {
            jour: (DAYS as readonly string[]).includes(jour ?? '') ? (jour as Day) : null,
            moment: (MOMENTS as readonly string[]).includes(moment ?? '') ? (moment as Moment) : null,
          }
        : null,
    criteres: params.getAll('critere'),
  };
}

export function ResultsPage() {
  const [params, setParams] = useSearchParams();
  const manualFilters = useMemo(() => filtersFromParams(params), [params]);
  const q = params.get('q')?.trim() ?? '';
  const query = q || (manualFilters?.categorie ? `Service de ${CATEGORY_LABELS[manualFilters.categorie].toLowerCase()}` : '');
  const search = useSmartSearch(query, manualFilters);

  const applyFilters = (f: SearchFilters) => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (f.categorie) next.set('categorie', f.categorie);
    if (f.ville) next.set('ville', f.ville);
    if (f.budget_max) next.set('budget_max', String(f.budget_max));
    if (f.disponibilite?.jour) next.set('jour', f.disponibilite.jour);
    if (f.disponibilite?.moment) next.set('moment', f.disponibilite.moment);
    f.criteres.forEach((c) => next.append('critere', c));
    next.set('manuel', '1');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Recherche intelligente" subtitle={query ? `« ${query} »` : 'Décrivez votre besoin en langage naturel.'} />
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-primary-600 to-primary-700 p-4">
        <SearchBar key={q} initialValue={q} compact />
      </div>

      {!query ? (
        <EmptyState title="Que recherchez-vous ?">Par exemple : « vidange pas chère près de l’Ariana samedi matin ».</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside>
            <Card className="lg:sticky lg:top-20">
              <h2 className="mb-1 font-semibold text-slate-900">Filtres</h2>
              <p className="mb-3 text-xs text-slate-500">
                {manualFilters ? 'Filtres modifiés à la main.' : 'Extraits automatiquement par l’IA. Vous pouvez les corriger.'}
              </p>
              {search.data ? (
                <FiltersPanel filters={search.data.filtres} onApply={applyFilters} />
              ) : (
                <p className="text-sm text-slate-400">En attente de la recherche…</p>
              )}
            </Card>
          </aside>

          <section className="space-y-4" aria-live="polite">
            {search.isLoading && <AiLoader label="L’IA analyse votre demande et classe les prestataires…" />}
            {search.error && <AiErrorDisplay error={search.error} onRetry={() => search.refetch()} />}
            {search.data && (
              <>
                {search.data.filtres_assouplis.length > 0 && (
                  <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Aucun résultat exact : nous avons assoupli {search.data.filtres_assouplis.map((k) => RELAXED_LABELS[k]).join(', ')}.
                  </p>
                )}
                {search.data.resultats.length === 0 ? (
                  <EmptyState title="Aucun prestataire ne correspond">Essayez d’élargir vos filtres.</EmptyState>
                ) : (
                  <>
                    <p className="text-sm text-slate-500">{search.data.resultats.length} prestataire(s), classés par l’IA</p>
                    {search.data.resultats.map((p, i) => (
                      <ProviderCard key={p.id} provider={p} rank={i + 1} category={search.data.filtres.categorie} />
                    ))}
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
