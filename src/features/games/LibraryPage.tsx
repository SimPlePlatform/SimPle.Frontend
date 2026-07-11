'use client';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { EmptyState, Skeleton } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { ROUTES } from '@/lib/routes';
import { ApiError } from '@/lib/api-client';
import { gamesApi } from '@/features/games/gamesApi';
import { GAME_SORTS, type GameCatalogDto, type GameSort } from '@/features/games/types';

const FILTERS = ['All', 'Multiplayer', 'Solo vs AI', 'Strategy', 'Puzzle', 'Quick Match'] as const;
type Filter = typeof FILTERS[number];

// Allow-listed tags not already covered by a primary filter tab above.
const EXTRA_TAGS = ['logic', 'arcade', 'reaction', 'classic', 'vocabulary', 'memory'];

const SORT_LABELS: Record<GameSort, string> = {
  default: 'Featured', name: 'Name', difficulty: 'Difficulty', duration: 'Duration',
};

function filterParams(filter: Filter): { category?: string[]; mode?: string[] } {
  switch (filter) {
    case 'Multiplayer': return { mode: ['multiplayer'] };
    case 'Solo vs AI': return { mode: ['ai'] };
    case 'Strategy': return { category: ['strategy'] };
    case 'Puzzle': return { category: ['puzzle'] };
    case 'Quick Match': return { mode: ['quick-match'] };
    default: return {};
  }
}

function nextSort(s: GameSort): GameSort {
  return GAME_SORTS[(GAME_SORTS.indexOf(s) + 1) % GAME_SORTS.length];
}

