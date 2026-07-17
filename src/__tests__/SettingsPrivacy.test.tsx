import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));
vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: vi.fn() }),
  usePathname: () => '/settings',
}));
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-1', displayName: 'Test User', username: 'testuser', initials: 'TU', color: '#F0394B', status: 'online' },
    status: 'authenticated',
    setStatus: vi.fn(),
  }),
}));
vi.mock('@/lib/theme', () => ({ useTheme: () => [false, vi.fn()] }));
vi.mock('@/features/auth/accountApi', () => ({
  accountApi: {
    getSessions: () => Promise.resolve([]),
    signOut:     () => Promise.resolve(),
    getUsernameChangeRequest: () => Promise.resolve(null),
  },
}));

const mockToast = { push: vi.fn() };
vi.mock('@/components/ui/Toast', () => ({ useToast: () => mockToast }));

vi.mock('@/features/realtime/RealtimeConnectionProvider', () => ({
  useRealtime: () => ({
    connectionState: 'connected',
    presence: new Map(),
    subscribeLobby: vi.fn().mockResolvedValue(undefined),
    unsubscribeLobby: vi.fn().mockResolvedValue(undefined),
    sendLobbyMessage: vi.fn(),
    retry: vi.fn(),
    addEventListener: vi.fn(() => vi.fn()),
  }),
  usePresence: () => undefined,
  useRealtimeEvent: () => {},
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function settingsOk(privacy: string) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ friendRequestPrivacy: privacy }) });
}
// CursorPage<T> — no total/count. Block count is derived from the first page's item count.
function blocksOk(items: unknown[], nextCursor: string | null = null) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items, nextCursor }) });
}
function makeBlock(id: string, name: string) {
  return { blockedUserId: id, blockedUsername: name.toLowerCase(), blockedDisplayName: name, blockedInitials: name.slice(0, 2).toUpperCase(), blockedColor: '#F0394B', blockedAvatarUrl: null, blockedAt: '2026-01-01T00:00:00Z' };
}
function profileOk() {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
    userId: 'u-1', username: 'testuser', displayName: 'Test User',
    bio: null, avatarUrl: null, bannerUrl: null, hasUploadedAvatar: false, hasUploadedBanner: false,
    statusMessage: null, region: '', color: '#F0394B', bannerFallbackColor: '#0F1422',
    initials: 'TU', visibility: 'Public', profileType: 'Player', role: 'Player',
    level: 1, elo: 1200, friendCount: 3, joinedAt: '2026-01-01T00:00:00Z', links: [], interests: [],
  }) });
}
function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockToast.push.mockReset();
  vi.resetModules();
});

async function renderAndNavigateToPrivacy() {
  // SettingsPage makes multiple concurrent fetches on mount (profileApi.getMe, getSettings, getBlocks)
  // We need to handle all of them
  mockFetch.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('/api/profile/me')) return profileOk();
    if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
    if (u.includes('/api/friends/blocks')) return blocksOk([]);
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });

  const { SettingsPage } = await import('@/features/settings/SettingsPage');
  render(<SettingsPage />);

  // Navigate to Privacy tab — two buttons exist (mobile pill + desktop sidenav), click first
  const privacyTabs = screen.getAllByRole('button', { name: /^Privacy$/ });
  await act(async () => { fireEvent.click(privacyTabs[0]); });
}

