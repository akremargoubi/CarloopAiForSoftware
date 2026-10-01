import type { ServiceDto } from './service.mapper';

/** Mode de recherche effectivement utilisé. */
export type SearchMode = 'semantic' | 'keyword';

/** Raison du repli en mode mots-clés. */
export type FallbackReason = 'model_unavailable' | 'model_error' | 'requested';

/** Options communes aux deux moteurs de recherche. */
export interface SearchOptions {
  ville?: string | undefined;
  limit: number;
}

/** Un résultat de recherche : le service et son score de pertinence (0..1). */
export interface SearchHit {
  score: number;
  service: ServiceDto;
}

/** Réponse de GET /api/services/search. */
export interface SearchResponse {
  mode: SearchMode;
  query: string;
  /** Seuil appliqué (mode sémantique uniquement). */
  minScore?: number;
  /** Présent uniquement en mode mots-clés. */
  fallbackReason?: FallbackReason;
  results: SearchHit[];
}

/**
 * Ordre de tri des résultats : score décroissant, puis titre et id (ordre stable et déterministe).
 * @param a Premier résultat.
 * @param b Second résultat.
 */
export function compareHits(a: SearchHit, b: SearchHit): number {
  return b.score - a.score || a.service.title.localeCompare(b.service.title, 'fr') || a.service.id.localeCompare(b.service.id);
}
