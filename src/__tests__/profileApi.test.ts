import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── profileApi unit tests ─────────────────────────────────────────────────────
// Tests use fetch mocking to verify the API client builds correct requests.

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockOk(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
}

function mockError(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve(body),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

const SAMPLE_PROFILE = {
  userId: 'u-1',
  username: 'testuser',
  displayName: 'Test User',
  bio: null,
  avatarUrl: null,
  bannerUrl: null,
  statusMessage: null,
  region: 'EU-West',
  color: '#F0394B',
  initials: 'TU',
  visibility: 'Public',
  role: 'Player',
  level: 1,
  elo: 1200,
  joinedAt: '2026-01-01T00:00:00Z',
  links: [],
  interests: [],
};

describe('profileApi', () => {
  it('getMe calls GET /api/profile/me', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_PROFILE) });
    const { profileApi } = await import('@/features/profile/profileApi');
    const result = await profileApi.getMe();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me'),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.username).toBe('testuser');
  });

  it('getPublic calls GET /api/profile/{username}', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_PROFILE) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.getPublic('testuser');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/testuser'),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('updateMe calls PUT /api/profile/me with body', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_PROFILE) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.updateMe({ displayName: 'New Name', visibility: 'Private' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me'),
      expect.objectContaining({
        method: 'PUT',
        body: expect.stringContaining('New Name'),
      }),
    );
  });

  it('updateLinks calls PUT /api/profile/me/links', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve([]) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.updateLinks({ links: [{ platform: 'github', url: 'https://github.com/u', sortOrder: 0 }] });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/links'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('updateInterests calls PUT /api/profile/me/interests', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(['board-games']) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.updateInterests(['board-games']);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/interests'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('getMe 404 throws ApiError', async () => {
    mockFetch.mockResolvedValueOnce(mockError(404, { error: { code: 'General.NotFound', message: 'Not found' } }));
    const { profileApi } = await import('@/features/profile/profileApi');
    const { ApiError } = await import('@/lib/api-client');
    await expect(profileApi.getMe()).rejects.toBeInstanceOf(ApiError);
  });

  it('getPublic private profile returns 403 as ApiError', async () => {
    mockFetch.mockResolvedValueOnce(mockError(403, { error: { code: 'Profile.Private', message: 'Private' } }));
    const { profileApi } = await import('@/features/profile/profileApi');
    const { ApiError } = await import('@/lib/api-client');
    await expect(profileApi.getPublic('privateuser')).rejects.toBeInstanceOf(ApiError);
  });
});