function titleCase(s: string) {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function subtitleFor(g: GameCatalogDto): string {
  const parts = [titleCase(g.category)];
  const extraTag = g.tags.find(t => t !== g.category);
  if (extraTag) parts.push(titleCase(extraTag));
  return parts.join(' · ');
}

function formatDuration(g: GameCatalogDto): string {
  return g.estimatedDurationMinMinutes === g.estimatedDurationMaxMinutes
    ? `${g.estimatedDurationMinMinutes} min`
    : `${g.estimatedDurationMinMinutes}–${g.estimatedDurationMaxMinutes} min`;
}

export function LibraryPage({ initialQuery = '' }: { initialQuery?: string }) {
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState(initialQuery);
  const [tags, setTags] = useState<string[]>([]);
  const [sort, setSort] = useState<GameSort>('default');
  const [retryTick, setRetryTick] = useState(0);

  const [games, setGames] = useState<GameCatalogDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featured, setFeatured] = useState<GameCatalogDto | undefined>(undefined);

  const seq = useRef(0);

  useEffect(() => {
    gamesApi.getFeatured().then(setFeatured).catch(() => setFeatured(undefined));
  }, []);

  useEffect(() => {
    const mySeq = ++seq.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      const { category, mode } = filterParams(filter);
      gamesApi.list({ query: query || undefined, category, mode, tag: tags.length ? tags : undefined, sort, limit: 24 })
        .then(page => {
          if (seq.current !== mySeq) return;
          setGames(page.items);
          setCursor(page.nextCursor);
        })
        .catch(e => {
          if (seq.current !== mySeq) return;
          setError(e instanceof ApiError ? e.message : 'Failed to load games.');
        })
        .finally(() => {
          if (seq.current !== mySeq) return;
          setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, query, tags, sort, retryTick]);

  function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    const { category, mode } = filterParams(filter);
    gamesApi.list({ query: query || undefined, category, mode, tag: tags.length ? tags : undefined, sort, limit: 24, cursor })
      .then(page => {
        setGames(g => [...g, ...page.items]);
        setCursor(page.nextCursor);
      })
      .catch(e => setError(e instanceof ApiError ? e.message : 'Failed to load games.'))
      .finally(() => setLoadingMore(false));
  }

  const hasActiveFilter = filter !== 'All' || query.length > 0 || tags.length > 0;

  function resetFilters() {
    setFilter('All');
    setQuery('');
    setTags([]);
  }

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Game Library</div>
          <div className="page-sub">Browse, filter, and favorite games.</div>
        </div>
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-lo)' }} />
          <input
            className="input"
            placeholder="Search games…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Tabs value={filter} onChange={v => setFilter(v as Filter)} items={FILTERS.map(f => ({ value: f, label: f }))} />
        <div className="row" style={{ gap: 8 }}>
          <MoreFiltersMenu selected={tags} onChange={setTags} />
          <Button size="sm" variant="ghost" icon="list" onClick={() => setSort(nextSort(sort))}>
            Sort: {SORT_LABELS[sort]}
          </Button>
        </div>
      </div>

      {featured && <FeaturedBanner game={featured} />}

      <div role="status" aria-live="polite" className="sr-only">
        {!loading && !error ? `${games.length} game${games.length === 1 ? '' : 's'} found.` : ''}
      </div>

      {loading ? (
        <div className="grid grid-3" style={{ marginTop: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={260} />)}
        </div>
      ) : error ? (
        <EmptyState
          icon="signal"
          title="Couldn't load games."
          body={error}
          action={<Button icon="refresh" onClick={() => setRetryTick(t => t + 1)}>Retry</Button>}
        />
      ) : games.length === 0 ? (
        hasActiveFilter ? (
          <EmptyState
            icon="search"
            title="No games match that filter."
            body="Try clearing your search or browsing all categories."
            action={<Button onClick={resetFilters}>Reset filters</Button>}
          />
        ) : (
          <EmptyState icon="library" title="No games available yet." body="Check back soon." />
        )
      ) : (
        <>
          <div className="grid grid-3" style={{ marginTop: 20 }}>
            {games.map(g => <LibraryCard key={g.slug} game={g} />)}
          </div>
          {cursor && (
            <div className="row" style={{ justifyContent: 'center', marginTop: 20 }}>
              <Button variant="ghost" onClick={loadMore} disabled={loadingMore} aria-disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MoreFiltersMenu({ selected, onChange }: { selected: string[]; onChange: (tags: string[]) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Button size="sm" variant="ghost" icon="filter" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        More filters{selected.length > 0 ? ` (${selected.length})` : ''}
      </Button>
      {open && (
        <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, padding: 12, zIndex: 10, minWidth: 180 }}>
          {EXTRA_TAGS.map(tag => (
            <label key={tag} className="row" style={{ gap: 8, padding: '6px 4px', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(tag)}
                onChange={e => onChange(e.target.checked ? [...selected, tag] : selected.filter(t => t !== tag))}
              />
              {titleCase(tag)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedBanner({ game }: { game: GameCatalogDto }) {
  const router = useRouter();
  return (
    <div className="card-elev" style={{ marginTop: 20, padding: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 200 }}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="chip chip--red chip--mono" style={{ alignSelf: 'flex-start' }}>
          <Icon name="sparkle" size={12} /> Spotlight
        </span>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, marginTop: 14 }}>{game.name}</div>
        <p style={{ marginTop: 8, maxWidth: 380 }}>{game.summary}</p>
        <div className="row" style={{ gap: 8, marginTop: 18 }}>
          <Button onClick={() => router.push(ROUTES.game(game.slug))}>View details</Button>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <GameArt game={game} subtitle={subtitleFor(game)} h="100%" />
      </div>
    </div>
  );
}

function LibraryCard({ game }: { game: GameCatalogDto }) {
  const diffClass = game.difficulty === 'Easy' ? 'chip--success' : game.difficulty === 'Hard' ? 'chip--red' : 'chip--warn';
  const subtitle = subtitleFor(game);
  return (
    <Link href={ROUTES.game(game.slug)} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ overflow: 'hidden' }}>
        <GameArt game={game} subtitle={subtitle} h={170} />
        <div style={{ padding: 16 }}>
          <div className="row between">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{game.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{subtitle}</div>
            </div>
            <span className={`chip chip--mono ${diffClass}`}>{game.difficulty}</span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="chip">
              <Icon name="users" size={12} />
              {' '}{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}
            </span>
            <span className="chip"><Icon name="clock" size={12} /> {formatDuration(game)}</span>
            {game.capabilities.includes('ai') && <span className="chip"><Icon name="ai" size={12} /> AI</span>}
          </div>
          {game.lifecycle !== 'Available' && (
            <div className="row" style={{ marginTop: 14 }}>
              <span className="chip chip--mono">{game.lifecycle === 'ComingSoon' ? 'Coming soon' : game.lifecycle}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
