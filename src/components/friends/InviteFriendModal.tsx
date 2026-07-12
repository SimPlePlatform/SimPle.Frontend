'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { friendsApi } from '@/features/friends/friendsApi';
import type { FriendDto } from '@/features/friends/types';
import { lobbyApi } from '@/features/lobby/lobbyApi';
import { lobbyErrorMessage } from '@/features/lobby/lobbyErrors';
import { LobbyActions } from '@/features/lobby/types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Already-known target lobby (e.g. from LobbyPage). Omit to invite to the viewer's current active lobby. */
  lobbyId?: string;
  preselectedGameId?: string;
  /** Seeds the friend search (e.g. a specific friend's display name from ProfilePage) instead of listing all friends. */
  initialQuery?: string;
}

export function InviteFriendModal({ open, onClose, lobbyId, preselectedGameId, initialQuery }: Props) {
  const toast = useToast();

  const [q, setQ]       = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const [resolvedLobbyId, setResolvedLobbyId] = useState<string | null>(null);
  const [gameSlug, setGameSlug] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [lobbyLoading, setLobbyLoading] = useState(true);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const [allFriends, setAllFriends]           = useState<FriendDto[]>([]);
  const [friendsCursor, setFriendsCursor]     = useState<string | null>(null);
  const [loadingFriends, setLoadingFriends]   = useState(false);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);
  const [friendsError, setFriendsError]       = useState<string | null>(null);
  const friendsSeq    = useRef(0);
  const activeQueryRef = useRef('');
  const [activeQuery, setActiveQuery] = useState('');

  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadFriendsSearch = useCallback(async (query: string, cursor: string | null, append: boolean) => {
    const seq = ++friendsSeq.current;
    if (append) { setLoadingMoreFriends(true); } else { setLoadingFriends(true); }
    setFriendsError(null);
    try {
      const r = await friendsApi.getFriends({ query: query || undefined, cursor: cursor ?? undefined, limit: 20 });
      if (seq !== friendsSeq.current) return;
      const newItems = append ? [...allFriends, ...r.items] : r.items;
      setAllFriends(newItems);
      setFriendsCursor(r.nextCursor);
      setActiveQuery(query);
      // Deselect picked users that are no longer in the returned list
      setPicked(prev => new Set([...prev].filter(id => newItems.some(f => f.userId === id))));
    } catch (e) {
      if (seq !== friendsSeq.current) return;
      setFriendsError(e instanceof ApiError ? e.message : 'Could not load friends.');
    } finally {
      if (seq === friendsSeq.current) { setLoadingFriends(false); setLoadingMoreFriends(false); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve which lobby we're inviting to: the one we're already viewing, or the viewer's active hosted lobby.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSendError(null);
    if (lobbyId) {
      setResolvedLobbyId(lobbyId);
      setGameSlug(preselectedGameId ?? null);
      setLobbyLoading(false);
      setLobbyError(null);
      return;
    }
    setLobbyLoading(true);
    setLobbyError(null);
    lobbyApi.getMyActive()
      .then(ctx => {
        if (cancelled) return;
        if (ctx.lobby && ctx.lobby.allowedActions.includes(LobbyActions.Invite)) {
          setResolvedLobbyId(ctx.lobby.lobbyId);
          setGameSlug(ctx.lobby.gameSlug);
        } else {
          setResolvedLobbyId(null);
          setGameSlug(null);
        }
      })
      .catch(e => { if (!cancelled) setLobbyError(lobbyErrorMessage(e)); })
      .finally(() => { if (!cancelled) setLobbyLoading(false); });
    return () => { cancelled = true; };
  }, [open, lobbyId, preselectedGameId]);

  // Reveal an already-known invite link (host must have revealed/rotated it from the lobby page first —
  // a join credential is never minted or displayed from this modal, only read back).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open || !resolvedLobbyId) { setLinkToken(null); return; }
    try {
      const raw = sessionStorage.getItem(`lobby-credential:${resolvedLobbyId}`);
      setLinkToken(raw ? JSON.parse(raw).linkToken ?? null : null);
    } catch {
      setLinkToken(null);
    }
  }, [open, resolvedLobbyId]);

  // Reset and initial load when modal opens
  useEffect(() => {
    if (!open) return;
    const seedQuery = initialQuery ?? '';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ(seedQuery);

    setPicked(new Set());

    setAllFriends([]);

    setFriendsError(null);
    activeQueryRef.current = seedQuery;
    loadFriendsSearch(seedQuery, null, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced search (skip initial render within this effect)
  const didMountSearchRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    if (!didMountSearchRef.current) { didMountSearchRef.current = true; return; }
    const t = setTimeout(() => {
      activeQueryRef.current = q;
      loadFriendsSearch(q, null, false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, loadFriendsSearch]);

  // Reset didMount flag when modal closes so it triggers correctly on next open
  useEffect(() => {
    if (!open) didMountSearchRef.current = false;
  }, [open]);

  const toggle = (userId: string) => setPicked(p => {
    const next = new Set(p);
    if (next.has(userId)) { next.delete(userId); } else { next.add(userId); }
    return next;
  });

  const send = async () => {
    if (!resolvedLobbyId || sending || picked.size === 0) return;
    setSending(true);
    setSendError(null);
    const targets = allFriends.filter(f => picked.has(f.userId));
    try {
      await Promise.all(targets.map(f => lobbyApi.createInvite(resolvedLobbyId, { inviteeUserId: f.userId })));
      toast.push({
        kind: 'success',
        title: `Invite sent to ${targets.length} friend${targets.length === 1 ? '' : 's'}`,
        body: targets.map(f => f.displayName).join(', '),
      });
      onClose();
    } catch (e) {
      setSendError(lobbyErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const copyLink = () => {
    if (!linkToken) return;
    navigator.clipboard.writeText(`https://simple.gg/j/${linkToken}`).catch(() => {});
    toast.push({ kind: 'info', title: 'Link copied' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite friends" icon="users" size="lg" footer={
      resolvedLobbyId ? (
        <>
          {linkToken && <Button variant="ghost" icon="copy" onClick={copyLink}>Copy link</Button>}
          <div className="grow" />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={picked.size === 0 || sending} icon="send" onClick={send}>
            {sending ? 'Sending…' : `Send invite (${picked.size})`}
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={onClose}>Close</Button>
      )
    }>
      {lobbyLoading ? (
        <div className="page-sub">Loading your lobby…</div>
      ) : lobbyError ? (
        <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{lobbyError}</div>
      ) : !resolvedLobbyId ? (
        <EmptyState icon="link" title="No open lobby to invite to." body="Create a lobby first, then invite friends to it." />
      ) : (
        <div className="col" style={{ gap: 14 }}>
          {gameSlug && <div className="page-sub">Inviting to your <strong>{gameSlug}</strong> lobby.</div>}

          <label style={{ display: 'block' }}>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="label">Friends · {allFriends.length}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-lo)' }} />
              <input className="input" placeholder="Search by name…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 32 }} />
            </div>
          </label>

          <div style={{ maxHeight: 280, overflow: 'auto', borderRadius: 10, border: '1px solid var(--border-1)' }}>
            {loadingFriends ? (
              <div role="status" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--text-lo)' }}>Loading friends…</div>
            ) : friendsError ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--danger)' }}>{friendsError}</div>
            ) : allFriends.length === 0 ? (
              <EmptyState icon="users" title="No friends yet." body="Add some from the Friends page." />
            ) : (
              <>
                {allFriends.map(f => {
                  const on = picked.has(f.userId);
                  return (
                    <button
                      key={f.userId}
                      onClick={() => toggle(f.userId)}
                      className="row"
                      style={{
                        width: '100%', padding: '10px 12px', borderBottom: '1px solid var(--border-1)',
                        background: on ? 'var(--red-soft)' : 'transparent', gap: 12, textAlign: 'left',
                      }}
                    >
                      <Avatar src={f.avatarUrl} user={{ initials: f.initials, color: f.color }} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{f.displayName}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>@{f.username}</div>
                      </div>
                      {/* ELO chip hidden until M10 supplies authoritative ratings */}
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: on ? 'var(--red-500)' : 'transparent',
                        border: `1.5px solid ${on ? 'var(--red-500)' : 'var(--border-3)'}`,
                        display: 'grid', placeItems: 'center',
                      }}>
                        {on && <Icon name="check" size={12} style={{ color: '#fff' }} />}
                      </span>
                    </button>
                  );
                })}
                {friendsCursor != null && (
                  <div style={{ padding: '8px 12px', textAlign: 'center' }}>
                    <Button size="sm" variant="ghost" disabled={loadingMoreFriends} onClick={() => loadFriendsSearch(activeQuery, friendsCursor, true)}>
                      {loadingMoreFriends ? 'Loading…' : 'Load more'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {sendError && <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{sendError}</div>}
        </div>
      )}
    </Modal>
  );
}
