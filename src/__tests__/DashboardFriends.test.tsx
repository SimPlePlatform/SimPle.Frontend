import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter:   () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
  useParams:   () => ({}),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) =>
    <a href={href} className={className}>{children}</a>,
}));
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'u-1', displayName: 'Test User', username: 'testuser', initials: 'TU', color: '#F0394B', status: 'online' },
    status: 'authenticated',
  }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));

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

const mockSummary = {
  summary: null as { friendCount: number; incomingRequestCount: number; outgoingRequestCount: number } | null,
  loading: false,
  error: null as string | null,
  invalidate: vi.fn(),
  retry: vi.fn(),
};
vi.mock('@/features/friends/FriendSummaryContext', () => ({
  useFriendSummary: () => mockSummary,
  FriendSummaryProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// CursorPage<T> — no total/count.
function friendsOk(items: unknown[]) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items, nextCursor: null }) });
}

// No level/elo (deferred to M10).
function makeFriend(id: string, name: string) {
  return { userId: id, username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#F0394B', avatarUrl: null, friendsSince: '2026-01-01T00:00:00Z' };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.resetModules();
  mockSummary.summary = { friendCount: 0, incomingRequestCount: 0, outgoingRequestCount: 0 };
  mockSummary.loading = false;
  mockSummary.error = null;
});

async function renderDashboard() {
  const { DashboardPage } = await import('@/features/dashboard/DashboardPage');
  return render(<DashboardPage />);
}

describe('DashboardPage friends panel', () => {
  it('handles a missing summary before the request starts', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([]));
    mockSummary.summary = null;
    mockSummary.loading = false;
    await renderDashboard();
    expect(screen.getByText(/invite waiting/i)).toBeInTheDocument();
  });

  it('shows friend displayName when API returns friends', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([makeFriend('f-1', 'AliceUser')]));
    await renderDashboard();
    await waitFor(() => expect(screen.getByText('AliceUser')).toBeInTheDocument());
  });

  it('shows friends loading state', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    await renderDashboard();
    // Multiple panels (friends, lobby invites) show their own "status" live region while loading.
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
    resolve(friendsOk([]));
  });

  it('shows friend error state', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: { code: 'Server.Error', message: 'Server error' } }) });
    await renderDashboard();
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('shows pending request count when incomingRequestCount > 0', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([]));
    mockSummary.summary = { friendCount: 5, incomingRequestCount: 3, outgoingRequestCount: 0 };
    await renderDashboard();
    await waitFor(() => expect(screen.getByText(/3 friend request/i)).toBeInTheDocument());
  });

  it('does not show pending count when incomingRequestCount is 0', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([]));
    mockSummary.summary = { friendCount: 5, incomingRequestCount: 0, outgoingRequestCount: 0 };
    await renderDashboard();
    await waitFor(() => { /* let loading settle */ });
    expect(screen.queryByText(/friend request.*pending/i)).not.toBeInTheDocument();
  });

  it('does not show pending count while summary is loading', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([]));
    mockSummary.loading = true;
    mockSummary.summary = null; // null is safe here because summaryLoading=true → shows '…'
    await renderDashboard();
    expect(screen.queryByText(/friend request.*pending/i)).not.toBeInTheDocument();
  });

  it('does not show pending count when summary has error', async () => {
    mockFetch.mockResolvedValueOnce(friendsOk([]));
    mockSummary.error = 'Failed';
    mockSummary.summary = { friendCount: 0, incomingRequestCount: 2, outgoingRequestCount: 0 };
    await renderDashboard();
    expect(screen.queryByText(/friend request.*pending/i)).not.toBeInTheDocument();
  });
});
