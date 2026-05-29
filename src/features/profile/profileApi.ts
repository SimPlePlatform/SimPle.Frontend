import { apiFetch } from '@/lib/api-client';

export type ProfileVisibility = 'Public' | 'FriendsOnly' | 'Private';
export type ProfileType = 'Player' | 'Developer';

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
  hasUploadedAvatar: boolean;
  hasUploadedBanner: boolean;
  statusMessage: string | null;
  region: string;
  color: string;
  bannerFallbackColor: string;
  initials: string;
  visibility: ProfileVisibility;
  profileType: ProfileType;
  role: string;
  level: number;
  elo: number;
  friendCount: number;
  friendshipStatus: string;
  joinedAt: string;
  links: ExternalLink[];
  interests: string[];
}

interface UploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  contentType: string;
  expiresAtUtc: string;
}

// avatarUrl and bannerUrl are intentionally omitted.
// Profile media is managed exclusively through the upload/confirm/remove endpoints.
export interface UpdateProfileRequest {
  displayName: string;
  bio?: string | null;
  region?: string | null;
  statusMessage?: string | null;
  visibility?: ProfileVisibility;
  profileType?: ProfileType;
}

export interface UpdateLinksRequest {
  links: { platform: string; url: string; displayLabel?: string | null; sortOrder: number }[];
}

export interface UsernameChangeRequest {
  id: string;
  requestedUsername: string;
  status: 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled';
  rejectionReason: string | null;
  requestYear: number;
  requestMonth: number;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  reviewedAt: string | null;
  canEdit: boolean;
  canCancel: boolean;
}

export interface UsernameChangeResult {
  appliedImmediately: boolean;
  message: string;
  request: UsernameChangeRequest | null;
}

export const profileApi = {
  getMe: () =>
    apiFetch<UserProfile>('/api/profile/me'),

  updateMe: (request: UpdateProfileRequest) =>
    apiFetch<UserProfile>('/api/profile/me', 'PUT', request),

  updateUsername: (username: string) =>
    apiFetch<UsernameChangeResult>('/api/profile/me/username', 'PUT', { username }),

  requestUsernameChange: (username: string) =>
    apiFetch<UsernameChangeRequest>('/api/profile/me/username-change-request', 'POST', { username }),

  editUsernameChangeRequest: (username: string) =>
    apiFetch<UsernameChangeRequest>('/api/profile/me/username-change-request', 'PUT', { username }),

  cancelUsernameChangeRequest: () =>
    apiFetch<UsernameChangeRequest>('/api/profile/me/username-change-request', 'DELETE'),

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

  uploadAvatar: (file: File) => uploadProfileMedia(file, 'avatar'),
  uploadBanner: (file: File) => uploadProfileMedia(file, 'banner'),
  removeAvatar: () => apiFetch<UserProfile>('/api/profile/me/avatar', 'DELETE'),
  removeBanner: () => apiFetch<UserProfile>('/api/profile/me/banner', 'DELETE'),
  updateAvatarFallback: (color: string) =>
    apiFetch<UserProfile>('/api/profile/me/avatar/fallback', 'PUT', { color }),
  updateBannerFallback: (color: string) =>
    apiFetch<UserProfile>('/api/profile/me/banner/fallback', 'PUT', { color }),
};

async function uploadProfileMedia(file: File, kind: 'avatar' | 'banner'): Promise<UserProfile> {
  const maxBytes = kind === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are accepted.');
  }
  if (file.size > maxBytes) {
    throw new Error(kind === 'avatar' ? 'Avatar must be 5 MB or smaller.' : 'Banner must be 10 MB or smaller.');
  }

  const upload = await apiFetch<UploadUrlResponse>(`/api/profile/me/${kind}/upload-url`, 'POST', {
    fileName: file.name,
    contentType: file.type,
    fileSizeBytes: file.size,
  });

  const put = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': upload.contentType },
    body: file,
  });
  if (!put.ok) throw new Error('Upload failed.');

  return apiFetch<UserProfile>(`/api/profile/me/${kind}/confirm`, 'POST', { objectKey: upload.objectKey });
}
