import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '@/lib/api-client';
import type { ChatMessageDto } from '@/features/chat/types';
import type { RealtimeConnectionState, RealtimeEventName, RealtimeEventMap } from '@/features/realtime/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u-1', username: 'me', displayName: 'Me', initials: 'ME', color: '#F0394B' } }),
}));

const mockToastPush = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ push: mockToastPush }) }));

const mockGetHistory = vi.fn();
const mockDeleteMessage = vi.fn();
vi.mock('@/features/chat/chatApi', () => ({
  chatApi: {
    getHistory: (...args: unknown[]) => mockGetHistory(...args),
    deleteMessage: (...args: unknown[]) => mockDeleteMessage(...args),
  },
}));

const mockSendLobbyMessage = vi.fn();
let mockConnectionState: RealtimeConnectionState = 'connected';
type Listener = (payload: never) => void;
const testListeners: Partial<Record<RealtimeEventName, Listener>> = {};

vi.mock('@/features/realtime/RealtimeConnectionProvider', () => ({
  useRealtime: () => ({
    connectionState: mockConnectionState,
    presence: new Map(),
    subscribeLobby: vi.fn().mockResolvedValue(undefined),
    unsubscribeLobby: vi.fn().mockResolvedValue(undefined),
    sendLobbyMessage: (...args: unknown[]) => mockSendLobbyMessage(...args),
    retry: vi.fn(),
    addEventListener: vi.fn(() => vi.fn()),
  }),
  useRealtimeEvent: (event: RealtimeEventName, listener: Listener) => {
    testListeners[event] = listener;
  },
}));

function emit<K extends RealtimeEventName>(event: K, payload: RealtimeEventMap[K]) {
  const listener = testListeners[event];
  if (listener) listener(payload as never);
}

function envelope(scopeId = 'lobby-1') {
  return { schemaVersion: 1, eventId: 'e-1', serverUtc: '2026-01-01T00:00:00Z', scope: 'lobby' as const, scopeId };
}

function sender(overrides: Partial<ChatMessageDto['sender']> = {}) {
  return {
    userId: 'u-2', username: 'other', displayName: 'Other User', initials: 'OU',
    color: '#38BDF8', avatarUrl: null, profileType: 'Player' as const, ...overrides,
  };
}

function msg(overrides: Partial<ChatMessageDto> = {}): ChatMessageDto {
  return {
    id: 'm-1', lobbyId: 'lobby-1', sender: sender(), body: 'Hello there',
    deleted: false, createdAt: '2026-01-01T00:00:00Z', schemaVersion: 1, ...overrides,
  };
}

function page(items: ChatMessageDto[], nextCursor: string | null = null) {
  return { items, nextCursor };
}

async function renderPanel(lobbyId = 'lobby-1') {
  const { ChatPanel } = await import('@/components/lobby/ChatPanel');
  return render(<ChatPanel lobbyId={lobbyId} />);
}

beforeEach(() => {
  mockGetHistory.mockReset();
  mockDeleteMessage.mockReset();
  mockSendLobbyMessage.mockReset();
  mockToastPush.mockReset();
  mockConnectionState = 'connected';
  delete testListeners.chatMessageCreated;
  delete testListeners.chatMessageDeleted;
  delete testListeners.accessRevoked;
  delete testListeners.lobbyChanged;
  delete testListeners.resyncRequired;
  mockGetHistory.mockResolvedValue(page([]));
});

