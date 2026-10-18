/**
 * Evaluation of the 5 AI modules on annotated cases, for one or several models.
 *
 *   npm run eval -w server -- mock google/gemma-4-31b-it:free nvidia/nemotron-3-super-120b-a12b:free
 *
 * "mock" runs the demo mode. Real models need OPENROUTER_API_KEY in server/.env.
 * Results (JSON validity, accuracy, latency, tokens, retries) are written to docs/EVALUATION.md.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { AiLogModel } from '../ai/AiLog.model.js';
import { config } from '../core/config.js';
import { CASES, type EvalCase } from './cases.js';

interface CaseResult {
  model: string;
  module: EvalCase['module'];
  name: string;
  valid: boolean;
  correct: boolean;
  detail: string;
  durationMs: number;
  attempts: number;
  promptTokens: number;
  completionTokens: number;
}

const apiKey = config.ai.apiKey;
const models = process.argv.slice(2).length ? process.argv.slice(2) : ['mock'];
const pauseMs = Number(process.env.EVAL_PAUSE_MS ?? 4000);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runCase(model: string, c: EvalCase): Promise<CaseResult> {
  const started = Date.now();
  let valid = true;
  let detail = '';
  let output: unknown;
  try {
    output = await c.run();
  } catch (err) {
    valid = false;
    detail = `${(err as { code?: string }).code ?? 'ERROR'} : ${(err as Error).message}`;
  }
  const log = await AiLogModel.findOne({ module: c.task }).sort({ createdAt: -1 }).lean();
  const reason = valid ? c.check(output as never) : detail;
  return {
    model,
    module: c.module,
    name: c.name,
    valid,
    correct: valid && reason === null,
    detail: reason ?? '',
    durationMs: log?.durationMs ?? Date.now() - started,
    attempts: log?.attempts ?? 1,
    promptTokens: log?.promptTokens ?? 0,
    completionTokens: log?.completionTokens ?? 0,
  };
}

const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)} %` : '-');
const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

function report(results: CaseResult[]): string {
  const lines = [
    '# Évaluation des modules IA',
    '',
    `Généré par \`npm run eval -w server\` le ${new Date().toLocaleString('fr-FR', { timeZone: 'Africa/Tunis' })}.`,
    `${CASES.length} cas annotés (voir \`server/src/eval/cases.ts\`), mêmes prompts et schémas Zod que l'application.`,
    '',
    '- **JSON valide** : réponse conforme au schéma Zod (après au plus une relance corrective).',
    '- **Correct** : réponse valide ET conforme à l\'attendu (bonne catégorie, filtres extraits, fourchette plausible, pas de donnée personnelle reprise...).',
    '- **Relances** : nombre de cas où la première réponse était invalide et a été corrigée par la relance.',
    '',
    '## Synthèse par modèle',
    '',
    '| Modèle | JSON valide | Correct | Relances | Latence médiane | Tokens moyens (entrée / sortie) |',
    '|---|---|---|---|---|---|',
  ];
  for (const model of models) {
    const r = results.filter((x) => x.model === model);
    const real = model !== 'mock';
    lines.push(
      `| \`${model}\` | ${pct(r.filter((x) => x.valid).length, r.length)} | ${pct(r.filter((x) => x.correct).length, r.length)} | ${r.filter((x) => x.attempts > 1).length} | ${real ? `${(median(r.map((x) => x.durationMs)) / 1000).toFixed(1)} s` : '< 1 ms'} | ${real ? `${Math.round(r.reduce((a, x) => a + x.promptTokens, 0) / r.length)} / ${Math.round(r.reduce((a, x) => a + x.completionTokens, 0) / r.length)}` : '-'} |`,
    );
  }
  lines.push('', '## Détail par cas', '', '| Modèle | Module | Cas | Valide | Correct | Durée | Remarque |', '|---|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(`| \`${r.model}\` | ${r.module} | ${r.name} | ${r.valid ? '✅' : '❌'} | ${r.correct ? '✅' : '❌'} | ${(r.durationMs / 1000).toFixed(1)} s | ${r.detail.replace(/\|/g, '/')} |`);
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  // AiLog entries (latency, tokens, attempts) are written to a throwaway in-memory database.
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const results: CaseResult[] = [];
  try {
    for (const model of models) {
      if (model === 'mock') {
        config.ai.apiKey = '';
        config.ai.mock = true;
      } else {
        if (!apiKey) throw new Error('OPENROUTER_API_KEY manquant dans server/.env');
        config.ai.apiKey = apiKey;
        config.ai.model = model;
        config.ai.timeoutMs = 60_000;
      }
      for (const c of CASES) {
        const r = await runCase(model, c);
        results.push(r);
        console.log(`${r.correct ? 'OK  ' : r.valid ? 'FAUX' : 'ERR '} ${model} · ${c.module} · ${c.name} (${(r.durationMs / 1000).toFixed(1)} s) ${r.detail}`);
        if (model !== 'mock') await sleep(pauseMs);
      }
    }
    const out = resolve(import.meta.dirname, '../../../docs/EVALUATION.md');
    writeFileSync(out, report(results));
    console.log(`\nRapport écrit dans ${out}`);
  } finally {
    await mongoose.disconnect();
    await mongo.stop();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
