'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { useAuth } from '@/features/auth/AuthProvider';
import { API_BASE } from '@/lib/api-client';
import type { ChatMessageDto } from '@/features/chat/types';
import type {
  PresenceEntry,
  RealtimeConnectionState,
  RealtimeEnvelope,
  RealtimeEventListener,
  RealtimeEventMap,
  RealtimeEventName,
  SendLobbyMessageResultDto,
  SubscribeLobbyResultDto,
} from './types';

// Connection state machine (spec): Connecting -> Connected|Closed, Connected -> Reconnecting|Closed,
// Reconnecting -> Connected|Closed. Automatic reconnect waits 0, 2, 10, 30s; once that list is exhausted
// SignalR stops retrying and fires onclose, which is exactly the fourth-failure -> closed/offline transition.
const RECONNECT_DELAYS_MS = [0, 2000, 10000, 30000];

type Listeners = { [K in RealtimeEventName]: Set<RealtimeEventListener<K>> };

function createListenerRegistry(): Listeners {
  return {
    lobbyChanged: new Set(),
    chatMessageCreated: new Set(),
    chatMessageDeleted: new Set(),
    accessRevoked: new Set(),
    resyncRequired: new Set(),
  };
}

interface RealtimeContextValue {
  connectionState: RealtimeConnectionState;
  presence: Map<string, PresenceEntry>;
  subscribeLobby: (lobbyId: string) => Promise<SubscribeLobbyResultDto>;
  unsubscribeLobby: (lobbyId: string) => Promise<void>;
  sendLobbyMessage: (lobbyId: string, body: string, clientCommandId: string) => Promise<ChatMessageDto>;
  retry: () => void;
  addEventListener: <K extends RealtimeEventName>(event: K, listener: RealtimeEventListener<K>) => () => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeConnectionProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('idle');
  const [presence, setPresence] = useState<Map<string, PresenceEntry>>(new Map());
  const [retryToken, setRetryToken] = useState(0);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const epochRef = useRef<string | null>(null);
  const listenersRef = useRef<Listeners>(createListenerRegistry());

  const emit = useCallback(<K extends RealtimeEventName>(event: K, payload: RealtimeEventMap[K]) => {
    listenersRef.current[event].forEach(listener => listener(payload));
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      connectionRef.current?.stop();
      connectionRef.current = null;
      epochRef.current = null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConnectionState('idle');
      setPresence(new Map());
      return;
    }

    let disposed = false;
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/realtime`, { withCredentials: true })
      .withAutomaticReconnect(RECONNECT_DELAYS_MS)
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    connection.on('Connected', (_envelope: RealtimeEnvelope, serverEpoch: string) => {
      // A changed epoch means the server restarted — every cached presence entry is now stale (spec: "a
      // changed epoch clears all cached presence").
      if (epochRef.current !== null && epochRef.current !== serverEpoch) {
        setPresence(new Map());
      }
      epochRef.current = serverEpoch;
    });

    connection.on('PresenceChanged', (
      _envelope: RealtimeEnvelope, userId: string, presenceStatus: string, serverEpoch: string, userVersion: number,
    ) => {
      setPresence(prev => {
        const existing = prev.get(userId);
        if (existing && existing.serverEpoch === serverEpoch && existing.userVersion >= userVersion) return prev;
        const next = new Map(prev);
        next.set(userId, { status: presenceStatus as PresenceEntry['status'], serverEpoch, userVersion });
        return next;
      });
    });

    connection.on('LobbyChanged', (envelope: RealtimeEnvelope, revision: number, changeType: string) => {
      emit('lobbyChanged', { envelope, revision, changeType });
    });

    connection.on('ChatMessageCreated', (envelope: RealtimeEnvelope, message: ChatMessageDto) => {
      emit('chatMessageCreated', { envelope, message });
    });

    connection.on('ChatMessageDeleted', (envelope: RealtimeEnvelope, messageId: string, deletedAtUtc: string) => {
      emit('chatMessageDeleted', { envelope, messageId, deletedAtUtc });
    });

    connection.on('AccessRevoked', (envelope: RealtimeEnvelope, reason: string) => {
      emit('accessRevoked', { envelope, reason });
    });

    connection.on('ResyncRequired', (envelope: RealtimeEnvelope, reason: string, currentRevision: number | null) => {
      emit('resyncRequired', { envelope, reason, currentRevision });
    });

    connection.onreconnecting(() => { if (!disposed) setConnectionState('reconnecting'); });
    connection.onreconnected(() => { if (!disposed) setConnectionState('connected'); });
    connection.onclose(() => { if (!disposed) setConnectionState('closed'); });

    connectionRef.current = connection;
    setConnectionState('connecting');

    connection.start()
      .then(() => { if (!disposed) setConnectionState('connected'); })
      .catch(() => { if (!disposed) setConnectionState('closed'); });

    return () => {
      disposed = true;
      if (connectionRef.current === connection) connectionRef.current = null;
      connection.stop();
    };
  }, [status, retryToken, emit]);

  const subscribeLobby = useCallback(async (lobbyId: string): Promise<SubscribeLobbyResultDto> => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Realtime connection is not available.');
    }
    return connection.invoke<SubscribeLobbyResultDto>('SubscribeLobby', lobbyId);
  }, []);

  const unsubscribeLobby = useCallback(async (lobbyId: string): Promise<void> => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;
    await connection.invoke('UnsubscribeLobby', lobbyId);
  }, []);

  const sendLobbyMessage = useCallback(async (
    lobbyId: string, body: string, clientCommandId: string,
  ): Promise<ChatMessageDto> => {
    const connection = connectionRef.current;
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Realtime connection is not available.');
    }
    const result = await connection.invoke<SendLobbyMessageResultDto>(
      'SendLobbyMessage', lobbyId, body, clientCommandId,
    );
    return result.message;
  }, []);

  const retry = useCallback(() => setRetryToken(t => t + 1), []);

  const addEventListener = useCallback(<K extends RealtimeEventName>(
    event: K, listener: RealtimeEventListener<K>,
  ) => {
    listenersRef.current[event].add(listener);
    return () => { listenersRef.current[event].delete(listener); };
  }, []);

  const value: RealtimeContextValue = {
    connectionState, presence, subscribeLobby, unsubscribeLobby, sendLobbyMessage, retry, addEventListener,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeConnectionProvider');
  return ctx;
}

/** Absent (undefined) means unknown presence — callers must never treat that as offline-implies-safe or as online. */
export function usePresence(userId: string | undefined): PresenceEntry | undefined {
  const { presence } = useRealtime();
  return userId ? presence.get(userId) : undefined;
}

export function useRealtimeEvent<K extends RealtimeEventName>(event: K, listener: RealtimeEventListener<K>): void {
  const { addEventListener } = useRealtime();
  const listenerRef = useRef(listener);
  useEffect(() => { listenerRef.current = listener; }, [listener]);
  useEffect(() => addEventListener(event, payload => listenerRef.current(payload)), [event, addEventListener]);
}
