export type UserStatus = 'online' | 'away' | 'playing' | 'offline';
export type MatchResult = 'win' | 'loss' | 'draw';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type NotificationKind = 'invite' | 'friend' | 'system' | 'achieve';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  initials: string;
  color: string;
  role: string;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  display: string;
  initials: string;
  color: string;
  level: number;
  xp: number;
  xpToNext: number;
  rank: string;
  elo: number;
  region: string;
  joined: string;
  bio: string;
  status: UserStatus;
}

export interface Friend {
  id: string;
  display: string;
  initials: string;
  color: string;
  status: UserStatus;
  activity: string;
  elo: number;
  level: number;
}

export interface FriendRequest {
  id: string;
  display: string;
  initials: string;
  color: string;
  mutual: number;
}

export interface SuggestedUser {
  id: string;
  display: string;
  initials: string;
  color: string;
  mutual: number;
  elo: number;
}

export interface GameArt {
  kind: string;
  a: string;
  b: string;
}

export interface Game {
  id: string;
  name: string;
  tag: string;
  cats: string[];
  art: GameArt;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  difficulty: string;
  online: number;
  lastPlayed: string;
  rules: string;
  aiLevels: string[];
  multiplayer: boolean;
  solo: boolean;
}

export interface Match {
  id: string;
  game: string;
  result: MatchResult;
  opponent: string;
  duration: string;
  delta: string;
  when: string;
}

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
  rarity: AchievementRarity;
  progress?: number;
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  from: string;
  text: string;
  when: string;
  initials: string;
  color: string;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  elo: number;
  country: string;
  trend: string;
  you?: boolean;
}

export interface ChatMessage {
  from: string;
  text: string;
  color: string;
  initials: string;
  when: string;
  me?: boolean;
}

export interface Toast {
  id?: string;
  kind?: 'default' | 'success' | 'info';
  title?: string;
  body?: string;
  icon?: string;
  duration?: number;
}
