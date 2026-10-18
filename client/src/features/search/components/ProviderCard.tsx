import { Link } from 'react-router-dom';
import { Badge, Card } from '@/core/components/Card';
import { CATEGORY_LABELS, formatTnd, type ServiceCategory } from '@/core/constants';
import type { SearchResultItem } from '../api';

export function ProviderCard({ provider, rank, category }: { provider: SearchResultItem; rank: number; category: ServiceCategory | null }) {
  const services = provider.services.filter((s) => !category || s.category === category);
  const minPrice = services.length ? Math.min(...services.map((s) => s.priceTnd)) : null;

  return (
    <Card className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">{rank}</span>
          <Link to={`/prestataires/${provider.id}`} className="truncate text-lg font-semibold text-slate-900 hover:text-primary-600">
            {provider.name}
          </Link>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {provider.city} ·{' '}
          <span className="text-amber-600">★ {provider.ratingAvg.toFixed(1)}</span> ({provider.ratingCount} avis)
        </p>
        {provider.justification && (
          <p className="mt-2 rounded-lg bg-primary-50 px-3 py-2 text-sm text-primary-900">
            <span className="font-medium">Pourquoi ce choix : </span>
            {provider.justification}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {provider.categories.map((c) => (
            <Badge key={c} tone={c === category ? 'blue' : 'gray'}>
              {CATEGORY_LABELS[c]}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
        {minPrice !== null && (
          <p className="text-sm text-slate-600">
            à partir de <span className="text-lg font-bold text-slate-900">{formatTnd(minPrice)}</span>
          </p>
        )}
        <Link to={`/prestataires/${provider.id}`} className="text-sm font-medium text-primary-600 hover:underline">
          Voir la fiche →
        </Link>
      </div>
    </Card>
  );
}
