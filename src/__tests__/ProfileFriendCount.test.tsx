import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useParams:   () => ({ username: 'testuser' }),
  useRouter:   () => ({ push: vi.fn() }),
  usePathname: () => '/profile/testuser',
}));
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

function profileOk(overrides: Record<string, unknown> = {}) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
    userId: 'u-1', username: 'testuser', displayName: 'Test User',
    bio: null, avatarUrl: null, bannerUrl: null,
    hasUploadedAvatar: false, hasUploadedBanner: false,
    statusMessage: null, region: '', color: '#F0394B',
    bannerFallbackColor: '#0F1422', initials: 'TU',
    visibility: 'Public', profileType: 'Player', role: 'Player',
    level: 5, elo: 1250, friendCount: 12,
    joinedAt: '2026-01-01T00:00:00Z', links: [], interests: [],
    ...overrides,
  }) });
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.resetModules();
});

describe('ProfilePage friend count', () => {
  it('shows friendCount from API when nonzero', async () => {
    mockFetch.mockResolvedValue(profileOk({ friendCount: 12 }));
    const { ProfilePage } = await import('@/features/profile/ProfilePage');
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument());
    // The "Friends" label should appear alongside the count
    expect(screen.getByText('Friends')).toBeInTheDocument();
  });

  it('shows 0 when friendCount is zero (not "—" for the Friends stat)', async () => {
    mockFetch.mockResolvedValue(profileOk({ friendCount: 0 }));
    const { ProfilePage } = await import('@/features/profile/ProfilePage');
    render(<ProfilePage />);
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
