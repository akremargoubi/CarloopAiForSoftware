import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ServiceCategory } from '@prisma/client';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { embeddingService } from '../services/embedding.service';
import { keywordSearch } from '../services/keyword-search.service';
import { semanticSearch } from '../services/search.service';
import type { SearchHit } from '../services/search.types';

const EVAL_DIR = resolve(process.cwd(), 'eval');
const ALL = 1000;
/** Seuils testés : 0.20 → 0.95 au pas de 0.01 (les échelles de score varient selon le modèle). */
const THRESHOLDS: readonly number[] = Array.from({ length: 76 }, (_value, index) => Math.round((0.2 + index * 0.01) * 100) / 100);
/** Seuils affichés dans le rapport (en plus du meilleur). */
const isDisplayedThreshold = (threshold: number): boolean => Math.round(threshold * 100) % 5 === 0;

const datasetSchema = z.object({
  queries: z.array(z.object({ q: z.string().min(1).max(300), expectedCategory: z.enum(ServiceCategory) })).min(20),
  outOfScope: z.array(z.string().min(1).max(300)),
});

type Dataset = z.output<typeof datasetSchema>;

interface QueryResult {
  q: string;
  expected: ServiceCategory;
  semantic: SearchHit[];
  keyword: SearchHit[];
  semanticRank: number | null;
  keywordRank: number | null;
  latencyMs: number;
}

interface Metrics {
  precisionAt1: number;
  precisionAt3: number;
  mrr: number;
  noResult: number;
}

/** Rang (1-based) du premier résultat de la catégorie attendue, ou null. */
function firstRelevantRank(hits: readonly SearchHit[], expected: ServiceCategory): number | null {
  const index = hits.findIndex((hit) => hit.service.category === expected);
  return index === -1 ? null : index + 1;
}

/** Précision@1, précision@3, MRR et nombre de requêtes sans résultat. */
function computeMetrics(ranks: readonly (number | null)[], resultCounts: readonly number[]): Metrics {
  const n = ranks.length;
  return {
    precisionAt1: ranks.filter((rank) => rank === 1).length / n,
    precisionAt3: ranks.filter((rank) => rank !== null && rank <= 3).length / n,
    mrr: ranks.reduce<number>((sum, rank) => sum + (rank === null ? 0 : 1 / rank), 0) / n,
    noResult: resultCounts.filter((count) => count === 0).length,
  };
}

const pct = (value: number): string => `${(value * 100).toFixed(1)} %`;
const num = (value: number): string => value.toFixed(3);

/** Calibre le seuil : réussite in-scope (bonne catégorie dans le top 3 au-dessus du seuil) vs rejet hors-sujet. */
function thresholdTable(results: readonly QueryResult[], outOfScopeTop: readonly number[]): { rows: string[]; best: number } {
  const evaluated = THRESHOLDS.map((threshold) => {
    const inScopeOk =
      results.filter((result) =>
        result.semantic.slice(0, 3).some((hit) => hit.score >= threshold && hit.service.category === result.expected),
      ).length / results.length;
    const rejected = outOfScopeTop.filter((score) => score < threshold).length / Math.max(outOfScopeTop.length, 1);
    return { threshold, inScopeOk, rejected, balanced: (inScopeOk + rejected) / 2 };
  });
  // Meilleure moyenne ; à égalité, le seuil le plus bas (moins de faux négatifs).
  const best = evaluated.reduce((current, candidate) => (candidate.balanced > current.balanced ? candidate : current));
  const rows = evaluated
    .filter((row) => isDisplayedThreshold(row.threshold) || row.threshold === best.threshold)
    .map((row) => {
      const label = row.threshold === best.threshold ? `**${row.threshold.toFixed(2)}**` : row.threshold.toFixed(2);
      return `| ${label} | ${pct(row.inScopeOk)} | ${pct(row.rejected)} | ${pct(row.balanced)} |`;
    });
  return { rows, best: best.threshold };
}

