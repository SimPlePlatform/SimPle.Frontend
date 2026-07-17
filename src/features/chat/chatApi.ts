import { apiFetch } from '@/lib/api-client';
import type { CursorPage } from '@/features/friends/types';
import type { ChatHistoryDirection, ChatMessageDto } from './types';

interface ChatHistoryParams {
  cursor?: string;
  direction?: ChatHistoryDirection;
  limit?: number;
}

export const chatApi = {
  getHistory: (lobbyId: string, params?: ChatHistoryParams) => {
    const qs = new URLSearchParams();
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.direction) qs.set('direction', params.direction);
    if (params?.limit != null) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    return apiFetch<CursorPage<ChatMessageDto>>(`/api/chat/lobbies/${lobbyId}/messages${suffix ? `?${suffix}` : ''}`);
  },

  deleteMessage: (messageId: string) =>
    apiFetch<void>(`/api/chat/messages/${messageId}`, 'DELETE'),
};
