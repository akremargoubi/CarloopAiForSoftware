import { env } from '../config/env';
import { prisma } from '../config/prisma';
import type { SearchQuery } from '../schemas/search.schema';
import { serviceCityFilter } from '../utils/filters';
import { logger } from '../utils/logger';
import { embeddingService } from './embedding.service';
import { keywordSearch } from './keyword-search.service';
import { compareHits, type FallbackReason, type SearchHit, type SearchOptions, type SearchResponse } from './search.types';
import { serviceSelect, toServiceDto } from './service.mapper';

/** Options de la recherche sémantique (seuil surchargeable pour l'évaluation). */
export interface SemanticSearchOptions extends SearchOptions {
  minScore: number;
}

/**
 * Similarité cosinus entre deux vecteurs.
 * Pour des vecteurs normalisés (cas du modèle), elle est égale au produit scalaire.
 * @returns Valeur dans [-1, 1], ou 0 si les vecteurs sont vides ou de tailles différentes.
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dot / denominator;
}

/**
 * Recherche sémantique : embedding de la requête → cosinus avec chaque service indexé →
 * filtrage par seuil → top N.
 * @param query Requête utilisateur.
 * @param options Ville, limite et seuil de pertinence.
 * @returns Résultats triés par score décroissant.
 * @throws EmbeddingUnavailableError / TimeoutError si le modèle ne répond pas.
 */
export async function semanticSearch(query: string, options: SemanticSearchOptions): Promise<SearchHit[]> {
  const queryVector = await embeddingService.embed(query);
  const candidates = await prisma.service.findMany({
    where: {
      NOT: { embedding: { isEmpty: true } },
      ...serviceCityFilter(options.ville),
    },
    select: { ...serviceSelect, embedding: true },
  });

  return candidates
    .map(({ embedding, ...row }) => ({ score: cosineSimilarity(queryVector, embedding), service: toServiceDto(row) }))
    .filter((hit) => hit.score >= options.minScore)
    .sort(compareHits)
    .slice(0, options.limit);
}

/** Arrondit les scores pour une réponse lisible. */
function roundScores(hits: SearchHit[]): SearchHit[] {
  return hits.map((hit) => ({ ...hit, score: Math.round(hit.score * 10_000) / 10_000 }));
}

/**
 * Point d'entrée de GET /api/services/search : sémantique si le modèle est prêt,
 * sinon (ou en cas d'erreur / timeout) repli automatique sur la recherche par mots-clés.
 * @param params Requête validée (q, ville, limit).
 * @returns Résultats avec le mode utilisé.
 */
export async function searchServices(params: SearchQuery): Promise<SearchResponse> {
  const options: SearchOptions = { ville: params.ville, limit: params.limit };
  let fallbackReason: FallbackReason = 'model_unavailable';

  if (embeddingService.isReady()) {
    try {
      const results = await semanticSearch(params.q, { ...options, minScore: env.SEARCH_MIN_SCORE });
      return { mode: 'semantic', query: params.q, minScore: env.SEARCH_MIN_SCORE, results: roundScores(results) };
    } catch (error: unknown) {
      fallbackReason = 'model_error';
      logger.warn(`Recherche sémantique en échec, repli mots-clés : ${error instanceof Error ? error.message : 'erreur'}`);
    }
  }

  const results = await keywordSearch(params.q, options);
  return { mode: 'keyword', query: params.q, fallbackReason, results: roundScores(results) };
}
