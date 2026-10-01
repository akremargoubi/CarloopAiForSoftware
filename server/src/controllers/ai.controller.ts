import type { Request, Response } from 'express';
import { diagnoseSchema } from '../schemas/ai.schema';
import { HttpError } from '../utils/http-error';
import { validate } from '../utils/validate';

/**
 * POST /api/ai/diagnose — STUB (501) en attendant le module d'Akrem.
 * L'entrée est déjà validée pour figer le contrat d'API.
 */
export async function diagnose(req: Request, _res: Response): Promise<void> {
  validate(diagnoseSchema, req.body);
  throw HttpError.notImplemented('Le diagnostic IA sera bientôt disponible');
}
