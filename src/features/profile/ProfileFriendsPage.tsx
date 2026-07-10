'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayerIdentity } from '@/components/identity/PlayerIdentity';
import { profileApi, type PublicIdentity } from '@/features/profile/profileApi';
import { ROUTES } from '@/lib/routes';

export function ProfileFriendsPage({ username }: { username: string }) {
  const [items, setItems] = useState<PublicIdentity[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const activeQueryRef = useRef('');

  const load = useCallback(async (q: string, cur: string | null, append: boolean) => {
    const mySeq = ++seq.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const r = await profileApi.getFriendsList(username, { query: q || undefined, cursor: cur ?? undefined, limit: 20 });
      if (mySeq !== seq.current) return;
      setItems(prev => append ? [...prev, ...r.items] : r.items);
      setCursor(r.nextCursor);
    } catch (e) {
      if (mySeq !== seq.current) return;
      setError(e instanceof ApiError ? e.message : 'Failed to load friends.');
    } finally {
      if (mySeq === seq.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [username]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load('', null, false); }, [load]);

  const onSearch = (v: string) => {
    setQuery(v);
    activeQueryRef.current = v;
    load(v, null, false);
  };

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <Link href={ROUTES.u(username)} className="row" style={{ gap: 6, color: 'var(--text-lo)', fontSize: 13, textDecoration: 'none', width: 'fit-content' }}>
          <Icon name="chevronLeft" size={14} /> Back to profile
        </Link>
        <h1 className="font-display" style={{ fontSize: 20, marginTop: 6 }}>@{username}&rsquo;s friends</h1>
      </div>

      <div style={{ position: 'relative', maxWidth: 320, marginBottom: 16 }}>
        <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-lo)' }} />
        <input
          className="input"
          style={{ paddingLeft: 30 }}
          placeholder="Search friends…"
          value={query}
          onChange={e => onSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Loading…</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
          <Button size="sm" variant="ghost" onClick={() => load(activeQueryRef.current, null, false)}>Retry</Button>
        </div>
      ) : !items.length ? (
        <EmptyState
          icon="users"
          title="No friends found"
          body={query ? 'Try a different search.' : "This user's friends list is empty or not visible to you."}
        />
      ) : (
        <div className="col" style={{ gap: 2 }}>
          {items.map(f => (
            <div key={f.userId} className="friend-row">
              <PlayerIdentity player={f} />
            </div>
          ))}
          {cursor && (
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <Button size="sm" variant="ghost" disabled={loadingMore} onClick={() => load(activeQueryRef.current, cursor, true)}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
