import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import { Card } from '../components/Card';
import { CATEGORY_ICONS, CATEGORY_LABELS, SERVICE_CATEGORIES } from '../constants';
import { Slot, hasSlot } from '../slots/Slot';
import type { Provider } from '../types';

const AI_FEATURES = [
  { title: 'Diagnostic assisté', text: 'Décrivez un bruit, un voyant ou une fuite : l’assistant identifie les causes probables.' },
  { title: 'Recherche intelligente', text: 'Écrivez votre besoin comme vous le diriez : « vidange pas chère à l’Ariana samedi ».' },
  { title: 'Estimation de devis', text: 'Obtenez une fourchette de prix avant même de réserver.' },
  { title: 'Avis analysés', text: 'Un résumé des avis clients pour choisir le bon garage en un coup d’œil.' },
  { title: 'Plan d’entretien', text: 'Un calendrier d’entretien personnalisé pour chacun de vos véhicules.' },
];

export function HomePage() {
  const { data } = useQuery({
    queryKey: ['providers', 'top'],
    queryFn: () => apiGet<{ providers: Provider[] }>('/providers', { limit: 6 }),
  });

  return (
    <div className="space-y-14">
      <section className="rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 px-6 py-12 text-white shadow-lg sm:px-10 sm:py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-200">Services auto en Tunisie</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight sm:text-5xl">
          Entretenez votre voiture, sans perdre de temps.
        </h1>
        <p className="mt-4 max-w-2xl text-primary-100">
          Lavage, vidange, pneus, climatisation, électricité, carrosserie, mécanique et dépannage : trouvez le bon
          professionnel près de chez vous, guidé par l’intelligence artificielle.
        </p>
        <div className="mt-8 max-w-3xl">
          {hasSlot('home.hero') ? (
            <Slot name="home.hero" props={{}} />
          ) : (
            <p className="rounded-lg bg-white/10 px-4 py-3 text-sm">Choisissez une catégorie ci-dessous pour commencer.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">Nos catégories de services</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SERVICE_CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/recherche?categorie=${c}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-300 hover:shadow"
            >
              <span className="text-2xl" aria-hidden>
                {CATEGORY_ICONS[c]}
              </span>
              <span className="font-medium text-slate-800">{CATEGORY_LABELS[c]}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-slate-900">5 assistants IA pour vous accompagner</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AI_FEATURES.map((f) => (
            <Card key={f.title} className="p-4">
              <p className="font-semibold text-primary-700">{f.title}</p>
              <p className="mt-1 text-sm text-slate-600">{f.text}</p>
            </Card>
          ))}
        </div>
      </section>

      {data && data.providers.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-900">Prestataires les mieux notés</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.providers.map((p) => (
              <Link key={p.id} to={`/prestataires/${p.id}`} className="group">
                <Card className="h-full transition group-hover:border-primary-300">
                  <p className="font-semibold text-slate-900">{p.name}</p>
                  <p className="text-sm text-slate-500">{p.city}</p>
                  <p className="mt-2 text-sm text-amber-600">
                    ★ {p.ratingAvg.toFixed(1)} <span className="text-slate-400">({p.ratingCount} avis)</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-500">{p.categories.map((c) => CATEGORY_LABELS[c]).join(' · ')}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Slot name="home.sections" props={{}} />
    </div>
  );
}
