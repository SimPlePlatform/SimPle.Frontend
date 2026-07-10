'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayerIdentity } from '@/components/identity/PlayerIdentity';
import { peopleApi } from '@/features/people/peopleApi';
import type { PeopleSearchResultDto } from '@/features/people/types';
import { ROUTES } from '@/lib/routes';

type SearchTab = 'people' | 'games' | 'lobbies';

const RELATIONSHIP_LABEL: Record<PeopleSearchResultDto['relationshipState'], string | null> = {
  None: null,
  Friends: 'Friends',
  IncomingPending: 'Wants to be friends',
  OutgoingPending: 'Request sent',
};

export function SearchResultsPage({ initialQuery, initialType }: { initialQuery: string; initialType: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<SearchTab>(initialType === 'games' || initialType === 'lobbies' ? initialType : 'people');
  const [query, setQuery] = useState(initialQuery);

  const [items, setItems] = useState<PeopleSearchResultDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const seq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didMount = useRef(false);

  const load = useCallback(async (q: string, cur: string | null, append: boolean) => {
    const trimmed = q.trim();
    if (!trimmed) {
      seq.current++;
      setItems([]);
      setCursor(null);
      setSearched(false);
      setLoading(false);
      return;
    }
    const mySeq = ++seq.current;
    if (append) setLoadingMore(true); else setLoading(true);
    setError(null);
    try {
      const r = await peopleApi.search(trimmed, { cursor: cur ?? undefined, limit: 20 });
      if (mySeq !== seq.current) return;
      setItems(prev => append ? [...prev, ...r.items] : r.items);
      setCursor(r.nextCursor);
      setSearched(true);
    } catch (e) {
      if (mySeq !== seq.current) return;
      setError(e instanceof ApiError ? e.message : 'Failed to search people.');
    } finally {
      if (mySeq === seq.current) { setLoading(false); setLoadingMore(false); }
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(initialQuery, null, false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(ROUTES.search({ type: 'people', q: query.trim() }));
      load(query, null, false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div className="page">
      <div className="page-title">Search</div>
      <div className="page-sub">Find players by username or display name.</div>

      <div style={{ position: 'relative', maxWidth: 420, marginTop: 16, marginBottom: 4 }}>
        <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-lo)' }} />
        <input
          className="input"
          style={{ paddingLeft: 30 }}
          placeholder="Search people…"
          aria-label="Search people"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Tabs
          value={tab}
          onChange={v => setTab(v as SearchTab)}
          items={[
            { value: 'people', label: 'People', icon: 'users' },
            { value: 'games', label: 'Games', icon: 'controller' },
            { value: 'lobbies', label: 'Public Lobbies', icon: 'network' },
          ]}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'games' && (
          <EmptyState icon="controller" title="Game search unavailable" body="Available in Module 4." />
        )}
        {tab === 'lobbies' && (
          <EmptyState icon="network" title="Public lobby search unavailable" body="Available in Module 6." />
        )}
        {tab === 'people' && (
          loading && items.length === 0 ? (
            <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Searching…</div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{error}</p>
              <Button size="sm" variant="ghost" onClick={() => load(query, null, false)}>Retry</Button>
            </div>
          ) : !query.trim() ? (
            <EmptyState icon="search" title="Search for people" body="Type a username or display name above." />
          ) : searched && items.length === 0 ? (
            <EmptyState icon="search" title="No people found" body={`No results for "${query.trim()}".`} />
          ) : (
            <div className="col" style={{ gap: 2 }}>
              <div role="status" aria-live="polite" className="sr-only">
                {searched ? `${items.length} result${items.length === 1 ? '' : 's'} for ${query.trim()}.` : ''}
              </div>
              {items.map(r => {
                const relLabel = RELATIONSHIP_LABEL[r.relationshipState];
                return (
                  <div key={r.userId} className="friend-row">
                    <PlayerIdentity
                      player={r}
                      subtitle={
                        <span>
                          @{r.username}
                          {r.visibleMutualFriendCount > 0 && ` · ${r.visibleMutualFriendCount} mutual`}
                          {relLabel && ` · ${relLabel}`}
                        </span>
                      }
                    />
                  </div>
                );
              })}
              {cursor && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button size="sm" variant="ghost" disabled={loadingMore} onClick={() => load(query, cursor, true)}>
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
