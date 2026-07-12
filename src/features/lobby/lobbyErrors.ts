import { ApiError } from '@/lib/api-client';
import { formatRetryAfter } from '@/features/friends/friendsErrors';

/** Maps the Module 6 lobby error catalogue (LobbyErrors in ILobbiesService.cs) to user copy. */
export function lobbyErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.';
  switch (error.code) {
    case 'Lobbies.NotFound':
    case 'Lobbies.CredentialInvalid':
      // Privacy-safe: wrong/expired/rotated/closed code and a nonexistent lobby are indistinguishable.
      return 'That lobby code or link is invalid.';
    case 'Lobbies.Full':
      return 'That lobby is full.';
    case 'Lobbies.Closed':
      return 'That lobby has closed.';
    case 'Lobbies.Expired':
      return 'That lobby has expired.';
    case 'Lobbies.Blocked':
      return "You can't join that lobby.";
    case 'Lobbies.Forbidden':
      return "You don't have permission to do that.";
    case 'Lobbies.StaleRevision':
      return 'The lobby changed — refreshing its current state.';
    case 'Lobbies.AlreadyActive':
      return "You're already in a lobby or queue.";
    case 'Lobbies.CapabilityDisabled':
      return 'That setting is not available for this game.';
    case 'Lobbies.CapabilityNotFound':
      return "This game isn't available to play right now.";
    case 'Lobbies.MatchRuntimeUnavailable':
      return 'Starting matches arrives with Module 8.';
    case 'Lobbies.ConcurrencyConflict':
      return 'That action conflicted with another change — please try again.';
    case 'Lobbies.NotStartable':
      return "The lobby isn't ready to start yet.";
    case 'Lobbies.InvalidTarget':
      return "That member isn't in this lobby.";
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
