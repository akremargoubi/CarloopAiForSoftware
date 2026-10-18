/** HTTP error carrying a status code and a stable machine-readable code. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, 'BAD_REQUEST', message, details);
export const unauthorized = (message = 'Authentification requise') =>
  new HttpError(401, 'UNAUTHORIZED', message);
export const forbidden = (message = 'Accès refusé') => new HttpError(403, 'FORBIDDEN', message);
export const notFound = (message = 'Ressource introuvable') =>
  new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message: string) => new HttpError(409, 'CONFLICT', message);
