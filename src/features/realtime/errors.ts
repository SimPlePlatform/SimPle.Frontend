/**
 * HubException messages are always the stable dot-namespaced error code (e.g. "Chat.InvalidBody",
 * "Realtime.ConnectionLimit") — RealtimeHub never lets a detailed failure reason reach the client. A
 * SignalR transport/timeout failure has no such code and falls through to undefined.
 */
export function parseHubErrorCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  return /^[A-Za-z]+\.[A-Za-z]+$/.test(error.message) ? error.message : undefined;
}
