import { CITIES, type ServiceCategory } from '../../core/constants.js';
import type { RankingCandidate } from './prompt.js';
import { DAYS, type SearchFilters, type SearchRanking } from './schema.js';

// Demo mode: simple keyword rules that imitate what the LLM extracts.
const CATEGORY_KEYWORDS: [ServiceCategory, RegExp][] = [
  ['vidange', /vidange|huile|filtre/],
  ['lavage', /lavage|laver|nettoy|propre/],
  ['pneus', /pneu|crevaison|parallelisme|equilibrage|jante/],
  ['climatisation', /clim|froid|chaud dans/],
  ['electricite', /batterie|electri|alternateur|demarr|phare|voyant/],
  ['carrosserie', /carross|rayure|bosse|peinture|choc/],
  ['mecanique', /frein|embrayage|moteur|distribution|mecani|boite/],
  ['depannage', /depann|remorqu|panne|bloque/],
];

const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/** Simulated step 1 answer. */
export function mockExtraction(query: string): SearchFilters {
  const q = plain(query);
  const categorie = CATEGORY_KEYWORDS.find(([, re]) => re.test(q))?.[0] ?? null;
  const ville = CITIES.find((c) => q.includes(plain(c))) ?? (q.includes('marsa') ? 'La Marsa' : null);
  const budget = q.match(/(\d{2,5})\s*(?:dt|tnd|dinars?|d\b)/) ?? q.match(/moins de\s*(\d{2,5})/);
  const jour = DAYS.find((d) => q.includes(d)) ?? null;
  const moment = q.includes('matin') ? 'matin' : q.includes('apres-midi') || q.includes('aprem') ? 'apres-midi' : q.includes('soir') ? 'soir' : null;
  const criteres: string[] = [];
  if (/pas cher|moins cher|economique|petit prix/.test(q)) criteres.push('pas cher');
  if (/rapide|vite|urgent/.test(q)) criteres.push('rapide');
  if (/bien note|serieux|fiable|bon garage/.test(q)) criteres.push('bien noté');
  return {
    categorie,
    ville,
    budget_max: budget ? Number(budget[1]) : null,
    disponibilite: jour || moment ? { jour, moment } : null,
    criteres,
  };
}

/** Simulated step 3 answer: best rated first, cheapest first when the user asked for a low price. */
export function mockRanking(query: string, candidates: RankingCandidate[]): SearchRanking {
  const cheap = /pas cher|moins cher|economique/.test(plain(query));
  const minPrice = (c: RankingCandidate) => Math.min(...c.services.map((s) => s.prix_tnd), Infinity);
  const sorted = [...candidates].sort((a, b) => (cheap ? minPrice(a) - minPrice(b) : b.note - a.note || minPrice(a) - minPrice(b)));
  return {
    resultats: sorted.slice(0, 5).map((c) => {
      const service = [...c.services].sort((a, b) => a.prix_tnd - b.prix_tnd)[0];
      const parts = [
        c.nombre_avis > 0 ? `noté ${c.note.toFixed(1)}/5 (${c.nombre_avis} avis)` : 'nouveau sur CarLoop',
        service ? `${service.nom.toLowerCase()} à ${service.prix_tnd} TND` : null,
        `à ${c.ville}`,
      ].filter(Boolean);
      return { providerId: c.providerId, justification: `${c.nom} : ${parts.join(', ')}.` };
    }),
  };
}
