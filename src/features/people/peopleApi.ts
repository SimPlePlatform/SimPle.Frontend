import { apiFetch } from '@/lib/api-client';
import type { CursorPage } from '@/features/friends/types';
import type { PeopleSearchResultDto } from './types';

export const peopleApi = {
  search: (q: string, params?: { limit?: number; cursor?: string }) => {
    const qs = new URLSearchParams({ q });
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    return apiFetch<CursorPage<PeopleSearchResultDto>>(`/api/people/search?${qs}`);
  },
};
