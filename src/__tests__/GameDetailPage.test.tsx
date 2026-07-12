import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockAuth = { status: 'anonymous' as string };
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: mockAuth.status }),
}));

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
  mockAuth.status = 'anonymous';
});

function game(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    slug: 'falling-blocks', name: 'Falling Blocks', summary: 'Stack the pieces.', rulesSummary: 'Clear lines.',
    category: 'puzzle', tags: ['puzzle', 'logic'], difficulty: 'Medium',
    estimatedDurationMinMinutes: 5, estimatedDurationMaxMinutes: 10,
    minPlayers: 1, maxPlayers: 1, lifecycle: 'Available', capabilities: ['ai'],
    featuredRank: null, artToken: 'falling-blocks', artColorA: '#F0394B', artColorB: '#111',
    artAltText: 'Falling Blocks art',
    entryActions: [
      { action: 'quick-match', status: 'deferred', reasonCode: 'Games.AwaitingLobby', ownerModule: 6 },
      { action: 'play-vs-ai', status: 'deferred', reasonCode: 'Games.AwaitingAiEngine', ownerModule: 9 },
    ],
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

function setupDetailFetch(handler: (url: string, opts?: { method?: string }) => Promise<unknown> | null) {
  mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
    const result = handler(String(url), opts);
    if (result) return result;
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: { code: 'Games.NotFound', message: 'Not found' } }) });
  });
}

async function renderPage(gameId = 'falling-blocks') {
  const { GameDetailPage } = await import('@/features/games/GameDetailPage');
  return render(<GameDetailPage gameId={gameId} />);
}

