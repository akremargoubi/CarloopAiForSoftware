import { AiInvalidOutputError } from './errors.js';

/**
 * Extracts the JSON value from a raw LLM answer.
 * Handles ```json fences, leading/trailing prose and a UTF-8 BOM.
 * Throws AiInvalidOutputError when no parseable JSON object/array is found.
 */
export function extractJson(raw: string): unknown {
  // trim() also removes a leading UTF-8 BOM.
  let text = raw.trim();

  const fence = text.match(/```(?:json|JSON)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  try {
    return JSON.parse(text);
  } catch {
    // Fall back to the outermost {...} or [...] block.
  }

  const firstBrace = text.search(/[{[]/);
  if (firstBrace === -1) throw new AiInvalidOutputError('La réponse du service IA ne contient pas de JSON.');
  const closing = text[firstBrace] === '{' ? '}' : ']';
  const last = text.lastIndexOf(closing);
  if (last <= firstBrace) throw new AiInvalidOutputError('La réponse du service IA ne contient pas de JSON.');

  try {
    return JSON.parse(text.slice(firstBrace, last + 1));
  } catch {
    throw new AiInvalidOutputError('La réponse du service IA n’est pas un JSON valide.');
  }
}
