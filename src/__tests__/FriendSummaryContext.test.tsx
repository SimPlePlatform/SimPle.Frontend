import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted before imports) ──────────────────────────────────────────

const mockStatus = { value: 'authenticated' as string };
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ status: mockStatus.value, user: { id: 'u-1' } }),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}
function err(status: number, code: string, message: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message } }) });
}

// ── Consumer component ───────────────────────────────────────────────────────

async function setup() {
  const { FriendSummaryProvider, useFriendSummary } = await import('@/features/friends/FriendSummaryContext');
  function Consumer() {
    const { summary, loading, error, invalidate, retry } = useFriendSummary();
    if (loading) return <div data-testid="loading">loading</div>;
    if (error)   return <div data-testid="error">{error}<button onClick={retry}>retry</button></div>;
    return (
      <div>
        <div data-testid="count">{summary?.incomingRequestCount ?? 'none'}</div>
        <button onClick={invalidate}>invalidate</button>
      </div>
    );
  }
  return { Provider: FriendSummaryProvider, Consumer, useFriendSummary };
}

beforeEach(() => {
  mockFetch.mockReset();
  mockStatus.value = 'authenticated';
  vi.resetModules();
});

describe('FriendSummaryProvider', () => {
  it('fetches summary on authenticated mount and exposes count', async () => {
    mockFetch.mockResolvedValueOnce(ok({ friendCount: 5, incomingRequestCount: 2, outgoingRequestCount: 1 }));
    const { Provider, Consumer } = await setup();
    render(<Provider><Consumer /></Provider>);
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
  });

  it('shows loading initially', async () => {
    let resolve!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const { Provider, Consumer } = await setup();
    render(<Provider><Consumer /></Provider>);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
    act(() => resolve({ ok: true, status: 200, json: () => Promise.resolve({ friendCount: 0, incomingRequestCount: 0, outgoingRequestCount: 0 }) }));
  });

  it('skips fetch and clears state when status is anonymous', async () => {
    mockStatus.value = 'anonymous';
    const { Provider, Consumer } = await setup();
    render(<Provider><Consumer /></Provider>);
    // Should show count=none (no fetch) and not loading
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument());
    expect(screen.getByTestId('count')).toHaveTextContent('none');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('exposes error message on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce(err(401, 'Auth.Unauthorized', 'Not authenticated'));
    const { Provider, Consumer } = await setup();
    render(<Provider><Consumer /></Provider>);
    await waitFor(() => expect(screen.getByTestId('error')).toBeInTheDocument());
  });

  it('retry() re-fetches after error', async () => {
    mockFetch
      .mockResolvedValueOnce(err(500, 'Server.Error', 'Oops'))
      .mockResolvedValueOnce(ok({ friendCount: 1, incomingRequestCount: 0, outgoingRequestCount: 0 }));
    const { Provider, Consumer } = await setup();
    render(<Provider><Consumer /></Provider>);
    await waitFor(() => screen.getByTestId('error'));
    act(() => screen.getByRole('button', { name: 'retry' }).click());
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });

  it('throws when useFriendSummary used outside provider', async () => {
    const { useFriendSummary } = await setup();
    function BadConsumer() { useFriendSummary(); return null; }
    expect(() => render(<BadConsumer />)).toThrow();
  });
});