describe('GameDetailPage', () => {
  it('renders a 404 in-page message for an unknown game (never a fallback game)', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/ghost')) return jsonResponse(404, { error: { code: 'Games.NotFound', message: 'Not found' } });
      return null;
    });
    await renderPage('ghost');
    await waitFor(() => expect(screen.getByText("This game isn't available.")).toBeInTheDocument());
    expect(screen.queryByText('Falling Blocks')).not.toBeInTheDocument();
  });

  it('renders a distinct tombstone state for a 410 Retired game (not the 404 message)', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/old-game')) {
        return Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve({ slug: 'old-game', name: 'Old Game', lifecycle: 'Retired', reasonCode: 'Games.Retired' }) });
      }
      return null;
    });
    await renderPage('old-game');
    await waitFor(() => expect(screen.getByText('Old Game has been retired.')).toBeInTheDocument());
    expect(screen.queryByText("This game isn't available.")).not.toBeInTheDocument();
  });

  it('shows an error state with retry on a server failure', async () => {
    let calls = 0;
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) {
        calls++;
        return calls === 1
          ? jsonResponse(500, { error: { code: 'Server.Error', message: 'Server broke' } })
          : jsonResponse(200, game());
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Server broke')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); });
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
  });

  it('renders disabled entry actions naming their real owner module, not a generic label', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) return jsonResponse(200, game());
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    expect(screen.getByText('Available once Module 6 — Lobby & Matchmaking System ships.')).toBeInTheDocument();
    expect(screen.getByText('Available once Module 9 — Solo vs AI Platform Flow ships.')).toBeInTheDocument();
    const quickMatchBtn = screen.getByText('Quick match').closest('button');
    expect(quickMatchBtn).toBeDisabled();
  });

  it('does not render fake stats/leaderboard data — shows a deferred empty state instead', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) return jsonResponse(200, game());
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: 'Your stats' })); });
    await waitFor(() => expect(screen.getByText('No stats yet.')).toBeInTheDocument());
    expect(screen.getByText('Available once Module 10 — Stats, Achievements & Leaderboards ships.')).toBeInTheDocument();
  });

  it('anonymous favorite click shows a sign-in prompt instead of mutating', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) return jsonResponse(200, game());
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Favorite/i })); });
    await waitFor(() => expect(screen.getByText('Sign in to favorite games.')).toBeInTheDocument());
    const favoriteCall = mockFetch.mock.calls.find(c => String(c[0]).includes('/favorites/'));
    expect(favoriteCall).toBeUndefined();
  });

  it('authenticated: favorite toggle is optimistic and rolls back on failure', async () => {
    mockAuth.status = 'authenticated';
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks') && !u.includes('favorites')) return jsonResponse(200, game());
      if (u.includes('/api/games/me/favorites') && !u.includes('/falling-blocks')) return jsonResponse(200, { items: [], nextCursor: null });
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    // Favorite state resolves to "not favorited" after paging.
    await waitFor(() => expect(screen.getByRole('button', { name: /Favorite/i })).toHaveAttribute('aria-pressed', 'false'));

    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/games/me/favorites/falling-blocks')) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: { code: 'Server.Error', message: 'Failed to update favorite.' } }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Favorite/i })); });
    // Optimistic flip then rollback to false on error.
    await waitFor(() => expect(screen.getByRole('button', { name: /Favorite/i })).toHaveAttribute('aria-pressed', 'false'));
    await waitFor(() => expect(screen.getByText('Failed to update favorite.')).toBeInTheDocument());
  });

  it('renders game art with an accessible alt label even for an unrecognized art token (broken-media fallback)', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/mystery-game')) return jsonResponse(200, game({ slug: 'mystery-game', name: 'Mystery Game', artToken: 'unknown-token' }));
      return null;
    });
    await renderPage('mystery-game');
    await waitFor(() => expect(screen.getByRole('img', { name: 'Falling Blocks art' })).toBeInTheDocument());
  });

  it('favorite toggle is keyboard operable (a real <button>, not a div)', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) return jsonResponse(200, game());
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    const favoriteBtn = screen.getByRole('button', { name: /Favorite/i });
    expect(favoriteBtn.tagName).toBe('BUTTON');
    favoriteBtn.focus();
    expect(favoriteBtn).toHaveFocus();
  });

  // ── M6 entry actions: enabled branch + per-game client gating ──────────────

  it('an enabled action for a multiplayer game opens its real modal (create lobby)', async () => {
    mockAuth.status = 'authenticated';
    setupDetailFetch(u => {
      if (u.includes('/api/games/chess-lite')) {
        return jsonResponse(200, game({
          slug: 'chess-lite', name: 'Chess Lite', minPlayers: 2, maxPlayers: 2, capabilities: ['multiplayer', 'ranked'],
          entryActions: [
            { action: 'quick-match', status: 'enabled', reasonCode: 'Games.EntryDeferred.QuickMatch', ownerModule: 6 },
            { action: 'create-lobby', status: 'enabled', reasonCode: 'Games.EntryDeferred.Lobby', ownerModule: 6 },
            { action: 'invite-friend', status: 'enabled', reasonCode: 'Games.EntryDeferred.Invite', ownerModule: 6 },
          ],
        }));
      }
      return null;
    });
    await renderPage('chess-lite');
    await waitFor(() => expect(screen.getAllByText('Chess Lite').length).toBeGreaterThan(0));

    // quick-match is enabled backend-side but this game doesn't declare the 'quick-match' capability —
    // the client re-checks per-game and still gates it.
    expect(screen.getByText('Not supported for this game.')).toBeInTheDocument();
    const quickMatchBtn = screen.getByText('Quick match').closest('button');
    expect(quickMatchBtn).toBeDisabled();

    // create-lobby is genuinely enabled for this 2-player game — clicking opens CreateLobbyModal.
    const createLobbyBtn = screen.getByText('Create lobby').closest('button');
    expect(createLobbyBtn).not.toBeDisabled();
    await act(async () => { fireEvent.click(createLobbyBtn!); });
    await waitFor(() => expect(screen.getByText('Create a lobby')).toBeInTheDocument());
  });

  it('create-lobby/invite-friend are client-gated with "This is a solo game." for a single-player game', async () => {
    setupDetailFetch(u => {
      if (u.includes('/api/games/falling-blocks')) {
        return jsonResponse(200, game({
          minPlayers: 1, maxPlayers: 1,
          entryActions: [
            { action: 'create-lobby', status: 'enabled', reasonCode: 'Games.EntryDeferred.Lobby', ownerModule: 6 },
            { action: 'invite-friend', status: 'enabled', reasonCode: 'Games.EntryDeferred.Invite', ownerModule: 6 },
          ],
        }));
      }
      return null;
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    expect(screen.getAllByText('This is a solo game.').length).toBe(2);
    expect(screen.getByText('Create lobby').closest('button')).toBeDisabled();
    expect(screen.getByText('Invite friend').closest('button')).toBeDisabled();
  });
});
