import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown, status = 200) {
  return Promise.resolve({ ok: true, status, json: () => Promise.resolve(body) });
}
function err(status: number, code: string, message: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message } }) });
}
function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
}

beforeEach(() => mockFetch.mockReset());

// CursorPage<T> — no total/count; nextCursor null on last page.
const PAGE = { items: [], nextCursor: null };
const SUMMARY = { friendCount: 3, incomingRequestCount: 1, outgoingRequestCount: 2 };
// No level/elo on friend/suggestion DTOs (deferred to M10).
const FRIEND = {
  userId: 'f-1', username: 'alice', displayName: 'Alice', initials: 'AL',
  color: '#F0394B', avatarUrl: null, friendsSince: '2026-01-01T00:00:00Z',
};
const REQUEST = {
  requestId: 'rq-1', requesterId: 'u-2', requesterUsername: 'bob', requesterDisplayName: 'Bob',
  requesterInitials: 'BO', requesterColor: '#38BDF8', requesterAvatarUrl: null,
  addresseeId: 'u-1', addresseeUsername: 'me', addresseeDisplayName: 'Me',
  addresseeInitials: 'ME', addresseeColor: '#34D399', addresseeAvatarUrl: null,
  status: 'Pending', requestedAt: '2026-01-02T00:00:00Z', mutualFriendCount: 1,
};
const SEND_RESULT = { outcome: 'request_created', request: REQUEST };
const SUGGESTION = {
  userId: 's-1', username: 'carol', displayName: 'Carol', initials: 'CA',
  color: '#A78BFA', avatarUrl: null, mutualFriendCount: 2,
};
const DISCOVERY = {
  userId: 'd-1', username: 'dave', displayName: 'Dave', initials: 'DA',
  color: '#F472B6', avatarUrl: null,
};
const BLOCK = {
  blockedUserId: 'b-1', blockedUsername: 'dan', blockedDisplayName: 'Dan',
  blockedInitials: 'DA', blockedColor: '#F472B6', blockedAvatarUrl: null, blockedAt: '2026-01-03T00:00:00Z',
};
const BLOCK_RESULT = { outcome: 'blocked', blockedUserId: 'b-1', blockedAt: '2026-01-03T00:00:00Z' };
const SETTINGS = { friendRequestPrivacy: 'Anyone' };

describe('friendsApi.getSummary', () => {
  it('calls GET /api/friends/summary and returns DTO', async () => {
    mockFetch.mockResolvedValueOnce(ok(SUMMARY));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getSummary();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/summary'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(r.friendCount).toBe(3);
    expect(r.incomingRequestCount).toBe(1);
    expect(r.outgoingRequestCount).toBe(2);
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockResolvedValueOnce(err(401, 'Auth.Unauthorized', 'Unauthorized'));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const { ApiError } = await import('@/lib/api-client');
    await expect(friendsApi.getSummary()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('friendsApi.getFriends (keyset cursor)', () => {
  it('returns a CursorPage with items and nextCursor', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [FRIEND], nextCursor: 'c-next' }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getFriends({ limit: 20 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/friends\?.*limit=20/),
      expect.any(Object),
    );
    expect(r.items[0].userId).toBe('f-1');
    expect(r.nextCursor).toBe('c-next');
  });

  it('passes cursor when provided', async () => {
    mockFetch.mockResolvedValueOnce(ok(PAGE));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.getFriends({ cursor: 'opaque-cursor', limit: 20 });
    expect(String(mockFetch.mock.calls[0][0])).toContain('cursor=opaque-cursor');
  });

  it('includes query param when provided', async () => {
    mockFetch.mockResolvedValueOnce(ok(PAGE));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.getFriends({ query: 'alice', limit: 20 });
    expect(String(mockFetch.mock.calls[0][0])).toContain('query=alice');
  });

  it('omits query and cursor params when undefined', async () => {
    mockFetch.mockResolvedValueOnce(ok(PAGE));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.getFriends({ limit: 20 });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).not.toContain('query=');
    expect(url).not.toContain('cursor=');
  });

  it('avatarUrl is preserved as null; no level/elo fields', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [FRIEND], nextCursor: null }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getFriends();
    expect(r.items[0].avatarUrl).toBeNull();
    expect(r.items[0]).not.toHaveProperty('level');
    expect(r.items[0]).not.toHaveProperty('elo');
  });
});

describe('friendsApi.getRequests (keyset cursor)', () => {
  it('passes direction=incoming in query string', async () => {
    mockFetch.mockResolvedValueOnce(ok(PAGE));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.getRequests('incoming');
    expect(String(mockFetch.mock.calls[0][0])).toContain('direction=incoming');
  });

  it('passes direction=outgoing and cursor', async () => {
    mockFetch.mockResolvedValueOnce(ok(PAGE));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.getRequests('outgoing', { cursor: 'c1', limit: 20 });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('direction=outgoing');
    expect(url).toContain('cursor=c1');
  });
});

describe('friendsApi.getSuggestions', () => {
  it('calls GET /api/friends/suggestions with a capped limit (default 20)', async () => {
    mockFetch.mockResolvedValueOnce(ok([SUGGESTION]));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getSuggestions();
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/friends/suggestions?limit=20');
    expect(r[0].mutualFriendCount).toBe(2);
    expect(r[0].avatarUrl).toBeNull();
    expect(r[0]).not.toHaveProperty('elo');
  });
});