/** Génère le rapport Markdown. */
function renderReport(
  dataset: Dataset,
  results: readonly QueryResult[],
  outOfScope: readonly { q: string; top: SearchHit | undefined }[],
  serviceCount: number,
): { markdown: string; semantic: Metrics; keyword: Metrics; best: number } {
  const semantic = computeMetrics(
    results.map((result) => result.semanticRank),
    results.map((result) => result.semantic.length),
  );
  const keyword = computeMetrics(
    results.map((result) => result.keywordRank),
    results.map((result) => result.keyword.length),
  );
  const avgLatency = results.reduce((sum, result) => sum + result.latencyMs, 0) / results.length;
  const { rows: thresholdRows, best } = thresholdTable(
    results,
    outOfScope.map((item) => item.top?.score ?? 0),
  );

  const perCategory = Object.values(ServiceCategory).map((category) => {
    const subset = results.filter((result) => result.expected === category);
    const sem = computeMetrics(subset.map((r) => r.semanticRank), subset.map((r) => r.semantic.length));
    const kw = computeMetrics(subset.map((r) => r.keywordRank), subset.map((r) => r.keyword.length));
    return `| ${category} | ${subset.length} | ${pct(sem.precisionAt3)} | ${num(sem.mrr)} | ${pct(kw.precisionAt3)} | ${num(kw.mrr)} |`;
  });

  const describe = (hits: readonly SearchHit[]): string => {
    const top = hits[0];
    return top ? `${top.service.category} (${top.score.toFixed(2)})` : '—';
  };
  const rank = (value: number | null): string => (value === null ? '✗' : String(value));
  const perQuery = results.map(
    (result) =>
      `| ${result.q} | ${result.expected} | ${rank(result.semanticRank)} | ${describe(result.semantic)} | ${rank(result.keywordRank)} | ${describe(result.keyword)} |`,
  );
  const outRows = outOfScope.map(
    (item) => `| ${item.q} | ${item.top ? `${item.top.service.category} — ${item.top.service.title}` : '—'} | ${(item.top?.score ?? 0).toFixed(3)} |`,
  );

  const markdown = `# Résultats de l'évaluation — recherche de services

> Fichier généré par \`npm run eval\` le ${new Date().toISOString().slice(0, 10)}. Ne pas modifier à la main.

- **Modèle** : \`${embeddingService.getModelName()}\` (ONNX ${env.EMBEDDING_DTYPE}, exécution locale)
- **Corpus** : ${serviceCount} services indexés (seed)
- **Jeu de test** : ${dataset.queries.length} requêtes client (\`eval/queries.json\`) + ${dataset.outOfScope.length} requêtes hors sujet
- **Pertinence** : un résultat est pertinent s'il appartient à la catégorie attendue
- Classement complet évalué **sans seuil** (le seuil est étudié séparément)

## Synthèse

| Méthode | Précision@1 | Précision@3 | MRR | Requêtes sans résultat |
|---|---|---|---|---|
| Sémantique (embeddings + cosinus) | ${pct(semantic.precisionAt1)} | **${pct(semantic.precisionAt3)}** | **${num(semantic.mrr)}** | ${semantic.noResult} / ${results.length} |
| Mots-clés (Prisma \`contains\`) | ${pct(keyword.precisionAt1)} | ${pct(keyword.precisionAt3)} | ${num(keyword.mrr)} | ${keyword.noResult} / ${results.length} |

Latence moyenne de la recherche sémantique (embedding + classement) : **${avgLatency.toFixed(0)} ms** par requête.

## Par catégorie

| Catégorie | Requêtes | P@3 sémantique | MRR sémantique | P@3 mots-clés | MRR mots-clés |
|---|---|---|---|---|---|
${perCategory.join('\n')}

## Calibration du seuil de pertinence (\`SEARCH_MIN_SCORE\`)

- *Réussite in-scope* : la bonne catégorie figure dans le top 3 **au-dessus du seuil**.
- *Rejet hors sujet* : aucun résultat au-dessus du seuil pour une requête hors sujet.

| Seuil | Réussite in-scope | Rejet hors sujet | Moyenne |
|---|---|---|---|
${thresholdRows.join('\n')}

**Seuil recommandé : ${best.toFixed(2)}** (meilleure moyenne ; seuil actuellement configuré : ${env.SEARCH_MIN_SCORE}).

### Requêtes hors sujet (meilleur score obtenu)

| Requête | Meilleur résultat | Score |
|---|---|---|
${outRows.join('\n')}

## Détail par requête

Rang = position du premier service de la catégorie attendue (✗ = absent).

| Requête | Attendu | Rang sém. | Top 1 sém. | Rang mots-clés | Top 1 mots-clés |
|---|---|---|---|---|---|
${perQuery.join('\n')}
`;
  return { markdown, semantic, keyword, best };
}

/** `npm run eval` : évalue la recherche sémantique vs mots-clés et écrit eval/results.md. */
async function main(): Promise<void> {
  try {
    const dataset = datasetSchema.parse(JSON.parse(await readFile(resolve(EVAL_DIR, 'queries.json'), 'utf8')));
    const status = await embeddingService.init();
    if (status !== 'ready') {
      throw new Error(`Modèle indisponible (état : ${status})`);
    }
    const serviceCount = await prisma.service.count({ where: { NOT: { embedding: { isEmpty: true } } } });
    if (serviceCount === 0) {
      throw new Error('Aucun service indexé : lancez « npm run seed » d’abord.');
    }

    const results: QueryResult[] = [];
    for (const { q, expectedCategory } of dataset.queries) {
      const startedAt = performance.now();
      const semantic = await semanticSearch(q, { limit: ALL, minScore: -1 });
      const latencyMs = performance.now() - startedAt;
      const keyword = await keywordSearch(q, { limit: ALL });
      results.push({
        q,
        expected: expectedCategory,
        semantic,
        keyword,
        semanticRank: firstRelevantRank(semantic, expectedCategory),
        keywordRank: firstRelevantRank(keyword, expectedCategory),
        latencyMs,
      });
    }
    const outOfScope = [];
    for (const q of dataset.outOfScope) {
      const [top] = await semanticSearch(q, { limit: 1, minScore: -1 });
      outOfScope.push({ q, top });
    }

    const report = renderReport(dataset, results, outOfScope, serviceCount);
    await writeFile(resolve(EVAL_DIR, 'results.md'), report.markdown, 'utf8');
    console.info(
      `Sémantique : P@3 ${pct(report.semantic.precisionAt3)}, MRR ${num(report.semantic.mrr)} | ` +
        `Mots-clés : P@3 ${pct(report.keyword.precisionAt3)}, MRR ${num(report.keyword.mrr)} | ` +
        `Seuil recommandé ${report.best.toFixed(2)} → eval/results.md`,
    );
  } catch (error: unknown) {
    console.error('Échec de l’évaluation :', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
