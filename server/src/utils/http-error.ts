/** Codes d'erreur métier renvoyés dans `error.code`. */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL_ERROR'
  | 'NOT_IMPLEMENTED';

/** Détail d'une erreur de validation (champ + message), sans information interne. */
export interface ErrorDetail {
  readonly path: string;
  readonly message: string;
}

/** Erreur HTTP « attendue », transformée en réponse JSON par le middleware d'erreurs. */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: ErrorCode;
  public readonly details: readonly ErrorDetail[] | undefined;

  /**
   * @param status Code HTTP.
   * @param code Code d'erreur métier.
   * @param message Message lisible, destiné au client.
   * @param details Détails de validation éventuels.
   */
  constructor(status: number, code: ErrorCode, message: string, details?: readonly ErrorDetail[]) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** 400 — entrée invalide (détails Zod). */
  static validation(details: readonly ErrorDetail[]): HttpError {
    return new HttpError(400, 'VALIDATION_ERROR', 'Données invalides', details);
  }

  /** 400 — requête incorrecte. */
  static badRequest(message: string): HttpError {
    return new HttpError(400, 'BAD_REQUEST', message);
  }

  /** 401 — authentification absente ou invalide. */
  static unauthorized(message = 'Authentification requise'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  /** 403 — authentifié mais non autorisé. */
  static forbidden(message = 'Accès refusé'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  /** 404 — ressource introuvable. */
  static notFound(message = 'Ressource introuvable'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  /** 409 — conflit avec l'état actuel de la ressource. */
  static conflict(message: string): HttpError {
    return new HttpError(409, 'CONFLICT', message);
  }

  /** 501 — fonctionnalité non encore implémentée. */
  static notImplemented(message = 'Fonctionnalité non implémentée'): HttpError {
    return new HttpError(501, 'NOT_IMPLEMENTED', message);
  }
}
