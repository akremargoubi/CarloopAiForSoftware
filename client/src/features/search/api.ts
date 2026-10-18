import { useQuery } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/core/api/client';
import type { ServiceCategory } from '@/core/constants';
import type { Provider } from '@/core/types';

export const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'] as const;
export const MOMENTS = ['matin', 'apres-midi', 'soir'] as const;
export type Day = (typeof DAYS)[number];
export type Moment = (typeof MOMENTS)[number];

export interface SearchFilters {
  categorie: ServiceCategory | null;
  ville: string | null;
  budget_max: number | null;
  disponibilite: { jour: Day | null; moment: Moment | null } | null;
  criteres: string[];
}

export interface SearchResultItem extends Provider {
  justification: string | null;
}

export interface SearchResponse {
  filtres: SearchFilters;
  filtres_assouplis: ('budget_max' | 'disponibilite' | 'ville')[];
  resultats: SearchResultItem[];
}

/** AI search. `filtres` is sent only when the user set them by hand (skips the extraction step). */
export function useSmartSearch(query: string, filtres: SearchFilters | null) {
  return useQuery({
    queryKey: ['ai-search', query, filtres],
    queryFn: () => apiPost<SearchResponse>('/ai/search', filtres ? { query, filtres } : { query }),
    enabled: query.trim().length >= 3,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ['providers', id],
    queryFn: () => apiGet<{ provider: Provider }>(`/providers/${id}`),
    enabled: Boolean(id),
  });
}
