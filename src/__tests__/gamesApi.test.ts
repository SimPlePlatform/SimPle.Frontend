import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(body: unknown, status = 200) {
  return Promise.resolve({ ok: true, status, json: () => Promise.resolve(body) });
}
function noContent() {
  return Promise.resolve({ ok: true, status: 204, json: () => Promise.resolve(null) });
}
function tombstone(body: unknown) {
  return Promise.resolve({ ok: false, status: 410, json: () => Promise.resolve(body) });
}
function err(status: number, code: string, message: string) {
  return Promise.resolve({ ok: false, status, json: () => Promise.resolve({ error: { code, message } }) });
}

beforeEach(() => mockFetch.mockReset());

const CATALOG = {
  slug: 'falling-blocks', name: 'Falling Blocks', summary: 'Stack the pieces.', rulesSummary: 'Clear lines.',
  category: 'puzzle', tags: ['puzzle', 'logic'], difficulty: 'Medium',
  estimatedDurationMinMinutes: 5, estimatedDurationMaxMinutes: 10,
  minPlayers: 1, maxPlayers: 1, lifecycle: 'Available', capabilities: ['ai'],
  featuredRank: null, artToken: 'falling-blocks', artColorA: '#F0394B', artColorB: '#111',
  artAltText: 'Falling Blocks art', entryActions: [],
};
const FAVORITE = {
  slug: 'falling-blocks', name: 'Falling Blocks', lifecycle: 'Available',
  artToken: 'falling-blocks', artColorA: '#F0394B', artColorB: '#111',
  artAltText: 'Falling Blocks art', favoritedAt: '2026-01-01T00:00:00Z',
};

describe('gamesApi.list', () => {
  it('calls GET /api/games with query, filters, sort, and cursor as "after"', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [CATALOG], nextCursor: 'c-2' }));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.list({
      query: 'block', category: ['puzzle'], tag: ['logic'], mode: ['ai'], sort: 'name', limit: 24, cursor: 'c-1',
    });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('/api/games?');
    expect(url).toContain('query=block');
    expect(url).toContain('category=puzzle');
    expect(url).toContain('tag=logic');
    expect(url).toContain('mode=ai');
    expect(url).toContain('sort=name');
    expect(url).toContain('after=c-1');
    expect(url).not.toContain('cursor=c-1');
    expect(r.items[0].slug).toBe('falling-blocks');
    expect(r.nextCursor).toBe('c-2');
  });

  it('omits query/filter params when not provided', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], nextCursor: null }));
    const { gamesApi } = await import('@/features/games/gamesApi');
    await gamesApi.list();
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toMatch(/\/api\/games$/);
    expect(url).not.toContain('query=');
    expect(url).not.toContain('after=');
  });
});

describe('gamesApi.getFeatured', () => {
  it('returns the DTO on 200', async () => {
    mockFetch.mockResolvedValueOnce(ok(CATALOG));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.getFeatured();
    expect(r?.slug).toBe('falling-blocks');
  });

  it('returns undefined on 204 (no featured game)', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.getFeatured();
    expect(r).toBeUndefined();
  });
});

describe('gamesApi.getDetail', () => {
  it('returns { kind: "game" } on 200', async () => {
    mockFetch.mockResolvedValueOnce(ok(CATALOG));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.getDetail('falling-blocks');
    expect(r.kind).toBe('game');
    if (r.kind === 'game') expect(r.game.name).toBe('Falling Blocks');
  });

  it('returns { kind: "tombstone" } on 410 with the raw tombstone body (not ApiErrorResponse)', async () => {
    mockFetch.mockResolvedValueOnce(tombstone({ slug: 'old-game', name: 'Old Game', lifecycle: 'Retired', reasonCode: 'Games.Retired' }));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.getDetail('old-game');
    expect(r.kind).toBe('tombstone');
    if (r.kind === 'tombstone') {
      expect(r.tombstone.lifecycle).toBe('Retired');
      expect(r.tombstone.reasonCode).toBe('Games.Retired');
    }
  });

  it('throws ApiError on 404 (unknown or Draft — indistinguishable)', async () => {
    mockFetch.mockResolvedValueOnce(err(404, 'Games.NotFound', 'Not found'));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const { ApiError } = await import('@/lib/api-client');
    const caught = await gamesApi.getDetail('ghost').catch(e => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.status).toBe(404);
  });
});

describe('gamesApi.getFavorites', () => {
  it('calls GET /api/games/me/favorites with cursor as "after"', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [FAVORITE], nextCursor: null }));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.getFavorites({ limit: 50, cursor: 'c-9' });
    const url = String(mockFetch.mock.calls[0][0]);
    expect(url).toContain('/api/games/me/favorites');
    expect(url).toContain('after=c-9');
    expect(r.items[0].slug).toBe('falling-blocks');
  });

  it('throws ApiError on 401 when anonymous', async () => {
    mockFetch.mockResolvedValueOnce(err(401, 'Auth.Unauthorized', 'Unauthorized'));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const { ApiError } = await import('@/lib/api-client');
    await expect(gamesApi.getFavorites()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('gamesApi.favorite / unfavorite', () => {
  it('PUT /api/games/me/favorites/{slug} returns the favorite DTO', async () => {
    mockFetch.mockResolvedValueOnce(ok(FAVORITE));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const r = await gamesApi.favorite('falling-blocks');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/games/me/favorites/falling-blocks'),
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(r.slug).toBe('falling-blocks');
  });

  it('DELETE /api/games/me/favorites/{slug} resolves void on 204 (idempotent)', async () => {
    mockFetch.mockResolvedValueOnce(noContent());
    const { gamesApi } = await import('@/features/games/gamesApi');
    await expect(gamesApi.unfavorite('falling-blocks')).resolves.not.toThrow();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/games/me/favorites/falling-blocks'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('surfaces 409 Games.Retired when favoriting a retired game', async () => {
    mockFetch.mockResolvedValueOnce(err(409, 'Games.Retired', 'This game has been retired.'));
    const { gamesApi } = await import('@/features/games/gamesApi');
    const { ApiError } = await import('@/lib/api-client');
    const caught = await gamesApi.favorite('old-game').catch(e => e);
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.code).toBe('Games.Retired');
  });
});
