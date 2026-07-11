import type { AuthUser } from '@/types';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5147';
const CSRF_HEADER = { 'X-Requested-With': 'XMLHttpRequest' };

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface ErrorResponse {
  error?: { code?: string; message?: string; retryAfterUtc?: string };
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly validationErrors?: Record<string, string[]>,
    /** Present on cooldown (409 Friends.RequestCooldown) / rate-limit (429) responses — ISO 8601 UTC. */
    readonly retryAfterUtc?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function safeErrorMessage(status: number, response: ErrorResponse): string {
  const validationMessage = response.errors
    ? Object.values(response.errors).flat().find(Boolean)
    : undefined;

  if (response.error?.message) return response.error.message;
  if (validationMessage) return validationMessage;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 429) return 'Too many attempts. Please wait and try again.';
  return 'Something went wrong. Please try again.';
}

export async function apiFetch<T>(path: string, method: Method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(method !== 'GET' ? CSRF_HEADER : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => ({} as ErrorResponse)) as ErrorResponse;
    throw new ApiError(
      response.status,
      result.error?.code ?? `http_${response.status}`,
      safeErrorMessage(response.status, result),
      result.errors,
      result.error?.retryAfterUtc,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  captchaToken: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
  captchaToken: string;
}

export const authApi = {
  me: () => apiFetch<AuthUser>('/api/auth/me'),
  register: (request: RegisterRequest) => apiFetch<AuthUser>('/api/auth/register', 'POST', request),
  login: (request: LoginRequest) => apiFetch<AuthUser>('/api/auth/login', 'POST', request),
  refresh: () => apiFetch<AuthUser>('/api/auth/refresh', 'POST'),
  logout: () => apiFetch<void>('/api/auth/logout', 'POST'),
  logoutAll: () => apiFetch<void>('/api/auth/logout-all', 'POST'),

  checkEmail: (email: string) => apiFetch<void>(`/api/auth/check-email?email=${encodeURIComponent(email)}`),
  verifyEmail: (token: string) => apiFetch<void>('/api/auth/verify-email', 'POST', { token }),
  resendVerification: () => apiFetch<void>('/api/auth/resend-verification', 'POST'),
  forgotPassword: (email: string) => apiFetch<void>('/api/auth/forgot-password', 'POST', { email }),
  resetPassword: (token: string, newPassword: string, confirmNewPassword: string) =>
    apiFetch<void>('/api/auth/reset-password', 'POST', { token, newPassword, confirmNewPassword }),
  googleLogin: (idToken: string) =>
    apiFetch<AuthUser>('/api/auth/google', 'POST', { idToken }),
};

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, 'PATCH', body),
  delete: <T>(path: string) => apiFetch<T>(path, 'DELETE'),
};
