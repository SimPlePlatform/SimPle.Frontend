import { ApiError } from '@/lib/api-client';

/** Human-friendly "in 5 minutes" / "in 2 hours" from an ISO UTC instant. */
export function formatRetryAfter(retryAfterUtc?: string): string | null {
  if (!retryAfterUtc) return null;
  const target = new Date(retryAfterUtc).getTime();
  if (Number.isNaN(target)) return null;
  const ms = target - Date.now();
  if (ms <= 0) return 'now';
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.ceil(mins / 60);
  if (hours < 24) return `in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.ceil(hours / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Maps the canonical Module 3 error catalogue (api-reference.md, R12) to user copy.
 * Privacy-safe codes (Profile.NotVisible) never disclose whether a target exists.
 */
export function friendsErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.';
  switch (error.code) {
    case 'Friends.SelfRequest':
      return "You can't send yourself a friend request.";
    case 'Friends.SelfBlock':
      return "You can't block yourself.";
    case 'Friends.RequestsDisabled':
      return "This user doesn't accept friend requests.";
    case 'Friends.NotFriendOfFriend':
      return 'This user only accepts requests from mutual connections.';
    case 'Friends.NotPending':
      return 'This request is no longer pending.';
    case 'Friends.AlreadyFriends':
      return "You're already friends.";
    case 'Friends.RequestCooldown': {
      const when = formatRetryAfter(error.retryAfterUtc);
      return when
        ? `You recently contacted this user. You can try again ${when}.`
        : 'You recently contacted this user. Please try again later.';
    }
    case 'Friends.ConcurrencyConflict':
      return 'That action conflicted with another change — please try again.';
    case 'Profile.NotVisible':
      // Privacy-safe: nonexistent / private / blocked / suspended are indistinguishable.
      return 'User not found.';
    case 'Pagination.InvalidCursor':
      return 'This list is out of date — please refresh.';
    case 'RateLimit.Exceeded': {
      const when = formatRetryAfter(error.retryAfterUtc);
      return when
        ? `You're doing that too fast. Please try again ${when}.`
        : "You're doing that too fast. Please wait a moment and try again.";
    }
    default:
      return error.message || 'Something went wrong.';
  }
}
