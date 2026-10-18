import axios, { AxiosError } from 'axios';

export const TOKEN_STORAGE_KEY = 'carloop.token';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Axios instance used by every module. Adds the JWT automatically. */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  // Slightly above the server AI timeout (15 s + 1 retry) to let the server answer first.
  timeout: 45000,
});

api.interceptors.request.use((request) => {
  const token = readToken();
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

/** Normalised API error shown by the UI. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

/** Converts any thrown value (axios error, network failure...) into an ApiError. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof AxiosError) {
    if (err.code === 'ECONNABORTED') {
      return new ApiError(0, 'CLIENT_TIMEOUT', 'Le serveur met trop de temps à répondre.');
    }
    if (!err.response) {
      return new ApiError(0, 'NETWORK_ERROR', 'Impossible de joindre le serveur.');
    }
    const body = err.response.data as ErrorBody | undefined;
    return new ApiError(
      err.response.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? 'Une erreur est survenue.',
      body?.error?.details,
    );
  }
  return new ApiError(0, 'UNKNOWN', err instanceof Error ? err.message : 'Erreur inconnue');
}

/** Small helpers that unwrap `data` and normalise errors. */
export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  try {
    return (await api.get<T>(url, { params })).data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  try {
    return (await api.post<T>(url, body)).data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiPut<T>(url: string, body?: unknown): Promise<T> {
  try {
    return (await api.put<T>(url, body)).data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  try {
    return (await api.patch<T>(url, body)).data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function apiDelete<T>(url: string): Promise<T> {
  try {
    return (await api.delete<T>(url)).data;
  } catch (err) {
    throw toApiError(err);
  }
}
