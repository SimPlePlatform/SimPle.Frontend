import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUser: { id: string; username: string; displayName: string } | null = { id: 'u-1', username: 'me', displayName: 'Me' };
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, status: mockUser ? 'authenticated' : 'anonymous' }),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
});

function identity(userId: string, name: string) {
  return { userId, username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#F0394B', avatarUrl: null, profileType: 'Standard' };
}

function seat(userId: string, name: string, overrides: Partial<Record<string, unknown>> = {}) {
  return { identity: identity(userId, name), isHost: false, isReady: false, joinedAtUtc: '2026-01-01T00:00:00Z', ...overrides };
}

function lobby(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    lobbyId: 'lobby-1', gameSlug: 'chess-lite', capabilityVersion: 1,
    privacy: 'Private', maxPlayers: 2, timeControlId: 'blitz-5', rated: false,
    resolvedRegion: 'NA', spectatorPolicy: 'Open', tieBreakRuleId: 'sudden-death',
    aiFillRequested: false, state: 'Open', revision: 1, expiresAtUtc: '2026-01-01T01:00:00Z',
    closedReason: null, hostUserId: 'u-host', seats: [seat('u-host', 'Host', { isHost: true })],
    allowedActions: [], dependencyReadiness: { chat: false, matchRuntime: false, aiParticipants: false },
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

function setupFetch(handler: (url: string, opts?: { method?: string; body?: string }) => Promise<unknown> | null) {
  mockFetch.mockImplementation((url: string, opts?: { method?: string; body?: string }) => {
    const result = handler(String(url), opts);
    if (result) return result;
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: { code: 'Lobbies.NotFound', message: 'Not found' } }) });
  });
}

async function renderPage(lobbyId = 'lobby-1') {
  const { LobbyPage } = await import('@/features/lobby/LobbyPage');
  return render(<LobbyPage lobbyId={lobbyId} />);
}

describe('LobbyPage', () => {
  it('renders a not-found state on a 404', async () => {
    setupFetch(u => {
      if (u.includes('/api/lobbies/lobby-1') && !u.includes('capabilities')) return jsonResponse(404, { error: { code: 'Lobbies.NotFound', message: 'Not found' } });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Lobby not found.')).toBeInTheDocument());
  });

  it('renders seats and the Ready toggle for a joined member', async () => {
    setupFetch(u => {
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, lobby({
          hostUserId: 'u-1',
          seats: [seat('u-1', 'Me', { isHost: true })],
          allowedActions: ['ready', 'leave'],
        }));
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Not ready').length).toBeGreaterThan(0));
    expect(screen.queryByText('Join lobby')).not.toBeInTheDocument();
  });

  it('shows a Join lobby CTA for a non-member browsing a Public+Open lobby', async () => {
    setupFetch(u => {
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, lobby({ privacy: 'Public', state: 'Open', allowedActions: [] }));
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Join lobby' })).toBeInTheDocument());
  });

  it('does not show a Join lobby CTA for a non-member on a Private lobby', async () => {
    setupFetch(u => {
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, lobby({ privacy: 'Private', state: 'Open', allowedActions: [] }));
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Players · 1 / 2')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Join lobby' })).not.toBeInTheDocument();
  });

  it('shows a disabled "Lobby full" state instead of Join lobby when seats are full', async () => {
    setupFetch(u => {
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, lobby({
          privacy: 'Public', state: 'Open', maxPlayers: 2,
          seats: [seat('u-host', 'Host', { isHost: true }), seat('u-2', 'Other')],
        }));
      }
      return null;
    });
    await renderPage();
    const btn = await screen.findByRole('button', { name: 'Lobby full' });
    expect(btn).toBeDisabled();
  });

  it('clicking Join lobby calls join-by-lobbyId and re-renders as a member', async () => {
    let joined = false;
    setupFetch((u, opts) => {
      if (u.endsWith('/api/lobbies/join') && opts?.method === 'POST') {
        joined = true;
        return jsonResponse(200, lobby({
          privacy: 'Public', state: 'Open', allowedActions: ['ready', 'leave'],
          seats: [seat('u-host', 'Host', { isHost: true }), seat('u-1', 'Me')],
        }));
      }
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, joined
          ? lobby({ privacy: 'Public', state: 'Open', allowedActions: ['ready', 'leave'], seats: [seat('u-host', 'Host', { isHost: true }), seat('u-1', 'Me')] })
          : lobby({ privacy: 'Public', state: 'Open', allowedActions: [] }));
      }
      return null;
    });
    await renderPage();
    const joinBtn = await screen.findByRole('button', { name: 'Join lobby' });
    await act(async () => { fireEvent.click(joinBtn); });

    const joinCall = mockFetch.mock.calls.find(c => String(c[0]).endsWith('/api/lobbies/join'));
    expect(joinCall).toBeDefined();
    expect(JSON.parse(String((joinCall![1] as { body: string }).body))).toEqual({ lobbyId: 'lobby-1' });

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Join lobby' })).not.toBeInTheDocument());
    expect(screen.getAllByText('Not ready').length).toBeGreaterThan(0);
  });

  it('a 404 on join (lobby closed/filled in the race) flips to the not-found state', async () => {
    setupFetch((u, opts) => {
      if (u.endsWith('/api/lobbies/join') && opts?.method === 'POST') {
        return jsonResponse(404, { error: { code: 'Lobbies.NotFound', message: 'Not found' } });
      }
      if (u.endsWith('/api/lobbies/lobby-1')) {
        return jsonResponse(200, lobby({ privacy: 'Public', state: 'Open', allowedActions: [] }));
      }
      return null;
    });
    await renderPage();
    const joinBtn = await screen.findByRole('button', { name: 'Join lobby' });
    await act(async () => { fireEvent.click(joinBtn); });
    await waitFor(() => expect(screen.getByText('Lobby not found.')).toBeInTheDocument());
  });
});
