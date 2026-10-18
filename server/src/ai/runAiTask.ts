import type { z, ZodTypeAny } from 'zod';
import { config } from '../core/config.js';
import { AiLogModel } from './AiLog.model.js';
import { anonymize } from './anonymizer.js';
import { AiConfigError, AiError, AiInvalidOutputError } from './errors.js';
import { extractJson } from './jsonExtract.js';
import { callLlm, type ChatMessage, type LlmUsage } from './llmClient.js';

export interface RunAiTaskOptions<T extends ZodTypeAny> {
  /** Simulated answer used in demo mode (no API key + AI_MOCK=true). Validated like a real answer. */
  mock?: () => z.input<T>;
  /** Names of known users to mask in addition to the generic PII patterns. */
  knownNames?: string[];
  temperature?: number;
  maxTokens?: number;
}

export type UserInput = string | ChatMessage[];

/** Returns true when the AI layer runs in demo mode (simulated answers). */
export function isAiMockMode(): boolean {
  return !config.ai.apiKey && config.ai.mock;
}

function toMessages(input: UserInput): ChatMessage[] {
  if (typeof input === 'string') return [{ role: 'user', content: input }];
  return input;
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 10).map((i) => `${i.path.join('.') || '(racine)'}: ${i.message}`);
}

async function writeLog(entry: {
  module: string;
  success: boolean;
  errorCode?: string;
  durationMs: number;
  mock: boolean;
  model?: string;
  attempts: number;
  usage?: LlmUsage;
  piiMasked: number;
}) {
  try {
    await AiLogModel.create({
      module: entry.module,
      success: entry.success,
      errorCode: entry.errorCode,
      durationMs: entry.durationMs,
      mock: entry.mock,
      model: entry.model,
      attempts: entry.attempts,
      promptTokens: entry.usage?.promptTokens,
      completionTokens: entry.usage?.completionTokens,
      totalTokens: entry.usage?.totalTokens,
      piiMasked: entry.piiMasked,
    });
  } catch (err) {
    // Logging must never break the user request.
    if (!config.isTest) console.warn('[ai] unable to write AiLog', (err as Error).message);
  }
}

/**
 * Shared AI pipeline used by the 5 modules:
 * anonymize → call LLM → extract JSON → validate with Zod → typed result (or typed AiError).
 * An invalid answer triggers one corrective retry that includes the validation errors.
 * Every call is logged in AiLog without any personal data.
 */
export async function runAiTask<T extends ZodTypeAny>(
  taskName: string,
  systemPrompt: string,
  userMessage: UserInput,
  schema: T,
  options: RunAiTaskOptions<T> = {},
): Promise<z.output<T>> {
  const startedAt = Date.now();
  let attempts = 0;
  let piiMasked = 0;
  let usage: LlmUsage | undefined;
  let model: string | undefined;
  const mock = isAiMockMode();

  try {
    if (!config.ai.apiKey) {
      if (!config.ai.mock || !options.mock) throw new AiConfigError();
      attempts = 1;
      const parsed = schema.safeParse(options.mock());
      if (!parsed.success) {
        throw new AiInvalidOutputError(undefined, formatIssues(parsed.error));
      }
      await writeLog({ module: taskName, success: true, durationMs: Date.now() - startedAt, mock, attempts, piiMasked });
      return parsed.data;
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...toMessages(userMessage).map((m) => {
        const result = anonymize(m.content, { knownNames: options.knownNames });
        piiMasked += Object.values(result.counts).reduce((a, b) => a + b, 0);
        return { role: m.role, content: result.text };
      }),
    ];

    let lastIssues: string[] = [];
    while (attempts < 2) {
      attempts++;
      const response = await callLlm(messages, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      });
      model = response.model;
      usage = {
        promptTokens: (usage?.promptTokens ?? 0) + (response.usage.promptTokens ?? 0),
        completionTokens: (usage?.completionTokens ?? 0) + (response.usage.completionTokens ?? 0),
        totalTokens: (usage?.totalTokens ?? 0) + (response.usage.totalTokens ?? 0),
      };

      let json: unknown;
      try {
        json = extractJson(response.content);
      } catch {
        lastIssues = ['La réponse n’est pas un JSON valide'];
        messages.push(
          { role: 'assistant', content: response.content.slice(0, 2000) },
          { role: 'user', content: 'Ta réponse n’est pas un JSON valide. Réponds uniquement avec le JSON demandé, sans texte autour.' },
        );
        continue;
      }
      const parsed = schema.safeParse(json);
      if (parsed.success) {
        await writeLog({ module: taskName, success: true, durationMs: Date.now() - startedAt, mock, model, attempts, usage, piiMasked });
        return parsed.data;
      }
      lastIssues = formatIssues(parsed.error);
      messages.push(
        { role: 'assistant', content: response.content.slice(0, 2000) },
        {
          role: 'user',
          content: `Ton JSON ne respecte pas le schéma demandé :\n- ${lastIssues.join('\n- ')}\nCorrige et renvoie uniquement le JSON complet.`,
        },
      );
    }
    throw new AiInvalidOutputError(undefined, lastIssues);
  } catch (err) {
    const errorCode = err instanceof AiError ? err.code : 'INTERNAL_ERROR';
    await writeLog({ module: taskName, success: false, errorCode, durationMs: Date.now() - startedAt, mock, model, attempts: Math.max(attempts, 1), usage, piiMasked });
    throw err;
  }
}