describe('ChatPanel', () => {
  it('shows a loading state before history resolves', async () => {
    let resolveHistory: (v: unknown) => void = () => {};
    mockGetHistory.mockReturnValue(new Promise(resolve => { resolveHistory = resolve; }));
    await renderPanel();
    expect(screen.getByText('Loading messages…')).toBeInTheDocument();
    await act(async () => { resolveHistory(page([])); });
  });

  it('renders history messages with sender name and body', async () => {
    mockGetHistory.mockResolvedValue(page([msg({ id: 'm-1', body: 'Hi all' })]));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('Hi all')).toBeInTheDocument());
    expect(screen.getByText('Other User')).toBeInTheDocument();
  });

  it('shows an empty state when history has no messages', async () => {
    mockGetHistory.mockResolvedValue(page([]));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
  });

  it('shows a forbidden state on a 403/404 history response', async () => {
    mockGetHistory.mockRejectedValue(new ApiError(404, 'Chat.NotFound', 'Not found'));
    await renderPanel();
    await waitFor(() => expect(screen.getByText("You don't have access to this chat.")).toBeInTheDocument());
  });

  it('shows a retryable error state on a generic history failure, and Retry re-fetches', async () => {
    mockGetHistory.mockRejectedValueOnce(new Error('network down'));
    await renderPanel();
    await waitFor(() => expect(screen.getByText("Couldn't load chat.")).toBeInTheDocument());

    mockGetHistory.mockResolvedValueOnce(page([msg({ body: 'Recovered' })]));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Recovered')).toBeInTheDocument());
  });

  it('sends on Enter and appends the returned message', async () => {
    mockSendLobbyMessage.mockResolvedValue(msg({ id: 'm-sent', body: 'yo', sender: { ...sender(), userId: 'u-1', displayName: 'Me' } }));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());

    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    fireEvent.change(textarea, { target: { value: 'yo' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });

    await waitFor(() => expect(mockSendLobbyMessage).toHaveBeenCalledWith('lobby-1', 'yo', expect.any(String)));
    await waitFor(() => expect(screen.getByText('yo')).toBeInTheDocument());
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });

  it('does not send on Shift+Enter', async () => {
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    fireEvent.change(textarea, { target: { value: 'line one' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(mockSendLobbyMessage).not.toHaveBeenCalled();
  });

  it('does not send on Enter while composing an IME candidate', async () => {
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    fireEvent.change(textarea, { target: { value: 'こんにちは' } });
    fireEvent.compositionStart(textarea);
    fireEvent.keyDown(textarea, { key: 'Enter', isComposing: true });
    expect(mockSendLobbyMessage).not.toHaveBeenCalled();
  });

  it('shows a validation error and marks the input invalid on Chat.InvalidBody', async () => {
    mockSendLobbyMessage.mockRejectedValue(new Error('Chat.InvalidBody'));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    fireEvent.change(textarea, { target: { value: 'x'.repeat(3000) } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText('Message must be between 1 and 2000 characters.')).toBeInTheDocument());
    expect(textarea.className).toContain('input--error');
  });

  it('shows a rate-limited message and disables the composer on RateLimit.Exceeded', async () => {
    mockSendLobbyMessage.mockRejectedValue(new Error('RateLimit.Exceeded'));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' }) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'too fast' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(screen.getByText("You're sending messages too fast. Try again shortly.")).toBeInTheDocument());
    expect(textarea).toBeDisabled();
  });

  it('disables the composer and shows a message when access is revoked and the re-fetch confirms it', async () => {
    mockGetHistory.mockResolvedValueOnce(page([msg()]));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());

    // Access-revoked is only sticky if the resync fetch it triggers actually confirms the loss of access.
    mockGetHistory.mockRejectedValueOnce(new ApiError(404, 'Chat.NotFound', 'Not found'));
    await act(async () => {
      emit('accessRevoked', { envelope: envelope(), reason: 'lobby.membership_removed' });
    });

    await waitFor(() => expect(screen.getByText("You don't have access to this chat.")).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    expect(textarea).toBeDisabled();
  });

  it('dedupes an incoming chatMessageCreated broadcast against the same id', async () => {
    mockGetHistory.mockResolvedValue(page([msg({ id: 'm-1', body: 'Hello there' })]));
    await renderPanel();
    await waitFor(() => expect(screen.getAllByText('Hello there')).toHaveLength(1));

    await act(async () => {
      emit('chatMessageCreated', { envelope: envelope(), message: msg({ id: 'm-1', body: 'Hello there' }) });
    });

    expect(screen.getAllByText('Hello there')).toHaveLength(1);
  });

  it('ignores a chatMessageCreated broadcast for a different lobby', async () => {
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());

    await act(async () => {
      emit('chatMessageCreated', { envelope: envelope('lobby-other'), message: msg({ id: 'm-2', lobbyId: 'lobby-other', body: 'wrong room' }) });
    });

    expect(screen.queryByText('wrong room')).not.toBeInTheDocument();
  });

  it('marks a message deleted in place on chatMessageDeleted', async () => {
    mockGetHistory.mockResolvedValue(page([msg({ id: 'm-1', body: 'Hello there' })]));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());

    await act(async () => {
      emit('chatMessageDeleted', { envelope: envelope(), messageId: 'm-1', deletedAtUtc: '2026-01-01T00:01:00Z' });
    });

    await waitFor(() => expect(screen.getByText('Message deleted')).toBeInTheDocument());
    expect(screen.queryByText('Hello there')).not.toBeInTheDocument();
  });

  it('disables the composer while the realtime connection is closed', async () => {
    mockConnectionState = 'closed';
    await renderPanel();
    await waitFor(() => expect(screen.getByText('No messages yet — say hello.')).toBeInTheDocument());
    const textarea = screen.getByRole('textbox', { name: 'Chat message' });
    expect(textarea).toBeDisabled();
  });

  it('exposes an accessible live message log and a polite status region', async () => {
    mockGetHistory.mockResolvedValue(page([msg()]));
    await renderPanel();
    await waitFor(() => expect(screen.getByText('Hello there')).toBeInTheDocument());
    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
