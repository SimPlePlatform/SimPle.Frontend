// Module 6 — Quick Match frontend contract.
// Mirrors SimPLe.Backend/src/SimPle.Application/Matchmaking/DTOs/MatchmakingDtos.cs.

import type { DependencyReadinessDto } from '@/features/lobby/types';

export interface CreateTicketRequestDto {
  gameSlug: string;
  capabilityVersion: number;
  mode: string;
  playerCount: number;
  timeControlId: string;
  rated: boolean;
  region?: string | null;
}

export interface TicketAssignmentDto {
  matchRequestId: string;
  groupId: string;
}

export type TicketState = 'Queued' | 'Matched' | 'Cancelled' | 'Expired';

export interface TicketDto {
  ticketId: string;
  gameSlug: string;
  capabilityVersion: number;
  mode: string;
  playerCount: number;
  timeControlId: string;
  rated: boolean;
  resolvedRegion: string;
  rating: number;
  ratingSourceVersion: string;
  state: TicketState;
  enqueuedAtUtc: string;
  deadlineAtUtc: string;
  currentBand: number | null;
  assignment: TicketAssignmentDto | null;
  dependencyReadiness: DependencyReadinessDto;
}
