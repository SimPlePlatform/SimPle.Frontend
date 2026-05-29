import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('friendsApi', () => {
  it('loads friend list from the social graph API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.list();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('sends a friend request with the receiver user id', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'r-1' }) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.sendRequest('user-2');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/requests'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: 'user-2' }),
      }),
    );
  });

  it('accepts, declines, and cancels requests through request-specific endpoints', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'r-1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'r-1' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ id: 'r-1' }) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.acceptRequest('r-1');
    await friendsApi.declineRequest('r-1');
    await friendsApi.cancelRequest('r-1');

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/friends/requests/r-1/accept'), expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/friends/requests/r-1/decline'), expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/friends/requests/r-1/cancel'), expect.objectContaining({ method: 'POST' }));
  });

  it('blocks, unblocks, and saves friend request privacy', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ userId: 'user-2' }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ friendRequestPolicy: 'Off' }) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.block('user-2');
    await friendsApi.unblock('user-2');
    const privacy = await friendsApi.updatePrivacy('Off');

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/blocks'), expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/blocks/user-2'), expect.objectContaining({ method: 'DELETE' }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/friends/privacy'), expect.objectContaining({ method: 'PUT' }));
    expect(privacy.friendRequestPolicy).toBe('Off');
  });

  it('search encodes query terms', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.search('sam player');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/search?query=sam%20player'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('loads request groups and discovery collections', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ incoming: [], outgoing: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.requests();
    await friendsApi.incomingRequests();
    await friendsApi.outgoingRequests();
    await friendsApi.suggestions();
    await friendsApi.blocks();

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/friends/requests'), expect.objectContaining({ method: 'GET' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/friends/requests/incoming'), expect.objectContaining({ method: 'GET' }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/friends/requests/outgoing'), expect.objectContaining({ method: 'GET' }));
    expect(mockFetch).toHaveBeenNthCalledWith(4, expect.stringContaining('/api/friends/suggestions'), expect.objectContaining({ method: 'GET' }));
    expect(mockFetch).toHaveBeenNthCalledWith(5, expect.stringContaining('/api/blocks'), expect.objectContaining({ method: 'GET' }));
  });

  it('removes friends and loads friend request privacy', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ friendRequestPolicy: 'Anyone' }) });
    const { friendsApi } = await import('@/features/friends/friendsApi');

    await friendsApi.removeFriend('user-2');
    const privacy = await friendsApi.privacy();

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/friends/user-2'), expect.objectContaining({ method: 'DELETE' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, expect.stringContaining('/api/friends/privacy'), expect.objectContaining({ method: 'GET' }));
    expect(privacy.friendRequestPolicy).toBe('Anyone');
  });
});
