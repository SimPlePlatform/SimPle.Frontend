import { ApiError } from '@/lib/api-client';
import { lobbyErrorMessage } from '@/features/lobby/lobbyErrors';

/** Maps the Module 6 matchmaking error catalogue (MatchmakingErrors in MatchmakingDtos.cs) to user copy. */
export function matchmakingErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Something went wrong.';
  switch (error.code) {
    case 'Matchmaking.TicketNotFound':
      // Privacy-safe: another user's ticket id and a missing one are indistinguishable.
      return 'That queue ticket is no longer available.';
    case 'Matchmaking.AlreadyQueued':
      return "You're already in a lobby or queue.";
    case 'Matchmaking.TicketExpired':
      return 'No match was found in time.';
    case 'Matchmaking.RuntimeUnavailable':
      return 'Matching arrives with Module 8.';
    default:
      return lobbyErrorMessage(error);
  }
}
