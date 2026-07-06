import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockInvalidate = vi.fn();
const mockSummary = {
  summary: { friendCount: 3, incomingRequestCount: 1, outgoingRequestCount: 0 } as { friendCount: number; incomingRequestCount: number; outgoingRequestCount: number } | null,
  loading: false,
  error: null as string | null,
  retry: vi.fn(),
  invalidate: mockInvalidate,
};
vi.mock('@/features/friends/FriendSummaryContext', () => ({
  useFriendSummary: () => mockSummary,
}));

const mockToast = { push: vi.fn() };
vi.mock('@/components/ui/Toast', () => ({ useToast: () => mockToast }));

// Stub AddFriendModal to avoid nesting complexity
vi.mock('@/features/friends/AddFriendModal', () => ({
  AddFriendModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="add-friend-modal"><button onClick={onClose}>Close</button></div> : null,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ── Helpers ───────────────────────────────────────────────────────────────────

// CursorPage<T> — no total/count; nextCursor null on the last page.
function page(items: unknown[], nextCursor: string | null = null) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items, nextCursor }) });
}

function listOk(items: unknown[]) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(items) });
}

function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
}

function apiErr(status: number, code: string, message: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message } }) });
}

// No level/elo on friend/suggestion DTOs (deferred to M10).
function makeFriend(id: string, name: string) {
  return { userId: id, username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#F0394B', avatarUrl: null, friendsSince: '2026-01-01T00:00:00Z' };
}

function makeRequest(id: string, from: string, fromId: string) {
  return {
    requestId: id, requesterId: fromId, requesterUsername: from.toLowerCase(),
    requesterDisplayName: from, requesterInitials: from.slice(0, 2).toUpperCase(),
    requesterColor: '#38BDF8', requesterAvatarUrl: null,
    addresseeId: 'u-me', addresseeUsername: 'me', addresseeDisplayName: 'Me',
    addresseeInitials: 'ME', addresseeColor: '#F0394B', addresseeAvatarUrl: null,
    status: 'Pending', requestedAt: '2026-01-01T00:00:00Z', mutualFriendCount: 0,
  };
}

function makeSuggestion(id: string, name: string) {
  return { userId: id, username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#A78BFA', avatarUrl: null, mutualFriendCount: 1 };
}

// Default fetch mock: returns empty lists for all endpoints
function setupDefaultFetch() {
  mockFetch.mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes('/api/friends/suggestions')) return listOk([]);
    if (u.includes('direction=incoming'))       return page([]);
    if (u.includes('direction=outgoing'))       return page([]);
    if (u.includes('/api/friends'))             return page([]);
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockToast.push.mockReset();
  mockInvalidate.mockReset();
  mockSummary.summary = { friendCount: 3, incomingRequestCount: 1, outgoingRequestCount: 0 };
  mockSummary.loading = false;
  mockSummary.error = null;
  vi.resetModules();
});

async function renderPage() {
  const { FriendsPage } = await import('@/features/friends/FriendsPage');
  return render(<FriendsPage />);
}

