import type {
  AssistantResult,
  Category,
  ProviderDetail,
  ProviderSummary,
  Review,
  ReviewSummary,
} from './types';

// Dev: '/api' is proxied by Vite. Prod: nginx proxies it, or set VITE_API_URL at build time.
const BASE = import.meta.env.VITE_API_URL ?? '/api';

// Stub for module M1 (auth): the demo client seeded with id 1.
const DEMO_USER_ID = '1';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'x-user-id': DEMO_USER_ID, ...init.headers },
    });
  } catch {
    throw new ApiError('Serveur injoignable. Vérifiez votre connexion.', 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.error?.message ?? 'Une erreur est survenue.', res.status, body?.error?.code);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const json = (body: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(body) });

export const api = {
  categories: () => request<Category[]>('/categories'),
  providers: (params: URLSearchParams) =>
    request<ProviderSummary[]>(`/providers?${params.toString()}`),
  provider: (id: number, lat: number, lng: number) =>
    request<ProviderDetail>(`/providers/${id}?lat=${lat}&lng=${lng}`),
  reviews: (id: number) => request<Review[]>(`/providers/${id}/reviews`),
  postReview: (id: number, note: number, commentaire: string) =>
    request<Review>(`/providers/${id}/reviews`, json({ note, commentaire })),
  setFavorite: (id: number, on: boolean) =>
    request<void>(`/favorites/${id}`, { method: on ? 'PUT' : 'DELETE' }),
  aiReviewSummary: (providerId: number) =>
    request<ReviewSummary>('/ai/review-summary', json({ providerId })),
  aiAssistant: (message: string) => request<AssistantResult>('/ai/assistant', json({ message })),
};
