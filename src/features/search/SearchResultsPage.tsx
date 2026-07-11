'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { PlayerIdentity } from '@/components/identity/PlayerIdentity';
import { GameArt } from '@/components/ui/GameArt';
import { peopleApi } from '@/features/people/peopleApi';
import type { PeopleSearchResultDto } from '@/features/people/types';
import { gamesApi } from '@/features/games/gamesApi';
import type { GameCatalogDto } from '@/features/games/types';
import { ROUTES } from '@/lib/routes';

type SearchTab = 'people' | 'games' | 'lobbies';

const RELATIONSHIP_LABEL: Record<PeopleSearchResultDto['relationshipState'], string | null> = {
  None: null,
  Friends: 'Friends',
  IncomingPending: 'Wants to be friends',
  OutgoingPending: 'Request sent',
};

function titleCase(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function subtitleFor(g: GameCatalogDto): string {
  const parts = [titleCase(g.category)];
  const extraTag = g.tags.find(t => t !== g.category);
  if (extraTag) parts.push(titleCase(extraTag));
  return parts.join(' · ');
}

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

  const [gameItems, setGameItems] = useState<GameCatalogDto[]>([]);
  const [gameCursor, setGameCursor] = useState<string | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameLoadingMore, setGameLoadingMore] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [gameSearched, setGameSearched] = useState(false);

  const seq = useRef(0);
  const gameSeq = useRef(0);
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

  const loadGames = useCallback(async (q: string, cur: string | null, append: boolean) => {
    const trimmed = q.trim();
    if (!trimmed) {
      gameSeq.current++;
      setGameItems([]);
      setGameCursor(null);
      setGameSearched(false);
      setGameLoading(false);
      return;
    }
    const mySeq = ++gameSeq.current;
    if (append) setGameLoadingMore(true); else setGameLoading(true);
    setGameError(null);
    try {
      const r = await gamesApi.list({ query: trimmed, limit: 20, cursor: cur ?? undefined });
      if (mySeq !== gameSeq.current) return;
      setGameItems(prev => append ? [...prev, ...r.items] : r.items);
      setGameCursor(r.nextCursor);
      setGameSearched(true);
    } catch (e) {
      if (mySeq !== gameSeq.current) return;
      setGameError(e instanceof ApiError ? e.message : 'Failed to search games.');
    } finally {
      if (mySeq === gameSeq.current) { setGameLoading(false); setGameLoadingMore(false); }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (initialType === 'games') loadGames(initialQuery, null, false);
    else load(initialQuery, null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (tab === 'lobbies') return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.replace(ROUTES.search({ type: tab, q: query.trim() }));
      if (tab === 'games') loadGames(query, null, false);
      else load(query, null, false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab]);

  const searchPlaceholder = tab === 'games' ? 'Search games…' : 'Search people…';
  const searchLabel = tab === 'games' ? 'Search games' : 'Search people';

  return (
    <div className="page">
      <div className="page-title">Search</div>
      <div className="page-sub">Find players by username or display name, or browse games.</div>

      <div style={{ position: 'relative', maxWidth: 420, marginTop: 16, marginBottom: 4 }}>
        <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-lo)' }} />
        <input
          className="input"
          style={{ paddingLeft: 30 }}
          placeholder={searchPlaceholder}
          aria-label={searchLabel}
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
        {tab === 'lobbies' && (
          <EmptyState icon="network" title="Public lobby search unavailable" body="Available in Module 6." />
        )}
        {tab === 'games' && (
          gameLoading && gameItems.length === 0 ? (
            <div role="status" style={{ textAlign: 'center', padding: 32, color: 'var(--text-lo)' }}>Searching…</div>
          ) : gameError ? (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ color: 'var(--danger)', marginBottom: 8 }}>{gameError}</p>
              <Button size="sm" variant="ghost" onClick={() => loadGames(query, null, false)}>Retry</Button>
            </div>
          ) : !query.trim() ? (
            <EmptyState icon="controller" title="Search for games" body="Type a game name above." />
          ) : gameSearched && gameItems.length === 0 ? (
            <EmptyState icon="search" title="No games found" body={`No results for "${query.trim()}".`} />
          ) : (
            <div className="col" style={{ gap: 2 }}>
              <div role="status" aria-live="polite" className="sr-only">
                {gameSearched ? `${gameItems.length} result${gameItems.length === 1 ? '' : 's'} for ${query.trim()}.` : ''}
              </div>
              {gameSearched && gameItems.length > 0 && (
                <div style={{ textAlign: 'right', marginBottom: 4 }}>
                  <Link
                    href={`/games?query=${encodeURIComponent(query.trim())}`}
                    className="btn btn-ghost btn-sm"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    See all games <Icon name="chevronRight" size={14} />
                  </Link>
                </div>
              )}
              {gameItems.map(g => <GameSearchRow key={g.slug} game={g} />)}
              {gameCursor && (
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <Button size="sm" variant="ghost" disabled={gameLoadingMore} onClick={() => loadGames(query, gameCursor, true)}>
                    {gameLoadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </div>
          )
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

function GameSearchRow({ game }: { game: GameCatalogDto }) {
  return (
    <Link href={ROUTES.game(game.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="friend-row">
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
            <GameArt game={game} h={44} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 13.5 }}>{game.name}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{subtitleFor(game)}</div>
          </div>
          <span className="chip chip--mono">{game.difficulty}</span>
        </div>
      </div>
    </Link>
  );
}
