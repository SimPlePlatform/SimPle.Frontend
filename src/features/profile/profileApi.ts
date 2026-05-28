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

export interface UsernameChangeRequest {
  id: string;
  requestedUsername: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export const profileApi = {
  getMe: () =>
    apiFetch<UserProfile>('/api/profile/me'),

  updateMe: (request: UpdateProfileRequest) =>
    apiFetch<UserProfile>('/api/profile/me', 'PUT', request),

  updateUsername: (username: string) =>
    apiFetch<void>('/api/profile/me/username', 'PUT', { username }),

  requestUsernameChange: (username: string) =>
    apiFetch<UsernameChangeRequest>('/api/profile/me/username-change-request', 'POST', { username }),

  getUsernameChangeRequest: () =>
    apiFetch<UsernameChangeRequest | null>('/api/profile/me/username-change-request'),

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

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5147'}/api/profile/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message ?? 'Upload failed.');
      return r.json() as Promise<UserProfile>;
    });
  },

  uploadBanner: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5147'}/api/profile/me/banner`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: form,
    }).then(async r => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error?.message ?? 'Upload failed.');
      return r.json() as Promise<UserProfile>;
    });
  },
};
