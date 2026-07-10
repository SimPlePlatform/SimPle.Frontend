'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useFriendSummary } from './FriendSummaryContext';
import { friendsApi } from './friendsApi';
import { friendsErrorMessage } from './friendsErrors';
import { AddFriendModal } from './AddFriendModal';
import { PlayerIdentity } from '@/components/identity/PlayerIdentity';
import type { FriendDto, FriendRequestDto, FriendSuggestionDto } from './types';

export function FriendsPage() {
  const toast = useToast();
  const {
    summary, loading: summaryLoading, error: summaryError,
    retry: summaryRetry, invalidate,
  } = useFriendSummary();

  // ─── Friends panel (keyset cursor) ─────────────────────────────────────────────
  const [friends, setFriends]                   = useState<FriendDto[]>([]);
  const [friendsCursor, setFriendsCursor]       = useState<string | null>(null);
  const [loadingFriends, setLoadingFriends]     = useState(true);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);
  const [friendsError, setFriendsError]         = useState<string | null>(null);
  const friendsSeq                              = useRef(0);
  const activeQueryRef                          = useRef('');

  // ─── Incoming requests (keyset cursor) ─────────────────────────────────────────
  const [incoming, setIncoming]                 = useState<FriendRequestDto[]>([]);
  const [incomingCursor, setIncomingCursor]     = useState<string | null>(null);
  const [loadingIncoming, setLoadingIncoming]   = useState(true);
  const [loadingMoreIncoming, setLoadingMoreIncoming] = useState(false);
  const [incomingError, setIncomingError]       = useState<string | null>(null);
  const incomingSeq                             = useRef(0);

  // ─── Outgoing requests (keyset cursor) ─────────────────────────────────────────
  const [outgoing, setOutgoing]                 = useState<FriendRequestDto[]>([]);
  const [outgoingCursor, setOutgoingCursor]     = useState<string | null>(null);
  const [loadingOutgoing, setLoadingOutgoing]   = useState(true);
  const [loadingMoreOutgoing, setLoadingMoreOutgoing] = useState(false);
  const [outgoingError, setOutgoingError]       = useState<string | null>(null);
  const outgoingSeq                             = useRef(0);

  // ─── Suggestions ─────────────────────────────────────────────────────────────
  const [suggestions, setSuggestions]           = useState<FriendSuggestionDto[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const suggestionsSeq                          = useRef(0);
  const dismissedRef                            = useRef<Set<string>>(new Set());

  // ─── Per-action pending ───────────────────────────────────────────────────────
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const isP = (key: string) => pendingActions[key] === true;
  const setP = (key: string, v: boolean) =>
    setPendingActions(prev => {
      if (v) return { ...prev, [key]: true };
      const n = { ...prev }; delete n[key]; return n;
    });

  // ─── UI state ────────────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState<'all' | 'requests' | 'suggest'>('all');
  const [q, setQ]                     = useState('');
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'block'; userId: string; displayName: string;
  } | null>(null);

  // ─── Loaders ─────────────────────────────────────────────────────────────────

  const loadFriends = useCallback(async (query: string, cursor: string | null, append: boolean) => {
    const seq = ++friendsSeq.current;
    if (append) { setLoadingMoreFriends(true); } else { setLoadingFriends(true); }
    setFriendsError(null);
    try {
      const r = await friendsApi.getFriends({ query: query || undefined, cursor: cursor ?? undefined, limit: 20 });
      if (seq !== friendsSeq.current) return;
      setFriends(prev => append ? [...prev, ...r.items] : r.items);
      setFriendsCursor(r.nextCursor);
    } catch (e) {
      if (seq !== friendsSeq.current) return;
      setFriendsError(e instanceof ApiError ? e.message : 'Failed to load friends.');
    } finally {
      if (seq === friendsSeq.current) { setLoadingFriends(false); setLoadingMoreFriends(false); }
    }
  }, []);

  const loadSuggestions = useCallback(async () => {
    const seq = ++suggestionsSeq.current;
    setLoadingSuggestions(true); setSuggestionsError(null);
    try {
      const r = await friendsApi.getSuggestions();
      if (seq !== suggestionsSeq.current) return;
      setSuggestions(r.filter(s => !dismissedRef.current.has(s.userId)));
    } catch (e) {
      if (seq !== suggestionsSeq.current) return;
      setSuggestionsError(e instanceof ApiError ? e.message : 'Failed to load suggestions.');
    } finally {
      if (seq === suggestionsSeq.current) setLoadingSuggestions(false);
    }
  }, []);

  const reloadIncoming = useCallback(async () => {
    const seq = ++incomingSeq.current;
    setLoadingIncoming(true); setIncomingError(null);
    try {
      const r = await friendsApi.getRequests('incoming', { limit: 20 });
      if (seq !== incomingSeq.current) return;
      setIncoming(r.items); setIncomingCursor(r.nextCursor);
    } catch (e) {
      if (seq !== incomingSeq.current) return;
      setIncomingError(e instanceof ApiError ? e.message : 'Failed to load requests.');
    } finally {
      if (seq === incomingSeq.current) setLoadingIncoming(false);
    }
  }, []);

  const reloadOutgoing = useCallback(async () => {
    const seq = ++outgoingSeq.current;
    setLoadingOutgoing(true); setOutgoingError(null);
    try {
      const r = await friendsApi.getRequests('outgoing', { limit: 20 });
      if (seq !== outgoingSeq.current) return;
      setOutgoing(r.items); setOutgoingCursor(r.nextCursor);
    } catch (e) {
      if (seq !== outgoingSeq.current) return;
      setOutgoingError(e instanceof ApiError ? e.message : 'Failed to load outgoing requests.');
    } finally {
      if (seq === outgoingSeq.current) setLoadingOutgoing(false);
    }
  }, []);

  // Panel loaders — independent startup (setState calls happen inside async callbacks, not synchronously)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadFriends('', null, false); }, [loadFriends]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reloadIncoming(); }, [reloadIncoming]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { reloadOutgoing(); }, [reloadOutgoing]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSuggestions(); }, [loadSuggestions]);

  // Debounced search — skip initial mount
  const didMountSearch = useRef(false);
  useEffect(() => {
    if (!didMountSearch.current) { didMountSearch.current = true; return; }
    const t = setTimeout(() => {
      activeQueryRef.current = q;
      loadFriends(q, null, false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, loadFriends]);

  // ─── Load-more helpers ────────────────────────────────────────────────────────

  const loadMoreIncoming = async () => {
    if (!incomingCursor) return;
    const seq = ++incomingSeq.current;
    setLoadingMoreIncoming(true);
    try {
      const r = await friendsApi.getRequests('incoming', { cursor: incomingCursor, limit: 20 });
      if (seq !== incomingSeq.current) return;
      setIncoming(prev => [...prev, ...r.items]);
      setIncomingCursor(r.nextCursor);
    } catch (e) {
      if (seq !== incomingSeq.current) return;
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally {
      if (seq === incomingSeq.current) setLoadingMoreIncoming(false);
    }
  };

  const loadMoreOutgoing = async () => {
    if (!outgoingCursor) return;
    const seq = ++outgoingSeq.current;
    setLoadingMoreOutgoing(true);
    try {
      const r = await friendsApi.getRequests('outgoing', { cursor: outgoingCursor, limit: 20 });
      if (seq !== outgoingSeq.current) return;
      setOutgoing(prev => [...prev, ...r.items]);
      setOutgoingCursor(r.nextCursor);
    } catch (e) {
      if (seq !== outgoingSeq.current) return;
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally {
      if (seq === outgoingSeq.current) setLoadingMoreOutgoing(false);
    }
  };

  // ─── Mutation handlers ────────────────────────────────────────────────────────

  const handleAccept = async (requestId: string) => {
    setP(`accept-${requestId}`, true);
    try {
      await friendsApi.acceptRequest(requestId);
      invalidate();
      reloadIncoming();
      loadFriends(activeQueryRef.current, null, false);
      loadSuggestions();
      toast.push({ kind: 'success', title: 'Friend added', body: 'You are now friends.' });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`accept-${requestId}`, false); }
  };

  const handleDecline = async (requestId: string) => {
    setP(`decline-${requestId}`, true);
    try {
      await friendsApi.declineRequest(requestId);
      invalidate();
      reloadIncoming();
      loadSuggestions();
      toast.push({ kind: 'info', title: 'Request declined' });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`decline-${requestId}`, false); }
  };

  const handleCancel = async (requestId: string) => {
    setP(`cancel-${requestId}`, true);
    try {
      await friendsApi.cancelRequest(requestId);
      invalidate();
      reloadOutgoing();
      loadSuggestions();
      toast.push({ kind: 'info', title: 'Request cancelled' });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`cancel-${requestId}`, false); }
  };

  const handleSendFromSuggestion = async (userId: string, displayName: string) => {
    setP(`send-${userId}`, true);
    try {
      const result = await friendsApi.sendRequest(userId);
      invalidate();
      loadSuggestions();
      if (result.outcome === 'cross_request_accepted') {
        // A reverse pending request existed and was atomically accepted — now friends.
        reloadIncoming();
        loadFriends(activeQueryRef.current, null, false);
        toast.push({ kind: 'success', title: 'Friend added', body: `You and ${displayName} are now friends.` });
      } else if (result.outcome === 'already_pending') {
        reloadOutgoing();
        toast.push({ kind: 'info', title: 'Request already sent', body: `Your request to ${displayName} is still pending.` });
      } else {
        reloadOutgoing();
        toast.push({ kind: 'success', title: 'Request sent', body: `${displayName} will be notified.` });
      }
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`send-${userId}`, false); }
  };

  const handleDismiss = async (userId: string) => {
    // Optimistic: hide immediately, reconcile from the server (30-day suppression).
    dismissedRef.current.add(userId);
    const snapshot = suggestions;
    setSuggestions(prev => prev.filter(s => s.userId !== userId));
    try {
      await friendsApi.dismissSuggestion(userId);
    } catch (e) {
      // Roll back the optimistic removal on failure.
      dismissedRef.current.delete(userId);
      setSuggestions(snapshot);
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    }
  };

  const handleRemove = async () => {
    if (!confirmAction || confirmAction.type !== 'remove') return;
    const { userId, displayName } = confirmAction;
    setP(`remove-${userId}`, true);
    try {
      await friendsApi.removeFriend(userId);
      invalidate();
      loadFriends(activeQueryRef.current, null, false);
      loadSuggestions();
      setConfirmAction(null);
      toast.push({ kind: 'info', title: 'Friend removed', body: `${displayName} has been removed.` });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`remove-${userId}`, false); }
  };

  const handleBlock = async () => {
    if (!confirmAction || confirmAction.type !== 'block') return;
    const { userId, displayName } = confirmAction;
    setP(`block-${userId}`, true);
    try {
      await friendsApi.blockUser(userId);
      invalidate();
      loadFriends(activeQueryRef.current, null, false);
      reloadIncoming();
      reloadOutgoing();
      loadSuggestions();
      setConfirmAction(null);
      toast.push({ kind: 'info', title: 'User blocked', body: `${displayName} has been blocked.` });
    } catch (e) {
      toast.push({ kind: 'default', title: 'Error', body: friendsErrorMessage(e) });
    } finally { setP(`block-${userId}`, false); }
  };

  const handleAddFriendSent = () => {
    invalidate();
    reloadOutgoing();
    loadSuggestions();
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Friends</div>
          <div className="page-sub">
            {summaryError ? (
              <>
                Could not load counts.{' '}
                <button
                  onClick={summaryRetry}
                  style={{ color: 'var(--ice-400)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
                >Retry</button>
              </>
            ) : summaryLoading || !summary ? 'Loading…' : (
              `${summary.friendCount} total · ${summary.incomingRequestCount} pending requests`
            )}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" icon="share" disabled aria-disabled="true">Share invite link</Button>
          <Button icon="plus" onClick={() => setAddFriendOpen(true)}>Add friend</Button>
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={v => setTab(v as 'all' | 'requests' | 'suggest')}
          items={[
            { value: 'all',      label: 'All friends',  count: summary?.friendCount ?? 0 },
            { value: 'requests', label: 'Requests',     count: summary?.incomingRequestCount ?? 0, icon: 'bell' },
            { value: 'suggest',  label: 'Suggestions',  count: suggestions.length, icon: 'sparkle' },
          ]}
        />
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-lo)' }} />
          <input
            className="input"
            placeholder="Search by name or @handle"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      <div className="friends-grid">
        <div className="card" style={{ padding: 18 }}>
          {tab === 'requests' ? (
            <RequestsPanel
              incoming={incoming}         incomingHasNext={incomingCursor != null}
              loadingIncoming={loadingIncoming} loadingMoreIncoming={loadingMoreIncoming}
              incomingError={incomingError}
              outgoing={outgoing}         outgoingHasNext={outgoingCursor != null}
              loadingOutgoing={loadingOutgoing} loadingMoreOutgoing={loadingMoreOutgoing}
              outgoingError={outgoingError}
              pendingActions={pendingActions}
              onAccept={handleAccept}     onDecline={handleDecline}   onCancel={handleCancel}
              onLoadMoreIncoming={loadMoreIncoming}  onRetryIncoming={reloadIncoming}
              onLoadMoreOutgoing={loadMoreOutgoing}  onRetryOutgoing={reloadOutgoing}
            />
          ) : tab === 'suggest' ? (
            <SuggestionsList
              suggestions={suggestions}
              loading={loadingSuggestions} error={suggestionsError}
              pendingActions={pendingActions}
              onSend={handleSendFromSuggestion} onDismiss={handleDismiss}
              onRetry={loadSuggestions}
            />
          ) : (
            <FriendList
              friends={friends}
              loading={loadingFriends}    loadingMore={loadingMoreFriends}
              error={friendsError}        hasNext={friendsCursor != null}
              pendingActions={pendingActions}
              onLoadMore={() => loadFriends(activeQueryRef.current, friendsCursor, true)}
              onRetry={() => loadFriends(activeQueryRef.current, null, false)}
              onRemove={(userId, displayName) => setConfirmAction({ type: 'remove', userId, displayName })}
              onBlock={(userId, displayName) => setConfirmAction({ type: 'block', userId, displayName })}
              onEmpty={() => setAddFriendOpen(true)}
            />
          )}
        </div>

        <div className="col" style={{ gap: 18 }}>
          <SuggestedSidecar
            suggestions={suggestions} loading={loadingSuggestions}
            pendingActions={pendingActions}
            onSend={handleSendFromSuggestion} onDismiss={handleDismiss}
          />
          {/* FriendsActivity deferred to Module 11 — requires real-time presence/activity system */}
          <FriendsActivity />
        </div>
      </div>

      <Modal
        open={confirmAction?.type === 'remove'}
        onClose={() => setConfirmAction(null)}
        title="Remove friend"
        icon="users"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              disabled={isP(`remove-${confirmAction?.userId ?? ''}`)}
              onClick={handleRemove}
            >
              {isP(`remove-${confirmAction?.userId ?? ''}`) ? 'Removing…' : 'Remove'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-md)', margin: 0 }}>
          Remove <b>{confirmAction?.displayName}</b> from your friends list?
        </p>
      </Modal>

      <Modal
        open={confirmAction?.type === 'block'}
        onClose={() => setConfirmAction(null)}
        title="Block user"
        icon="shield"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button
              disabled={isP(`block-${confirmAction?.userId ?? ''}`)}
              onClick={handleBlock}
            >
              {isP(`block-${confirmAction?.userId ?? ''}`) ? 'Blocking…' : 'Block'}
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--text-md)', margin: 0 }}>
          Block <b>{confirmAction?.displayName}</b>? They will be removed from your friends list and cannot send you friend requests.
        </p>
      </Modal>

      <AddFriendModal
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onSent={handleAddFriendSent}
      />
    </div>
  );
}

