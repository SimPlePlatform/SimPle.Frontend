import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUser = { id: 'u-1', username: 'me', displayName: 'Me' };
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, status: 'authenticated' }),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));

const PROFILE = {
  userId: 'u-1', username: 'me', displayName: 'Me', bio: null,
  avatarUrl: null, bannerUrl: null, hasUploadedAvatar: false, hasUploadedBanner: false,
  statusMessage: null, region: 'NA', color: '#F0394B', bannerFallbackColor: '#111',
  initials: 'ME', visibility: 'Public', profileType: 'Standard', role: 'Member',
  level: 1, elo: 1000, friendCount: 0, joinedAt: '2026-01-01T00:00:00Z', links: [], interests: [],
};

vi.mock('@/features/profile/profileApi', async () => {
  const actual = await vi.importActual('@/features/profile/profileApi');
  return {
    ...actual,
    profileApi: {
      getMe: vi.fn(() => Promise.resolve(PROFILE)),
      getPublic: vi.fn(() => Promise.resolve(PROFILE)),
      getViewerContext: vi.fn(() => Promise.resolve(null)),
    },
  };
});

const mockGetFavorites = vi.fn();
vi.mock('@/features/games/gamesApi', () => ({
  gamesApi: { getFavorites: (...args: unknown[]) => mockGetFavorites(...args) },
}));

beforeEach(() => {
  mockPush.mockReset();
  mockGetFavorites.mockReset();
});

const FAVORITE = {
  slug: 'falling-blocks', name: 'Falling Blocks', lifecycle: 'Available',
  artToken: 'falling-blocks', artColorA: '#F0394B', artColorB: '#111',
  artAltText: 'Falling Blocks art', favoritedAt: '2026-01-01T00:00:00Z',
};

async function renderProfile() {
  const { ProfilePage } = await import('@/features/profile/ProfilePage');
  return render(<ProfilePage username="me" />);
}

async function openGamesTab() {
  await waitFor(() => expect(screen.getByText('Me')).toBeInTheDocument());
  await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Favorite games' })); });
}

describe('ProfilePage — Favorite games tab', () => {
  it('lazy-loads favorites only when the tab is opened, not on initial profile load', async () => {
    mockGetFavorites.mockResolvedValue({ items: [], nextCursor: null });
    await renderProfile();
    await waitFor(() => expect(screen.getByText('Me')).toBeInTheDocument());
    expect(mockGetFavorites).not.toHaveBeenCalled();
    await openGamesTab();
    await waitFor(() => expect(mockGetFavorites).toHaveBeenCalled());
  });

  it('shows the empty state with a Browse games CTA when there are no favorites', async () => {
    mockGetFavorites.mockResolvedValue({ items: [], nextCursor: null });
    await renderProfile();
    await openGamesTab();
    await waitFor(() => expect(screen.getByText('No favorite games yet')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Browse games' })); });
    expect(mockPush).toHaveBeenCalledWith('/games');
  });

  it('shows an error state with retry on favorites load failure', async () => {
    mockGetFavorites.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ items: [FAVORITE], nextCursor: null });
    await renderProfile();
    await openGamesTab();
    await waitFor(() => expect(screen.getByText('Failed to load favorite games.')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); });
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
  });

  it('renders favorite game cards as links to game detail, with Load more via keyset cursor', async () => {
    mockGetFavorites
      .mockResolvedValueOnce({ items: [FAVORITE], nextCursor: 'c-2' })
      .mockResolvedValueOnce({ items: [{ ...FAVORITE, slug: 'chess', name: 'Chess' }], nextCursor: null });
    await renderProfile();
    await openGamesTab();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    const names = screen.getAllByText('Falling Blocks');
    const link = names.map(n => n.closest('a')).find(Boolean);
    expect(link).toHaveAttribute('href', '/games/falling-blocks');

    await act(async () => { fireEvent.click(screen.getByText('Load more')); });
    await waitFor(() => expect(screen.getAllByText('Chess').length).toBeGreaterThan(0));
    expect(mockGetFavorites).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'c-2' }));
  });
});

describe('ProfilePage — Favorite games tab (visiting another profile)', () => {
  it('shows "Only visible to the profile owner." and never calls getFavorites for a non-own profile', async () => {
    const { profileApi } = await import('@/features/profile/profileApi');
    (profileApi.getPublic as ReturnType<typeof vi.fn>).mockResolvedValue({ ...PROFILE, username: 'other', displayName: 'Other' });
    const { ProfilePage } = await import('@/features/profile/ProfilePage');
    render(<ProfilePage username="other" />);
    await waitFor(() => expect(screen.getByText('Other')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Favorite games' })); });
    await waitFor(() => expect(screen.getByText('Only visible to the profile owner.')).toBeInTheDocument());
    expect(mockGetFavorites).not.toHaveBeenCalled();
  });
});
