import { apiFetch } from '@/lib/api-client';

export type ProfileVisibility = 'Public' | 'FriendsOnly' | 'Private';

export interface ExternalLink {
  id: string;
  platform: string;
  url: string;
  displayLabel: string | null;
  sortOrder: number;
}

export interface UserProfile {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  statusMessage: string | null;
  region: string;
  color: string;
  initials: string;
  visibility: ProfileVisibility;
  role: string;
  level: number;
  elo: number;
  joinedAt: string;
  links: ExternalLink[];
  interests: string[];
}

export interface UpdateProfileRequest {
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  region?: string | null;
  statusMessage?: string | null;
  visibility?: ProfileVisibility;
}

export interface UpdateLinksRequest {
  links: { platform: string; url: string; displayLabel?: string | null; sortOrder: number }[];
}

export const profileApi = {
  getMe: () =>
    apiFetch<UserProfile>('/api/profile/me'),

  updateMe: (request: UpdateProfileRequest) =>
    apiFetch<UserProfile>('/api/profile/me', 'PUT', request),

  updateUsername: (username: string) =>
    apiFetch<void>('/api/profile/me/username', 'PUT', { username }),

  getPublic: (username: string) =>
    apiFetch<UserProfile>(`/api/profile/${encodeURIComponent(username)}`),

  getLinks: () =>
    apiFetch<ExternalLink[]>('/api/profile/me/links'),

  updateLinks: (request: UpdateLinksRequest) =>
    apiFetch<ExternalLink[]>('/api/profile/me/links', 'PUT', request),

  getInterests: () =>
    apiFetch<string[]>('/api/profile/me/interests'),

  updateInterests: (interests: string[]) =>
    apiFetch<string[]>('/api/profile/me/interests', 'PUT', { interests }),
};
