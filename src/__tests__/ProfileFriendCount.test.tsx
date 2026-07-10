import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));

const mockUser = {
  id: 'u-1', username: 'testuser', displayName: 'Test User',
  initials: 'TU', color: '#F0394B', status: 'online',
};
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, status: 'authenticated' }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ push: vi.fn() }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function profileBody(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'u-1', username: 'testuser', displayName: 'Test User',
    bio: null, avatarUrl: null, bannerUrl: null,
    hasUploadedAvatar: false, hasUploadedBanner: false,
    statusMessage: null, region: '', color: '#F0394B',
    bannerFallbackColor: '#0F1422', initials: 'TU',
    visibility: 'Public', profileType: 'Player', role: 'Player',
    level: 5, elo: 1250, friendCount: 12,
    joinedAt: '2026-01-01T00:00:00Z', links: [], interests: [],
    ...overrides,
  };
}

function viewerContextBody(overrides: Record<string, unknown> = {}) {
  return {
    relationshipState: 'Self',
    visibleMutualFriendCount: 0,
    canViewFriends: true,
    visibleFriendCount: 12,
    allowedActions: ['edit', 'share'],
    ...overrides,
  };
}

// Real production routing: /api/profile/{username} returns the profile, and
// /api/profile/{username}/viewer-context returns the (auth-gated) viewer-context shape.
function stubFetchByUrl(profile: Record<string, unknown>, viewerContext: Record<string, unknown>) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/viewer-context')) return jsonResponse(viewerContext);
    return jsonResponse(profile);
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ProfilePage friend count', () => {
  it('shows friendCount from API when nonzero', async () => {
    stubFetchByUrl(profileBody({ friendCount: 12 }), viewerContextBody({ visibleFriendCount: 12 }));
    const { ProfilePage } = await import('@/features/profile/ProfilePage');
    render(<ProfilePage username="testuser" />);
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    // The "Friends" label should appear alongside the count
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('shows 0 when friendCount is zero (not "—" for the Friends stat)', async () => {
    stubFetchByUrl(profileBody({ friendCount: 0 }), viewerContextBody({ visibleFriendCount: 0 }));
    const { ProfilePage } = await import('@/features/profile/ProfilePage');
    render(<ProfilePage username="testuser" />);
    // Verify the Friends label appears alongside '0' (not '—')
    await waitFor(() => {
      const friendsEl = screen.getByText('Friends');
      const container = friendsEl.closest('.card') ?? friendsEl.parentElement;
      // The value '0' should appear in the same stat block
      expect(container!.textContent).toContain('0');
      expect(container!.textContent).not.toContain('—');
    });
  });
});
