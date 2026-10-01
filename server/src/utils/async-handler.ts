import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** Handler Express asynchrone. */
export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Enveloppe un handler asynchrone pour transmettre toute erreur au middleware d'erreurs.
 * @param handler Handler asynchrone (controller).
 * @returns Un RequestHandler Express.
 */
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await handler(req, res, next);
    } catch (error: unknown) {
      next(error);
    }
  };
}
