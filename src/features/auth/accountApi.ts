import { apiFetch } from '@/lib/api-client';

export interface Session {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export const accountApi = {
  changePassword: (currentPassword: string, newPassword: string, confirmNewPassword: string) =>
    apiFetch<void>('/api/auth/change-password', 'POST', { currentPassword, newPassword, confirmNewPassword }),

  changeEmail: (newEmail: string) =>
    apiFetch<void>('/api/auth/change-email', 'POST', { newEmail }),

  getSessions: () =>
    apiFetch<Session[]>('/api/auth/sessions', 'GET'),

  revokeSession: (sessionId: string) =>
    apiFetch<void>(`/api/auth/sessions/${sessionId}`, 'DELETE'),

  deleteAccount: (password: string) =>
    apiFetch<void>('/api/auth/account', 'DELETE', { password }),
};
