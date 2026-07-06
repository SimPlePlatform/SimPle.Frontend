import { apiFetch } from '@/lib/api-client';
import type {
  FriendSummaryDto,
  FriendDto,
  FriendRequestDto,
  SendFriendRequestResult,
  FriendSuggestionDto,
  DiscoveryResultDto,
  BlockDto,
  BlockUserResult,
  FriendSettingsDto,
  FriendRequestPrivacy,
  CursorPage,
} from './types';

/** Keyset cursor list params. `limit` default 20 / max 50 (suggestions cap 20). */
interface CursorParams {
  limit?: number;
  cursor?: string;
}

function cursorQuery(qs: URLSearchParams, params?: CursorParams) {
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.cursor) qs.set('cursor', params.cursor);
}

export const friendsApi = {
  getSummary: () =>
    apiFetch<FriendSummaryDto>('/api/friends/summary'),

  getFriends: (params?: CursorParams & { query?: string }) => {
    const qs = new URLSearchParams();
    if (params?.query) qs.set('query', params.query);
    cursorQuery(qs, params);
    const suffix = qs.toString();
    return apiFetch<CursorPage<FriendDto>>(`/api/friends${suffix ? `?${suffix}` : ''}`);
  },

  getRequests: (direction: 'incoming' | 'outgoing', params?: CursorParams) => {
    const qs = new URLSearchParams({ direction });
    cursorQuery(qs, params);
    return apiFetch<CursorPage<FriendRequestDto>>(`/api/friends/requests?${qs}`);
  },

  getSuggestions: (limit = 20) =>
    apiFetch<FriendSuggestionDto[]>(`/api/friends/suggestions?limit=${limit}`),

  // Exact-username safe discovery. Any ineligible/hidden/nonexistent target → 404 Profile.NotVisible.
  discover: (username: string) =>
    apiFetch<DiscoveryResultDto>(`/api/friends/discovery?username=${encodeURIComponent(username)}`),

  dismissSuggestion: (userId: string) =>
    apiFetch<void>(`/api/friends/suggestions/${userId}/dismiss`, 'PUT'),

  getBlocks: (params?: CursorParams) => {
    const qs = new URLSearchParams();
    cursorQuery(qs, params);
    const suffix = qs.toString();
    return apiFetch<CursorPage<BlockDto>>(`/api/friends/blocks${suffix ? `?${suffix}` : ''}`);
  },

  getSettings: () =>
    apiFetch<FriendSettingsDto>('/api/friends/settings'),

  sendRequest: (targetUserId: string, idempotencyKey?: string) =>
    apiFetch<SendFriendRequestResult>('/api/friends/requests', 'POST',
      idempotencyKey ? { targetUserId, idempotencyKey } : { targetUserId }),

  acceptRequest: (requestId: string) =>
    apiFetch<FriendRequestDto>(`/api/friends/requests/${requestId}/accept`, 'POST'),

  declineRequest: (requestId: string) =>
    apiFetch<FriendRequestDto>(`/api/friends/requests/${requestId}/decline`, 'POST'),

  cancelRequest: (requestId: string) =>
    apiFetch<void>(`/api/friends/requests/${requestId}`, 'DELETE'),

  removeFriend: (friendUserId: string) =>
    apiFetch<void>(`/api/friends/${friendUserId}`, 'DELETE'),

  blockUser: (targetUserId: string) =>
    apiFetch<BlockUserResult>('/api/friends/blocks', 'POST', { targetUserId }),

  unblockUser: (blockedUserId: string) =>
    apiFetch<void>(`/api/friends/blocks/${blockedUserId}`, 'DELETE'),

  updateSettings: (privacy: FriendRequestPrivacy) =>
    apiFetch<FriendSettingsDto>('/api/friends/settings', 'PUT', { friendRequestPrivacy: privacy }),
};
