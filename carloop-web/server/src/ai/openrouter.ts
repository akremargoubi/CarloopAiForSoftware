import type { z } from 'zod';
import { config } from '../config.js';

export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'AI_AUTH'
  | 'AI_QUOTA'
  | 'AI_TIMEOUT'
  | 'AI_UPSTREAM'
  | 'AI_INVALID_OUTPUT';

export class AiError extends Error {
  constructor(
    public code: AiErrorCode,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Models sometimes wrap JSON in ```json fences or add a sentence around it. */
function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('no json object');
  return JSON.parse(text.slice(start, end + 1));
}

/** One HTTP round trip to OpenRouter; returns the raw text of the model's answer. */
async function requestContent(system: string, user: string): Promise<unknown> {
  const { apiKey, baseUrl, model, timeoutMs, appUrl } = config.openrouter;
  if (!apiKey) {
    throw new AiError(
      'AI_NOT_CONFIGURED',
      503,
      'Le service IA n’est pas configuré (clé OpenRouter absente).',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let content: unknown;
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': 'CarLoop',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (res.status === 401 || res.status === 403) {
      throw new AiError('AI_AUTH', 502, 'Clé OpenRouter invalide ou refusée.');
    }
    if (res.status === 402 || res.status === 429) {
      throw new AiError('AI_QUOTA', 429, 'Quota IA atteint, réessayez dans un instant.');
    }
    if (!res.ok) {
      throw new AiError('AI_UPSTREAM', 502, `Le service IA a répondu ${res.status}.`);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    content = data.choices?.[0]?.message?.content;
  } catch (err) {
    if (err instanceof AiError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AiError('AI_TIMEOUT', 504, 'Le service IA a mis trop de temps à répondre.');
    }
    throw new AiError('AI_UPSTREAM', 502, 'Impossible de joindre le service IA.');
  } finally {
    clearTimeout(timer);
  }
  return content;
}

/**
 * Calls OpenRouter and returns the model's answer parsed AND validated against
 * `schema`. Nothing unvalidated ever reaches the front-end. LLM output is not
 * deterministic, so an off-schema answer is retried once before giving up.
 */
export async function chatJson<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const attempts = 2;
  for (let attempt = 1; ; attempt++) {
    const content = await requestContent(system, user);
    try {
      if (typeof content !== 'string') throw new Error('empty answer');
      return schema.parse(extractJson(content));
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`AI output rejected (attempt ${attempt}/${attempts}): ${reason}\n${content}`);
      if (attempt >= attempts) {
        throw new AiError('AI_INVALID_OUTPUT', 502, 'Réponse IA invalide, veuillez réessayer.');
      }
    }
  }
}
