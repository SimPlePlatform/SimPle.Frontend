'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs } from '@/components/ui/Tabs';
import { GAMES } from '@/mock/games';
import { ROUTES } from '@/lib/routes';
import type { Game } from '@/types';

const FILTERS = ['All', 'Multiplayer', 'Solo vs AI', 'Strategy', 'Puzzle', 'Quick Match'];

export function LibraryPage() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');

  let games = GAMES;
  if (filter !== 'All') {
    if (filter === 'Solo vs AI') games = games.filter(g => g.solo);
    else games = games.filter(g => g.cats.includes(filter));
  }
  if (q) games = games.filter(g => g.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Game Library</div>
          <div className="page-sub">{GAMES.length} games · 6,432 players online right now</div>
        </div>
        <div style={{ position: 'relative', width: 'min(100%, 280px)' }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-lo)' }} />
          <input
            className="input"
            placeholder="Search games…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      <div className="row mobile-wrap" style={{ marginTop: 22, gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Tabs
          value={filter}
          onChange={setFilter}
          items={FILTERS.map(f => ({ value: f, label: f, count: f === 'All' ? GAMES.length : undefined }))}
        />
        <div className="row mobile-actions" style={{ gap: 8 }}>
          <Button size="sm" variant="ghost" icon="filter">More filters</Button>
          <Button size="sm" variant="ghost" icon="list">Sort: Popular</Button>
        </div>
      </div>

      <FeaturedBanner onEnter={() => router.push(ROUTES.game(GAMES[3].id))} />

      {games.length === 0 ? (
        <EmptyState
          icon="search"
          title="No games match that filter."
          body="Try clearing your search or browsing all categories."
          action={<Button onClick={() => { setQ(''); setFilter('All'); }}>Reset filters</Button>}
        />
      ) : (
        <div className="grid grid-3" style={{ marginTop: 20 }}>
          {games.map(g => (
            <LibraryCard key={g.id} game={g} onClick={() => router.push(ROUTES.game(g.id))} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedBanner({ onEnter }: { onEnter: () => void }) {
  const g = GAMES[3];
  return (
    <div className="card-elev responsive-split" style={{ marginTop: 20, padding: 0, overflow: 'hidden', gridTemplateColumns: '1fr 1fr', minHeight: 200 }}>
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span className="chip chip--red chip--mono" style={{ alignSelf: 'flex-start' }}>
          <Icon name="sparkle" size={12} /> Spotlight
        </span>
        <div className="font-display" style={{ fontSize: 28, fontWeight: 600, marginTop: 14 }}>Chess Lite · Blitz Season</div>
        <p style={{ marginTop: 8, maxWidth: 380 }}>3-minute blitz with bullet endings. Climb a dedicated ladder for the next 4 weeks.</p>
        <div className="row mobile-actions" style={{ gap: 8, marginTop: 18 }}>
          <Button onClick={onEnter}>Enter event</Button>
          <Button variant="ghost">Read rules</Button>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <GameArt game={g} h="100%" />
      </div>
    </div>
  );
}

function LibraryCard({ game, onClick }: { game: Game; onClick: () => void }) {
  const diffClass = game.difficulty === 'Easy' ? 'chip--success' : game.difficulty === 'Hard' ? 'chip--red' : 'chip--warn';
  return (
    <div className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={onClick}>
      <GameArt game={game} h={170} />
      <div style={{ padding: 16 }}>
        <div className="row between">
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>{game.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{game.tag}</div>
          </div>
          <span className={`chip chip--mono ${diffClass}`}>{game.difficulty}</span>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <span className="chip">
            <Icon name="users" size={12} />
            {' '}{game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`}
          </span>
          <span className="chip"><Icon name="clock" size={12} /> {game.duration}</span>
          {game.solo && <span className="chip"><Icon name="ai" size={12} /> AI</span>}
        </div>
        <div className="row between" style={{ marginTop: 14 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>
            <span className="dot dot--online" style={{ width: 6, height: 6, marginRight: 6, boxShadow: 'none', display: 'inline-block' }} />
            {game.online.toLocaleString()} online
          </span>
          <Button size="sm" icon="play">Play</Button>
        </div>
      </div>
    </div>
  );
}