// ─── FriendList ───────────────────────────────────────────────────────────────

interface FriendListProps {
  friends: FriendDto[];
  loading: boolean; loadingMore: boolean;
  error: string | null; hasNext: boolean;
  pendingActions: Record<string, boolean>;
  onLoadMore: () => void; onRetry: () => void;
  onRemove: (userId: string, displayName: string) => void;
  onBlock:  (userId: string, displayName: string) => void;
  onEmpty:  () => void;
}

function FriendList({ friends, loading, loadingMore, error, hasNext, pendingActions: _pendingActions, onLoadMore, onRetry, onRemove, onBlock, onEmpty }: FriendListProps) {
  const [openMoreFor, setOpenMoreFor] = useState<string | null>(null);
  const moreContainerRef = useRef<HTMLDivElement | null>(null);
  const setMoreRef = useCallback((el: HTMLDivElement | null) => { moreContainerRef.current = el; }, []);

  useEffect(() => {
    if (!openMoreFor) return;
    const handler = (e: MouseEvent) => {
      if (moreContainerRef.current && !moreContainerRef.current.contains(e.target as Node)) {
        setOpenMoreFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMoreFor]);

  if (loading) return <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Loading…</div>;
  if (error)   return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
      <Button size="sm" variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  );
  if (!friends.length) return <EmptyFriends onAdd={onEmpty} />;

  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="friend-row" style={{ padding: '6px 10px' }}>
        <div className="uppercase-label" style={{ flex: 1 }}>Player</div>
        <div className="uppercase-label friend-row__status">Status</div>
        {/* ELO column hidden until M10 supplies authoritative ratings */}
        <div className="friend-row__actions" aria-hidden="true" />
      </div>
      {friends.map(f => (
        <div key={f.userId} className="friend-row" style={{ position: 'relative' }}>
          <PlayerIdentity player={f} />
          <div className="friend-row__status" />
          {/* ELO value hidden until M10 */}
          <div className="friend-row__actions">
            <div className="friend-row__secondary">
              <Button size="sm" variant="ghost" icon="message" disabled aria-disabled="true" />
              <Button size="sm" variant="ghost" icon="plus" disabled aria-disabled="true">Invite</Button>
            </div>
            <div ref={openMoreFor === f.userId ? setMoreRef : null} style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost btn-icon btn-sm"
                aria-label={`More actions for ${f.displayName}`}
                onClick={() => setOpenMoreFor(v => v === f.userId ? null : f.userId)}
              >
                <Icon name="more" size={14} />
              </button>
              {openMoreFor === f.userId && (
                <div style={{
                  position: 'absolute', right: 0, top: '100%', zIndex: 10,
                  background: 'var(--bg-3)', border: '1px solid var(--border-2)',
                  borderRadius: 8, padding: '4px 0', minWidth: 140,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, borderRadius: 0 }}
                    onClick={() => { setOpenMoreFor(null); onRemove(f.userId, f.displayName); }}
                  >Remove friend</button>
                  <button
                    className="btn btn-ghost"
                    style={{ width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 13, borderRadius: 0, color: 'var(--danger)' }}
                    onClick={() => { setOpenMoreFor(null); onBlock(f.userId, f.displayName); }}
                  >Block user</button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      {hasNext && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button size="sm" variant="ghost" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── RequestsPanel ────────────────────────────────────────────────────────────

interface RequestsPanelProps {
  incoming: FriendRequestDto[]; incomingHasNext: boolean;
  loadingIncoming: boolean; loadingMoreIncoming: boolean; incomingError: string | null;
  outgoing: FriendRequestDto[]; outgoingHasNext: boolean;
  loadingOutgoing: boolean; loadingMoreOutgoing: boolean; outgoingError: string | null;
  pendingActions: Record<string, boolean>;
  onAccept: (id: string) => void; onDecline: (id: string) => void; onCancel: (id: string) => void;
  onLoadMoreIncoming: () => void; onRetryIncoming: () => void;
  onLoadMoreOutgoing: () => void; onRetryOutgoing: () => void;
}

function RequestsPanel({
  incoming, incomingHasNext, loadingIncoming, loadingMoreIncoming, incomingError,
  outgoing, outgoingHasNext, loadingOutgoing, loadingMoreOutgoing, outgoingError,
  pendingActions, onAccept, onDecline, onCancel,
  onLoadMoreIncoming, onRetryIncoming, onLoadMoreOutgoing, onRetryOutgoing,
}: RequestsPanelProps) {
  const isP = (key: string) => pendingActions[key] === true;

  return (
    <div className="col" style={{ gap: 20 }}>
      {/* Incoming */}
      <div>
        <div className="uppercase-label" style={{ marginBottom: 8 }}>Incoming</div>
        {loadingIncoming ? (
          <div role="status" style={{ padding: 16, color: 'var(--text-lo)', fontSize: 13 }}>Loading…</div>
        ) : incomingError ? (
          <div style={{ padding: 8 }}>
            <span style={{ color: 'var(--danger)', fontSize: 13 }}>{incomingError}</span>{' '}
            <Button size="sm" variant="ghost" onClick={onRetryIncoming}>Retry</Button>
          </div>
        ) : incoming.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-lo)' }}>No incoming requests.</div>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {incoming.map(r => (
              <div key={r.requestId} className="surface row" style={{ padding: 14, gap: 12 }}>
                <PlayerIdentity
                  player={{
                    username: r.requesterUsername,
                    displayName: r.requesterDisplayName,
                    initials: r.requesterInitials,
                    color: r.requesterColor,
                    avatarUrl: r.requesterAvatarUrl,
                  }}
                  subtitle={`${r.mutualFriendCount} mutual friend${r.mutualFriendCount !== 1 ? 's' : ''}`}
                />
                <Button
                  size="sm" icon="check"
                  disabled={isP(`accept-${r.requestId}`) || isP(`decline-${r.requestId}`)}
                  onClick={() => onAccept(r.requestId)}
                >
                  {isP(`accept-${r.requestId}`) ? 'Accepting…' : 'Accept'}
                </Button>
                <Button
                  size="sm" variant="ghost" icon="x"
                  disabled={isP(`accept-${r.requestId}`) || isP(`decline-${r.requestId}`)}
                  onClick={() => onDecline(r.requestId)}
                >
                  {isP(`decline-${r.requestId}`) ? 'Declining…' : 'Decline'}
                </Button>
              </div>
            ))}
            {incomingHasNext && (
              <Button size="sm" variant="ghost" disabled={loadingMoreIncoming} onClick={onLoadMoreIncoming}>
                {loadingMoreIncoming ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Outgoing */}
      <div>
        <div className="uppercase-label" style={{ marginBottom: 8 }}>Sent</div>
        {loadingOutgoing ? (
          <div role="status" style={{ padding: 16, color: 'var(--text-lo)', fontSize: 13 }}>Loading…</div>
        ) : outgoingError ? (
          <div style={{ padding: 8 }}>
            <span style={{ color: 'var(--danger)', fontSize: 13 }}>{outgoingError}</span>{' '}
            <Button size="sm" variant="ghost" onClick={onRetryOutgoing}>Retry</Button>
          </div>
        ) : outgoing.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-lo)' }}>No pending sent requests.</div>
        ) : (
          <div className="col" style={{ gap: 8 }}>
            {outgoing.map(r => (
              <div key={r.requestId} className="surface row" style={{ padding: 14, gap: 12 }}>
                <PlayerIdentity
                  player={{
                    username: r.addresseeUsername,
                    displayName: r.addresseeDisplayName,
                    initials: r.addresseeInitials,
                    color: r.addresseeColor,
                    avatarUrl: r.addresseeAvatarUrl,
                  }}
                  subtitle={`${r.mutualFriendCount} mutual friend${r.mutualFriendCount !== 1 ? 's' : ''}`}
                />
                <Button
                  size="sm" variant="ghost" icon="x"
                  disabled={isP(`cancel-${r.requestId}`)}
                  onClick={() => onCancel(r.requestId)}
                >
                  {isP(`cancel-${r.requestId}`) ? 'Cancelling…' : 'Cancel'}
                </Button>
              </div>
            ))}
            {outgoingHasNext && (
              <Button size="sm" variant="ghost" disabled={loadingMoreOutgoing} onClick={onLoadMoreOutgoing}>
                {loadingMoreOutgoing ? 'Loading…' : 'Load more'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SuggestionsList ──────────────────────────────────────────────────────────

interface SuggestionsListProps {
  suggestions: FriendSuggestionDto[];
  loading: boolean; error: string | null;
  pendingActions: Record<string, boolean>;
  onSend: (userId: string, displayName: string) => void;
  onDismiss: (userId: string) => void;
  onRetry: () => void;
}

function SuggestionsList({ suggestions, loading, error, pendingActions, onSend, onDismiss, onRetry }: SuggestionsListProps) {
  const isP = (key: string) => pendingActions[key] === true;

  if (loading) return <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Loading…</div>;
  if (error)   return (
    <div style={{ textAlign: 'center', padding: 24 }}>
      <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
      <Button size="sm" variant="ghost" onClick={onRetry}>Retry</Button>
    </div>
  );
  if (!suggestions.length) return (
    <EmptyState icon="sparkle" title="No suggestions right now." body="We'll show people you might know as your network grows." />
  );

  return (
    <div className="col" style={{ gap: 8 }}>
      {suggestions.map(s => (
        <div key={s.userId} className="surface row" style={{ padding: 14, gap: 12 }}>
          <PlayerIdentity
            player={s}
            subtitle={`${s.mutualFriendCount} mutual friend${s.mutualFriendCount === 1 ? '' : 's'}`}
          />
          <Button
            size="sm" variant="ghost" icon="plus"
            disabled={isP(`send-${s.userId}`)}
            onClick={() => onSend(s.userId, s.displayName)}
          >
            {isP(`send-${s.userId}`) ? 'Sending…' : 'Add'}
          </Button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={`Dismiss ${s.displayName}`}
            onClick={() => onDismiss(s.userId)}
          >
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── SuggestedSidecar ─────────────────────────────────────────────────────────

interface SuggestedSidecarProps {
  suggestions: FriendSuggestionDto[];
  loading: boolean;
  pendingActions: Record<string, boolean>;
  onSend: (userId: string, displayName: string) => void;
  onDismiss: (userId: string) => void;
}

function SuggestedSidecar({ suggestions, loading, pendingActions, onSend, onDismiss }: SuggestedSidecarProps) {
  const isP = (key: string) => pendingActions[key] === true;
  const visible = suggestions.slice(0, 5);

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>People to play with</div>
        <Icon name="sparkle" size={14} style={{ color: 'var(--ice-400)' }} />
      </div>
      <div className="col" style={{ marginTop: 12, gap: 10 }}>
        {loading ? (
          <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>Loading…</div>
        ) : visible.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>No suggestions yet.</div>
        ) : visible.map(s => (
          <div key={s.userId} className="row" style={{ gap: 10 }}>
            <PlayerIdentity player={s} size="sm" subtitle={`${s.mutualFriendCount} mutual`} />
            <Button
              size="sm" variant="ghost" icon="plus"
              disabled={isP(`send-${s.userId}`)}
              onClick={() => onSend(s.userId, s.displayName)}
            />
            <button
              className="btn btn-ghost btn-icon btn-sm"
              aria-label={`Dismiss ${s.displayName}`}
              onClick={() => onDismiss(s.userId)}
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FriendsActivity (mocked — Module 11) ─────────────────────────────────────

function FriendsActivity() {
  const items = [
    { when: 'now',  name: 'Priya',  text: 'opened a Chess Lite lobby',       color: '#38BDF8', initials: 'PR' },
    { when: '3m',   name: 'Sara',   text: 'climbed to Master · +24 ELO',     color: '#34D399', initials: 'SL' },
    { when: '12m',  name: 'Mateus', text: 'solved Sudoku Master in 4:21',    color: '#A78BFA', initials: 'MO' },
    { when: '1h',   name: 'Noor',   text: 'hit 10-win streak in Connect Four', color: '#F472B6', initials: 'NA' },
  ];
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Friend activity</div>
      {/* TODO Module 11: replace with real-time activity feed */}
      <div className="col" style={{ marginTop: 12, gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} className="row" style={{ gap: 10 }}>
            <Avatar user={{ initials: item.initials, color: item.color }} size="sm" />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              <div><b>{item.name}</b> <span style={{ color: 'var(--text-lo)' }}>{item.text}</span></div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{item.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EmptyFriends ─────────────────────────────────────────────────────────────

function EmptyFriends({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="Your roster is empty — let's fix that."
      body="Add friends to invite them to lobbies, see when they're online, and climb leaderboards together."
      action={
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <Button icon="plus" onClick={onAdd}>Add a friend</Button>
          <Button variant="ghost" icon="share" disabled aria-disabled="true">Copy invite link</Button>
        </div>
      }
    />
  );
}
