import type { z } from 'zod';
import { HttpError } from './http-error';

/**
 * Valide une entrée utilisateur avec un schéma Zod.
 * @param schema Schéma Zod.
 * @param data Donnée brute (body, query, params).
 * @returns La donnée validée et typée.
 * @throws HttpError 400 avec la liste des champs invalides.
 */
export function validate<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw HttpError.validation(
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    );
  }
  return result.data;
}
