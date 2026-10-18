import { useEffect, useState } from 'react';
import { Button } from '@/core/components/Button';
import { Field, Input, Select } from '@/core/components/Form';
import { CATEGORY_LABELS, CITIES, SERVICE_CATEGORIES, type ServiceCategory } from '@/core/constants';
import { DAYS, MOMENTS, type Day, type Moment, type SearchFilters } from '../api';

const MOMENT_LABELS: Record<Moment, string> = { matin: 'Matin', 'apres-midi': 'Après-midi', soir: 'Soir' };

/** Shows the filters extracted by the AI and lets the user edit them by hand. */
export function FiltersPanel({ filters, onApply }: { filters: SearchFilters; onApply: (f: SearchFilters) => void }) {
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft(filters), [filters]);

  const dispo = draft.disponibilite ?? { jour: null, moment: null };
  const setDispo = (patch: Partial<typeof dispo>) => {
    const next = { ...dispo, ...patch };
    setDraft({ ...draft, disponibilite: next.jour || next.moment ? next : null });
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
    >
      <Field label="Catégorie" htmlFor="f-cat">
        <Select
          id="f-cat"
          value={draft.categorie ?? ''}
          onChange={(e) => setDraft({ ...draft, categorie: (e.target.value || null) as ServiceCategory | null })}
        >
          <option value="">Toutes</option>
          {SERVICE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Ville" htmlFor="f-city">
        <Select id="f-city" value={draft.ville ?? ''} onChange={(e) => setDraft({ ...draft, ville: e.target.value || null })}>
          <option value="">Toutes</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Budget max (TND)" htmlFor="f-budget">
        <Input
          id="f-budget"
          type="number"
          min={1}
          value={draft.budget_max ?? ''}
          onChange={(e) => setDraft({ ...draft, budget_max: e.target.value ? Number(e.target.value) : null })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Jour" htmlFor="f-day">
          <Select id="f-day" value={dispo.jour ?? ''} onChange={(e) => setDispo({ jour: (e.target.value || null) as Day | null })}>
            <option value="">Indifférent</option>
            {DAYS.map((d) => (
              <option key={d} value={d}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Moment" htmlFor="f-moment">
          <Select id="f-moment" value={dispo.moment ?? ''} onChange={(e) => setDispo({ moment: (e.target.value || null) as Moment | null })}>
            <option value="">Indifférent</option>
            {MOMENTS.map((m) => (
              <option key={m} value={m}>
                {MOMENT_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {draft.criteres.length > 0 && (
        <div>
          <p className="text-sm font-medium text-slate-700">Critères détectés</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {draft.criteres.map((c) => (
              <button
                key={c}
                type="button"
                title="Retirer ce critère"
                onClick={() => setDraft({ ...draft, criteres: draft.criteres.filter((x) => x !== c) })}
                className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-700 ring-1 ring-primary-200 hover:bg-primary-100"
              >
                {c} ×
              </button>
            ))}
          </div>
        </div>
      )}
      <Button type="submit" className="w-full">
        Appliquer les filtres
      </Button>
    </form>
  );
}
