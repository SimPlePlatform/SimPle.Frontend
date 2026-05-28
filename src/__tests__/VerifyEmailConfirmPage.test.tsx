import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const MockApiError = vi.hoisted(() =>
  class extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
    ) { super(message); this.name = 'ApiError'; }
  }
);

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockReloadSession = vi.fn();
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ reloadSession: mockReloadSession }),
}));

const mockVerifyEmail = vi.fn();
vi.mock('@/lib/api-client', () => ({
  authApi: { verifyEmail: (...args: unknown[]) => mockVerifyEmail(...args) },
  ApiError: MockApiError,
}));

vi.mock('@/lib/routes', () => ({
  ROUTES: { dashboard: '/dashboard', login: '/login', verifyEmail: '/verify-email' },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { VerifyEmailConfirmPage } from '@/features/auth/VerifyEmailConfirmPage';

beforeEach(() => {
  vi.clearAllMocks();
  // Real timers by default — waitFor depends on them for retry logic
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('VerifyEmailConfirmPage', () => {
  it('shows verifying spinner immediately', () => {
    mockVerifyEmail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<VerifyEmailConfirmPage token="valid-token" />);
    expect(screen.getByText(/verifying your email/i)).toBeInTheDocument();
  });

  it('shows error state when token is empty', async () => {
    render(<VerifyEmailConfirmPage token="" />);
    await waitFor(() =>
      expect(screen.getByText('Verification failed')).toBeInTheDocument()
    );
    expect(screen.getByText(/no verification token/i)).toBeInTheDocument();
  });

  it('shows success state and reloads session after successful verification', async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    mockReloadSession.mockResolvedValue(undefined);

    render(<VerifyEmailConfirmPage token="good-token" />);

    await waitFor(() =>
      expect(screen.getByText('Email verified!')).toBeInTheDocument()
    );
    expect(mockReloadSession).toHaveBeenCalled();
  });

  it('redirects to dashboard after 2.5 seconds on success', async () => {
    vi.useFakeTimers();
    mockVerifyEmail.mockResolvedValue(undefined);
    mockReloadSession.mockResolvedValue(undefined);

    render(<VerifyEmailConfirmPage token="good-token" />);

    // Flush all pending promises and microtasks (advances fake clock too)
    await vi.runAllTimersAsync();

    expect(screen.getByText('Email verified!')).toBeInTheDocument();

    vi.advanceTimersByTime(2500);

    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error message on API failure', async () => {
    mockVerifyEmail.mockRejectedValue(
      new MockApiError(400, 'Auth.InvalidToken', 'This verification link is invalid or has expired.')
    );

    render(<VerifyEmailConfirmPage token="bad-token" />);

    await waitFor(() =>
      expect(screen.getByText('Verification failed')).toBeInTheDocument()
    );
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
  });

  it('shows "Request a new link" button on error', async () => {
    mockVerifyEmail.mockRejectedValue(
      new MockApiError(400, 'Auth.InvalidToken', 'Expired.')
    );

    render(<VerifyEmailConfirmPage token="expired-token" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /request a new link/i })).toBeInTheDocument()
    );
  });

  it('navigates to /verify-email when requesting a new link', async () => {
    mockVerifyEmail.mockRejectedValue(
      new MockApiError(400, 'Auth.InvalidToken', 'Expired.')
    );

    render(<VerifyEmailConfirmPage token="expired-token" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /request a new link/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /request a new link/i }));

    expect(mockReplace).toHaveBeenCalledWith('/verify-email');
  });

  it('navigates to login when "Back to sign in" is clicked on error', async () => {
    mockVerifyEmail.mockRejectedValue(
      new MockApiError(400, 'Auth.InvalidToken', 'Expired.')
    );

    render(<VerifyEmailConfirmPage token="expired-token" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('navigates to dashboard when "Go to dashboard" is clicked after success', async () => {
    mockVerifyEmail.mockResolvedValue(undefined);
    mockReloadSession.mockResolvedValue(undefined);

    render(<VerifyEmailConfirmPage token="good-token" />);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument()
    );

    await userEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
