'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChatPanel } from '@/components/lobby/ChatPanel';
import { useToast } from '@/components/ui/Toast';
import { CURRENT_USER } from '@/mock/users';
import { FRIENDS } from '@/mock/friends';
import { GAMES } from '@/mock/games';
import { DEFAULT_LOBBY_CHAT } from '@/mock/lobbies';
import { ROUTES } from '@/lib/routes';
import type { LobbySlot, ChatMessage } from '@/types';

export function LobbyPage({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const game = GAMES[3];

  const [slots, setSlots] = useState<LobbySlot[]>([
    { kind: 'host',   user: CURRENT_USER, ready: true },
    { kind: 'friend', user: FRIENDS[0],   ready: true },
    { kind: 'empty' },
    { kind: 'empty' },
  ]);
  const [aiFill, setAiFill] = useState(false);
  const [privacy, setPrivacy] = useState('private');
  const [timeMode, setTimeMode] = useState('Blitz Â· 3+2');
  const [chat, setChat] = useState<ChatMessage[]>(DEFAULT_LOBBY_CHAT);

  const slotsWithAi = slots.map(s =>
    s.kind === 'empty' && aiFill
      ? { kind: 'ai' as const, user: { initials: 'AI', color: '#A78BFA', display: `AI Â· ${game.aiLevels[1]}` }, ready: true }
      : s
  );
  const allReady = slotsWithAi.every(s => s.kind === 'empty' || s.ready);

  const sendChat = (text: string) => {
    setChat(c => [...c, { from: 'You', text, color: '#F0394B', initials: 'AK', when: 'now', me: true }]);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(lobbyId).catch(() => {});
    toast.push({ kind: 'success', title: 'Lobby code copied', body: 'Share it with a friend.' });
  };

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row mobile-wrap" style={{ gap: 8 }}>
            <span className="chip chip--red chip--mono"><span className="dot dot--playing" />Lobby active</span>
            <span className="chip chip--mono">{privacy === 'private' ? 'Private' : 'Public'}</span>
            <span className="chip chip--mono">{timeMode}</span>
          </div>
          <div className="page-title" style={{ marginTop: 10 }}>{game.name} Â· Lobby</div>
          <div className="page-sub">Hosted by you Â· region Auto Â· est. start in 30s</div>
        </div>
        <div className="row mobile-actions" style={{ gap: 8 }}>
          <button
            className="chip chip--mono"
            onClick={copyCode}
            style={{ height: 32, padding: '0 12px', cursor: 'pointer', border: '1px solid var(--border-2)', background: 'var(--bg-2)' }}
          >
            <Icon name="link" size={12} />
            <span style={{ color: 'var(--text-hi)', fontWeight: 600, margin: '0 6px' }}>{lobbyId}</span>
            <Icon name="copy" size={12} style={{ color: 'var(--text-lo)' }} />
          </button>
          <Button variant="ghost" icon="share">Share invite</Button>
          <Button variant="ghost" icon="x" onClick={() => router.push(ROUTES.dashboard)}>Leave</Button>
        </div>
      </div>

      <div className="responsive-split" style={{ gridTemplateColumns: '1.6fr 1fr', marginTop: 22 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card-elev" style={{ padding: 22 }}>
            <div className="row between mobile-wrap">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Players Â· {slotsWithAi.filter(s => s.kind !== 'empty').length} / {slots.length}
                </div>
                <div className="page-sub">Host can kick or promote.</div>
              </div>
              <div className="row mobile-actions" style={{ gap: 6 }}>
                <Button size="sm" variant="ghost" icon="plus" onClick={() => setSlots(s => [...s, { kind: 'empty' }])}>Add slot</Button>
                <Button size="sm" variant="ghost" icon="refresh" onClick={() => setSlots(s => s.map(slot => slot.kind === 'empty' ? slot : { ...slot, ready: !slot.ready }))}>Toggle ready</Button>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              {slotsWithAi.map((s, i) => <SlotCard key={i} slot={s} seat={i + 1} />)}
            </div>

            <div className="row between mobile-wrap" style={{ marginTop: 18 }}>
              <div className="row mobile-wrap" style={{ gap: 8 }}>
                <Toggle on={aiFill} onChange={setAiFill} label="Fill empty seats with AI" />
                <span className="chip chip--mono">AI Â· {game.aiLevels[1]}</span>
              </div>
              <div className="row mobile-actions" style={{ gap: 8 }}>
                {allReady ? (
                  <Button size="lg" icon="play" onClick={() => router.push(ROUTES.room(lobbyId))}>Start match</Button>
                ) : (
                  <Button size="lg" disabled icon="clock">Waiting for readyâ€¦</Button>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Match settings</div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              <SettingDropdown label="Time control" value={timeMode} options={['Bullet Â· 1+0', 'Blitz Â· 3+2', 'Rapid Â· 10+5', 'Classic Â· 30+30']} onChange={setTimeMode} />
              <SettingDropdown label="Privacy" value={privacy === 'private' ? 'Private (link)' : 'Public'} options={['Private (link)', 'Public']} onChange={v => setPrivacy(v === 'Private (link)' ? 'private' : 'public')} />
              <SettingDropdown label="Rated" value="Ranked" options={['Ranked', 'Casual']} />
              <SettingDropdown label="Region" value="Auto" options={['Auto', 'NA-East', 'Asia-SEA']} />
              <SettingDropdown label="Tie-break" value="Sudden death" options={['Sudden death', 'Bullet round']} />
              <SettingDropdown label="Spectators" value="Friends only" options={['Anyone', 'Friends only', 'Disabled']} />
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <InviteFriendsPanel />
          <ChatPanel chat={chat} onSend={sendChat} title="Lobby chat" />
        </div>
      </div>
    </div>
  );
}

function SlotCard({ slot, seat }: { slot: LobbySlot; seat: number }) {
  if (slot.kind === 'empty') {
    return (
      <div className="surface mobile-wrap" style={{ padding: 16, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 12, minHeight: 80 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-3)', color: 'var(--text-lo)', display: 'grid', placeItems: 'center', border: '1px dashed var(--border-3)' }}>
          <Icon name="plus" size={16} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-md)' }}>Seat {seat} Â· Empty</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Invite a friend or fill with AI</div>
        </div>
        <Button size="sm" variant="ghost" icon="plus">Invite</Button>
      </div>
    );
  }

  const isAi = slot.kind === 'ai';
  return (
    <div className="surface mobile-wrap" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 80, borderColor: slot.ready ? 'rgba(52,211,153,0.25)' : 'var(--border-2)' }}>
      <Avatar user={slot.user!} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row mobile-wrap" style={{ gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{slot.user?.display}</span>
          {slot.kind === 'host' && <span className="chip chip--red chip--mono"><Icon name="crown" size={11} /> Host</span>}
          {isAi && <span className="chip chip--mono"><Icon name="ai" size={11} /> AI</span>}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{isAi ? 'Difficulty: Hard' : `Seat ${seat} Â· Auto`}</div>
      </div>
      <div className="row mobile-wrap" style={{ gap: 6 }}>
        <span className={`chip ${slot.ready ? 'chip--success' : 'chip--warn'}`}>
          <span className={`dot ${slot.ready ? 'dot--online' : 'dot--away'}`} />
          {slot.ready ? 'Ready' : 'Not ready'}
        </span>
        {slot.kind === 'friend' && <button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" size={14} /></button>}
      </div>
    </div>
  );
}

function SettingDropdown({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <div className="uppercase-label">{label}</div>
      <button onClick={() => setOpen(v => !v)} className="surface row between" style={{ padding: '10px 12px', width: '100%', marginTop: 6, cursor: 'pointer' }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
        <Icon name="chevronDown" size={14} style={{ color: 'var(--text-lo)' }} />
      </button>
      {open && (
        <div className="card-elev dropdown-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 6, zIndex: 20, padding: 6, overflow: 'hidden' }}>
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange?.(o); setOpen(false); }}
              className="row"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: o === value ? 'var(--bg-tint)' : 'transparent', fontSize: 13, color: o === value ? 'var(--text-hi)' : 'var(--text-md)' }}
            >
              {o === value && <Icon name="check" size={12} style={{ color: 'var(--red-500)', marginRight: 6 }} />}
              <span>{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InviteFriendsPanel() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const list = FRIENDS.filter(f => f.status !== 'offline').filter(f => !q || f.display.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Invite friends</div>
        <span className="chip chip--mono">{list.length} online</span>
      </div>
      <div style={{ position: 'relative', marginTop: 10 }}>
        <Icon name="search" size={14} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-lo)' }} />
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search friends" style={{ paddingLeft: 32 }} />
      </div>
      <div className="col" style={{ marginTop: 10, gap: 4, maxHeight: 280, overflow: 'auto' }}>
        {list.map(f => (
          <div key={f.id} className="row mobile-wrap" style={{ padding: '8px 6px', borderRadius: 8, gap: 10 }}>
            <Avatar user={f} size="sm" showPresence />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.display}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{f.activity}</div>
            </div>
            <Button
              size="sm" variant="ghost" icon="send"
              onClick={() => toast.push({ kind: 'info', title: 'Invite sent', body: `${f.display} got a lobby invite.` })}
            >Invite</Button>
          </div>
        ))}
        {list.length === 0 && <EmptyState icon="users" title="No matches." body="Try a different name." />}
      </div>
    </div>
  );
}
