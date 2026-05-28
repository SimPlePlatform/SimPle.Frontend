import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── profileApi unit tests ─────────────────────────────────────────────────────
// Tests use fetch mocking to verify the API client builds correct requests.

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

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
  hasUploadedAvatar: false,
  hasUploadedBanner: false,
  statusMessage: null,
  region: '',
  color: '#F0394B',
  bannerFallbackColor: '#0F1422',
  initials: 'TU',
  visibility: 'Public',
  profileType: 'Player',
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

  it('updateMe sends profile type without changing auth or storage configuration', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ...SAMPLE_PROFILE, profileType: 'Developer' }) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.updateMe({ displayName: 'New Name', visibility: 'Public', profileType: 'Developer' });
    const body = String(mockFetch.mock.calls[0][1].body);
    expect(body).toContain('Developer');
    const forbidden = ['Storage__Access' + 'Key', 'Storage__Secret' + 'Key', 'AWS_SECRET' + '_ACCESS_KEY'];
    for (const key of forbidden) expect(body).not.toContain(key);
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

  it('uploadAvatar uses presigned URL then confirms', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3-upload.test/avatar',
          objectKey: 'profile-assets/users/u-1/avatar/file.png',
          contentType: 'image/png',
          expiresAtUtc: '2026-01-01T00:10:00Z',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...SAMPLE_PROFILE, hasUploadedAvatar: true }),
      });

    const { profileApi } = await import('@/features/profile/profileApi');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const result = await profileApi.uploadAvatar(file);

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/profile/me/avatar/upload-url'), expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://s3-upload.test/avatar', expect.objectContaining({ method: 'PUT' }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/profile/me/avatar/confirm'), expect.objectContaining({ method: 'POST' }));
    expect(result.hasUploadedAvatar).toBe(true);
  });

  it('removeAvatar calls DELETE /api/profile/me/avatar', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_PROFILE) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.removeAvatar();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/avatar'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('uploadBanner uses presigned URL then confirms', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3-upload.test/banner',
          objectKey: 'profile-assets/users/u-1/banner/file.webp',
          contentType: 'image/webp',
          expiresAtUtc: '2026-01-01T00:10:00Z',
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...SAMPLE_PROFILE, hasUploadedBanner: true }),
      });

    const { profileApi } = await import('@/features/profile/profileApi');
    const file = new File(['banner'], 'banner.webp', { type: 'image/webp' });
    const result = await profileApi.uploadBanner(file);

    expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('/api/profile/me/banner/upload-url'), expect.objectContaining({ method: 'POST' }));
    expect(mockFetch).toHaveBeenNthCalledWith(2, 'https://s3-upload.test/banner', expect.objectContaining({ method: 'PUT' }));
    expect(mockFetch).toHaveBeenNthCalledWith(3, expect.stringContaining('/api/profile/me/banner/confirm'), expect.objectContaining({ method: 'POST' }));
    expect(result.hasUploadedBanner).toBe(true);
  });

  it('removeBanner calls DELETE /api/profile/me/banner', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE_PROFILE) });
    const { profileApi } = await import('@/features/profile/profileApi');
    await profileApi.removeBanner();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/banner'),
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('uploadAvatar stops before confirm when direct upload fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          uploadUrl: 'https://s3-upload.test/avatar',
          objectKey: 'profile-assets/users/u-1/avatar/file.png',
          contentType: 'image/png',
          expiresAtUtc: '2026-01-01T00:10:00Z',
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 403, json: () => Promise.resolve({}) });

    const { profileApi } = await import('@/features/profile/profileApi');
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    await expect(profileApi.uploadAvatar(file)).rejects.toThrow('Upload failed.');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('updateAvatarFallback calls fallback endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ...SAMPLE_PROFILE, color: '#3366AA' }) });
    const { profileApi } = await import('@/features/profile/profileApi');
    const result = await profileApi.updateAvatarFallback('#3366AA');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/avatar/fallback'),
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('#3366AA') }),
    );
    expect(result.color).toBe('#3366AA');
  });

  it('updateBannerFallback calls fallback endpoint', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ...SAMPLE_PROFILE, bannerFallbackColor: '#123456' }) });
    const { profileApi } = await import('@/features/profile/profileApi');
    const result = await profileApi.updateBannerFallback('#123456');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/banner/fallback'),
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('#123456') }),
    );
    expect(result.bannerFallbackColor).toBe('#123456');
  });

  it('updateUsername returns immediate or request result', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ appliedImmediately: true, message: 'Username changed.', request: null }),
    });
    const { profileApi } = await import('@/features/profile/profileApi');
    const result = await profileApi.updateUsername('newhandle');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/username'),
      expect.objectContaining({ method: 'PUT', body: expect.stringContaining('newhandle') }),
    );
    expect(result.appliedImmediately).toBe(true);
  });

  it('cancelUsernameChangeRequest calls DELETE endpoint', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        id: 'r-1',
        requestedUsername: 'nextname',
        status: 'Cancelled',
        rejectionReason: null,
        requestYear: 2026,
        requestMonth: 5,
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-01T00:00:00Z',
        cancelledAt: '2026-05-01T00:01:00Z',
        reviewedAt: null,
        canEdit: false,
        canCancel: false,
      }),
    });
    const { profileApi } = await import('@/features/profile/profileApi');
    const result = await profileApi.cancelUsernameChangeRequest();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/profile/me/username-change-request'),
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(result.status).toBe('Cancelled');
  });
});
