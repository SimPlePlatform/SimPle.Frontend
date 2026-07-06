'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { CreateLobbyModal } from '@/components/lobby/CreateLobbyModal';
import { InviteFriendModal } from '@/components/friends/InviteFriendModal';
import { CURRENT_USER } from '@/mock/users';
import { GAMES } from '@/mock/games';
import { RECENT_MATCHES } from '@/mock/matches';
import { NOTIFICATIONS } from '@/mock/notifications';
import { ROUTES } from '@/lib/routes';
import { friendsApi } from '@/features/friends/friendsApi';
import { useFriendSummary } from '@/features/friends/FriendSummaryContext';
import type { FriendDto } from '@/features/friends/types';

export function DashboardPage() {
  const u = CURRENT_USER;
  const router = useRouter();
  const [lobbyOpen, setLobbyOpen]   = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { summary, loading: summaryLoading, error: summaryError } = useFriendSummary();

  const [friends, setFriends]               = useState<FriendDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [friendsError, setFriendsError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    friendsApi.getFriends({ limit: 10 })
      .then(r => { if (!cancelled) setFriends(r.items); })
      .catch(e => { if (!cancelled) setFriendsError(e instanceof ApiError ? e.message : 'Failed to load friends.'); })
      .finally(() => { if (!cancelled) setFriendsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const inviteCount = NOTIFICATIONS.filter(n => n.kind === 'invite').length;

  const subtitleFriends = summaryLoading || (!summary && !summaryError)
    ? '…'
    : summaryError
      ? null
      : summary?.friendCount ?? null;

  return (
    <div className="page">
      <div className="between" style={{ flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="page-title">Good evening, {u.display.split(' ')[0]}.</div>
          <div className="page-sub">
            {subtitleFriends !== null
              ? `${subtitleFriends} friends · ${inviteCount} invite waiting`
              : `${inviteCount} invite waiting`}
          </div>
        </div>
        <div className="row" style={{ gap:8 }}>
          <Button variant="ghost" icon="ai" onClick={() => router.push(ROUTES.games)}>Play vs AI</Button>
          <Button variant="ghost" icon="users" onClick={() => setInviteOpen(true)}>Invite friend</Button>
          <Button icon="plus" onClick={() => setLobbyOpen(true)}>Create lobby</Button>
        </div>
      </div>

      {/* Hero + side panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:18, marginTop:24 }}>
        <HeroPanel />
        <SideQuickPanel summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} />
      </div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginTop:18 }}>
        <StatCard label="ELO"      value="1,842" trend="+18" hint="this week"    icon="trendingUp" />
        <StatCard label="Win rate" value="64%"   trend="+3%" hint="last 30d"     icon="trophy" />
        <StatCard label="Matches"  value="218"   trend="+12" hint="lifetime"     icon="controller" accent="ice" />
        <StatCard label="Streak"   value="4W"    trend="+4"  hint="best of season" icon="flame" />
      </div>

      {/* Continue playing */}
      <section className="section">
        <div className="section-head">
          <div>
            <div className="section-title">Continue playing</div>
            <div className="page-sub">Pick up an unfinished match or jump into a quick one.</div>
          </div>
          <Button variant="ghost" size="sm" iconRight="chevronRight" onClick={() => router.push(ROUTES.games)}>Game library</Button>
        </div>
        <div className="grid grid-4">
          {[3,0,7,5].map(i => {
            const g = GAMES[i];
            return (
              <div key={g.id} className="card" style={{ overflow:'hidden', cursor:'pointer' }} onClick={() => router.push(ROUTES.game(g.id))}>
                <GameArt game={g} h={120} />
                <div style={{ padding:14 }}>
                  <div className="row between">
                    <div className="row" style={{ gap:8 }}>
                      <span className="chip chip--mono">{g.duration}</span>
                      <span className="chip chip--mono">{g.difficulty}</span>
                    </div>
                    <Button size="sm" variant="ghost" icon="play" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Friends + Matches */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginTop:28 }}>
        <FriendsPanel friends={friends} loading={friendsLoading} error={friendsError} summary={summary} />
        <RecentMatchesPanel />
      </div>

      {/* Recommended */}
      <section className="section">
        <div className="section-head">
          <div className="section-title">Recommended for you</div>
          <div className="row" style={{ gap:6 }}>
            <span className="chip chip--mono">Based on your last 50 matches</span>
          </div>
        </div>
        <div className="grid grid-3">
          {[1,2,6].map(i => <GameCardBig key={GAMES[i].id} game={GAMES[i]} />)}
        </div>
      </section>

      <CreateLobbyModal open={lobbyOpen} onClose={() => setLobbyOpen(false)} />
      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}

function HeroPanel() {
  const router = useRouter();
  const u = CURRENT_USER;
  const pct = u.xp / u.xpToNext;
  return (
    <div className="card-elev" style={{ padding:20, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(600px 280px at 100% -20%, rgba(240,57,75,0.18), transparent 60%)' }} />
      <div style={{ position:'relative' }}>
        <div className="row between">
          <span className="chip chip--red chip--mono"><span className="dot dot--playing" /> Season 4 · ranked open</span>
          <span className="chip chip--mono">Region: {u.region}</span>
        </div>
        <div className="row" style={{ marginTop:22, gap:18 }}>
          <Avatar user={u} size="xl" showPresence />
          <div style={{ flex:1, minWidth:0 }}>
            <div className="row" style={{ gap:10 }}>
              <div className="font-display" style={{ fontSize:24, fontWeight:600 }}>{u.display}</div>
              <span className="chip chip--mono">@{u.username}</span>
            </div>
            <div className="row" style={{ gap:10, marginTop:8 }}>
              <span className="chip chip--red chip--mono"><Icon name="crown" size={12} /> {u.rank}</span>
              <span className="chip chip--mono">{u.elo} ELO</span>
              <span className="chip chip--mono">Lv {u.level}</span>
            </div>
            <div style={{ marginTop:14 }}>
              <div className="row between" style={{ marginBottom:6 }}>
                <span className="uppercase-label">XP to Diamond II</span>
                <span className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>{u.xp.toLocaleString()} / {u.xpToNext.toLocaleString()}</span>
              </div>
              <div className="bar"><div className="bar__fill" style={{ width:`${pct*100}%` }} /></div>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap:8, marginTop:20 }}>
          <Button icon="play" onClick={() => router.push(ROUTES.games)}>Quick match</Button>
          <Button variant="ghost" icon="controller" onClick={() => router.push(ROUTES.lobby('SP-7F-29'))}>Open active lobby</Button>
        </div>
      </div>
    </div>
  );
}

interface SideQuickPanelProps {
  summary: { incomingRequestCount: number } | null;
  summaryLoading: boolean;
  summaryError: string | null;
}

function SideQuickPanel({ summary, summaryLoading, summaryError }: SideQuickPanelProps) {
  return (
    <div className="col" style={{ gap:18 }}>
      <DailyQuestsCard />
      <PendingInvitesCard summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} />
    </div>
  );
}

function DailyQuestsCard() {
  const quests = [
    { label:'Win 2 ranked matches', p:0.5, reward:'+250 XP' },
    { label:'Play 3 different games', p:1.0, reward:'+150 XP' },
    { label:'Beat AI on Hard', p:0.0, reward:'+400 XP' },
  ];
  return (
    <div className="card" style={{ padding:18 }}>
      <div className="row between">
        <div className="row" style={{ gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'rgba(56,189,248,0.10)', color:'var(--ice-400)', display:'grid', placeItems:'center' }}><Icon name="flame" size={14} /></div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:14 }}>Daily quests</div>
            <div className="mono" style={{ fontSize:10.5, color:'var(--text-lo)' }}>Resets in 6h 12m</div>
          </div>
        </div>
        <span className="chip chip--mono">2 / 3</span>
      </div>
      <div className="col" style={{ marginTop:14, gap:10 }}>
        {quests.map((q, i) => (
          <div key={i}>
            <div className="row between" style={{ marginBottom:6 }}>
              <span style={{ fontSize:12.5, color: q.p === 1 ? 'var(--text-lo)' : 'var(--text-hi)', textDecoration: q.p === 1 ? 'line-through' : 'none' }}>{q.label}</span>
              <span className="mono" style={{ fontSize:11, color: q.p === 1 ? 'var(--success)' : 'var(--text-lo)' }}>{q.reward}</span>
            </div>
            <div className={`bar ${q.p === 1 ? 'bar--success' : 'bar--ice'}`}><div className="bar__fill" style={{ width:`${q.p*100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PendingInvitesCardProps {
  summary: { incomingRequestCount: number } | null;
  summaryLoading: boolean;
  summaryError: string | null;
}

function PendingInvitesCard({ summary, summaryLoading, summaryError }: PendingInvitesCardProps) {
  const router = useRouter();
  const pendingCount = (!summaryLoading && !summaryError && summary)
    ? summary.incomingRequestCount
    : null;

  return (
    <div className="card" style={{ padding:18 }}>
      <div className="row between">
        <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:14 }}>Lobby invites</div>
        <span className="chip chip--red chip--mono">1 active</span>
      </div>
      <div className="surface" style={{ marginTop:14, padding:12 }}>
        <div className="row" style={{ gap:10 }}>
          <Avatar user={{ initials:'PR', color:'#38BDF8' }} size="sm" />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12.5 }}><b>Priya Raman</b> · Chess Lite · 1v1</div>
            <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>Lobby SP-7F-29 · expires in 4:12</div>
          </div>
        </div>
        <div className="row" style={{ gap:8, marginTop:12 }}>
          <Button size="sm" style={{ flex:1 }} onClick={() => router.push(ROUTES.lobby('SP-7F-29'))}>Join</Button>
          <Button size="sm" variant="ghost" style={{ flex:1 }}>Decline</Button>
        </div>
      </div>
      {pendingCount !== null && pendingCount > 0 && (
        <div className="row" style={{ marginTop:12, gap:8 }}>
          <Icon name="bell" size={14} style={{ color:'var(--text-lo)' }} />
          <span style={{ fontSize:12, color:'var(--text-lo)' }}>
            {pendingCount} friend request{pendingCount !== 1 ? 's' : ''} pending
          </span>
        </div>
      )}
    </div>
  );
}

interface FriendsPanelProps {
  friends: FriendDto[];
  loading: boolean;
  error: string | null;
  summary: { friendCount: number } | null;
}

function FriendsPanel({ friends, loading, error, summary }: FriendsPanelProps) {
  const router = useRouter();
  const visible = friends.slice(0, 5);

  return (
    <div className="card" style={{ padding:18 }}>
      <div className="row between">
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:14 }}>Friends</div>
          <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>
            {summary !== null ? `${summary.friendCount} total` : '—'}
          </div>
        </div>
        <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => router.push(ROUTES.friends)}>View all</Button>
      </div>
      <div className="col" style={{ marginTop:12, gap:6 }}>
        {loading ? (
          <div role="status" style={{ padding:16, color:'var(--text-lo)', fontSize:13 }}>Loading…</div>
        ) : error ? (
          <div style={{ padding:8, fontSize:13, color:'var(--danger)' }}>{error}</div>
        ) : visible.length === 0 ? (
          <div style={{ fontSize:13, color:'var(--text-lo)' }}>No friends yet. Add some on the Friends page.</div>
        ) : visible.map(f => (
          <div key={f.userId} className="row" style={{ padding:'10px 8px', borderRadius:10, gap:12 }}>
            <Avatar src={f.avatarUrl} user={{ initials:f.initials, color:f.color }} />
            <div style={{ flex:1, minWidth:0 }}>
              <div className="row" style={{ gap:8 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{f.displayName}</span>
                {/* ELO chip hidden until M10 supplies authoritative ratings */}
              </div>
              <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>@{f.username}</div>
            </div>
            <Button size="sm" variant="ghost" icon="message" disabled aria-disabled="true" />
            <Button size="sm" variant="ghost" icon="plus" disabled aria-disabled="true">Invite</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentMatchesPanel() {
  const router = useRouter();
  return (
    <div className="card" style={{ padding:18 }}>
      <div className="row between">
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:14 }}>Recent matches</div>
          <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>Last 7 days</div>
        </div>
        <Button size="sm" variant="ghost" iconRight="chevronRight" onClick={() => router.push(ROUTES.profile('me'))}>Full history</Button>
      </div>
      <div className="col" style={{ marginTop:12, gap:4 }}>
        {RECENT_MATCHES.map(m => {
          const c = m.result === 'win' ? 'var(--success)' : m.result === 'loss' ? 'var(--danger)' : 'var(--text-lo)';
          return (
            <div key={m.id} className="row" style={{ padding:'10px 8px', borderRadius:10, gap:12 }}>
              <div style={{ width:6, height:30, borderRadius:3, background:c }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div className="row" style={{ gap:8 }}>
                  <span style={{ fontSize:13, fontWeight:600 }}>{m.game}</span>
                  <span className="chip chip--mono" style={{ height:18, padding:'0 6px', fontSize:10, textTransform:'uppercase' }}>{m.result}</span>
                </div>
                <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>vs {m.opponent} · {m.duration}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div className="mono" style={{ fontSize:13, color: m.delta.startsWith('+') ? 'var(--success)' : m.delta.startsWith('-') ? 'var(--danger)' : 'var(--text-lo)', fontWeight:600 }}>{m.delta}</div>
                <div className="mono" style={{ fontSize:10.5, color:'var(--text-lo)' }}>{m.when}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GameCardBig({ game }: { game: typeof GAMES[0] }) {
  const router = useRouter();
  return (
    <div className="card" style={{ overflow:'hidden', cursor:'pointer' }} onClick={() => router.push(ROUTES.game(game.id))}>
      <GameArt game={game} h={140} />
      <div style={{ padding:16 }}>
        <div className="row between">
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:600 }}>{game.name}</div>
            <div className="mono" style={{ fontSize:11, color:'var(--text-lo)', marginTop:2 }}>{game.duration} · {game.difficulty}</div>
          </div>
          <Button size="sm" icon="play">Play</Button>
        </div>
        <div className="row" style={{ gap:6, marginTop:12, flexWrap:'wrap' }}>
          {game.cats.slice(0,2).map(c => <span key={c} className="chip">{c}</span>)}
        </div>
      </div>
    </div>
  );
}