describe('FriendsPage', () => {
  it('renders page title and Add friend button', async () => {
    setupDefaultFetch();
    await renderPage();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add friend/i })).toBeInTheDocument();
  });

  it('shows "Loading…" subtitle when summary is loading', async () => {
    setupDefaultFetch();
    mockSummary.loading = true;
    mockSummary.summary = null;
    await renderPage();
    await waitFor(() => expect(screen.getByText('Loading…')).toBeInTheDocument());
  });

  it('handles a missing summary before the request starts', async () => {
    setupDefaultFetch();
    mockSummary.loading = false;
    mockSummary.summary = null;
    await renderPage();
    await waitFor(() => expect(screen.getByText('Loading…')).toBeInTheDocument());
  });

  it('shows "Could not load counts. Retry" subtitle when summary has error', async () => {
    setupDefaultFetch();
    mockSummary.error = 'Network error';
    mockSummary.summary = null;
    await renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Could not load counts/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  it('shows summary counts in subtitle when loaded', async () => {
    setupDefaultFetch();
    await renderPage();
    await waitFor(() => expect(screen.getByText(/3 total · 1 pending requests/)).toBeInTheDocument());
  });

  it('friend list shows loading state initially', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('direction='))              return page([]);
      if (u.includes('/api/friends'))            return new Promise(r => { resolve = r; });
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => resolve({ ok: true, status: 200, json: () => Promise.resolve({ items: [], nextCursor: null }) }));
  });

  it('renders friend displayName after successful load', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('direction='))              return page([]);
      if (u.includes('/api/friends'))            return page([makeFriend('f-1', 'AliceFriend')]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('AliceFriend')).toBeInTheDocument());
  });

  it('shows error + retry when friends fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('direction='))              return page([]);
      if (u.includes('/api/friends'))            return apiErr(500, 'Server.Error', 'Server broke');
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => expect(screen.getByText('Server broke')).toBeInTheDocument());
  });

  it('partial failure: friends error does not prevent requests panel', async () => {
    const req = makeRequest('rq-1', 'BobSender', 'u-bob');
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('direction=incoming'))       return page([req]);
      if (u.includes('direction=outgoing'))       return page([]);
      if (u.includes('/api/friends'))            return apiErr(500, 'Server.Error', 'Friends failed');
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => screen.getByText('Friends failed'));
    await act(async () => { fireEvent.click(screen.getByRole('tab', { name: /Requests/i }) ?? screen.getByText(/Requests/)); });
    await waitFor(() => expect(screen.getByText('BobSender')).toBeInTheDocument());
  });

  it('accept request calls friendsApi.acceptRequest and invalidates summary', async () => {
    const req = makeRequest('rq-1', 'BobSender', 'u-bob');
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('/api/friends/requests/rq-1/accept')) return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ...req, status: 'Accepted' }) });
      if (u.includes('direction=incoming'))       return page([req]);
      if (u.includes('direction=outgoing'))       return page([]);
      if (u.includes('/api/friends'))            return page([]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();

    const requestsTab = await waitFor(() => {
      const el = screen.getAllByText(/Requests/).find(b => b.tagName === 'BUTTON' || b.closest('[role="tab"]'));
      return el!;
    });
    await act(async () => { fireEvent.click(requestsTab); });
    await waitFor(() => screen.getByText('BobSender'));

    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Accept/i })); });
    await waitFor(() => {
      expect(mockInvalidate).toHaveBeenCalled();
      expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
    });
  });

  it('accept failure shows error toast and pending resets to false', async () => {
    const req = makeRequest('rq-1', 'BobSender', 'u-bob');
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('/api/friends/requests/rq-1/accept')) return apiErr(409, 'Friends.ConcurrencyConflict', 'Conflict');
      if (u.includes('direction=incoming'))       return page([req]);
      if (u.includes('direction=outgoing'))       return page([]);
      if (u.includes('/api/friends'))            return page([]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    const requestsTab = await waitFor(() => screen.getAllByText(/Requests/)[0]);
    await act(async () => { fireEvent.click(requestsTab); });
    await waitFor(() => screen.getByText('BobSender'));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Accept/i })); });
    await waitFor(() => {
      expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'default' }));
      expect(screen.getByRole('button', { name: /Accept/i })).not.toBeDisabled();
    });
  });

  it('search debounce calls getFriends with query after 300ms', async () => {
    vi.useFakeTimers();
    setupDefaultFetch();
    await renderPage();
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mockFetch.mockReset();
    setupDefaultFetch();
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    await act(async () => { fireEvent.change(searchInput, { target: { value: 'alice' } }); });
    expect(mockFetch).not.toHaveBeenCalled(); // still debouncing
    await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
    const friendsCalls = mockFetch.mock.calls.filter(c => String(c[0]).includes('/api/friends') && !String(c[0]).includes('direction') && !String(c[0]).includes('suggestions'));
    expect(friendsCalls.length).toBeGreaterThan(0);
    expect(String(friendsCalls[0][0])).toContain('query=alice');
    vi.useRealTimers();
  });

  it('load more appends friends via the keyset cursor', async () => {
    mockFetch.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions')) return listOk([]);
      if (u.includes('direction='))              return page([]);
      if (u.includes('/api/friends') && u.includes('cursor=c-2')) return page([makeFriend('f-2', 'BobFriend')], null);
      if (u.includes('/api/friends'))            return page([makeFriend('f-1', 'AliceFriend')], 'c-2');
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    await waitFor(() => screen.getByText('AliceFriend'));
    await act(async () => { fireEvent.click(screen.getByText('Load more')); });
    await waitFor(() => {
      expect(screen.getByText('AliceFriend')).toBeInTheDocument();
      expect(screen.getByText('BobFriend')).toBeInTheDocument();
    });
    // Load-more must have used the opaque cursor, not an offset page number.
    const moreCall = mockFetch.mock.calls.find(c => String(c[0]).includes('cursor=c-2'));
    expect(moreCall).toBeTruthy();
  });

  it('dismiss suggestion calls the dismiss endpoint and removes it optimistically', async () => {
    const sugg = makeSuggestion('s-1', 'CarolSugg');
    mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      const u = String(url);
      if (u.includes('/api/friends/suggestions/s-1/dismiss') && opts?.method === 'PUT') return noContent();
      if (u.includes('/api/friends/suggestions')) return listOk([sugg]);
      if (u.includes('direction='))              return page([]);
      if (u.includes('/api/friends'))            return page([]);
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    });
    await renderPage();
    const suggestTab = await waitFor(() => screen.getAllByText(/Suggestions/)[0]);
    await act(async () => { fireEvent.click(suggestTab); });
    await waitFor(() => expect(screen.getAllByText('CarolSugg').length).toBeGreaterThan(0));

    const dismissBtns = screen.getAllByRole('button', { name: /Dismiss CarolSugg/i });
    expect(dismissBtns.length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(dismissBtns[0]); });

    await waitFor(() => expect(screen.queryAllByText('CarolSugg')).toHaveLength(0));
    const dismissCall = mockFetch.mock.calls.find(c => String(c[0]).includes('/api/friends/suggestions/s-1/dismiss'));
    expect(dismissCall).toBeTruthy();
    expect(dismissCall![1].method).toBe('PUT');
  });

  it('Add friend button opens AddFriendModal', async () => {
    setupDefaultFetch();
    await renderPage();
    expect(screen.queryByTestId('add-friend-modal')).not.toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Add friend/i })); });
    expect(screen.getByTestId('add-friend-modal')).toBeInTheDocument();
  });

  it('Share invite link button is disabled (Module 7 deferred)', async () => {
    setupDefaultFetch();
    await renderPage();
    const shareBtn = screen.getByRole('button', { name: /Share invite link/i });
    expect(shareBtn).toBeDisabled();
  });
});
