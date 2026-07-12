import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
});

function game(slug: string, name: string, maxPlayers = 2) {
  return {
    slug, name, summary: '', rulesSummary: '', category: 'strategy', tags: [], difficulty: 'Medium',
    estimatedDurationMinMinutes: 5, estimatedDurationMaxMinutes: 10, minPlayers: 2, maxPlayers,
    lifecycle: 'Available', capabilities: [], featuredRank: null,
    artToken: slug, artColorA: '#F0394B', artColorB: '#111', artAltText: `${name} art`,
    entryActions: [],
  };
}

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) });
}

function setupFetch(handler: (url: string) => Promise<unknown> | null) {
  mockFetch.mockImplementation((url: string) => {
    const result = handler(String(url));
    if (result) return result;
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

const capabilityProfile = {
  gameSlug: 'chess-lite', capabilityVersion: 1, minPlayers: 2, maxPlayers: 2,
  allowedModes: ['multiplayer'], timeControls: ['blitz-5'], tieBreakRules: ['sudden-death'],
  spectatorPolicies: ['Open'], ratedEligible: true, aiFillEligible: false,
};

async function renderModal(props: { preselectedGameSlug?: string } = {}) {
  const { CreateLobbyModal } = await import('@/components/lobby/CreateLobbyModal');
  const onClose = vi.fn();
  render(<CreateLobbyModal open={true} onClose={onClose} {...props} />);
  return { onClose };
}

describe('CreateLobbyModal — preselectedGameSlug', () => {
  it('preselects the matching eligible game when preselectedGameSlug is given', async () => {
    setupFetch(u => {
      if (u.includes('/api/games') && !u.includes('capabilities')) {
        return jsonResponse(200, { items: [game('chess-lite', 'Chess Lite'), game('checkers', 'Checkers')], nextCursor: null });
      }
      if (u.includes('/api/lobbies/capabilities/chess-lite')) return jsonResponse(200, capabilityProfile);
      return null;
    });
    await renderModal({ preselectedGameSlug: 'chess-lite' });
    await waitFor(() => expect(mockFetch.mock.calls.some(c => String(c[0]).includes('/capabilities/chess-lite'))).toBe(true));
  });

  it('falls back to the first eligible game when preselectedGameSlug is not multiplayer-eligible', async () => {
    setupFetch(u => {
      if (u.includes('/api/games') && !u.includes('capabilities')) {
        // 'solo-only' isn't in the eligible (maxPlayers > 1) list at all.
        return jsonResponse(200, { items: [game('chess-lite', 'Chess Lite'), game('checkers', 'Checkers')], nextCursor: null });
      }
      if (u.includes('/api/lobbies/capabilities/chess-lite')) return jsonResponse(200, capabilityProfile);
      return null;
    });
    await renderModal({ preselectedGameSlug: 'solo-only' });
    await waitFor(() => expect(mockFetch.mock.calls.some(c => String(c[0]).includes('/capabilities/chess-lite'))).toBe(true));
  });

  it('filters out single-player games from the picker entirely', async () => {
    setupFetch(u => {
      if (u.includes('/api/games') && !u.includes('capabilities')) {
        return jsonResponse(200, { items: [game('falling-blocks', 'Falling Blocks', 1), game('chess-lite', 'Chess Lite', 2)], nextCursor: null });
      }
      if (u.includes('/api/lobbies/capabilities/chess-lite')) return jsonResponse(200, capabilityProfile);
      return null;
    });
    await renderModal();
    await waitFor(() => expect(screen.getAllByText('Chess Lite').length).toBeGreaterThan(0));
    expect(screen.queryByText('Falling Blocks')).not.toBeInTheDocument();
  });
});
