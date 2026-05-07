import { camelizeKeys } from '../utils/format';
import { useAuthStore } from '../store/auth';
import { requestAuthToken } from './auth';
import { DimesApiError } from '@dimes-dot-fi/sdk';

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://api-sandbox.dimes.fi';

export { DimesApiError as ApiError };

interface ApiErrorBody {
  error?: {
    type?: string;
    code?: string;
    message?: string;
    params?: Record<string, unknown>;
  };
}

async function throwFromResponse(response: Response): Promise<never> {
  const rawBody = await response.text();
  let parsed: ApiErrorBody | null = null;
  try {
    parsed = rawBody ? (JSON.parse(rawBody) as ApiErrorBody) : null;
  } catch {
    parsed = null;
  }
  const code = parsed?.error?.code ?? null;
  const type = parsed?.error?.type ?? null;
  const message =
    parsed?.error?.message ?? code ?? rawBody ?? `API error ${response.status}`;
  const rawParams = parsed?.error?.params;
  const params =
    rawParams && typeof rawParams === 'object'
      ? camelizeKeys<Record<string, unknown>>(rawParams)
      : null;
  throw new DimesApiError({ status: response.status, code: code ?? 'unknown_error', type, message: message ?? 'Unknown error', params });
}

function getAuthHeaders(): Record<string, string> {
  const jwt = useAuthStore.getState().jwt;
  if (jwt) {
    return { Authorization: `Bearer ${jwt}` };
  }
  return {};
}

async function refreshToken(): Promise<string | null> {
  const { walletAddress, setAuth } = useAuthStore.getState();
  if (!walletAddress) return null;
  const result = await requestAuthToken(walletAddress);
  setAuth(result.token, walletAddress, result.expiresAt);
  return result.token;
}

async function request<T>(path: string, options?: RequestInit, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(auth ? getAuthHeaders() : {}),
    ...(options?.headers as Record<string, string> | undefined),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && auth) {
    const newJwt = await refreshToken();
    if (newJwt) {
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newJwt}` },
      });
      if (!retryResponse.ok) {
        await throwFromResponse(retryResponse);
      }
      return camelizeKeys<T>(await retryResponse.json());
    }
  }

  if (!response.ok) {
    await throwFromResponse(response);
  }

  return camelizeKeys<T>(await response.json());
}

/** Fetch a list endpoint — unwraps the `data` array from `{ data, has_more }`. */
export async function apiFetchList<T>(path: string, options?: RequestInit): Promise<T[]> {
  const result = await request<{ data: T[] }>(path, options);
  return result.data;
}

/** Fetch a list endpoint, returning both data and pagination info. */
export async function apiFetchListWithPagination<T>(
  path: string,
  options?: RequestInit,
): Promise<{ data: T[]; hasMore: boolean }> {
  return request<{ data: T[]; hasMore: boolean }>(path, options);
}

/** Fetch a single-object endpoint — returns the response as-is. */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, options);
}

/** Like `apiFetch` but skips the Authorization header. */
export async function apiFetchPublic<T>(path: string, options?: RequestInit): Promise<T> {
  return request<T>(path, options, false);
}
