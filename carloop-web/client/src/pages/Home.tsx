import { Link, useNavigate } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { api } from '../api';
import { AssistantBox } from '../components/AssistantBox';
import { ErrorBox, Icon, Loading } from '../components/ui';
import { useAsync } from '../useAsync';

export function Home() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const categories = useAsync(() => api.categories(), []);

  function search(e: FormEvent) {
    e.preventDefault();
    navigate(`/providers?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <>
      <section className="hero">
        <h1>Tous vos services auto, en un seul loop.</h1>
        <form onSubmit={search} className="search-bar">
          <Icon name="search" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Vidange, pneus, carrosserie, garage…"
            aria-label="Rechercher un service ou un prestataire"
          />
          <button className="btn">Rechercher</button>
        </form>
      </section>

      <section>
        <h2>Catégories</h2>
        {categories.loading && <Loading />}
        {categories.error && <ErrorBox message={categories.error} onRetry={categories.reload} />}
        <div className="category-grid">
          {categories.data?.map((c) => (
            <Link key={c.id} to={`/providers?category=${c.slug}`} className="card category-tile">
              <Icon name={c.icone} />
              <span>{c.nom}</span>
            </Link>
          ))}
        </div>
      </section>

      <AssistantBox />
    </>
  );
}
