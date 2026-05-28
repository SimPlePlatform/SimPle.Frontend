'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { FRIENDS, FRIEND_REQUESTS, SUGGESTED } from '@/mock/friends';
import type { Friend } from '@/types';

export function FriendsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [showEmpty, setShowEmpty] = useState(false);

  const filtered = FRIENDS.filter(f => !q || f.display.toLowerCase().includes(q.toLowerCase()));
  const online = filtered.filter(f => f.status !== 'offline');

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Friends</div>
          <div className="page-sub">{FRIENDS.length} total · {online.length} online · {FRIEND_REQUESTS.length} pending requests</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" icon="share">Share invite link</Button>
          <Button
            icon="plus"
            onClick={() => toast.push({ kind: 'info', title: 'Friend request sent', body: 'Yuki Tanaka will be notified.' })}
          >Add friend</Button>
        </div>
      </div>

      <div className="row" style={{ marginTop: 22, gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all',      label: 'All friends',  count: FRIENDS.length },
            { value: 'online',   label: 'Online',       count: online.length },
            { value: 'requests', label: 'Requests',     count: FRIEND_REQUESTS.length, icon: 'bell' },
            { value: 'suggest',  label: 'Suggestions',  count: SUGGESTED.length, icon: 'sparkle' },
          ]}
        />
        <div style={{ position: 'relative', minWidth: 260 }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-lo)' }} />
          <input
            className="input"
            placeholder="Search by name or @handle"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, marginTop: 22 }}>
        <div className="card" style={{ padding: 18 }}>
          {tab === 'requests' ? <RequestsList /> :
           tab === 'suggest'  ? <SuggestionsList /> :
           showEmpty ? <EmptyFriends onAdd={() => setShowEmpty(false)} /> :
           <FriendList list={tab === 'online' ? online : filtered} />}
          {(tab === 'all' || tab === 'online') && (
            <div className="row" style={{ marginTop: 14, gap: 8, justifyContent: 'center' }}>
              <Button size="sm" variant="ghost" onClick={() => setShowEmpty(s => !s)}>
                {showEmpty ? 'Show friends' : 'Preview empty state'}
              </Button>
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 18 }}>
          <SuggestedSidecar />
          <FriendsActivity />
        </div>
      </div>
    </div>
  );
}

function FriendList({ list }: { list: Friend[] }) {
  const toast = useToast();
  if (!list.length) return <EmptyState icon="users" title="Nobody matches that." body="Try clearing the search or invite someone new." />;
  return (
    <div className="col" style={{ gap: 2 }}>
      <div className="row" style={{ padding: '6px 10px' }}>
        <div className="uppercase-label" style={{ flex: 1 }}>Player</div>
        <div className="uppercase-label" style={{ width: 160 }}>Status</div>
        <div className="uppercase-label" style={{ width: 80, textAlign: 'right' }}>ELO</div>
        <div style={{ width: 170 }} />
      </div>
      {list.map(f => (
        <div key={f.id} className="row" style={{ padding: '10px', borderRadius: 10, gap: 12 }}>
          <Avatar user={f} showPresence />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.display}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Lv {f.level}</div>
          </div>
          <div style={{ width: 160 }}>
            <StatusBadge status={f.status} label={f.activity.length > 24 ? f.activity.slice(0, 22) + '…' : f.activity} />
          </div>
          <div className="mono" style={{ width: 80, textAlign: 'right', fontWeight: 600 }}>{f.elo}</div>
          <div className="row" style={{ width: 170, justifyContent: 'flex-end', gap: 6 }}>
            <Button size="sm" variant="ghost" icon="message" />
            <Button
              size="sm" variant="ghost" icon="plus"
              onClick={() => toast.push({ kind: 'info', title: 'Invite sent', body: `${f.display} got a lobby invite.` })}
            >Invite</Button>
            <button className="btn btn-ghost btn-icon btn-sm"><Icon name="more" size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsList() {
  const toast = useToast();
  return (
    <div className="col" style={{ gap: 8 }}>
      {FRIEND_REQUESTS.map(r => (
        <div key={r.id} className="surface row" style={{ padding: 14, gap: 12 }}>
          <Avatar user={r} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.display}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{r.mutual} mutual friends</div>
          </div>
          <Button
            size="sm" icon="check"
            onClick={() => toast.push({ kind: 'success', title: 'Friend added', body: `${r.display} is now your friend.` })}
          >Accept</Button>
          <Button size="sm" variant="ghost" icon="x">Decline</Button>
        </div>
      ))}
    </div>
  );
}

function SuggestionsList() {
  const toast = useToast();
  return (
    <div className="col" style={{ gap: 8 }}>
      {SUGGESTED.map(s => (
        <div key={s.id} className="surface row" style={{ padding: 14, gap: 12 }}>
          <Avatar user={s} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.display}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{s.mutual} mutual · {s.elo} ELO</div>
          </div>
          <Button
            size="sm" variant="ghost" icon="plus"
            onClick={() => toast.push({ kind: 'info', title: 'Request sent', body: `${s.display} will be notified.` })}
          >Add</Button>
          <Button size="sm" variant="ghost" icon="x" />
        </div>
      ))}
    </div>
  );
}

function SuggestedSidecar() {
  const toast = useToast();
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>People to play with</div>
        <Icon name="sparkle" size={14} style={{ color: 'var(--ice-400)' }} />
      </div>
      <div className="col" style={{ marginTop: 12, gap: 10 }}>
        {SUGGESTED.map(s => (
          <div key={s.id} className="row" style={{ gap: 10 }}>
            <Avatar user={s} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.display}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{s.mutual} mutual</div>
            </div>
            <Button
              size="sm" variant="ghost" icon="plus"
              onClick={() => toast.push({ kind: 'info', title: 'Request sent', body: `${s.display} will be notified.` })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendsActivity() {
  const items = [
    { when: 'now',  name: 'Priya',  text: 'opened a Chess Lite lobby',       color: '#38BDF8', initials: 'PR' },
    { when: '3m',   name: 'Sara',   text: 'climbed to Master · +24 ELO',     color: '#34D399', initials: 'SL' },
    { when: '12m',  name: 'Mateus', text: 'solved Sudoku Master in 4:21',    color: '#A78BFA', initials: 'MO' },
    { when: '1h',   name: 'Noor',   text: 'hit 10-win streak in Connect Four', color: '#F472B6', initials: 'NA' },
  ];
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Friend activity</div>
      <div className="col" style={{ marginTop: 12, gap: 12 }}>
        {items.map((item, i) => (
          <div key={i} className="row" style={{ gap: 10 }}>
            <Avatar user={{ initials: item.initials, color: item.color }} size="sm" />
            <div style={{ flex: 1, minWidth: 0, fontSize: 12.5 }}>
              <div><b>{item.name}</b> <span style={{ color: 'var(--text-lo)' }}>{item.text}</span></div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{item.when}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyFriends({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon="users"
      title="Your roster is empty — let's fix that."
      body="Add friends to invite them to lobbies, see when they're online, and climb leaderboards together."
      action={
        <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
          <Button icon="plus" onClick={onAdd}>Add a friend</Button>
          <Button variant="ghost" icon="share">Copy invite link</Button>
        </div>
      }
    />
  );
}
