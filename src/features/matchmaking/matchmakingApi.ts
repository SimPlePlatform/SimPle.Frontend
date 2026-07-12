import { apiFetch } from '@/lib/api-client';
import type { CreateTicketRequestDto, TicketDto } from './types';

export const matchmakingApi = {
  createTicket: (request: CreateTicketRequestDto) =>
    apiFetch<TicketDto>('/api/matchmaking/tickets', 'POST', request),

  getTicket: (ticketId: string) =>
    apiFetch<TicketDto>(`/api/matchmaking/tickets/${ticketId}`),

  cancelTicket: (ticketId: string) =>
    apiFetch<TicketDto>(`/api/matchmaking/tickets/${ticketId}`, 'DELETE'),
};
