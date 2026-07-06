import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockToast = { push: vi.fn() };
vi.mock('@/components/ui/Toast', () => ({ useToast: () => mockToast }));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Safe discovery returns MINIMAL identity only — never bio/elo/level/region/etc.
function discoveryOk(overrides: Record<string, unknown> = {}) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({
    userId: 'u-target', username: 'alice', displayName: 'Alice Smith',
    initials: 'AS', color: '#38BDF8', avatarUrl: null,
    ...overrides,
  }) });
}

// Any ineligible/hidden/nonexistent target → 404 Profile.NotVisible (privacy-safe).
function notVisible404() {
  return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({ error: { code: 'Profile.NotVisible', message: 'Not found' } }) });
}

function sendResult(outcome: string) {
  return Promise.resolve({ ok: true, status: outcome === 'request_created' ? 201 : 200, json: () => Promise.resolve({
    outcome,
    request: {
      requestId: 'rq-1', requesterId: 'u-me', requesterUsername: 'me',
      requesterDisplayName: 'Me', requesterInitials: 'ME', requesterColor: '#F0394B', requesterAvatarUrl: null,
      addresseeId: 'u-target', addresseeUsername: 'alice', addresseeDisplayName: 'Alice Smith',
      addresseeInitials: 'AS', addresseeColor: '#38BDF8', addresseeAvatarUrl: null,
      status: 'Pending', requestedAt: '2026-01-01T00:00:00Z', mutualFriendCount: 0,
    },
  }) });
}

function sendErr(status: number, code: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message: code } }) });
}

beforeEach(() => {
  mockFetch.mockReset();
  mockToast.push.mockReset();
  vi.resetModules();
});

async function renderModal(props: { open?: boolean; onClose?: () => void; onSent?: () => void } = {}) {
  const { AddFriendModal } = await import('@/features/friends/AddFriendModal');
  const { open = true, onClose = vi.fn(), onSent = vi.fn() } = props;
  const onCloseFn = vi.fn(onClose);
  const onSentFn = vi.fn(onSent);
  render(<AddFriendModal open={open} onClose={onCloseFn} onSent={onSentFn} />);
  return { onClose: onCloseFn, onSent: onSentFn };
}

describe('AddFriendModal', () => {
  it('renders input and Search button when open', async () => {
    await renderModal();
    expect(screen.getByPlaceholderText('@username')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('Search button disabled when input is empty', async () => {
    await renderModal();
    expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
  });

  it('strips leading @ and calls the safe discovery endpoint', async () => {
    mockFetch.mockResolvedValueOnce(discoveryOk());
    await renderModal();
    const input = screen.getByPlaceholderText('@username');
    await userEvent.type(input, '@alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => {
      const url = String(mockFetch.mock.calls[0][0]);
      expect(url).toContain('/api/friends/discovery?username=alice');
      expect(url).not.toContain('@alice');
      // Must NOT hit the full public-profile endpoint (privacy).
      expect(url).not.toContain('/api/profile/');
    });
  });

  it('shows preview card with displayName on successful lookup', async () => {
    mockFetch.mockResolvedValueOnce(discoveryOk({ displayName: 'Alice Smith' }));
    await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument());
  });

  it('shows "User not found." on privacy-safe 404', async () => {
    mockFetch.mockResolvedValueOnce(notVisible404());
    await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'nobody');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => expect(screen.getByText('User not found.')).toBeInTheDocument());
  });

  it('sends request and triggers onSent + onClose on request_created', async () => {
    mockFetch
      .mockResolvedValueOnce(discoveryOk({ userId: 'u-target' }))
      .mockResolvedValueOnce(sendResult('request_created'));
    const { onClose, onSent } = await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => screen.getByRole('button', { name: /Send request/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Send request/i })); });
    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(c => String(c[0]).includes('/api/friends/requests'));
      expect(postCall).toBeTruthy();
      const body = JSON.parse(postCall![1].body);
      expect(body.targetUserId).toBe('u-target');
    });
    expect(onSent).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('announces "Friend added" when a reverse request cross-accepts', async () => {
    mockFetch
      .mockResolvedValueOnce(discoveryOk({ userId: 'u-target' }))
      .mockResolvedValueOnce(sendResult('cross_request_accepted'));
    const { onSent } = await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => screen.getByRole('button', { name: /Send request/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Send request/i })); });
    await waitFor(() => {
      expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({
        kind: 'success', title: 'Friend added',
      }));
    });
    expect(onSent).toHaveBeenCalled();
  });

  it('shows error toast when the target does not accept requests', async () => {
    mockFetch
      .mockResolvedValueOnce(discoveryOk())
      .mockResolvedValueOnce(sendErr(400, 'Friends.RequestsDisabled'));
    const { onSent } = await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => screen.getByRole('button', { name: /Send request/i }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Send request/i })); });
    await waitFor(() => {
      expect(mockToast.push).toHaveBeenCalledWith(expect.objectContaining({
        kind: 'default',
        body: expect.stringContaining("doesn't accept friend requests"),
      }));
    });
    expect(onSent).not.toHaveBeenCalled();
  });

  it('resets state on reopen', async () => {
    mockFetch.mockResolvedValueOnce(discoveryOk());
    const { AddFriendModal } = await import('@/features/friends/AddFriendModal');
    const { rerender } = render(<AddFriendModal open={true} onClose={vi.fn()} onSent={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Search' })); });
    await waitFor(() => screen.getByText('Alice Smith'));

    // Close then reopen
    rerender(<AddFriendModal open={false} onClose={vi.fn()} onSent={vi.fn()} />);
    rerender(<AddFriendModal open={true} onClose={vi.fn()} onSent={vi.fn()} />);
    expect(screen.getByPlaceholderText('@username')).toHaveValue('');
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
  });

  it('overlapping search blocked by lookupActive ref', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    await renderModal();
    await userEvent.type(screen.getByPlaceholderText('@username'), 'alice');
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(screen.getByText('Searching…')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Searching…' }));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    act(() => resolve({ ok: true, status: 200, json: () => Promise.resolve({
      userId: 'u-t', username: 'alice', displayName: 'Alice', initials: 'AL', color: '#F0394B', avatarUrl: null,
    }) }));
  });
});
