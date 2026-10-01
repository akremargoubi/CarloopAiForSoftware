import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AiError } from './ai/openrouter.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Stub for module M1 (authentication): the "logged in" client is read from the
 * x-user-id header and defaults to the seeded demo client (id 1).
 */
export function currentUser(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.header('x-user-id') ?? 1);
  res.locals.userId = Number.isInteger(id) && id > 0 ? id : 1;
  next();
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { code: 'VALIDATION', message: err.issues.map((i) => i.message).join(', ') },
    });
    return;
  }
  if (err instanceof HttpError || err instanceof AiError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Erreur interne du serveur.' } });
}
