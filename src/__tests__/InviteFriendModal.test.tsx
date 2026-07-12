import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: vi.fn() }) }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// CursorPage<T> — no total/count; nextCursor null on the last page.
function pagedFriends(items: unknown[], nextCursor: string | null = null) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ items, nextCursor }) });
}

// No level/elo (deferred to M10).
function makeFriend(id: string, name: string) {
  return { userId: id, username: name.toLowerCase(), displayName: name, initials: name.slice(0, 2).toUpperCase(), color: '#F0394B', avatarUrl: null, friendsSince: '2026-01-01T00:00:00Z' };
}

beforeEach(() => {
  mockFetch.mockReset();
  vi.resetModules();
});

async function renderModal(open = true) {
  const { InviteFriendModal } = await import('@/components/friends/InviteFriendModal');
  const onClose = vi.fn();
  render(<InviteFriendModal open={open} onClose={onClose} lobbyId="lobby-1" />);
  return { onClose };
}

describe('InviteFriendModal', () => {
  it('does not fetch when open=false', async () => {
    await renderModal(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('loads friends on open', async () => {
    mockFetch.mockResolvedValueOnce(pagedFriends([makeFriend('f-1', 'Alice')]));
    await renderModal();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends'),
      expect.any(Object),
    );
  });

  it('shows loading state while fetching', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    await renderModal();
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => resolve(pagedFriends([])));
  });

  it('shows empty state when no friends', async () => {
    mockFetch.mockResolvedValueOnce(pagedFriends([]));
    await renderModal();
    await waitFor(() => expect(screen.getByText(/No friends yet/)).toBeInTheDocument());
  });

  it('shows error state on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.resolve({ error: { code: 'Server.Error', message: 'Server error' } }) });
    await renderModal();
    await waitFor(() => expect(screen.getByText('Server error')).toBeInTheDocument());
  });

  it('debounced search calls server getFriends with query', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(pagedFriends([makeFriend('f-1', 'Alice')]));
    await renderModal();
    await act(async () => { vi.runAllTimers(); await Promise.resolve(); });
    mockFetch.mockReset();
    mockFetch.mockResolvedValueOnce(pagedFriends([]));
    const input = screen.getByPlaceholderText(/Search by name/i);
    await act(async () => { fireEvent.change(input, { target: { value: 'ali' } }); });
    await act(async () => { vi.advanceTimersByTime(350); await Promise.resolve(); });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('query=ali'),
      expect.any(Object),
    );
    vi.useRealTimers();
  });

  it('load more button traverses via the keyset cursor', async () => {
    mockFetch.mockResolvedValueOnce(pagedFriends([makeFriend('f-1', 'Alice')], 'c-2'));
    await renderModal();
    await waitFor(() => screen.getByText('Load more'));
    mockFetch.mockResolvedValueOnce(pagedFriends([makeFriend('f-2', 'Bob')], null));
    await act(async () => { fireEvent.click(screen.getByText('Load more')); });
    await waitFor(() => expect(screen.getByText('Bob')).toBeInTheDocument());
    // Second call should carry the opaque cursor, not an offset page number.
    const secondCallUrl = String(mockFetch.mock.calls[1][0]);
    expect(secondCallUrl).toContain('cursor=c-2');
    expect(secondCallUrl).not.toContain('page=2');
  });

  it('picked IDs filtered to returned items after refetch (via close+reopen)', async () => {
    const { InviteFriendModal } = await import('@/components/friends/InviteFriendModal');
    // First open: Alice + Bob
    mockFetch.mockResolvedValueOnce(pagedFriends([makeFriend('f-1', 'Alice'), makeFriend('f-2', 'Bob')]));
    const onClose = vi.fn();
    const { rerender } = render(<InviteFriendModal open={true} onClose={onClose} lobbyId="lobby-1" />);
    await waitFor(() => screen.getByText('Alice'));

    // Pick Alice by clicking her row
    const aliceRow = screen.getByText('Alice').closest('button');
    expect(aliceRow).not.toBeNull();
    await act(async () => { fireEvent.click(aliceRow!); });

    // Send button shows count = 1
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send invite \(1\)/i })).toBeInTheDocument();
    });

    // Close then reopen — state should reset (picked = 0)
    rerender(<InviteFriendModal open={false} onClose={onClose} lobbyId="lobby-1" />);
    mockFetch.mockResolvedValueOnce(pagedFriends([makeFriend('f-2', 'Bob')]));
    rerender(<InviteFriendModal open={true} onClose={onClose} lobbyId="lobby-1" />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Send invite \(0\)/i })).toBeInTheDocument();
    });
  });
});
