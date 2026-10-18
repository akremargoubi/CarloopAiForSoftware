import { config } from '../core/config.js';
import { AiConfigError, AiInvalidOutputError, AiQuotaError, AiTimeoutError, AiUpstreamError } from './errors.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LlmResponse {
  content: string;
  model: string;
  usage: LlmUsage;
}

export interface LlmCallOptions {
  temperature?: number;
  maxTokens?: number;
}

interface OpenAiCompletion {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

const MAX_RETRIES = 1;
const BASE_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 4000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function backoffDelay(attempt: number, retryAfterHeader: string | null): number {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, MAX_BACKOFF_MS);
  return Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);
}

/**
 * Calls the OpenRouter chat completions API (OpenAI-compatible).
 * - Timeout via AbortController (AI_TIMEOUT_MS, 15 s by default)
 * - One retry with exponential backoff on 429 and 5xx
 * - Typed errors: AiConfigError, AiQuotaError, AiTimeoutError, AiUpstreamError, AiInvalidOutputError
 * - OPENROUTER_MODEL may list several comma-separated models: the first is used, the others are
 *   fallbacks tried by OpenRouter when it is unavailable or rate limited.
 */
export async function callLlm(messages: ChatMessage[], options: LlmCallOptions = {}): Promise<LlmResponse> {
  const { apiKey, model, baseUrl, timeoutMs } = config.ai;
  if (!apiKey) throw new AiConfigError();
  const [primary, ...fallbacks] = model.split(',').map((m) => m.trim()).filter(Boolean);
  if (!primary) throw new AiConfigError('Service IA non configuré : OPENROUTER_MODEL manquant');

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/akremargoubi/CarloopAiForSoftware',
          'X-Title': 'CarLoop',
        },
        body: JSON.stringify({
          model: primary,
          ...(fallbacks.length > 0 ? { models: [primary, ...fallbacks] } : {}),
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.maxTokens ?? 2500,
          response_format: { type: 'json_object' },
          // Reasoning models spend hidden tokens before answering: keep it short so the JSON is not truncated.
          reasoning: { effort: 'low', exclude: true },
        }),
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') throw new AiTimeoutError();
      if (attempt < MAX_RETRIES) {
        await sleep(backoffDelay(attempt, null));
        continue;
      }
      throw new AiUpstreamError();
    } finally {
      clearTimeout(timer);
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      await sleep(backoffDelay(attempt, response.headers.get('retry-after')));
      continue;
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiConfigError('Service IA non configuré : clé API refusée');
    }
    if (response.status === 429 || response.status === 402) throw new AiQuotaError();
    if (!response.ok) {
      // Server-side diagnostic only (the client receives a generic message).
      if (!config.isTest) console.warn(`[ai] upstream error ${response.status}: ${(await response.text().catch(() => '')).slice(0, 300)}`);
      throw new AiUpstreamError();
    }

    let body: OpenAiCompletion;
    try {
      body = (await response.json()) as OpenAiCompletion;
    } catch {
      throw new AiInvalidOutputError();
    }
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') throw new AiInvalidOutputError();
    return {
      content,
      model: body.model ?? primary,
      usage: {
        promptTokens: body.usage?.prompt_tokens,
        completionTokens: body.usage?.completion_tokens,
        totalTokens: body.usage?.total_tokens,
      },
    };
  }
}
