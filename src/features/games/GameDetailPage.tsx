'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { StatCard } from '@/components/ui/StatCard';
import { Tabs } from '@/components/ui/Tabs';
import { InviteFriendModal } from '@/components/friends/InviteFriendModal';
import { GAMES } from '@/mock/games';
import { FRIENDS } from '@/mock/friends';
import { PALETTE } from '@/mock/users';
import { ROUTES } from '@/lib/routes';
import type { Game } from '@/types';

export function GameDetailPage({ gameId }: { gameId: string }) {
  const router = useRouter();
  const game = GAMES.find(g => g.id === gameId) ?? GAMES[0];
  const [tab, setTab] = useState('overview');
  const [aiLevel, setAiLevel] = useState(game.aiLevels[1]);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="page">
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => router.push(ROUTES.games)}
        style={{ alignSelf: 'flex-start' }}
      >
        <Icon name="chevronLeft" size={14} /> Game library
      </button>

      <div className="responsive-split" style={{ gridTemplateColumns: '1.4fr 1fr', marginTop: 18 }}>
        <div className="card-elev" style={{ padding: 0, overflow: 'hidden' }}>
          <GameArt game={game} h={260} />
          <div style={{ padding: 22 }}>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="font-display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{game.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-lo)', marginTop: 4 }}>{game.tag}</div>
              </div>
              <div className="row mobile-wrap" style={{ gap: 6, flexWrap: 'wrap' }}>
                {game.cats.map(c => <span key={c} className="chip">{c}</span>)}
              </div>
            </div>

            <div className="row mobile-wrap" style={{ gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
              <InlineStat label="Players" value={`${game.minPlayers}–${game.maxPlayers}`} icon="users" />
              <InlineStat label="Duration" value={game.duration} icon="clock" />
              <InlineStat label="Difficulty" value={game.difficulty} icon="signal" />
              <InlineStat label="Online" value={game.online.toLocaleString()} icon="globe" />
            </div>

            <div style={{ marginTop: 22 }}>
              <Tabs
                value={tab}
                onChange={setTab}
                items={[
                  { value: 'overview', label: 'Overview' },
                  { value: 'rules', label: 'Rules' },
                  { value: 'stats', label: 'Your stats' },
                  { value: 'leader', label: 'Leaderboard' },
                ]}
              />
              <div style={{ marginTop: 14 }}>
                {tab === 'overview' && <OverviewTab game={game} />}
                {tab === 'rules'    && <RulesTab game={game} />}
                {tab === 'stats'    && <YourStatsTab />}
                {tab === 'leader'   && <FriendLeaderboardTab />}
              </div>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card-elev" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Start a match</div>
            <div className="page-sub">Choose a mode</div>
            <div className="col" style={{ marginTop: 16, gap: 10 }}>
              <ActionButton
                color="#F0394B" icon="play"
                title="Play vs AI" sub={`Difficulty · ${aiLevel}`}
                onClick={() => router.push(ROUTES.room(`${game.id}-ai`))}
              />
              <div className="row" style={{ gap: 6, flexWrap: 'wrap', padding: '0 4px 4px' }}>
                {game.aiLevels.map(lvl => (
                  <button
                    key={lvl}
                    className="chip"
                    onClick={() => setAiLevel(lvl)}
                    style={{
                      background: aiLevel === lvl ? 'var(--red-soft)' : undefined,
                      color: aiLevel === lvl ? 'var(--red-400)' : undefined,
                      borderColor: aiLevel === lvl ? 'rgba(240,57,75,0.3)' : undefined,
                      cursor: 'pointer',
                    }}
                  >{lvl}</button>
                ))}
              </div>
              <ActionButton
                color="#38BDF8" icon="users"
                title="Invite friend" sub="Send a direct challenge"
                onClick={() => setInviteOpen(true)}
              />
              <ActionButton
                color="#A78BFA" icon="plus"
                title="Create lobby" sub="Private room with chat"
                onClick={() => router.push(ROUTES.lobby('SP-7F-29'))}
              />
              <ActionButton
                color="#34D399" icon="bolt"
                title="Quick match" sub="Auto-fill from queue"
                onClick={() => router.push(ROUTES.room(`${game.id}-quick`))}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="row between mobile-wrap">
              <div className="row" style={{ gap: 8, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(56,189,248,0.10)', color: 'var(--ice-400)', display: 'grid', placeItems: 'center' }}>
                  <Icon name="users" size={14} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Friends playing</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>3 right now</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" iconRight="chevronRight">All</Button>
            </div>
            <div className="col" style={{ marginTop: 12, gap: 8 }}>
              {FRIENDS.slice(0, 3).map(f => (
                <div key={f.id} className="row mobile-wrap" style={{ gap: 10 }}>
                  <Avatar user={f} size="sm" showPresence />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.display}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{f.activity}</div>
                  </div>
                  <Button size="sm">Challenge</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function InlineStat({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="row" style={{ gap: 8 }}>
      <Icon name={icon} size={14} style={{ color: 'var(--text-lo)' }} />
      <div>
        <div className="uppercase-label">{label}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function ActionButton({ color, icon, title, sub, onClick }: {
  color: string; icon: string; title: string; sub: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="surface row"
      style={{ padding: 14, gap: 12, width: '100%', textAlign: 'left', border: '1px solid var(--border-1)' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}1f`, color, display: 'grid', placeItems: 'center', border: `1px solid ${color}44` }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-hi)' }}>{title}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{sub}</div>
      </div>
      <Icon name="chevronRight" size={16} style={{ color: 'var(--text-lo)' }} />
    </button>
  );
}

function OverviewTab({ game }: { game: Game }) {
  return (
    <div className="col" style={{ gap: 14 }}>
      <p style={{ fontSize: 13.5 }}>{game.rules} A lightweight refresh of a classic — same rules you know, polished for fast online play.</p>
      <div className="grid grid-3">
        <Capsule title="Avg. session" value={game.duration} />
        <Capsule title="Skill range" value="Bronze → Master" />
        <Capsule title="Best for" value={game.cats.includes('Quick Match') ? 'Quick breaks' : 'Strategy nights'} />
      </div>
    </div>
  );
}

function RulesTab({ game }: { game: Game }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <p>{game.rules}</p>
      <ul className="col" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
        <li className="row" style={{ gap: 10, fontSize: 13 }}><span className="chip chip--mono">1</span> Place your bet on time or skill — never both.</li>
        <li className="row" style={{ gap: 10, fontSize: 13 }}><span className="chip chip--mono">2</span> Forfeit is allowed after 30 seconds.</li>
        <li className="row" style={{ gap: 10, fontSize: 13 }}><span className="chip chip--mono">3</span> Server validates every move; cheating ends a session immediately.</li>
        <li className="row" style={{ gap: 10, fontSize: 13 }}><span className="chip chip--mono">4</span> Disconnect for &gt;60s = forfeit unless both sides agree to pause.</li>
      </ul>
    </div>
  );
}

function YourStatsTab() {
  return (
    <div className="grid grid-3">
      <StatCard label="Win rate" value="71%" trend="+2%" hint="last 30d" icon="trophy" />
      <StatCard label="Matches" value="58" trend="+9" hint="this season" icon="controller" accent="ice" />
      <StatCard label="Best ELO" value="1,902" hint="all-time" icon="trendingUp" />
    </div>
  );
}

function FriendLeaderboardTab() {
  const rows = [
    { name: 'Sara Lindqvist',  elo: 2104 },
    { name: 'Priya Raman',     elo: 1910 },
    { name: 'You',             elo: 1842, you: true },
    { name: 'Anya Volkov',     elo: 1990 },
    { name: 'Mateus Oliveira', elo: 1675 },
  ].sort((a, b) => b.elo - a.elo);

  return (
    <div className="col" style={{ gap: 2 }}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="surface row"
          style={{
            padding: '10px 14px', gap: 12,
            borderColor: r.you ? 'rgba(240,57,75,0.35)' : undefined,
            background: r.you ? 'var(--red-soft)' : undefined,
          }}
        >
          <div className="mono" style={{ width: 24, color: 'var(--text-lo)' }}>#{i + 1}</div>
          <Avatar user={{ initials: r.name.split(' ').map(s => s[0]).join(''), color: PALETTE[i % 8] }} size="sm" />
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{r.name}</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{r.elo}</div>
        </div>
      ))}
    </div>
  );
}

function Capsule({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface" style={{ padding: 14 }}>
      <div className="uppercase-label">{title}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginTop: 6 }}>{value}</div>
    </div>
  );
}
