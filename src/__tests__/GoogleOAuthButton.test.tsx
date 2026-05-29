import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// -- Mocks ---------------------------------------------------------------------

const MockApiError = vi.hoisted(() =>
  class extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      message: string,
    ) { super(message); this.name = 'ApiError'; }
  }
);

const mockLoginWithGoogle = vi.fn();
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ loginWithGoogle: mockLoginWithGoogle }),
}));

vi.mock('@/lib/api-client', () => ({
  ApiError: MockApiError,
}));

// -- Import after mocks --------------------------------------------------------

import { GoogleOAuthButton } from '@/features/auth/GoogleOAuthButton';

// -- Google GIS mock helpers ---------------------------------------------------

function setupGoogleMock() {
  const mockPrompt = vi.fn();
  const mockInitialize = vi.fn();
  Object.defineProperty(window, 'google', {
    value: { accounts: { id: { initialize: mockInitialize, prompt: mockPrompt } } },
    writable: true,
    configurable: true,
  });
  return { mockPrompt, mockInitialize };
}

function clearGoogleMock() {
  delete window.google;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Simulate NEXT_PUBLIC_GOOGLE_CLIENT_ID being set
  vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', 'test-client-id');
});

afterEach(() => {
  vi.unstubAllEnvs();
  clearGoogleMock();
});

// -- Tests ---------------------------------------------------------------------

describe('GoogleOAuthButton', () => {
  it('renders the Google sign-in button', () => {
    setupGoogleMock();
    render(<GoogleOAuthButton />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('calls google.accounts.id.prompt when clicked', async () => {
    const { mockPrompt } = setupGoogleMock();
    render(<GoogleOAuthButton />);

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(mockPrompt).toHaveBeenCalled();
  });

  it('calls loginWithGoogle with the credential from the GIS callback', async () => {
    const { mockInitialize } = setupGoogleMock();
    mockLoginWithGoogle.mockResolvedValue({ id: '1', email: 'g@test.com', isEmailVerified: true });

    render(<GoogleOAuthButton />);

    // Simulate GIS calling back with a credential
    const capturedCallback = mockInitialize.mock.calls[0]?.[0]?.callback;
    expect(capturedCallback).toBeDefined();

    await act(async () => {
      await capturedCallback({ credential: 'fake-id-token' });
    });

    expect(mockLoginWithGoogle).toHaveBeenCalledWith('fake-id-token');
  });

  it('shows loading state while signing in', async () => {
    const { mockInitialize } = setupGoogleMock();
    // Never resolves — keeps loading state
    mockLoginWithGoogle.mockReturnValue(new Promise(() => {}));

    render(<GoogleOAuthButton />);

    const capturedCallback = mockInitialize.mock.calls[0]?.[0]?.callback;
    act(() => {
      capturedCallback?.({ credential: 'fake-id-token' });
    });

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/signing in/i)
    );
  });

  it('calls onError when loginWithGoogle rejects', async () => {
    const { mockInitialize } = setupGoogleMock();
    const onError = vi.fn();
    mockLoginWithGoogle.mockRejectedValue(
      new MockApiError(401, 'Auth.InvalidGoogleToken', 'The Google credential is invalid.')
    );

    render(<GoogleOAuthButton onError={onError} />);

    const capturedCallback = mockInitialize.mock.calls[0]?.[0]?.callback;
    await act(async () => {
      await capturedCallback?.({ credential: 'bad-token' });
    });

    expect(onError).toHaveBeenCalledWith('The Google credential is invalid.');
  });

  it('calls onError with generic message when non-ApiError is thrown', async () => {
    const { mockInitialize } = setupGoogleMock();
    const onError = vi.fn();
    mockLoginWithGoogle.mockRejectedValue(new Error('Network error'));

    render(<GoogleOAuthButton onError={onError} />);

    const capturedCallback = mockInitialize.mock.calls[0]?.[0]?.callback;
    await act(async () => {
      await capturedCallback?.({ credential: 'bad-token' });
    });

    expect(onError).toHaveBeenCalledWith('Google sign-in failed. Please try again.');
  });

  it('calls onError when GIS prompt is not displayed', async () => {
    const { mockPrompt } = setupGoogleMock();
    const onError = vi.fn();

    // Make prompt call the listener with isNotDisplayed() = true
    mockPrompt.mockImplementation((listener?: (m: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => {
      listener?.({ isNotDisplayed: () => true, isSkippedMoment: () => false });
    });

    render(<GoogleOAuthButton onError={onError} />);
    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/try again/i));
  });

  it('calls onError when Google is not yet available on button click', async () => {
    // No window.google set up
    const onError = vi.fn();
    render(<GoogleOAuthButton onError={onError} />);

    await userEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/not available yet/i));
  });

  it('returns null when NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_CLIENT_ID', '');
    const { container } = render(<GoogleOAuthButton />);
    expect(container.firstChild).toBeNull();
  });
});
