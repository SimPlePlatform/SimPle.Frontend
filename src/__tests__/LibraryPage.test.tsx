import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/link', () => ({
  default: ({ href, children, style }: { href: string; children: React.ReactNode; style?: React.CSSProperties }) =>
    <a href={href} style={style}>{children}</a>,
}));

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

function game(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    slug: 'falling-blocks', name: 'Falling Blocks', summary: 'Stack the pieces.', rulesSummary: 'Clear lines.',
    category: 'puzzle', tags: ['puzzle', 'logic'], difficulty: 'Medium',
    estimatedDurationMinMinutes: 5, estimatedDurationMaxMinutes: 10,
    minPlayers: 1, maxPlayers: 1, lifecycle: 'Available', capabilities: ['ai'],
    featuredRank: null, artToken: 'falling-blocks', artColorA: '#F0394B', artColorB: '#111',
    artAltText: 'Falling Blocks art', entryActions: [],
    ...overrides,
  };
}

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}
function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
}
function apiErr(status: number, code: string, message: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message } }) });
}

function setupFetch(handlers: { list?: () => Promise<unknown>; featured?: () => Promise<unknown> }) {
  mockFetch.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('/api/games/featured')) return (handlers.featured ?? (() => noContent()))();
    if (u.includes('/api/games')) return (handlers.list ?? (() => ok({ items: [], nextCursor: null })))();
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

async function renderPage(initialQuery = '') {
  const { LibraryPage } = await import('@/features/games/LibraryPage');
  return render(<LibraryPage initialQuery={initialQuery} />);
}

describe('LibraryPage', () => {
  it('shows skeleton placeholders while loading, then real content after the debounced fetch resolves', async () => {
    setupFetch({ list: () => ok({ items: [game()], nextCursor: null }) });
    const { LibraryPage } = await import('@/features/games/LibraryPage');
    render(<LibraryPage />);
    expect(screen.getByText('Game Library')).toBeInTheDocument();
    expect(document.querySelectorAll('.skel').length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    expect(document.querySelectorAll('.skel').length).toBe(0);
  });

  it('renders the initial empty state when no games exist and no filter is active', async () => {
    setupFetch({ list: () => ok({ items: [], nextCursor: null }) });
    await renderPage();
    await waitFor(() => expect(screen.getByText('No games available yet.')).toBeInTheDocument());
  });

  it('renders the filtered empty state with a reset action when a search yields nothing', async () => {
    setupFetch({ list: () => ok({ items: [], nextCursor: null }) });
    await renderPage('nonexistent');
    await waitFor(() => expect(screen.getByText('No games match that filter.')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Reset filters' })).toBeInTheDocument();
  });

  it('shows an error state with retry on load failure, and retry re-fetches', async () => {
    let calls = 0;
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/games/featured')) return noContent();
      if (u.includes('/api/games')) {
        calls++;
        return calls === 1 ? apiErr(500, 'Server.Error', 'Server broke') : ok({ items: [game()], nextCursor: null });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Server broke')).toBeInTheDocument());
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry' })); });
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
  });

  it('renders game cards as links (not click-only containers)', async () => {
    setupFetch({ list: () => ok({ items: [game()], nextCursor: null }) });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    const names = screen.getAllByText('Falling Blocks');
    const link = names.map(n => n.closest('a')).find(Boolean);
    expect(link).toBeTruthy();
    expect(link).toHaveAttribute('href', '/games/falling-blocks');
  });

  it('debounces search input and cancels a stale response so it cannot overwrite a newer query', async () => {
    let firstCallSeen = false;
    let secondCallSeen = false;
    let resolveFirst!: (v: unknown) => void;
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/games/featured')) return noContent();
      if (u.includes('/api/games')) {
        if (!firstCallSeen) { firstCallSeen = true; return new Promise(r => { resolveFirst = r; }); }
        secondCallSeen = true;
        return ok({ items: [game({ slug: 'four-in-a-row', name: 'Four in a Row' })], nextCursor: null });
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });

    await renderPage();
    await waitFor(() => expect(firstCallSeen).toBe(true));

    const input = screen.getByPlaceholderText('Search games…');
    fireEvent.change(input, { target: { value: 'four' } });
    await waitFor(() => expect(secondCallSeen).toBe(true));
    await waitFor(() => expect(screen.getAllByText('Four in a Row').length).toBeGreaterThan(0));

    // Resolve the stale first (initial) response late, with different data — it must not overwrite the newer query's result.
    await act(async () => { resolveFirst(ok({ items: [game({ slug: 'stale-game', name: 'Stale Game' })], nextCursor: null })); });
    expect(screen.queryByText('Stale Game')).not.toBeInTheDocument();
    expect(screen.getAllByText('Four in a Row').length).toBeGreaterThan(0);
  });

  it('load more appends games via the opaque keyset cursor ("after")', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/games/featured')) return noContent();
      if (u.includes('/api/games') && u.includes('after=c-2')) return ok({ items: [game({ slug: 'chess', name: 'Chess' })], nextCursor: null });
      if (u.includes('/api/games')) return ok({ items: [game()], nextCursor: 'c-2' });
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0));
    await act(async () => { fireEvent.click(screen.getByText('Load more')); });
    await waitFor(() => expect(screen.getAllByText('Chess').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Falling Blocks').length).toBeGreaterThan(0);
  });

  it('renders the Coming soon lifecycle chip on cards, not a fake online/play claim', async () => {
    setupFetch({ list: () => ok({ items: [game({ lifecycle: 'ComingSoon' })], nextCursor: null }) });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Coming soon')).toBeInTheDocument());
  });

  it('renders the featured banner as a distinct link to game details', async () => {
    setupFetch({
      list: () => ok({ items: [game()], nextCursor: null }),
      featured: () => ok(game({ slug: 'chess', name: 'Chess', summary: 'The classic.' })),
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Spotlight')).toBeInTheDocument());
    expect(screen.getAllByText('Chess').length).toBeGreaterThan(0);
    const viewDetailsBtn = screen.getByRole('button', { name: 'View details' });
    fireEvent.click(viewDetailsBtn);
    expect(mockPush).toHaveBeenCalledWith('/games/chess');
  });
});
