'use client';
import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { peopleApi } from '@/features/people/peopleApi';
import type { PeopleSearchResultDto } from '@/features/people/types';
import { ROUTES } from '@/lib/routes';

const RESULT_LIMIT = 8;
const DEBOUNCE_MS = 300;

/**
 * Accessible topbar people-search combobox (WAI-ARIA combobox pattern: activedescendant, not
 * roving focus — focus stays on the input the whole time). Shows at most 8 first-page results plus a
 * "See all people results" row that always routes to the full /search page.
 */
export function PeopleSearchCombobox({ autoFocus, onNavigate }: { autoFocus?: boolean; onNavigate?: () => void }) {
  const id = useId();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PeopleSearchResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const hasQuery = query.trim().length > 0;
  const rowCount = results.length + (hasQuery ? 1 : 0); // +1 for the "See all" row
  const seeAllIndex = results.length;

  const runSearch = useCallback((q: string) => {
    const mySeq = ++seq.current;
    setLoading(true);
    peopleApi.search(q, { limit: RESULT_LIMIT })
      .then(r => {
        if (mySeq !== seq.current) return;
        setResults(r.items);
        setLoading(false);
      })
      .catch(() => {
        if (mySeq !== seq.current) return;
        setResults([]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      seq.current++; // invalidate any in-flight request
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query.trim()), DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, runSearch]);

  const close = () => { setOpen(false); setActiveIndex(-1); };

  const goToProfile = (username: string) => {
    close();
    setQuery('');
    onNavigate?.();
    router.push(ROUTES.u(username));
  };

  const goToSeeAll = () => {
    const q = query.trim();
    close();
    onNavigate?.();
    router.push(ROUTES.search({ type: 'people', q }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (!hasQuery) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, rowCount - 1));
    } else if (e.key === 'ArrowUp') {
      if (!hasQuery) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (!hasQuery) return;
      e.preventDefault();
      if (activeIndex === seeAllIndex || activeIndex === -1) {
        goToSeeAll();
      } else if (activeIndex >= 0 && activeIndex < results.length) {
        goToProfile(results[activeIndex].username);
      }
    } else if (e.key === 'Escape') {
      if (open) { e.preventDefault(); close(); } else { setQuery(''); }
    }
  };

  const statusMessage = !hasQuery
    ? ''
    : loading
      ? 'Searching…'
      : results.length === 0
        ? 'No people found.'
        : `${results.length} result${results.length === 1 ? '' : 's'}.`;

  const listboxId = `${id}-listbox`;
  const activeDescendant =
    activeIndex === -1 ? undefined
    : activeIndex === seeAllIndex ? `${id}-see-all`
    : `${id}-option-${activeIndex}`;

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-lo)' }} />
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        className="input"
        style={{ paddingLeft: 34, paddingRight: query ? 30 : undefined }}
        placeholder="Search people…"
        role="combobox"
        aria-expanded={open && hasQuery}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        aria-label="Search people"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIndex(-1); }}
        onFocus={() => { if (hasQuery) setOpen(true); }}
        onBlur={() => setTimeout(close, 150)}
        onKeyDown={onKeyDown}
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setQuery(''); setResults([]); close(); inputRef.current?.focus(); }}
          style={{
            position: 'absolute', right: 8, top: 7, width: 24, height: 24, display: 'grid', placeItems: 'center',
            background: 'transparent', border: 'none', color: 'var(--text-lo)', cursor: 'pointer',
          }}
        >
          <Icon name="x" size={13} />
        </button>
      )}
      {!query && <span className="chip chip--mono" style={{ position: 'absolute', right: 8, top: 7, height: 24, fontSize: 10, pointerEvents: 'none' }}>⌘ K</span>}

      <div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>

      {open && hasQuery && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="People search results"
          className="card-elev"
          style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 40, padding: 6, maxHeight: 380, overflow: 'auto' }}
        >
          {loading && results.length === 0 ? (
            <div style={{ padding: '10px 8px', fontSize: 12.5, color: 'var(--text-lo)' }}>Searching…</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '10px 8px', fontSize: 12.5, color: 'var(--text-lo)' }}>No people found.</div>
          ) : (
            results.map((r, i) => (
              <div
                key={r.userId}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={e => e.preventDefault()}
                onClick={() => goToProfile(r.username)}
                onMouseEnter={() => setActiveIndex(i)}
                className="row"
                style={{
                  gap: 10, padding: '8px', borderRadius: 8, cursor: 'pointer',
                  background: i === activeIndex ? 'var(--bg-tint)' : 'transparent',
                }}
              >
                <Avatar src={r.avatarUrl} user={{ initials: r.initials, color: r.color }} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.displayName}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>
                    @{r.username}
                    {r.visibleMutualFriendCount > 0 && ` · ${r.visibleMutualFriendCount} mutual`}
                  </div>
                </div>
              </div>
            ))
          )}
          <div
            id={`${id}-see-all`}
            role="option"
            aria-selected={activeIndex === seeAllIndex}
            onMouseDown={e => e.preventDefault()}
            onClick={goToSeeAll}
            onMouseEnter={() => setActiveIndex(seeAllIndex)}
            className="row between"
            style={{
              gap: 8, padding: '9px 8px', borderRadius: 8, cursor: 'pointer', marginTop: results.length ? 4 : 0,
              borderTop: results.length ? '1px solid var(--border-1)' : undefined,
              background: activeIndex === seeAllIndex ? 'var(--bg-tint)' : 'transparent',
              fontSize: 12.5, fontWeight: 500, color: 'var(--ice-400)',
            }}
          >
            See all people results for &ldquo;{query.trim()}&rdquo;
            <Icon name="chevronRight" size={13} />
          </div>
        </div>
      )}
    </div>
  );
}
