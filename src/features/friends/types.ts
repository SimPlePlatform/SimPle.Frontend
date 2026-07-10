// Module 3 — Friends & Social Graph frontend contract.
// Mirrors SimPle.Project/docs/modules/module-03-friends-social-graph/api-reference.md
// (realigned 2026-07-06). Keyset cursor paging; no level/elo (deferred to M10).

/** Keyset cursor page. `nextCursor` is null on the last page; no total/count is promised. */
export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface FriendSummaryDto {
  friendCount: number;
  incomingRequestCount: number;
  outgoingRequestCount: number;
}

// No level / elo (removed this module — deferred to M10).
export interface FriendDto {
  userId: string;
  username: string;
  displayName: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
  friendsSince: string; // ISO 8601
}

export interface FriendRequestDto {
  requestId: string;
  requesterId: string;
  requesterUsername: string;
  requesterDisplayName: string;
  requesterInitials: string;
  requesterColor: string;
  requesterAvatarUrl: string | null;
  addresseeId: string;
  addresseeUsername: string;
  addresseeDisplayName: string;
  addresseeInitials: string;
  addresseeColor: string;
  addresseeAvatarUrl: string | null;
  status: 'Pending' | 'Accepted' | 'Declined' | 'Cancelled';
  requestedAt: string;
  mutualFriendCount: number;
}

export type SendRequestOutcome =
  | 'request_created'
  | 'already_pending'
  | 'cross_request_accepted';

/** Send endpoint result: `request_created` → 201; `already_pending`/`cross_request_accepted` → 200. */
export interface SendFriendRequestResult {
  outcome: SendRequestOutcome;
  request: FriendRequestDto;
}

// No level / elo. Minimal identity + visible mutual count only.
export interface FriendSuggestionDto {
  userId: string;
  username: string;
  displayName: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
  mutualFriendCount: number;
}

// Minimal identity only — never bio, links, region, status, elo, level, email, or presence.
export interface DiscoveryResultDto {
  userId: string;
  username: string;
  displayName: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
}

export interface BlockDto {
  blockedUserId: string;
  blockedUsername: string;
  blockedDisplayName: string;
  blockedInitials: string;
  blockedColor: string;
  blockedAvatarUrl: string | null;
  blockedAt: string; // ISO 8601
}

/**
 * Block endpoint result: `blocked` -> 201; `already_blocked` -> 200. Deliberately carries no target
 * identity fields (M03-007 fix) -- the caller already has the identity card from whichever surface
 * initiated the block, and unlike the block list this path does not gate on the target's visibility.
 */
export interface BlockUserResult {
  outcome: 'blocked' | 'already_blocked';
  blockedUserId: string;
  blockedAt: string; // ISO 8601
}

export type FriendRequestPrivacy = 'Anyone' | 'FriendsOfFriends' | 'Off';
export type SearchVisibility = 'Everyone' | 'FriendsOfFriends' | 'Nobody';
export type FriendsListVisibility = 'Everyone' | 'Friends' | 'OnlyMe';

export interface FriendSettingsDto {
  friendRequestPrivacy: FriendRequestPrivacy;
  searchVisibility: SearchVisibility;
  friendsListVisibility: FriendsListVisibility;
}