describe('SettingsPrivacy', () => {
  it('shows Allow friend requests from section', async () => {
    await renderAndNavigateToPrivacy();
    await waitFor(() => expect(screen.getByText('Allow friend requests from')).toBeInTheDocument());
  });

  it('loads settings and marks correct privacy tab as active', async () => {
    await renderAndNavigateToPrivacy();
    await waitFor(() => {
      const tabs = screen.getAllByRole('button', { name: 'Anyone' });
      const activeTab = tabs.find(b => b.classList.contains('tab--active'));
      expect(activeTab).toBeTruthy();
    });
  });

  it('privacy tabs disabled while loading', async () => {
    let settingsResolve!: (v: unknown) => void;
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return new Promise(r => { settingsResolve = r; });
      if (u.includes('/api/friends/blocks')) return blocksOk([]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => screen.getByText('Allow friend requests from'));
    const offBtn = screen.getByRole('button', { name: 'Off' });
    expect(offBtn).toBeDisabled();
    act(() => settingsResolve({ ok: true, status: 200, json: () => Promise.resolve({ friendRequestPrivacy: 'Anyone' }) }));
  });

  it('clicking privacy tab calls updateSettings with correct value', async () => {
    await renderAndNavigateToPrivacy();
    await waitFor(() => screen.getByText('Allow friend requests from'));
    mockFetch.mockResolvedValueOnce(settingsOk('Off'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Off' })); });
    await waitFor(() => {
      const putCall = mockFetch.mock.calls.find(c => c[1]?.method === 'PUT' && String(c[0]).includes('/api/friends/settings'));
      expect(putCall).toBeTruthy();
      const body = JSON.parse(putCall![1].body);
      expect(body.friendRequestPrivacy).toBe('Off');
    });
    expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('save failure shows error toast', async () => {
    await renderAndNavigateToPrivacy();
    await waitFor(() => screen.getByText('Allow friend requests from'));
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: { code: 'Server.Error', message: 'Server error' } }) });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Off' })); });
    await waitFor(() => expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'default' })));
  });

  it('block count hint shows count derived from the first page', async () => {
    const five = [1, 2, 3, 4, 5].map(n => makeBlock(`b-${n}`, `User${n}`));
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
      if (u.includes('/api/friends/blocks')) return blocksOk(five);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => expect(screen.getByText('5 blocked players')).toBeInTheDocument());
  });

  it('block count hint shows "N+" when a second page exists', async () => {
    const twenty = Array.from({ length: 20 }, (_, i) => makeBlock(`b-${i}`, `User${i}`));
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
      if (u.includes('/api/friends/blocks')) return blocksOk(twenty, 'c-next');
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => expect(screen.getByText('20+ blocked players')).toBeInTheDocument());
  });

  it('block count hint shows "— blocked players" when count fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
      if (u.includes('/api/friends/blocks')) return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) });
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => expect(screen.getByText('— blocked players')).toBeInTheDocument());
  });

  it('Manage button toggles aria-expanded and loads block list', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
      if (u.includes('/api/friends/blocks')) return blocksOk([makeBlock('b-1', 'Dan')]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => screen.getByText('Block list'));
    const manageBtn = screen.getByRole('button', { name: 'Manage' });
    expect(manageBtn).toHaveAttribute('aria-expanded', 'false');
    await act(async () => { fireEvent.click(manageBtn); });
    await waitFor(() => expect(screen.getByText('Dan')).toBeInTheDocument());
    expect(manageBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('unblock removes user from list and decrements count', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      const u = String(url);
      if (u.includes('/api/profile/me')) return profileOk();
      if (u.includes('/api/friends/settings')) return settingsOk('Anyone');
      if (u.includes('/api/friends/blocks') && opts?.method === 'DELETE') return noContent();
      if (u.includes('/api/friends/blocks')) return blocksOk([makeBlock('b-1', 'Dan'), makeBlock('b-2', 'Eve')]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    const { SettingsPage } = await import('@/features/settings/SettingsPage');
    render(<SettingsPage />);
    await act(async () => { fireEvent.click(screen.getAllByRole('button', { name: 'Privacy' })[0]); });
    await waitFor(() => screen.getByText('Block list'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Manage' })); });
    await waitFor(() => screen.getByText('Dan'));
    const unblockBtns = screen.getAllByRole('button', { name: 'Unblock' });
    await act(async () => { fireEvent.click(unblockBtns[0]); });
    await waitFor(() => expect(screen.queryByText('Dan')).not.toBeInTheDocument());
    expect(screen.getByText('Eve')).toBeInTheDocument();
    expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success', title: 'Unblocked' }));
    // Block count should decrease to 1
    await waitFor(() => expect(screen.queryByText('2 blocked players')).not.toBeInTheDocument());
  });
});
