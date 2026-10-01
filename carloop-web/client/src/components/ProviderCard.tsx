import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ProviderSummary } from '../types';
import { Icon, Stars } from './ui';

export function FavoriteButton({
  providerId,
  initial,
  onChange,
}: {
  providerId: number;
  initial: boolean;
  onChange?: () => void;
}) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next); // optimistic
    try {
      await api.setFavorite(providerId, next);
      onChange?.();
    } catch {
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`fav ${on ? 'on' : ''}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Icon name="favorite" className={on ? 'filled' : ''} />
    </button>
  );
}

export function ProviderCard({
  p,
  onFavoriteChange,
}: {
  p: ProviderSummary;
  onFavoriteChange?: () => void;
}) {
  return (
    <article className="card provider-card">
      <Link to={`/providers/${p.id}`} className="provider-photo">
        {p.photo_url ? (
          <img src={p.photo_url} alt="" loading="lazy" />
        ) : (
          <div className="photo-placeholder" />
        )}
      </Link>
      <div className="provider-body">
        <div className="provider-head">
          <h3>
            <Link to={`/providers/${p.id}`}>{p.nom_atelier}</Link>
          </h3>
          <FavoriteButton providerId={p.id} initial={p.est_favori} onChange={onFavoriteChange} />
        </div>
        <p className="muted small">{p.adresse}</p>
        <div className="provider-meta">
          <Stars value={p.note_moyenne} />
          <span className="muted small">({p.nb_avis} avis)</span>
          <span className="muted small">
            <Icon name="near_me" /> {p.distance_km.toFixed(1)} km
          </span>
          <span className={`badge ${p.est_disponible ? 'ok' : 'warn'}`}>
            {p.est_disponible ? 'Disponible' : 'Complet'}
          </span>
        </div>
        <p className="price-line">
          Dès <span className="price">{p.prix_depart.toFixed(0)} TND</span>
        </p>
      </div>
    </article>
  );
}
