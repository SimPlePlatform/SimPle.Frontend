import type { UserStatus } from '@/types';
import type { PresenceStatusValue } from './types';

/** InLobby has no dedicated avatar-dot style yet, so it renders as the existing 'online' dot. */
export function toUserStatus(status: PresenceStatusValue): UserStatus {
  switch (status) {
    case 'Away':
      return 'away';
    case 'Playing':
      return 'playing';
    case 'Online':
    case 'InLobby':
      return 'online';
    default:
      return 'offline';
  }
}
