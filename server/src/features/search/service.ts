import type { FilterQuery } from 'mongoose';
import { runAiTask } from '../../ai/index.js';
import { ProviderModel, toPublicProvider, type Provider, type ProviderDoc } from '../../core/models/Provider.js';
import { buildProviderFilter } from '../../core/providers/provider.routes.js';
import { mockExtraction, mockRanking } from './mock.js';
import { EXTRACTION_SYSTEM_PROMPT, RANKING_SYSTEM_PROMPT, buildRankingMessage, type RankingCandidate } from './prompt.js';
import { DAYS, extractionSchema, rankingSchema, type SearchFilters } from './schema.js';

const MAX_CANDIDATES = 8;
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

type RelaxableFilter = 'budget_max' | 'disponibilite' | 'ville';

/** Builds the MongoDB query for the extracted filters (category, city, budget, availability). */
export function buildSearchQuery(filters: SearchFilters): FilterQuery<Provider> {
  const query = buildProviderFilter({
    categorie: filters.categorie ?? undefined,
    ville: filters.ville ?? undefined,
    budget_max: filters.budget_max ?? undefined,
  });
  const dispo = filters.disponibilite;
  if (dispo && (dispo.jour || dispo.moment)) {
    const slot: Record<string, unknown> = {};
    if (dispo.jour) slot.day = DAYS.indexOf(dispo.jour);
    if (dispo.moment === 'matin') slot.open = { $lte: '10:00' };
    if (dispo.moment === 'apres-midi') slot.close = { $gte: '16:00' };
    if (dispo.moment === 'soir') slot.close = { $gte: '18:00' };
    query.openingHours = { $elemMatch: slot };
  }
  return query;
}

/** Runs the MongoDB query, relaxing the least important filters when nothing matches. */
async function findCandidates(filters: SearchFilters): Promise<{ providers: ProviderDoc[]; relaxed: RelaxableFilter[] }> {
  const relaxed: RelaxableFilter[] = [];
  let current = { ...filters };
  for (const key of [null, 'budget_max', 'disponibilite', 'ville'] as const) {
    if (key) {
      if (current[key] === null) continue;
      current = { ...current, [key]: null };
      relaxed.push(key);
    }
    const providers = await ProviderModel.find(buildSearchQuery(current))
      .sort({ ratingAvg: -1, ratingCount: -1 })
      .limit(MAX_CANDIDATES);
    if (providers.length > 0) return { providers, relaxed };
  }
  return { providers: [], relaxed };
}

/** Public data only: no address, phone or owner is sent to the LLM. */
function toCandidate(p: ProviderDoc, filters: SearchFilters): RankingCandidate {
  const services = p.services.filter((s) => !filters.categorie || s.category === filters.categorie);
  return {
    providerId: p.id as string,
    nom: p.name,
    ville: p.city,
    note: Math.round(p.ratingAvg * 10) / 10,
    nombre_avis: p.ratingCount,
    services: services.slice(0, 6).map((s) => ({ nom: s.name, categorie: s.category, prix_tnd: s.priceTnd })),
    horaires: p.openingHours.map((h) => `${DAY_LABELS[h.day]} ${h.open}-${h.close}`),
  };
}

export interface SearchResult {
  filtres: SearchFilters;
  filtres_assouplis: RelaxableFilter[];
  resultats: (ReturnType<typeof toPublicProvider> & { justification: string | null })[];
}

/**
 * AI search pipeline:
 * 1. LLM extracts filters from the query (skipped when the user edited them by hand)
 * 2. MongoDB query with these filters
 * 3. LLM ranks the candidates; unknown providerIds are ignored
 */
export async function smartSearch(
  query: string,
  manualFilters: SearchFilters | undefined,
  knownNames: string[],
): Promise<SearchResult> {
  const filtres =
    manualFilters ??
    (await runAiTask('search-extract', EXTRACTION_SYSTEM_PROMPT, query, extractionSchema, {
      mock: () => mockExtraction(query),
      knownNames,
      temperature: 0,
    }));

  const { providers, relaxed } = await findCandidates(filtres);
  if (providers.length === 0) return { filtres, filtres_assouplis: relaxed, resultats: [] };

  const candidates = providers.map((p) => toCandidate(p, filtres));
  const ranking = await runAiTask('search-rank', RANKING_SYSTEM_PROMPT, buildRankingMessage(query, candidates), rankingSchema, {
    mock: () => mockRanking(query, candidates),
    knownNames,
  });

  // Keep only providerIds that really belong to the candidates, without duplicates.
  const byId = new Map(providers.map((p) => [p.id as string, p]));
  const seen = new Set<string>();
  const resultats: SearchResult['resultats'] = [];
  for (const r of ranking.resultats) {
    const provider = byId.get(r.providerId);
    if (!provider || seen.has(r.providerId)) continue;
    seen.add(r.providerId);
    resultats.push({ ...toPublicProvider(provider), justification: r.justification });
  }
  // The LLM may omit candidates: append them after the ranked ones.
  for (const p of providers) {
    if (!seen.has(p.id as string)) resultats.push({ ...toPublicProvider(p), justification: null });
  }
  return { filtres, filtres_assouplis: relaxed, resultats };
}
