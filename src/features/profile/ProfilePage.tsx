'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { StatCard } from '@/components/ui/StatCard';
import { GameArt } from '@/components/ui/GameArt';
import { Tabs } from '@/components/ui/Tabs';
import { CURRENT_USER } from '@/mock/users';
import { GAMES } from '@/mock/games';
import { RECENT_MATCHES } from '@/mock/matches';
import { ACHIEVEMENTS } from '@/mock/achievements';
import { rarityBg, rarityFg } from '@/lib/utils';

export function ProfilePage({ userId: _userId }: { userId: string }) {
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const u = CURRENT_USER;

  return (
    <div className="page">
      <div className="card-elev" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ height: 160, position: 'relative', background: 'linear-gradient(135deg, #0F1422 0%, #1B2238 50%, #0B0F18 100%)' }}>
          <div className="grid-bg" style={{ opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <Button size="sm" variant="ghost" icon={editing ? 'check' : 'edit'} onClick={() => setEditing(v => !v)}>
              {editing ? 'Save' : 'Edit profile'}
            </Button>
          </div>
        </div>
        <div style={{ padding: '0 24px 24px', marginTop: -44 }}>
          <div className="row between" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div className="row" style={{ gap: 18, alignItems: 'flex-end' }}>
              <Avatar user={u} size="xl" showPresence />
              <div style={{ paddingBottom: 6 }}>
                {!editing ? (
                  <>
                    <div className="font-display" style={{ fontSize: 24, fontWeight: 600 }}>{u.display}</div>
                    <div className="mono" style={{ fontSize: 12, color: 'var(--text-lo)' }}>@{u.username} · joined {u.joined}</div>
                  </>
                ) : (
                  <div className="col" style={{ gap: 8, maxWidth: 380 }}>
                    <input className="input" defaultValue={u.display} placeholder="Display name" />
                    <input className="input" defaultValue={u.username} placeholder="Username" />
                  </div>
                )}
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip chip--red chip--mono"><Icon name="crown" size={12} /> {u.rank}</span>
              <span className="chip chip--mono">{u.elo} ELO</span>
              <span className="chip chip--mono">Lv {u.level}</span>
            </div>
          </div>
          {!editing ? (
            <p style={{ marginTop: 14, maxWidth: 640 }}>{u.bio}</p>
          ) : (
            <textarea className="input" defaultValue={u.bio} style={{ marginTop: 14, minHeight: 80, padding: 12, resize: 'vertical', width: '100%' }} />
          )}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 18 }}>
        <StatCard label="Matches"     value="218" trend="+12" hint="lifetime"   icon="controller" />
        <StatCard label="Win rate"    value="64%" trend="+3%" hint="last 30d"   icon="trophy" />
        <StatCard label="Best streak" value="11W"             hint="all-time"   icon="flame" />
        <StatCard label="Friends"     value="36"  trend="+2"  hint="this week"  icon="users" accent="ice" />
      </div>

      <div style={{ marginTop: 24 }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'overview', label: 'Overview' },
            { value: 'matches',  label: 'Match history' },
            { value: 'achieve',  label: 'Achievements' },
            { value: 'games',    label: 'Favorite games' },
          ]}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'overview' && <ProfileOverview />}
        {tab === 'matches'  && <MatchHistoryTable />}
        {tab === 'achieve'  && <AchievementsGrid />}
        {tab === 'games'    && <FavoriteGames />}
      </div>
    </div>
  );
}

function ProfileOverview() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
      <PerformanceChart />
      <div className="col" style={{ gap: 18 }}>
        <FavoriteGames compact />
        <AchievementsGrid compact />
      </div>
    </div>
  );
}

function PerformanceChart() {
  const data = [1640, 1680, 1655, 1700, 1690, 1720, 1755, 1740, 1780, 1810, 1795, 1825, 1842];
  const min = Math.min(...data), max = Math.max(...data);
  const W = 600, H = 200, pad = 24;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');
  const dArea = d + ` L ${W - pad} ${H - pad} L ${pad} ${H - pad} Z`;

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="row between">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>ELO over time</div>
          <div className="page-sub">Last 13 days</div>
        </div>
        <Tabs value="13d" onChange={() => {}} items={[{ value: '7d', label: '7d' }, { value: '13d', label: '13d' }, { value: '30d', label: '30d' }]} />
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 220, marginTop: 14 }}>
        <defs>
          <linearGradient id="elo-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#F0394B" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#F0394B" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: 4 }).map((_, i) => (
          <line key={i} x1={pad} x2={W - pad} y1={pad + i * ((H - pad * 2) / 3)} y2={pad + i * ((H - pad * 2) / 3)} stroke="#1B2238" />
        ))}
        <path d={dArea} fill="url(#elo-grad)" />
        <path d={d} fill="none" stroke="#F0394B" strokeWidth="2" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 2.5} fill="#F0394B" stroke="#0F1422" strokeWidth={i === pts.length - 1 ? 3 : 1} />
        ))}
        <text x={W - pad} y={(pts[pts.length - 1][1] ?? 0) - 10} textAnchor="end" fill="#F0394B" fontFamily="JetBrains Mono" fontWeight="600" fontSize="12">1842</text>
      </svg>
    </div>
  );
}

