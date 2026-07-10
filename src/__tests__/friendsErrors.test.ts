import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

describe('friendsErrorMessage — canonical R12 catalogue', () => {
  it('SelfRequest', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Friends.SelfRequest', 'x')))
      .toBe("You can't send yourself a friend request.");
  });

  it('SelfBlock', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Friends.SelfBlock', 'x')))
      .toBe("You can't block yourself.");
  });

  it('RequestsDisabled', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Friends.RequestsDisabled', 'rd')))
      .toBe("This user doesn't accept friend requests.");
  });

  it('NotFriendOfFriend', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Friends.NotFriendOfFriend', 'nfof')))
      .toBe('This user only accepts requests from mutual connections.');
  });

  it('NotPending', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Friends.NotPending', 'np')))
      .toBe('This request is no longer pending.');
  });

  it('AlreadyFriends', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(409, 'Friends.AlreadyFriends', 'af')))
      .toBe("You're already friends.");
  });

  it('ConcurrencyConflict', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(409, 'Friends.ConcurrencyConflict', 'cc')))
      .toBe('That action conflicted with another change — please try again.');
  });

  it('Profile.NotVisible is privacy-safe (never discloses existence)', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(404, 'Profile.NotVisible', 'whatever')))
      .toBe('User not found.');
  });

  it('Pagination.InvalidCursor suggests refresh', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(400, 'Pagination.InvalidCursor', 'ic')))
      .toBe('This list is out of date — please refresh.');
  });

  it('unknown ApiError returns error.message', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(500, 'Server.Error', 'Internal error')))
      .toBe('Internal error');
  });

  it('non-ApiError returns generic fallback', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    expect(friendsErrorMessage(new Error('boom'))).toBe('Something went wrong.');
    expect(friendsErrorMessage('string error')).toBe('Something went wrong.');
    expect(friendsErrorMessage(null)).toBe('Something went wrong.');
  });
});

describe('friendsErrorMessage — cooldown & rate-limit retry time', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-07-06T00:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('RequestCooldown includes a minutes retry hint', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    const e = new ApiError(409, 'Friends.RequestCooldown', 'cd', undefined, '2026-07-06T00:05:00Z');
    expect(friendsErrorMessage(e)).toBe('You recently contacted this user. You can try again in 5 minutes.');
  });

  it('RequestCooldown includes a days retry hint for 7-day decline cooldown', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    const e = new ApiError(409, 'Friends.RequestCooldown', 'cd', undefined, '2026-07-13T00:00:00Z');
    expect(friendsErrorMessage(e)).toBe('You recently contacted this user. You can try again in 7 days.');
  });

  it('RequestCooldown without retryAfterUtc falls back to generic copy', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    expect(friendsErrorMessage(new ApiError(409, 'Friends.RequestCooldown', 'cd')))
      .toBe('You recently contacted this user. Please try again later.');
  });

  it('RateLimit.Exceeded includes a retry hint', async () => {
    const { friendsErrorMessage } = await import('@/features/friends/friendsErrors');
    const { ApiError } = await import('@/lib/api-client');
    const e = new ApiError(429, 'RateLimit.Exceeded', 'rl', undefined, '2026-07-06T00:01:00Z');
    expect(friendsErrorMessage(e)).toBe("You're doing that too fast. Please try again in 1 minute.");
  });
});

describe('formatRetryAfter', () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date('2026-07-06T00:00:00Z')));
  afterEach(() => vi.useRealTimers());

  it('returns null for undefined / invalid', async () => {
    const { formatRetryAfter } = await import('@/features/friends/friendsErrors');
    expect(formatRetryAfter(undefined)).toBeNull();
    expect(formatRetryAfter('not-a-date')).toBeNull();
  });

  it('returns "now" for a past instant', async () => {
    const { formatRetryAfter } = await import('@/features/friends/friendsErrors');
    expect(formatRetryAfter('2026-07-05T23:59:00Z')).toBe('now');
  });

  it('formats hours', async () => {
    const { formatRetryAfter } = await import('@/features/friends/friendsErrors');
    expect(formatRetryAfter('2026-07-06T02:00:00Z')).toBe('in 2 hours');
  });
});
