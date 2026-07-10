// Module 3 — People search frontend contract.
// Mirrors SimPLe.Backend PeopleSearchResultDto exactly (camelCase). Never exposes BlockedByTarget or a
// global/hidden result total; excludes self/private/blocked/deleted/suspended/banned server-side.

import type { RelationshipState } from '@/features/profile/profileApi';

export type SearchRelationshipState = Exclude<RelationshipState, 'Self' | 'BlockedBySelf'>;

export interface PeopleSearchResultDto {
  userId: string;
  username: string;
  displayName: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
  profileType: 'Player' | 'Developer';
  visibleMutualFriendCount: number;
  relationshipState: SearchRelationshipState;
}
