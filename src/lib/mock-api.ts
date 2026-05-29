/**
 * Mock API layer — returns typed data with artificial delay.
 * Replace implementations with real fetch calls during backend integration.
 */
import {
  CURRENT_USER, FRIENDS, FRIEND_REQUESTS, SUGGESTED,
  GAMES, RECENT_MATCHES, NOTIFICATIONS, ACHIEVEMENTS,
  LEADERBOARD_GLOBAL,
} from '@/mock';
import type {
  User, Friend, FriendRequest, SuggestedUser, Game,
  Match, Notification, Achievement, LeaderboardRow,
} from '@/types';

const delay = (ms = 300) => new Promise<void>(r => setTimeout(r, ms));

// -- Auth ----------------------------------------------------------------------
export async function login(_email: string, _password: string): Promise<User> {
  await delay(700);
  return CURRENT_USER;
}

export async function register(_email: string, _password: string): Promise<User> {
  await delay(700);
  return CURRENT_USER;
}

export async function getCurrentUser(): Promise<User> {
  await delay(100);
  return CURRENT_USER;
}

export async function logout(): Promise<void> {
  await delay(200);
}

// -- User profile --------------------------------------------------------------
export async function getUserById(id: string): Promise<User> {
  await delay(200);
  void id;
  return CURRENT_USER;
}

export async function updateProfile(patch: Partial<User>): Promise<User> {
  await delay(400);
  return { ...CURRENT_USER, ...patch };
}

export async function searchUsers(query: string): Promise<User[]> {
  await delay(300);
  void query;
  return [];
}

// -- Friends -------------------------------------------------------------------
export async function getFriends(): Promise<Friend[]> {
  await delay(200);
  return FRIENDS;
}

export async function getFriendRequests(): Promise<FriendRequest[]> {
  await delay(200);
  return FRIEND_REQUESTS;
}

export async function getSuggested(): Promise<SuggestedUser[]> {
  await delay(200);
  return SUGGESTED;
}

export async function sendFriendRequest(userId: string): Promise<void> {
  await delay(400);
  void userId;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await delay(300);
  void requestId;
}

export async function rejectFriendRequest(requestId: string): Promise<void> {
  await delay(300);
  void requestId;
}

export async function removeFriend(friendId: string): Promise<void> {
  await delay(300);
  void friendId;
}

// -- Games ---------------------------------------------------------------------
export async function getGames(): Promise<Game[]> {
  await delay(200);
  return GAMES;
}

export async function getGameById(id: string): Promise<Game | undefined> {
  await delay(150);
  return GAMES.find(g => g.id === id);
}

// -- Matches -------------------------------------------------------------------
export async function getRecentMatches(): Promise<Match[]> {
  await delay(200);
  return RECENT_MATCHES;
}

// -- Notifications -------------------------------------------------------------
export async function getNotifications(): Promise<Notification[]> {
  await delay(100);
  return NOTIFICATIONS;
}

export async function markAllRead(): Promise<void> {
  await delay(200);
}

// -- Achievements --------------------------------------------------------------
export async function getAchievements(): Promise<Achievement[]> {
  await delay(200);
  return ACHIEVEMENTS;
}

// -- Leaderboards --------------------------------------------------------------
export async function getLeaderboard(_scope: 'global' | 'friends' = 'global'): Promise<LeaderboardRow[]> {
  await delay(300);
  return LEADERBOARD_GLOBAL;
}

// -- Lobbies -------------------------------------------------------------------
export async function createLobby(gameId: string, options: Record<string, unknown> = {}): Promise<{ id: string }> {
  await delay(400);
  void gameId; void options;
  return { id: 'SP-7F-29' };
}

export async function joinLobby(lobbyId: string): Promise<void> {
  await delay(300);
  void lobbyId;
}

export async function leaveLobby(lobbyId: string): Promise<void> {
  await delay(200);
  void lobbyId;
}

export async function sendLobbyMessage(lobbyId: string, text: string): Promise<void> {
  await delay(100);
  void lobbyId; void text;
}

export async function toggleReady(lobbyId: string): Promise<void> {
  await delay(200);
  void lobbyId;
}

export async function startMatch(lobbyId: string): Promise<{ matchId: string }> {
  await delay(500);
  void lobbyId;
  return { matchId: 'match-001' };
}
