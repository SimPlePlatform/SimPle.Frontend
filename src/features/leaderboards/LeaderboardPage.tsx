'use client';
import React, { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icons';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { CURRENT_USER, PALETTE } from '@/mock/users';
import { LEADERBOARD_GLOBAL } from '@/mock/leaderboards';
import type { LeaderboardRow } from '@/types';

export function LeaderboardPage() {
  const [scope, setScope] = useState('global');
  const [game, setGame] = useState('all');

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Leaderboards</div>
          <div className="page-sub">Season 4 · 32 days remaining · prize pool: real bragging rights</div>
        </div>
        <Tabs
          value={scope}
          onChange={setScope}
          items={[
            { value: 'global',  label: 'Global',  icon: 'globe' },
            { value: 'friends', label: 'Friends', icon: 'users' },
          ]}
        />
      </div>

      <div className="grid grid-3" style={{ marginTop: 22 }}>
        <StatCard label="Your rank"  value="#142"   hint="of 18,402"   icon="trophy" />
        <StatCard label="To next tier" value="68 ELO" hint="Diamond II" icon="trendingUp" accent="ice" />
        <StatCard label="Best season" value="Master" hint="Season 2"   icon="crown" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, marginTop: 24 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="row between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
            <Tabs
              value={game}
              onChange={setGame}
              items={[
                { value: 'all',    label: 'All games' },
                { value: 'chess',  label: 'Chess Lite' },
                { value: 'sudoku', label: 'Sudoku' },
                { value: 'tetris', label: 'Tetris' },
              ]}
            />
            <Button size="sm" variant="ghost" icon="refresh">Refresh</Button>
          </div>
          <div className="row" style={{ padding: '10px 18px' }}>
            <div className="uppercase-label" style={{ width: 60 }}>Rank</div>
            <div className="uppercase-label" style={{ flex: 1 }}>Player</div>
            <div className="uppercase-label" style={{ width: 80 }}>Region</div>
            <div className="uppercase-label" style={{ width: 100, textAlign: 'right' }}>ELO</div>
            <div className="uppercase-label" style={{ width: 80, textAlign: 'right' }}>7d</div>
          </div>
          {LEADERBOARD_GLOBAL.map(r => <LBRow key={r.rank} row={r} />)}
          <div style={{ padding: '12px 18px', borderTop: '1px dashed var(--border-2)', background: 'var(--red-soft)' }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <div className="mono" style={{ width: 60, fontWeight: 700, color: 'var(--red-400)' }}>#142</div>
              <div className="row" style={{ flex: 1, gap: 10 }}>
                <Avatar user={CURRENT_USER} size="sm" />
                <span style={{ fontWeight: 600 }}>You · {CURRENT_USER.display}</span>
              </div>
              <div className="mono" style={{ width: 80, color: 'var(--text-md)' }}>NL</div>
              <div className="mono" style={{ width: 100, textAlign: 'right', fontWeight: 700 }}>1,842</div>
              <div className="mono" style={{ width: 80, textAlign: 'right', color: 'var(--success)' }}>+18</div>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <SeasonCard />
          <TierRewardsCard />
        </div>
      </div>
    </div>
  );
}

function LBRow({ row }: { row: LeaderboardRow }) {
  const medals = ['#F59E0B', '#94A3B8', '#B45309'];
  const medal = row.rank <= 3 ? medals[row.rank - 1] : null;
  return (
    <div className="row" style={{ padding: '10px 18px', borderTop: '1px solid var(--border-1)' }}>
      <div className="mono" style={{ width: 60, fontWeight: 600, color: medal ?? 'var(--text-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
        {medal && <Icon name="crown" size={14} />}
        #{row.rank}
      </div>
      <div className="row" style={{ flex: 1, gap: 10 }}>
        <Avatar user={{ initials: row.name.split(' ').map(s => s[0]).slice(0, 2).join(''), color: PALETTE[row.rank % 8] }} size="sm" />
        <span style={{ fontWeight: 600 }}>{row.name}</span>
      </div>
      <div className="mono" style={{ width: 80, color: 'var(--text-md)' }}>{row.country}</div>
      <div className="mono" style={{ width: 100, textAlign: 'right', fontWeight: 600 }}>{row.elo.toLocaleString()}</div>
      <div className="mono" style={{ width: 80, textAlign: 'right', color: row.trend.startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>{row.trend}</div>
    </div>
  );
}

function SeasonCard() {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row" style={{ gap: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--red-soft)', color: 'var(--red-400)', display: 'grid', placeItems: 'center' }}>
          <Icon name="flame" size={14} />
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Season 4 · &ldquo;Cipher&rdquo;</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>32 days remaining</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div className="bar"><div className="bar__fill" style={{ width: '42%' }} /></div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Diamond III · 1842</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Master · 2200</span>
        </div>
      </div>
    </div>
  );
}

function TierRewardsCard() {
  const tiers = [
    { name: 'Diamond II',  elo: '≥ 1910', reward: 'Avatar frame' },
    { name: 'Master',      elo: '≥ 2200', reward: 'Animated badge' },
    { name: 'Grandmaster', elo: '≥ 2500', reward: 'Title + frame' },
  ];
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Next rewards</div>
      <div className="col" style={{ marginTop: 12, gap: 8 }}>
        {tiers.map(t => (
          <div key={t.name} className="surface row" style={{ padding: 12, gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--bg-4)', color: 'var(--text-lo)', display: 'grid', placeItems: 'center' }}>
              <Icon name="crown" size={14} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{t.reward}</div>
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{t.elo}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
