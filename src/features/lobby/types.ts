// Module 6 — Lobby & Matchmaking System frontend contract.
// Mirrors SimPLe.Backend/src/SimPle.Application/Lobbies/DTOs (LobbyRequests.cs, LobbyDtos.cs).

import type { PublicIdentity } from '@/features/profile/profileApi';
import type { CursorPage } from '@/features/friends/types';

export type { CursorPage };

export interface DependencyReadinessDto {
  chat: boolean;
  matchRuntime: boolean;
  aiParticipants: boolean;
}

export interface LobbySeatDto {
  identity: PublicIdentity;
  isHost: boolean;
  isReady: boolean;
  joinedAtUtc: string;
}

export const LobbyActions = {
  Leave: 'leave',
  Ready: 'ready',
  Settings: 'settings',
  Invite: 'invite',
  Kick: 'kick',
  RotateCredential: 'rotate-credential',
  Start: 'start',
} as const;

export interface LobbyDto {
  lobbyId: string;
  gameSlug: string;
  capabilityVersion: number;
  privacy: 'Private' | 'Public';
  maxPlayers: number;
  timeControlId: string;
  rated: boolean;
  resolvedRegion: string;
  spectatorPolicy: string;
  tieBreakRuleId: string;
  aiFillRequested: boolean;
  state: 'Open' | 'Starting' | 'Closed';
  revision: number;
  expiresAtUtc: string;
  closedReason: string | null;
  hostUserId: string;
  seats: LobbySeatDto[];
  allowedActions: string[];
  dependencyReadiness: DependencyReadinessDto;
}

export interface LobbyCredentialDto {
  code: string;
  linkToken: string;
  generation: number;
  expiresAtUtc: string;
}

export interface CreateLobbyResultDto {
  lobby: LobbyDto;
  credential: LobbyCredentialDto;
}

export interface LobbySummaryDto {
  lobbyId: string;
  gameSlug: string;
  maxPlayers: number;
  joinedCount: number;
  timeControlId: string;
  rated: boolean;
  resolvedRegion: string;
  spectatorPolicy: string;
  host: PublicIdentity;
  createdAt: string;
  expiresAtUtc: string;
}

export interface LobbyInviteDto {
  inviteId: string;
  lobbyId: string;
  gameSlug: string;
  inviter: PublicIdentity;
  state: 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Revoked';
  expiresAtUtc: string;
}

export interface ActiveContextDto {
  lobby: LobbyDto | null;
  ticketId: string | null;
}

export interface StartLobbyResultDto {
  lobbyId: string;
  matchRequestId: string;
  state: string;
  revision: number;
}

export interface CreateLobbyRequestDto {
  gameSlug: string;
  capabilityVersion: number;
  privacy: 'Private' | 'Public';
  maxPlayers: number;
  timeControlId: string;
  rated: boolean;
  region?: string | null;
  spectatorPolicy: string;
  tieBreakRuleId: string;
  aiFillRequested: boolean;
}

export interface JoinLobbyRequestDto {
  code?: string;
  linkToken?: string;
  /** Only honored when the target lobby is currently Public and Open — never a substitute for a private credential. */
  lobbyId?: string;
}

export interface UpdateLobbySettingsRequestDto {
  gameSlug: string;
  capabilityVersion: number;
  privacy: 'Private' | 'Public';
  maxPlayers: number;
  timeControlId: string;
  rated: boolean;
  region?: string | null;
  spectatorPolicy: string;
  tieBreakRuleId: string;
  aiFillRequested: boolean;
  expectedRevision: number;
}

export interface SetReadinessRequestDto {
  isReady: boolean;
  expectedRevision: number;
}

export interface KickMemberRequestDto {
  targetUserId: string;
  expectedRevision: number;
}

export interface CreateInviteRequestDto {
  inviteeUserId: string;
}

export interface StartLobbyRequestDto {
  expectedRevision: number;
  idempotencyKey: string;
}

/**
 * The capability source (D2), read-only. Fetch before creating a lobby or matchmaking ticket, so
 * `capabilityVersion` and the allowed time controls/tie-break rules/spectator policies come from the server
 * instead of being guessed client-side.
 */
export interface GameCapabilityProfileDto {
  gameSlug: string;
  capabilityVersion: number;
  minPlayers: number;
  maxPlayers: number;
  allowedModes: string[];
  timeControls: string[];
  tieBreakRules: string[];
  spectatorPolicies: string[];
  ratedEligible: boolean;
  aiFillEligible: boolean;
}
