import type { PublicIdentity } from '@/features/profile/profileApi';

export type ChatSenderDto = PublicIdentity;

export interface ChatMessageDto {
  id: string;
  lobbyId: string;
  sender: ChatSenderDto;
  body: string | null;
  deleted: boolean;
  createdAt: string;
  schemaVersion: number;
}

export type ChatHistoryDirection = 'before' | 'after';
