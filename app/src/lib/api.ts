import Constants from 'expo-constants';
import { auth } from './firebase';
import type { CreateGamePayload } from '../types';

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL: string =
  extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

// Render free tier cold-starts can take well over the default fetch timeout.
const REQUEST_TIMEOUT_MS = 65_000;

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      'API_BASE_URL is not set. Set EXPO_PUBLIC_API_BASE_URL in app/.env.'
    );
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.auth !== false) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Not signed in.');
    }
    const token = await user.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        'The server took too long to respond. It may be waking up from a cold start, try again in a few seconds.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      (data && (data.error || data.message)) || `Request failed (${response.status})`,
      data
    );
  }

  return data as T;
}

export const api = {
  health: () => request<{ ok: true }>('/health', { auth: false }),

  createGame: (body: CreateGamePayload) =>
    request<{ id: string }>('/api/games', { method: 'POST', body }),

  joinGame: (id: string) =>
    request<{ ok: true }>(`/api/games/${id}/join`, { method: 'POST' }),

  leaveGame: (id: string) =>
    request<{ ok: true }>(`/api/games/${id}/leave`, { method: 'POST' }),

  cancelGame: (id: string) =>
    request<{ ok: true }>(`/api/games/${id}`, { method: 'DELETE' }),

  refreshWeather: (id: string) =>
    request<{ ok: true }>(`/api/games/${id}/refresh-weather`, {
      method: 'POST',
    }),
};
