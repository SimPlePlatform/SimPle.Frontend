import { apiFetch } from '@/lib/api-client';
import type {
  CreateLobbyRequestDto,
  CreateLobbyResultDto,
  JoinLobbyRequestDto,
  LobbyDto,
  UpdateLobbySettingsRequestDto,
  SetReadinessRequestDto,
  KickMemberRequestDto,
  CreateInviteRequestDto,
  LobbyInviteDto,
  LobbyCredentialDto,
  StartLobbyRequestDto,
  StartLobbyResultDto,
  LobbySummaryDto,
  ActiveContextDto,
  CursorPage,
  GameCapabilityProfileDto,
} from './types';

interface CursorParams {
  limit?: number;
  cursor?: string;
}

export const lobbyApi = {
  create: (request: CreateLobbyRequestDto) =>
    apiFetch<CreateLobbyResultDto>('/api/lobbies', 'POST', request),

  getPublic: (params?: CursorParams) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set('limit', String(params.limit));
    if (params?.cursor) qs.set('cursor', params.cursor);
    const suffix = qs.toString();
    return apiFetch<CursorPage<LobbySummaryDto>>(`/api/lobbies${suffix ? `?${suffix}` : ''}`);
  },

  get: (lobbyId: string) =>
    apiFetch<LobbyDto>(`/api/lobbies/${lobbyId}`),

  getCapabilityProfile: (gameSlug: string) =>
    apiFetch<GameCapabilityProfileDto>(`/api/lobbies/capabilities/${encodeURIComponent(gameSlug)}`),

  getMyInvites: () =>
    apiFetch<LobbyInviteDto[]>('/api/lobbies/me/invites'),

  getMyActive: () =>
    apiFetch<ActiveContextDto>('/api/lobbies/me/active'),

  join: (request: JoinLobbyRequestDto) =>
    apiFetch<LobbyDto>('/api/lobbies/join', 'POST', request),

  leave: (lobbyId: string) =>
    apiFetch<void>(`/api/lobbies/${lobbyId}/leave`, 'POST'),

  setReadiness: (lobbyId: string, request: SetReadinessRequestDto) =>
    apiFetch<LobbyDto>(`/api/lobbies/${lobbyId}/ready`, 'PUT', request),

  updateSettings: (lobbyId: string, request: UpdateLobbySettingsRequestDto) =>
    apiFetch<LobbyDto>(`/api/lobbies/${lobbyId}/settings`, 'PATCH', request),

  kick: (lobbyId: string, request: KickMemberRequestDto) =>
    apiFetch<LobbyDto>(`/api/lobbies/${lobbyId}/kick`, 'POST', request),

  rotateCredential: (lobbyId: string) =>
    apiFetch<LobbyCredentialDto>(`/api/lobbies/${lobbyId}/credential/rotate`, 'POST'),

  createInvite: (lobbyId: string, request: CreateInviteRequestDto) =>
    apiFetch<LobbyInviteDto>(`/api/lobbies/${lobbyId}/invites`, 'POST', request),

  revokeInvite: (lobbyId: string, inviteId: string) =>
    apiFetch<void>(`/api/lobbies/${lobbyId}/invites/${inviteId}`, 'DELETE'),

  acceptInvite: (inviteId: string) =>
    apiFetch<LobbyDto>(`/api/lobbies/invites/${inviteId}/accept`, 'POST'),

  declineInvite: (inviteId: string) =>
    apiFetch<void>(`/api/lobbies/invites/${inviteId}/decline`, 'POST'),

  start: (lobbyId: string, request: StartLobbyRequestDto) =>
    apiFetch<StartLobbyResultDto>(`/api/lobbies/${lobbyId}/start`, 'POST', request),
};
