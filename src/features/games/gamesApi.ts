import { apiFetch, ApiError, API_BASE } from '@/lib/api-client';
import type { CursorPage } from '@/features/friends/types';
import type { GameCatalogDto, GameFavoriteDto, GameDetailResult, GameSort } from './types';

/** Keyset cursor list params. Default page size 24 (matches the backend default), max 50. */
interface CursorParams {
  limit?: number;
  cursor?: string;
}

function cursorQuery(qs: URLSearchParams, params?: CursorParams) {
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.cursor) qs.set('after', params.cursor);
}

interface ListGamesParams extends CursorParams {
  query?: string;
  category?: string[];
  tag?: string[];
  mode?: string[];
  lifecycle?: string[];
  sort?: GameSort;
}

export const gamesApi = {
  list: (params?: ListGamesParams) => {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('query', params.query);
    params?.category?.forEach(v => qs.append('category', v));
    params?.tag?.forEach(v => qs.append('tag', v));
    params?.mode?.forEach(v => qs.append('mode', v));
    params?.lifecycle?.forEach(v => qs.append('lifecycle', v));
    if (params?.sort) qs.set('sort', params.sort);
    cursorQuery(qs, params);
    const suffix = qs.toString();
    return apiFetch<CursorPage<GameCatalogDto>>(`/api/games${suffix ? `?${suffix}` : ''}`);
  },

  // 204 (no featured game) is handled generically by apiFetch, which returns undefined for it.
  getFeatured: () => apiFetch<GameCatalogDto | undefined>('/api/games/featured'),

  // A Retired detail read returns 410 with a GameTombstoneDto body (not the ApiErrorResponse envelope), so
  // it cannot go through apiFetch's generic error path — that would discard the tombstone's name/reasonCode.
  getDetail: async (slug: string): Promise<GameDetailResult> => {
    const response = await fetch(`${API_BASE}/api/games/${encodeURIComponent(slug)}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 410) {
      return { kind: 'tombstone', tombstone: await response.json() };
    }
    if (!response.ok) {
      const result = await response.json().catch(() => ({} as { error?: { code?: string; message?: string } }));
      throw new ApiError(
        response.status,
        result.error?.code ?? `http_${response.status}`,
        result.error?.message ?? 'Something went wrong. Please try again.',
      );
    }
    return { kind: 'game', game: await response.json() };
  },

  getFavorites: (params?: CursorParams) => {
    const qs = new URLSearchParams();
    cursorQuery(qs, params);
    const suffix = qs.toString();
    return apiFetch<CursorPage<GameFavoriteDto>>(`/api/games/me/favorites${suffix ? `?${suffix}` : ''}`);
  },

  favorite: (slug: string) =>
    apiFetch<GameFavoriteDto>(`/api/games/me/favorites/${encodeURIComponent(slug)}`, 'PUT'),

  unfavorite: (slug: string) =>
    apiFetch<void>(`/api/games/me/favorites/${encodeURIComponent(slug)}`, 'DELETE'),
};