describe('friendsApi.discover (safe discovery)', () => {
  it('calls GET /api/friends/discovery with url-encoded username', async () => {
    mockFetch.mockResolvedValueOnce(ok(DISCOVERY));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.discover('dave');
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/friends/discovery?username=dave');
    expect(r.userId).toBe('d-1');
    // Minimal identity only.
    expect(r).not.toHaveProperty('elo');
    expect(r).not.toHaveProperty('bio');
  });

  it('throws ApiError with Profile.NotVisible on 404', async () => {
    mockFetch.mockResolvedValueOnce(err(404, 'Profile.NotVisible', 'Not found'));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const { ApiError } = await import('@/lib/api-client');
    // Single call (one queued response); assert both instance and shape on the one rejection.
    const caught = await friendsApi.discover('ghost').catch((e) => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught).toMatchObject({ code: 'Profile.NotVisible', status: 404 });
  });
});

describe('friendsApi.dismissSuggestion', () => {
  it('PUT /api/friends/suggestions/{id}/dismiss resolves void on 204', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await expect(friendsApi.dismissSuggestion('s-1')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/suggestions/s-1/dismiss'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});

describe('friendsApi.getBlocks (keyset cursor)', () => {
  it('calls GET /api/friends/blocks and returns a CursorPage', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [BLOCK], nextCursor: null }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getBlocks({ limit: 20 });
    expect(String(mockFetch.mock.calls[0][0])).toContain('/api/friends/blocks');
    expect(r.items[0].blockedUserId).toBe('b-1');
    expect(r.nextCursor).toBeNull();
  });
});

describe('friendsApi.getSettings', () => {
  it('calls GET /api/friends/settings', async () => {
    mockFetch.mockResolvedValueOnce(ok(SETTINGS));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.getSettings();
    expect(r.friendRequestPrivacy).toBe('Anyone');
  });
});

describe('friendsApi.sendRequest', () => {
  it('POST /api/friends/requests with targetUserId body, returns SendFriendRequestResult', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(SEND_RESULT) });
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.sendRequest('u-2');
    const call = mockFetch.mock.calls[0];
    expect(call[0]).toContain('/api/friends/requests');
    expect(call[1].method).toBe('POST');
    expect(call[1].body).toContain('u-2');
    expect(r.outcome).toBe('request_created');
    expect(r.request.requestId).toBe('rq-1');
  });

  it('includes idempotencyKey in body when provided', async () => {
    mockFetch.mockResolvedValueOnce(ok(SEND_RESULT, 201));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.sendRequest('u-2', 'idem-123');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toMatchObject({ targetUserId: 'u-2', idempotencyKey: 'idem-123' });
  });

  it('surfaces 409 Friends.RequestCooldown with retryAfterUtc', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 409,
      json: () => Promise.resolve({ error: { code: 'Friends.RequestCooldown', message: 'cooldown', retryAfterUtc: '2026-07-07T00:00:00Z' } }),
    });
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const { ApiError } = await import('@/lib/api-client');
    try {
      await friendsApi.sendRequest('u-2');
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const ae = e as InstanceType<typeof ApiError>;
      expect(ae.code).toBe('Friends.RequestCooldown');
      expect(ae.retryAfterUtc).toBe('2026-07-07T00:00:00Z');
    }
  });
});

describe('friendsApi.acceptRequest', () => {
  it('POST /api/friends/requests/{id}/accept', async () => {
    mockFetch.mockResolvedValueOnce(ok({ ...REQUEST, status: 'Accepted' }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.acceptRequest('rq-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/requests/rq-1/accept'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('friendsApi.declineRequest', () => {
  it('POST /api/friends/requests/{id}/decline', async () => {
    mockFetch.mockResolvedValueOnce(ok({ ...REQUEST, status: 'Declined' }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.declineRequest('rq-1');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/requests/rq-1/decline'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('friendsApi.cancelRequest', () => {
  it('DELETE /api/friends/requests/{id} resolves void on 204', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await expect(friendsApi.cancelRequest('rq-1')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/requests/rq-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('friendsApi.removeFriend', () => {
  it('DELETE /api/friends/{id} resolves void on 204', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await expect(friendsApi.removeFriend('f-1')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/f-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('friendsApi.blockUser', () => {
  it('POST /api/friends/blocks with targetUserId body, returns BlockUserResult', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve(BLOCK_RESULT) });
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.blockUser('b-1');
    expect(r.outcome).toBe('blocked');
    expect(r.blockedUserId).toBe('b-1');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
    expect(mockFetch.mock.calls[0][1].body).toContain('b-1');
  });
});

describe('friendsApi.unblockUser', () => {
  it('DELETE /api/friends/blocks/{id} resolves void on 204', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await expect(friendsApi.unblockUser('b-1')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/blocks/b-1'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});

describe('friendsApi.updateSettings', () => {
  it('PUT /api/friends/settings with friendRequestPrivacy in body', async () => {
    mockFetch.mockResolvedValueOnce(ok({ friendRequestPrivacy: 'FriendsOfFriends' }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    const r = await friendsApi.updateSettings('FriendsOfFriends');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/friends/settings'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('FriendsOfFriends'),
      }),
    );
    expect(r.friendRequestPrivacy).toBe('FriendsOfFriends');
  });

  it('builds body with key friendRequestPrivacy', async () => {
    mockFetch.mockResolvedValueOnce(ok({ friendRequestPrivacy: 'Off' }));
    const { friendsApi } = await import('@/features/friends/friendsApi');
    await friendsApi.updateSettings('Off');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toHaveProperty('friendRequestPrivacy', 'Off');
  });
});
