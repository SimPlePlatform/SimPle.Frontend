import { apiFetch } from '@/lib/api-client';

export type FriendRequestStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled';
export type FriendRequestPolicy = 'Anyone' | 'FriendsOfFriends' | 'Off';
export type FriendshipStatus = 'Self' | 'Blocked' | 'Friends' | 'RequestSent' | 'RequestReceived' | 'None' | 'Unknown';

export interface FriendUserSummary {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  avatarFallbackColor: string;
  initials: string;
  profileType: 'Player' | 'Developer';
  mutualFriendsCount: number;
  friendshipStatus: FriendshipStatus;
}

export interface FriendRequest {
  id: string;
  sender: FriendUserSummary;
  receiver: FriendUserSummary;
  status: FriendRequestStatus;
  createdAtUtc: string;
  respondedAtUtc: string | null;
  cancelledAtUtc: string | null;
}

export interface FriendRequests {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface BlockedUser extends Omit<FriendUserSummary, 'mutualFriendsCount' | 'friendshipStatus' | 'profileType'> {
  blockedAtUtc: string;
}

export interface FriendPrivacy {
  friendRequestPolicy: FriendRequestPolicy;
}

export const friendsApi = {
  list: () => apiFetch<FriendUserSummary[]>('/api/friends'),
  requests: () => apiFetch<FriendRequests>('/api/friends/requests'),
  incomingRequests: () => apiFetch<FriendRequest[]>('/api/friends/requests/incoming'),
  outgoingRequests: () => apiFetch<FriendRequest[]>('/api/friends/requests/outgoing'),
  sendRequest: (userId: string) => apiFetch<FriendRequest>('/api/friends/requests', 'POST', { userId }),
  acceptRequest: (requestId: string) => apiFetch<FriendRequest>(`/api/friends/requests/${encodeURIComponent(requestId)}/accept`, 'POST'),
  declineRequest: (requestId: string) => apiFetch<FriendRequest>(`/api/friends/requests/${encodeURIComponent(requestId)}/decline`, 'POST'),
  cancelRequest: (requestId: string) => apiFetch<FriendRequest>(`/api/friends/requests/${encodeURIComponent(requestId)}/cancel`, 'POST'),
  removeFriend: (friendUserId: string) => apiFetch<void>(`/api/friends/${encodeURIComponent(friendUserId)}`, 'DELETE'),
  search: (query: string) => apiFetch<FriendUserSummary[]>(`/api/friends/search?query=${encodeURIComponent(query)}`),
  suggestions: () => apiFetch<FriendUserSummary[]>('/api/friends/suggestions'),
  blocks: () => apiFetch<BlockedUser[]>('/api/blocks'),
  block: (userId: string) => apiFetch<BlockedUser>('/api/blocks', 'POST', { userId }),
  unblock: (blockedUserId: string) => apiFetch<void>(`/api/blocks/${encodeURIComponent(blockedUserId)}`, 'DELETE'),
  privacy: () => apiFetch<FriendPrivacy>('/api/friends/privacy'),
  updatePrivacy: (friendRequestPolicy: FriendRequestPolicy) =>
    apiFetch<FriendPrivacy>('/api/friends/privacy', 'PUT', { friendRequestPolicy }),
};
