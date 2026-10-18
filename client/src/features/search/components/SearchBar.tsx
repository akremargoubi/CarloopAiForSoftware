import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const EXAMPLES = [
  'Vidange pas chère près de l’Ariana samedi matin',
  'Recharge clim à Sousse moins de 120 dt',
  'Bruit en freinant, garage bien noté à Sfax',
];

/** Natural language search bar, shown on the home page (slot "home.hero"). */
export function SearchBar({ initialValue = '', compact = false }: { initialValue?: string; compact?: boolean }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (q.length >= 3) navigate(`/recherche?q=${encodeURIComponent(q)}`);
  };

  return (
    <div>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="ai-search" className="sr-only">
          Décrivez votre besoin
        </label>
        <input
          id="ai-search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ex. : vidange pas chère près de l’Ariana samedi matin"
          maxLength={300}
          className="w-full flex-1 rounded-xl border-0 bg-white px-4 py-3 text-slate-900 shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
        />
        <button
          type="submit"
          disabled={value.trim().length < 3}
          className="rounded-xl bg-primary-500 px-6 py-3 font-semibold text-white shadow-sm ring-1 ring-white/30 hover:bg-primary-600 disabled:opacity-60"
        >
          Rechercher avec l’IA
        </button>
      </form>
      {!compact && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => navigate(`/recherche?q=${encodeURIComponent(ex)}`)}
              className="rounded-full bg-white/15 px-3 py-1 text-white hover:bg-white/25"
            >
              {ex}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
