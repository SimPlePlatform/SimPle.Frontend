'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { GAMES } from '@/mock/games';
import { friendsApi } from '@/features/friends/friendsApi';
import type { FriendDto } from '@/features/friends/types';

interface Props {
  open: boolean;
  onClose: () => void;
  preselectedGameId?: string;
}

export function InviteFriendModal({ open, onClose, preselectedGameId }: Props) {
  const toast = useToast();

  const [q, setQ]       = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [game, setGame] = useState(preselectedGameId ?? GAMES[3].id);

  const [allFriends, setAllFriends]           = useState<FriendDto[]>([]);
  const [friendsCursor, setFriendsCursor]     = useState<string | null>(null);
  const [loadingFriends, setLoadingFriends]   = useState(false);
  const [loadingMoreFriends, setLoadingMoreFriends] = useState(false);
  const [friendsError, setFriendsError]       = useState<string | null>(null);
  const friendsSeq    = useRef(0);
  const activeQueryRef = useRef('');
  const [activeQuery, setActiveQuery] = useState('');

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

  // Reset and initial load when modal opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQ('');
     
    setPicked(new Set());
     
    setAllFriends([]);
     
    setFriendsError(null);
    activeQueryRef.current = '';
    if (preselectedGameId) setGame(preselectedGameId);
    loadFriendsSearch('', null, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preselectedGameId]);

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

  const send = () => {
    const g = GAMES.find(x => x.id === game);
    const pickedFriends = allFriends.filter(f => picked.has(f.userId));
    const names = pickedFriends.map(f => f.displayName).join(', ');
    toast.push({ kind: 'success', title: `Invite sent to ${picked.size} friend${picked.size === 1 ? '' : 's'}`, body: `${g?.name} · ${names}` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite friends" icon="users" size="lg" footer={
      <>
        <Button variant="ghost" icon="copy" onClick={() => toast.push({ kind: 'info', title: 'Link copied', body: 'https://simple.gg/j/SP-7F-29' })}>Copy link</Button>
        <div className="grow" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={picked.size === 0} icon="send" onClick={send}>Send invite ({picked.size})</Button>
      </>
    }>
      <div className="col" style={{ gap: 14 }}>
        <label style={{ display: 'block' }}>
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="label">Game</span>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            {GAMES.slice(0, 6).map(g => (
              <button key={g.id} onClick={() => setGame(g.id)} className="chip" style={{
                cursor: 'pointer', height: 30,
                background:  game === g.id ? 'var(--red-soft)'            : undefined,
                color:       game === g.id ? 'var(--red-400)'             : undefined,
                borderColor: game === g.id ? 'rgba(240,57,75,0.3)'        : undefined,
              }}>{g.name}</button>
            ))}
          </div>
        </label>

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
      </div>
    </Modal>
  );
}
