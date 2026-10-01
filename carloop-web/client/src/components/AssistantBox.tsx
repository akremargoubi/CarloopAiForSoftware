import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { AssistantResult } from '../types';
import { ErrorBox, Icon } from './ui';

/** AI feature 2: free-text problem -> best service category + search keywords. */
export function AssistantBox() {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.aiAssistant(message));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card assistant">
      <h2>
        <Icon name="auto_awesome" /> Décrivez votre besoin
      </h2>
      <p className="muted">
        L’assistant CarLoop vous oriente vers le bon service. Ne saisissez pas de données
        personnelles.
      </p>
      <form onSubmit={submit} className="assistant-form">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ex. : mes freins grincent quand je ralentis"
          maxLength={500}
          aria-label="Décrivez votre besoin"
        />
        <button className="btn" disabled={loading || message.trim().length < 3}>
          {loading ? 'Analyse…' : 'Trouver un service'}
        </button>
      </form>

      {error && <ErrorBox message={error} />}

      {result && (
        <div className="assistant-result">
          <p>{result.explication}</p>
          {result.urgence === 'haute' && (
            <p className="badge danger">Urgence élevée : pensez au service de dépannage.</p>
          )}
          {result.category_slug ? (
            <div className="chips">
              <Link className="btn btn-small" to={`/providers?category=${result.category_slug}`}>
                Voir : {result.category_nom}
              </Link>
              {result.mots_cles.map((k) => (
                <Link
                  key={k}
                  className="chip"
                  to={`/providers?category=${result.category_slug}&q=${encodeURIComponent(k)}`}
                >
                  {k}
                </Link>
              ))}
            </div>
          ) : (
            <p className="muted">Aucune catégorie ne correspond à votre demande.</p>
          )}
        </div>
      )}
    </section>
  );
}
