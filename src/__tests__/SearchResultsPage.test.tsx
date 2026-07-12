import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockToastPush = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: mockToastPush }) }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
  mockReplace.mockReset();
  mockToastPush.mockReset();
});

function hostIdentity(name = 'Priya') {
  return { userId: 'u-host', username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#F0394B', avatarUrl: null, profileType: 'Standard' };
}

function lobbySummary(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    lobbyId: 'lobby-1', gameSlug: 'chess-lite', maxPlayers: 2, joinedCount: 1,
    timeControlId: 'blitz-5', rated: false, resolvedRegion: 'NA', spectatorPolicy: 'Open',
    host: hostIdentity(), createdAt: '2026-01-01T00:00:00Z', expiresAtUtc: '2026-01-01T01:00:00Z',
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

function setupFetch(handler: (url: string, opts?: { method?: string }) => Promise<unknown> | null) {
  mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    const result = handler(String(url), opts);
    if (result) return result;
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: { code: 'NotFound', message: 'Not found' } }) });
  });
}

async function renderPage(initialType = 'lobbies') {
  const { SearchResultsPage } = await import('@/features/search/SearchResultsPage');
  return render(<SearchResultsPage initialQuery="" initialType={initialType} />);
}

describe('SearchResultsPage — Public Lobbies tab', () => {
  it('loads public lobbies on mount when initialType=lobbies', async () => {
    setupFetch(u => {
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary()], nextCursor: null });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('chess-lite')).toBeInTheDocument());
    expect(screen.getByText(/Hosted by Priya/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no public lobbies', async () => {
    setupFetch(u => {
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [], nextCursor: null });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('No public lobbies right now')).toBeInTheDocument());
  });

  it('shows an error state with retry on failure', async () => {
    let calls = 0;
    setupFetch(u => {
      if (u.includes('/api/lobbies')) {
        calls++;
        return calls === 1
          ? jsonResponse(500, { error: { code: 'Server.Error', message: 'Server broke' } })
          : jsonResponse(200, { items: [lobbySummary()], nextCursor: null });
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Server broke')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); });
    await waitFor(() => expect(screen.getByText('chess-lite')).toBeInTheDocument());
  });

  it('clicking Join calls join-by-lobbyId and navigates to the lobby', async () => {
    setupFetch((u, opts) => {
      if (u.endsWith('/api/lobbies/join') && opts?.method === 'POST') {
        return jsonResponse(200, { lobbyId: 'lobby-1' });
      }
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary()], nextCursor: null });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('chess-lite')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Join' })); });
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('lobby-1')));
  });

  it('a 404 on join removes the stale lobby and shows a toast, without navigating', async () => {
    setupFetch((u, opts) => {
      if (u.endsWith('/api/lobbies/join') && opts?.method === 'POST') {
        return jsonResponse(404, { error: { code: 'Lobbies.NotFound', message: 'Not found' } });
      }
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary()], nextCursor: null });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('chess-lite')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Join' })); });
    await waitFor(() => expect(screen.getByText('No public lobbies right now')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockToastPush).toHaveBeenCalledWith(expect.objectContaining({ title: 'This lobby is no longer available.' }));
  });

  it('shows a disabled "Full" button instead of Join when the lobby is at capacity', async () => {
    setupFetch(u => {
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary({ joinedCount: 2, maxPlayers: 2 })], nextCursor: null });
      return null;
    });
    await renderPage();
    const btn = await screen.findByRole('button', { name: 'Full' });
    expect(btn).toBeDisabled();
  });

  it('Load more traverses via the cursor', async () => {
    setupFetch(u => {
      if (u.includes('cursor=c-2')) return jsonResponse(200, { items: [lobbySummary({ lobbyId: 'lobby-2', host: hostIdentity('Bob') })], nextCursor: null });
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary()], nextCursor: 'c-2' });
      return null;
    });
    await renderPage();
    await waitFor(() => screen.getByText('Load more'));
    await act(async () => { fireEvent.click(screen.getByText('Load more')); });
    await waitFor(() => expect(screen.getByText(/Hosted by Bob/)).toBeInTheDocument());
  });

  it('switching from People to the Lobbies tab loads lobbies exactly once', async () => {
    setupFetch(u => {
      if (u.includes('/api/lobbies')) return jsonResponse(200, { items: [lobbySummary()], nextCursor: null });
      return null;
    });
    await renderPage('people');
    expect(mockFetch).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: /Public Lobbies/i })); });
    await waitFor(() => expect(screen.getByText('chess-lite')).toBeInTheDocument());
    expect(mockFetch.mock.calls.filter(c => String(c[0]).includes('/api/lobbies')).length).toBe(1);
  });
});
