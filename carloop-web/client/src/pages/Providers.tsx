import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { ProviderCard } from '../components/ProviderCard';
import { ProvidersMap } from '../components/ProvidersMap';
import { ErrorBox, Icon, Loading } from '../components/ui';
import { useLocation } from '../location';
import { useAsync } from '../useAsync';

export function Providers({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const [params, setParams] = useSearchParams();
  const { lat, lng } = useLocation();
  const [view, setView] = useState<'list' | 'map'>('list');
  const categories = useAsync(() => api.categories(), []);

  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'distance';

  // URL is the single source of truth for filters (shareable, back-button friendly).
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  // Debounced keyword search.
  const [q, setQ] = useState(params.get('q') ?? '');
  useEffect(() => {
    const t = setTimeout(() => {
      if (q !== (params.get('q') ?? '')) setParam('q', q.trim());
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => setQ(params.get('q') ?? ''), [params.get('q')]); // eslint-disable-line react-hooks/exhaustive-deps

  const query = new URLSearchParams(params);
  query.set('lat', String(lat));
  query.set('lng', String(lng));
  if (favoritesOnly) query.set('favorites', 'true');

  const providers = useAsync(() => api.providers(query), [query.toString()]);
  const count = providers.data?.length ?? 0;

  return (
    <>
      <h1>{favoritesOnly ? 'Mes favoris' : 'Prestataires'}</h1>

      {!favoritesOnly && (
        <div className="chips" role="tablist" aria-label="Catégories">
          <button className={`chip ${category === '' ? 'active' : ''}`} onClick={() => setParam('category', '')}>
            Toutes
          </button>
          {categories.data?.map((c) => (
            <button
              key={c.id}
              className={`chip ${category === c.slug ? 'active' : ''}`}
              onClick={() => setParam('category', c.slug)}
            >
              {c.nom}
            </button>
          ))}
        </div>
      )}

      <div className="card filters">
        <label className="field grow">
          Mot-clé
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Garage, embrayage, lavage…" />
        </label>
        <label className="field">
          Prix max (TND)
          <input
            type="number"
            min={1}
            value={params.get('maxPrice') ?? ''}
            onChange={(e) => setParam('maxPrice', e.target.value)}
          />
        </label>
        <label className="field">
          Note minimale
          <select value={params.get('minRating') ?? ''} onChange={(e) => setParam('minRating', e.target.value)}>
            <option value="">Toutes</option>
            <option value="3">3 et plus</option>
            <option value="4">4 et plus</option>
            <option value="4.5">4,5 et plus</option>
          </select>
        </label>
        <label className="field">
          Distance max
          <select value={params.get('maxDistance') ?? ''} onChange={(e) => setParam('maxDistance', e.target.value)}>
            <option value="">Toutes</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
          </select>
        </label>
        <label className="field">
          Trier par
          <select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
            <option value="distance">Distance</option>
            <option value="price">Prix</option>
            <option value="rating">Note</option>
          </select>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={params.get('available') === 'true'}
            onChange={(e) => setParam('available', e.target.checked ? 'true' : '')}
          />
          Disponible
        </label>
      </div>

      <div className="results-bar">
        <span className="muted">
          {providers.loading ? 'Recherche…' : `${count} prestataire${count > 1 ? 's' : ''}`}
        </span>
        <div className="segmented">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <Icon name="view_list" /> Liste
          </button>
          <button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}>
            <Icon name="map" /> Carte
          </button>
        </div>
      </div>

      {providers.error && <ErrorBox message={providers.error} onRetry={providers.reload} />}
      {providers.loading && !providers.data && <Loading />}

      {providers.data && count === 0 && (
        <p className="card empty">
          {favoritesOnly
            ? 'Vous n’avez pas encore de favoris.'
            : 'Aucun prestataire ne correspond à ces critères.'}
        </p>
      )}

      {providers.data && count > 0 && view === 'list' && (
        <div className="provider-list">
          {providers.data.map((p) => (
            <ProviderCard key={p.id} p={p} onFavoriteChange={favoritesOnly ? providers.reload : undefined} />
          ))}
        </div>
      )}
      {providers.data && view === 'map' && <ProvidersMap providers={providers.data} />}
    </>
  );
}