function MatchHistoryTable() {
  const matches = [...RECENT_MATCHES, ...RECENT_MATCHES.map((m, i) => ({ ...m, id: m.id + 'x' + i, when: '4d ago' }))];
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="row" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-1)' }}>
        <div className="uppercase-label" style={{ width: 120 }}>Result</div>
        <div className="uppercase-label" style={{ flex: 1 }}>Game / Opponent</div>
        <div className="uppercase-label" style={{ width: 120 }}>Duration</div>
        <div className="uppercase-label" style={{ width: 80, textAlign: 'right' }}>ELO</div>
        <div className="uppercase-label" style={{ width: 100, textAlign: 'right' }}>When</div>
      </div>
      {matches.map(m => {
        const c = m.result === 'win' ? 'var(--success)' : m.result === 'loss' ? 'var(--danger)' : 'var(--text-lo)';
        return (
          <div key={m.id} className="row" style={{ padding: '12px 18px', borderBottom: '1px solid var(--border-1)' }}>
            <div className="row" style={{ width: 120, gap: 8 }}>
              <div style={{ width: 6, height: 18, background: c, borderRadius: 3 }} />
              <span style={{ textTransform: 'uppercase', fontSize: 11, color: c, fontWeight: 600, letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>{m.result}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{m.game}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>vs {m.opponent}</div>
            </div>
            <div className="mono" style={{ width: 120, fontSize: 12.5 }}>{m.duration}</div>
            <div className="mono" style={{ width: 80, fontSize: 12.5, textAlign: 'right', color: m.delta.startsWith('+') ? 'var(--success)' : m.delta.startsWith('-') ? 'var(--danger)' : 'var(--text-lo)', fontWeight: 600 }}>{m.delta}</div>
            <div className="mono" style={{ width: 100, fontSize: 11, textAlign: 'right', color: 'var(--text-lo)' }}>{m.when}</div>
          </div>
        );
      })}
    </div>
  );
}

function AchievementsGrid({ compact }: { compact?: boolean }) {
  const list = compact ? ACHIEVEMENTS.slice(0, 4) : ACHIEVEMENTS;
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Achievements</div>
        <span className="chip chip--mono">3 / 6 unlocked</span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        {list.map(a => (
          <div key={a.id} className="surface" style={{ padding: 14, opacity: a.unlocked ? 1 : 0.7 }}>
            <div className="row" style={{ gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: a.unlocked ? rarityBg(a.rarity) : 'var(--bg-3)',
                color: a.unlocked ? rarityFg(a.rarity) : 'var(--text-dim)',
                display: 'grid', placeItems: 'center', border: '1px solid var(--border-2)',
              }}>
                <Icon name={a.unlocked ? 'trophy' : 'lock'} size={16} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</span>
                  <span className="chip chip--mono" style={{ height: 18, padding: '0 6px', fontSize: 10, textTransform: 'capitalize' }}>{a.rarity}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-lo)', marginTop: 2 }}>{a.desc}</div>
                {!a.unlocked && a.progress != null && (
                  <div style={{ marginTop: 8 }}>
                    <div className="bar bar--ice" style={{ height: 4 }}><div className="bar__fill" style={{ width: (a.progress * 100) + '%' }} /></div>
                    <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)', marginTop: 4 }}>{Math.round(a.progress * 100)}%</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FavoriteGames({ compact }: { compact?: boolean }) {
  const games = GAMES.slice(0, compact ? 4 : 8);
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Favorite games</div>
        <span className="chip chip--mono">8 played</span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        {games.map(g => (
          <div key={g.id} className="surface" style={{ padding: 10 }}>
            <GameArt game={g} h={90} />
            <div className="row between" style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{g.name}</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{g.online} online</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
