import { HttpError } from '../core/errors.js';

/** Base class of every error raised by the AI layer; converted to HTTP by the error handler. */
export class AiError extends HttpError {}

/** The LLM did not answer within the configured timeout. */
export class AiTimeoutError extends AiError {
  constructor(message = 'Le service IA met trop de temps à répondre. Réessayez dans un instant.') {
    super(504, 'AI_TIMEOUT', message);
    this.name = 'AiTimeoutError';
  }
}

/** Quota or rate limit exceeded on the provider side (HTTP 429 / 402). */
export class AiQuotaError extends AiError {
  constructor(message = 'Quota du service IA dépassé. Réessayez plus tard.') {
    super(429, 'AI_QUOTA_EXCEEDED', message);
    this.name = 'AiQuotaError';
  }
}

/** Missing or rejected API key / model configuration. */
export class AiConfigError extends AiError {
  constructor(message = 'Service IA non configuré') {
    super(503, 'AI_NOT_CONFIGURED', message);
    this.name = 'AiConfigError';
  }
}

/** The LLM answered, but the answer is not valid JSON or does not match the schema. */
export class AiInvalidOutputError extends AiError {
  constructor(message = 'La réponse du service IA est invalide. Réessayez.', details?: unknown) {
    super(502, 'AI_INVALID_OUTPUT', message, details);
    this.name = 'AiInvalidOutputError';
  }
}

/** Network failure or 5xx returned by the provider. */
export class AiUpstreamError extends AiError {
  constructor(message = 'Le service IA est momentanément indisponible.') {
    super(502, 'AI_UPSTREAM_ERROR', message);
    this.name = 'AiUpstreamError';
  }
}
