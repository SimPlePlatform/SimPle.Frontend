'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { chatApi } from '@/features/chat/chatApi';
import type { ChatMessageDto } from '@/features/chat/types';
import { parseHubErrorCode } from '@/features/realtime/errors';
import { useRealtime, useRealtimeEvent } from '@/features/realtime/RealtimeConnectionProvider';
import { ApiError } from '@/lib/api-client';

interface ChatPanelProps {
  lobbyId: string;
  title?: string;
}

const PAGE_SIZE = 30;
const NEAR_BOTTOM_PX = 48;
const RATE_LIMIT_COOLDOWN_MS = 5000;

function newClientCommandId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type HistoryState = 'loading' | 'ready' | 'forbidden' | 'retryable-error';
type SendState = 'idle' | 'sending' | 'validation-error' | 'rate-limited' | 'send-failed';

export function ChatPanel({ lobbyId, title = 'Chat' }: ChatPanelProps) {
  const { user } = useAuth();
  const { push: pushToast } = useToast();
  const { connectionState, sendLobbyMessage } = useRealtime();

  const [messages, setMessages] = useState<Map<string, ChatMessageDto>>(new Map());
  const [historyState, setHistoryState] = useState<HistoryState>('loading');
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [accessRevokedReason, setAccessRevokedReason] = useState<string | null>(null);

  const [draft, setDraft] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);
  const [pendingNewCount, setPendingNewCount] = useState(0);
  const [liveStatus, setLiveStatus] = useState('');

  const clientCommandIdRef = useRef(newClientCommandId());
  const composingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const prevConnectionStateRef = useRef(connectionState);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ordered = useMemo(
    () => Array.from(messages.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)),
    [messages],
  );

  const mergeMessages = useCallback((items: ChatMessageDto[]) => {
    setMessages(prev => {
      const next = new Map(prev);
      for (const item of items) next.set(item.id, item);
      return next;
    });
  }, []);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    nearBottomRef.current = true;
    setPendingNewCount(0);
  }, []);

  const loadLatest = useCallback(async () => {
    try {
      const page = await chatApi.getHistory(lobbyId, { direction: 'before', limit: PAGE_SIZE });
      mergeMessages(page.items);
      setOlderCursor(page.nextCursor);
      setHistoryState('ready');
      setAccessRevokedReason(null);
      return true;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
        setHistoryState('forbidden');
      } else {
        setHistoryState('retryable-error');
      }
      return false;
    }
  }, [lobbyId, mergeMessages]);

  // Initial load — runs once per lobby, independent of hub connection state (history is plain REST).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages(new Map());
    setHistoryState('loading');
    setHasLoadedOnce(false);
    setOlderCursor(null);
    void loadLatest().finally(() => {
      setHasLoadedOnce(true);
      requestAnimationFrame(() => scrollToBottom(false));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyId]);

  // Reconnect repair: re-fetch the latest snapshot page and merge by id (spec: chat gaps are healed via
  // the same "authorized snapshot resync" pattern lobby state uses, not incremental gap-walking).
  useEffect(() => {
    const prev = prevConnectionStateRef.current;
    prevConnectionStateRef.current = connectionState;
    if (connectionState === 'connected' && (prev === 'reconnecting' || prev === 'closed') && hasLoadedOnce) {
      setResyncing(true);
      void loadLatest().finally(() => setResyncing(false));
    }
  }, [connectionState, hasLoadedOnce, loadLatest]);

  useRealtimeEvent('chatMessageCreated', ({ message }) => {
    if (message.lobbyId !== lobbyId) return;
    mergeMessages([message]);
    if (nearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom(true));
    } else if (message.sender.userId !== user?.id) {
      setPendingNewCount(n => n + 1);
    }
  });

  useRealtimeEvent('chatMessageDeleted', ({ messageId, deletedAtUtc }) => {
    setMessages(prev => {
      const existing = prev.get(messageId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(messageId, { ...existing, deleted: true, body: null, createdAt: existing.createdAt });
      void deletedAtUtc;
      return next;
    });
  });

  useRealtimeEvent('accessRevoked', ({ reason }) => {
    setAccessRevokedReason(String(reason));
    setLiveStatus('Your access to this chat has changed.');
    void loadLatest();
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (connectionState === 'reconnecting') setLiveStatus('Reconnecting…');
    else if (connectionState === 'connected') setLiveStatus('Connected.');
    else if (connectionState === 'closed') setLiveStatus('Disconnected. Messages will not send until reconnected.');
  }, [connectionState]);

  useEffect(() => () => { if (rateLimitTimerRef.current) clearTimeout(rateLimitTimerRef.current); }, []);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    nearBottomRef.current = nearBottom;
    if (nearBottom) setPendingNewCount(0);
  }, []);

  const loadOlder = useCallback(async () => {
    if (!olderCursor || loadingOlder) return;
    setLoadingOlder(true);
    const el = listRef.current;
    const prevScrollHeight = el?.scrollHeight ?? 0;
    try {
      const page = await chatApi.getHistory(lobbyId, { cursor: olderCursor, direction: 'before', limit: PAGE_SIZE });
      mergeMessages(page.items);
      setOlderCursor(page.nextCursor);
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight - prevScrollHeight;
      });
    } catch {
      pushToast({ kind: 'default', title: 'Could not load earlier messages', body: 'Try again in a moment.' });
    } finally {
      setLoadingOlder(false);
    }
  }, [lobbyId, olderCursor, loadingOlder, mergeMessages, pushToast]);

  const canSend = connectionState === 'connected' && historyState === 'ready' && !accessRevokedReason;

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sendState === 'sending') return;
    setSendState('sending');
    setSendErrorMessage(null);
    try {
      const message = await sendLobbyMessage(lobbyId, body, clientCommandIdRef.current);
      mergeMessages([message]);
      setDraft('');
      clientCommandIdRef.current = newClientCommandId();
      setSendState('idle');
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (error) {
      const code = parseHubErrorCode(error);
      if (code === 'Chat.InvalidBody' || code === 'Chat.ProfanityRejected') {
        setSendState('validation-error');
        setSendErrorMessage(code === 'Chat.ProfanityRejected'
          ? 'That message was rejected by content filtering.'
          : 'Message must be between 1 and 2000 characters.');
        clientCommandIdRef.current = newClientCommandId();
      } else if (code === 'Chat.NotFound' || code === 'Chat.Forbidden') {
        setAccessRevokedReason(code);
        setSendState('idle');
      } else if (code === 'RateLimit.Exceeded') {
        setSendState('rate-limited');
        setSendErrorMessage("You're sending messages too fast. Try again shortly.");
        rateLimitTimerRef.current = setTimeout(() => {
          setSendState(s => (s === 'rate-limited' ? 'idle' : s));
        }, RATE_LIMIT_COOLDOWN_MS);
      } else {
        setSendState('send-failed');
        setSendErrorMessage('Message failed to send.');
      }
    }
  }, [draft, sendState, sendLobbyMessage, lobbyId, mergeMessages, scrollToBottom]);

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || composingRef.current || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void send();
  };

  const handleDeleteMessage = useCallback(async (messageId: string) => {
    const previous = messages.get(messageId);
    setMessages(prev => {
      const existing = prev.get(messageId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(messageId, { ...existing, deleted: true, body: null });
      return next;
    });
    try {
      await chatApi.deleteMessage(messageId);
    } catch {
      if (previous) setMessages(prev => new Map(prev).set(messageId, previous));
      pushToast({ kind: 'default', title: 'Could not delete message' });
    }
  }, [messages, pushToast]);

  const composerDisabledReason =
    accessRevokedReason ? 'You no longer have access to this chat.' :
    connectionState === 'closed' ? "You're offline — reconnect to send messages." :
    connectionState === 'reconnecting' ? 'Reconnecting…' :
    connectionState === 'connecting' ? 'Connecting…' :
    historyState === 'forbidden' ? 'Chat is unavailable.' :
    historyState === 'retryable-error' ? 'Chat could not be loaded.' :
    null;

  return (
    <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: 320 }}>
      <div className="row between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-1)' }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="message" size={14} style={{ color: 'var(--text-lo)' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>{title}</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          {resyncing && <span className="chip chip--ice">Syncing…</span>}
          {connectionState === 'reconnecting' && <span className="chip chip--warn">Reconnecting</span>}
          {connectionState === 'closed' && <span className="chip chip--red">Offline</span>}
          <span className="chip chip--mono">{ordered.length}</span>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">{liveStatus}</span>

      {historyState === 'loading' && (
        <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, color: 'var(--text-lo)', fontSize: 13 }}>
          Loading messages…
        </div>
      )}

      {historyState === 'forbidden' && (
        <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6, textAlign: 'center' }}>
          <Icon name="lock" size={20} style={{ color: 'var(--text-lo)' }} />
          <div style={{ fontSize: 13, color: 'var(--text-md)' }}>You don&apos;t have access to this chat.</div>
        </div>
      )}

      {historyState === 'retryable-error' && (
        <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-md)' }}>Couldn&apos;t load chat.</div>
          <Button size="sm" variant="secondary" onClick={() => { setHistoryState('loading'); void loadLatest(); }}>Retry</Button>
        </div>
      )}

      {historyState === 'ready' && (
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            onScroll={handleScroll}
            style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {olderCursor && (
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button size="sm" variant="ghost" onClick={() => void loadOlder()} disabled={loadingOlder}>
                  {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                </Button>
              </div>
            )}
            {!olderCursor && ordered.length > 0 && (
              <div style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--text-lo)' }}>Start of conversation</div>
            )}
            {ordered.length === 0 && (
              <div className="col" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, color: 'var(--text-lo)', fontSize: 13 }}>
                No messages yet — say hello.
              </div>
            )}
            {ordered.map(m => (
              <div key={m.id} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <Avatar user={{ initials: m.sender.initials, color: m.sender.color }} src={m.sender.avatarUrl} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: m.sender.userId === user?.id ? 'var(--red-400)' : 'var(--text-hi)' }}>
                      {m.sender.displayName}
                    </span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)' }}>{formatTime(m.createdAt)}</span>
                    {m.sender.userId === user?.id && !m.deleted && (
                      <button
                        type="button"
                        aria-label="Delete message"
                        onClick={() => void handleDeleteMessage(m.id)}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: 2 }}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: m.deleted ? 'var(--text-dim)' : 'var(--text-md)', marginTop: 2, fontStyle: m.deleted ? 'italic' : 'normal', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {m.deleted ? 'Message deleted' : m.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {pendingNewCount > 0 && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="chip chip--ice"
              style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', cursor: 'pointer' }}
            >
              {pendingNewCount} new message{pendingNewCount === 1 ? '' : 's'} ↓
            </button>
          )}
        </div>
      )}

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-1)' }}>
        {(sendState === 'validation-error' || sendState === 'send-failed' || sendState === 'rate-limited') && sendErrorMessage && (
          <div role="alert" style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 6 }}>
            {sendErrorMessage}
            {sendState === 'send-failed' && (
              <button type="button" onClick={() => void send()} style={{ marginLeft: 8, color: 'var(--ice-400)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                Retry
              </button>
            )}
          </div>
        )}
        {accessRevokedReason && (
          <div role="alert" style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 6 }}>
            You no longer have access to this chat.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            className={`input${sendState === 'validation-error' ? ' input--error' : ''}`}
            placeholder={composerDisabledReason ?? 'Message…'}
            value={draft}
            disabled={!canSend || sendState === 'sending' || sendState === 'rate-limited'}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            rows={1}
            aria-label="Chat message"
            style={{ flex: 1, height: 'auto', minHeight: 38, maxHeight: 96, padding: '8px 12px', resize: 'none', lineHeight: 1.4 }}
          />
          <Button
            size="md"
            icon="send"
            aria-label="Send message"
            onClick={() => void send()}
            disabled={!canSend || !draft.trim() || sendState === 'sending' || sendState === 'rate-limited'}
          />
        </div>
      </div>
    </div>
  );
}
