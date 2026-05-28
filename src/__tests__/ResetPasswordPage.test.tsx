import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';

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

const mockPush = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ push: mockPush }),
}));

const mockResetPassword = vi.fn();
vi.mock('@/lib/api-client', () => ({
  authApi: { resetPassword: (...args: unknown[]) => mockResetPassword(...args) },
  ApiError: MockApiError,
}));

vi.mock('@/lib/routes', () => ({
  ROUTES: { login: '/login', dashboard: '/dashboard' },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderPage(token = 'valid-token') {
  return render(<ResetPasswordPage token={token} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockResetPassword.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResetPasswordPage', () => {
  it('renders the form with disabled submit when token is missing', () => {
    renderPage('');
    const button = screen.getByRole('button', { name: /set new password/i });
    expect(button).toBeDisabled();
  });

  it('shows inline error for invalid/empty reset link', async () => {
    renderPage('');
    expect(screen.getByText(/this link is invalid/i)).toBeInTheDocument();
  });

  it('shows "Too weak" label for a short password', async () => {
    renderPage();
    const input = screen.getByPlaceholderText(/at least 8 characters/i);
    await userEvent.type(input, 'abc');
    expect(screen.getByText('Too weak')).toBeInTheDocument();
  });

  it('shows "Very strong" label for a strong password', async () => {
    renderPage();
    const input = screen.getByPlaceholderText(/at least 8 characters/i);
    await userEvent.type(input, 'Abcdefgh1234!@');
    expect(screen.getByText('Very strong')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    renderPage();
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'ValidPass1!');
    const confirmInputs = screen.getAllByDisplayValue('');
    // Find the confirm password field (second password-type input)
    const confirmInput = confirmInputs.find(el => (el as HTMLInputElement).type === 'password');
    if (confirmInput) await userEvent.type(confirmInput, 'DifferentPass1!');

    fireEvent.submit(screen.getByRole('button', { name: /set new password/i }).closest('form')!);

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
  });

  it('calls authApi.resetPassword on valid submission', async () => {
    renderPage('my-token');
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'ValidPass1!');

    // Type confirm password into the second field
    const allInputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(allInputs[1], 'ValidPass1!');

    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() =>
      expect(mockResetPassword).toHaveBeenCalledWith('my-token', 'ValidPass1!', 'ValidPass1!')
    );
  });

  it('shows success state after password reset', async () => {
    renderPage('my-token');
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'ValidPass1!');
    const allInputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(allInputs[1], 'ValidPass1!');

    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() =>
      expect(screen.getByText('Password updated')).toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    mockResetPassword.mockRejectedValue(
      new MockApiError(400, 'Auth.InvalidToken', 'This password reset link is invalid or has expired.')
    );
    renderPage('bad-token');
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'ValidPass1!');
    const allInputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(allInputs[1], 'ValidPass1!');

    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument()
    );
  });

  it('navigates to login when "Back to sign in" is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('shows error when password is too weak on submit', async () => {
    renderPage('valid-token');
    // Type a password that is too short / only one category (score < 2)
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'abc');

    fireEvent.submit(screen.getByRole('button', { name: /set new password/i }).closest('form')!);

    await waitFor(() =>
      expect(screen.getByText(/password is too weak/i)).toBeInTheDocument()
    );
  });

  it('navigates to login when "Sign in" is clicked after success', async () => {
    renderPage('my-token');
    await userEvent.type(screen.getByPlaceholderText(/at least 8 characters/i), 'ValidPass1!');
    const allInputs = document.querySelectorAll('input[type="password"]');
    await userEvent.type(allInputs[1], 'ValidPass1!');

    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));

    await waitFor(() =>
      expect(screen.getByText('Password updated')).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('toggles password visibility when show/hide button is clicked', async () => {
    renderPage();
    const input = screen.getByPlaceholderText(/at least 8 characters/i);
    expect(input).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /show/i });
    await userEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');

    await userEvent.click(screen.getByRole('button', { name: /hide/i }));
    expect(input).toHaveAttribute('type', 'password');
  });
});
