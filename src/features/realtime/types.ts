import type { ChatMessageDto } from '@/features/chat/types';

export type PresenceStatusValue = 'Offline' | 'Away' | 'Online' | 'InLobby' | 'Playing';

export interface RealtimeEnvelope {
  schemaVersion: number;
  eventId: string;
  serverUtc: string;
  scope: 'lobby' | 'match' | 'user';
  scopeId: string;
}

export interface SubscribeLobbyResultDto {
  revision: number;
}

export interface SendLobbyMessageResultDto {
  message: ChatMessageDto;
}

export type ResyncReason = 'gap' | 'slow_consumer';

export type AccessRevokedReason =
  | 'lobby.membership_removed'
  | 'lobby.closed'
  | 'auth.session_revoked'
  | 'auth.suspended'
  | 'social.blocked';

export type RealtimeConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

/** Absent from the presence map means unknown — never rendered as online. */
export interface PresenceEntry {
  status: PresenceStatusValue;
  serverEpoch: string;
  userVersion: number;
}

export interface LobbyChangedEvent {
  envelope: RealtimeEnvelope;
  revision: number;
  changeType: string;
}

export interface ChatMessageCreatedEvent {
  envelope: RealtimeEnvelope;
  message: ChatMessageDto;
}

export interface ChatMessageDeletedEvent {
  envelope: RealtimeEnvelope;
  messageId: string;
  deletedAtUtc: string;
}

export interface AccessRevokedEvent {
  envelope: RealtimeEnvelope;
  reason: AccessRevokedReason | string;
}

export interface ResyncRequiredEvent {
  envelope: RealtimeEnvelope;
  reason: ResyncReason | string;
  currentRevision: number | null;
}

export interface RealtimeEventMap {
  lobbyChanged: LobbyChangedEvent;
  chatMessageCreated: ChatMessageCreatedEvent;
  chatMessageDeleted: ChatMessageDeletedEvent;
  accessRevoked: AccessRevokedEvent;
  resyncRequired: ResyncRequiredEvent;
}

export type RealtimeEventName = keyof RealtimeEventMap;
export type RealtimeEventListener<K extends RealtimeEventName> = (event: RealtimeEventMap[K]) => void;
