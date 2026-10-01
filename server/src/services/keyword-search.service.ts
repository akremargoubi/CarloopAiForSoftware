import type { Prisma, ServiceCategory } from '@prisma/client';
import { prisma } from '../config/prisma';
import { SERVICE_CATEGORIES } from '../schemas/common.schema';
import { CATEGORY_LABELS } from '../utils/categories';
import { serviceCityFilter } from '../utils/filters';
import { serviceSelect, toServiceDto } from './service.mapper';
import { compareHits, type SearchHit, type SearchOptions } from './search.types';

/** Mots vides français ignorés par la recherche par mots-clés. */
const STOP_WORDS: ReadonlySet<string> = new Set([
  'les', 'des', 'une', 'pour', 'avec', 'sans', 'dans', 'sur', 'par', 'que', 'qui', 'quoi', 'est', 'sont',
  'mon', 'mes', 'ma', 'ton', 'tes', 'son', 'ses', 'notre', 'votre', 'leur', 'aux', 'du', 'de', 'la', 'le',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'quand', 'comment', 'pas', 'plus', 'tres',
  'besoin', 'veux', 'voudrais', 'faire', 'fait', 'avant', 'apres', 'mais', 'car', 'voiture', 'auto',
]);

/**
 * Normalise un texte : minuscules, sans accents.
 * @param text Texte brut.
 */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Découpe une requête en mots-clés significatifs (≥ 3 lettres, hors mots vides).
 * @param query Requête utilisateur.
 * @returns Les mots-clés tels que saisis (minuscules) et leur forme normalisée.
 */
export function extractKeywords(query: string): { raw: string; normalized: string }[] {
  const seen = new Set<string>();
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((raw) => ({ raw, normalized: normalizeText(raw) }))
    .filter(({ normalized }) => {
      if (normalized.length < 3 || STOP_WORDS.has(normalized) || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

/** Catégories dont le nom correspond exactement à un mot-clé (ex. « vidange » → VIDANGE). */
function matchingCategories(keywords: readonly string[]): ServiceCategory[] {
  return SERVICE_CATEGORIES.filter((category) => {
    const name = category.toLowerCase();
    return keywords.some((keyword) => keyword === name || `${keyword}s` === name);
  });
}

/**
 * Recherche « classique » par mots-clés (Prisma `contains`, insensible à la casse).
 * Sert de repli quand le modèle est indisponible et de référence pour l'évaluation.
 * Score = proportion des mots-clés présents dans le titre, la catégorie ou la description.
 * @param query Requête utilisateur.
 * @param options Filtre ville et nombre de résultats.
 * @returns Résultats triés par score décroissant.
 */
export async function keywordSearch(query: string, options: SearchOptions): Promise<SearchHit[]> {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    return [];
  }
  const categories = matchingCategories(keywords.map((keyword) => keyword.normalized));
  const textFilters: Prisma.ServiceWhereInput[] = keywords.flatMap(({ raw }) => [
    { title: { contains: raw, mode: 'insensitive' } },
    { description: { contains: raw, mode: 'insensitive' } },
  ]);
  const rows = await prisma.service.findMany({
    where: {
      OR: [...textFilters, ...(categories.length > 0 ? [{ category: { in: categories } }] : [])],
      ...serviceCityFilter(options.ville),
    },
    select: serviceSelect,
  });

  return rows
    .map((row) => {
      const haystack = normalizeText(`${row.title} ${CATEGORY_LABELS[row.category]} ${row.category} ${row.description}`);
      const matched = keywords.filter(({ normalized }) => haystack.includes(normalized)).length;
      return { score: matched / keywords.length, service: toServiceDto(row) };
    })
    .filter((hit) => hit.score > 0)
    .sort(compareHits)
    .slice(0, options.limit);
}
