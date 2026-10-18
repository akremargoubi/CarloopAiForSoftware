import { toApiError } from '../api/client';

interface ErrorCopy {
  title: string;
  hint: string;
  retryable: boolean;
}

/** User-facing copy for each error code returned by the AI layer. */
export function describeAiError(code: string): ErrorCopy {
  switch (code) {
    case 'AI_TIMEOUT':
    case 'CLIENT_TIMEOUT':
      return { title: 'L’assistant IA met trop de temps à répondre', hint: 'Réessayez dans quelques secondes.', retryable: true };
    case 'AI_QUOTA_EXCEEDED':
      return { title: 'Quota du service IA dépassé', hint: 'Le quota de requêtes est atteint. Réessayez plus tard.', retryable: true };
    case 'RATE_LIMITED':
      return { title: 'Trop de demandes', hint: 'Vous avez envoyé beaucoup de requêtes. Patientez une minute.', retryable: true };
    case 'AI_NOT_CONFIGURED':
      return {
        title: 'Service IA non configuré',
        hint: 'La clé OpenRouter est absente. L’administrateur doit la renseigner ou activer le mode démo (AI_MOCK=true).',
        retryable: false,
      };
    case 'AI_INVALID_OUTPUT':
      return { title: 'Réponse de l’IA inexploitable', hint: 'La réponse reçue ne respectait pas le format attendu. Réessayez.', retryable: true };
    case 'AI_UPSTREAM_ERROR':
      return { title: 'Service IA momentanément indisponible', hint: 'Le fournisseur IA ne répond pas. Réessayez plus tard.', retryable: true };
    case 'NETWORK_ERROR':
      return { title: 'Serveur injoignable', hint: 'Vérifiez votre connexion internet.', retryable: true };
    case 'UNAUTHORIZED':
      return { title: 'Connexion requise', hint: 'Connectez-vous pour utiliser cette fonctionnalité.', retryable: false };
    case 'VALIDATION_ERROR':
      return { title: 'Données invalides', hint: 'Vérifiez les champs du formulaire.', retryable: false };
    default:
      return { title: 'Une erreur est survenue', hint: 'Réessayez dans un instant.', retryable: true };
  }
}

/** Error box adapted to the type of AI error (timeout, quota, missing key, invalid answer...). */
export function AiErrorDisplay({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = toApiError(error);
  const copy = describeAiError(apiError.code);
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm" role="alert">
      <p className="font-semibold text-red-800">{copy.title}</p>
      <p className="mt-1 text-red-700">{copy.hint}</p>
      {apiError.code === 'VALIDATION_ERROR' && apiError.message && (
        <p className="mt-1 text-red-700">{apiError.message}</p>
      )}
      {copy.retryable && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-white px-3 py-1.5 font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}

/** Generic (non-AI) error message. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  const apiError = toApiError(error);
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {apiError.message}
    </div>
  );
}
