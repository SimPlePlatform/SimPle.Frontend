'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api-client';
import { friendsApi, type BlockedUser, type FriendRequest, type FriendUserSummary } from '@/features/friends/friendsApi';

function avatarFor(user: FriendUserSummary) {
  return { initials: user.initials, color: user.avatarFallbackColor, status: 'offline' };
}

function displayError(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function FriendsPage() {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [friends, setFriends] = useState<FriendUserSummary[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [suggestions, setSuggestions] = useState<FriendUserSummary[]>([]);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [searchResults, setSearchResults] = useState<FriendUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendList, requests, suggested, blocks] = await Promise.all([
        friendsApi.list(),
        friendsApi.requests(),
        friendsApi.suggestions(),
        friendsApi.blocks(),
      ]);
      setFriends(friendList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
      setSuggestions(suggested);
      setBlocked(blocks);
    } catch (e) {
      setError(displayError(e, 'Could not load friends.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(load);
  }, []);

  useEffect(() => {
    const query = q.trim();
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      friendsApi.search(query)
        .then(results => { if (!cancelled) setSearchResults(results); })
        .catch(() => { if (!cancelled) setSearchResults([]); });
    }, query.length < 2 ? 0 : 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [q]);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setActionLoading(key);
    try {
      await action();
      toast.push({ kind: 'success', title: success });
      await load();
    } catch (e) {
      toast.push({ kind: 'default', title: displayError(e, 'Action failed.') });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter(f =>
      f.displayName.toLowerCase().includes(query) || f.username.toLowerCase().includes(query)
    );
  }, [friends, q]);
  const visibleSearch = q.trim().length >= 2 ? searchResults : [];

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="page-title">Friends</div>
          <div className="page-sub">
            {friends.length} total - {incoming.length} incoming - {outgoing.length} sent
          </div>
        </div>
        <div className="row mobile-actions" style={{ gap: 8 }}>
          <Button variant="ghost" icon="refresh" onClick={() => void load()} disabled={loading}>Refresh</Button>
        </div>
      </div>

      <div className="row mobile-wrap" style={{ marginTop: 22, gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { value: 'all', label: 'All friends', count: friends.length },
            { value: 'requests', label: 'Requests', count: incoming.length + outgoing.length, icon: 'bell' },
            { value: 'suggest', label: 'Suggestions', count: suggestions.length, icon: 'sparkle' },
            { value: 'blocked', label: 'Blocked', count: blocked.length, icon: 'shield' },
          ]}
        />
        <div style={{ position: 'relative', width: 'min(100%, 300px)' }}>
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

      {error && <div className="surface" style={{ marginTop: 14, padding: 12, color: 'var(--danger)' }}>{error}</div>}

      <div className="responsive-split" style={{ gridTemplateColumns: '2fr 1fr', marginTop: 22 }}>
        <div className="card" style={{ padding: 18 }}>
          {loading ? (
            <EmptyState icon="users" title="Loading friends..." body="Fetching your social graph." />
          ) : visibleSearch.length > 0 ? (
            <UserResults
              users={visibleSearch}
              actionLoading={actionLoading}
              onSend={userId => run(`send-${userId}`, () => friendsApi.sendRequest(userId), 'Friend request sent.')}
              onBlock={userId => run(`block-${userId}`, () => friendsApi.block(userId), 'User blocked.')}
            />
          ) : tab === 'requests' ? (
            <RequestsList
              incoming={incoming}
              outgoing={outgoing}
              actionLoading={actionLoading}
              onAccept={id => run(`accept-${id}`, () => friendsApi.acceptRequest(id), 'Friend added.')}
              onDecline={id => run(`decline-${id}`, () => friendsApi.declineRequest(id), 'Request declined.')}
              onCancel={id => run(`cancel-${id}`, () => friendsApi.cancelRequest(id), 'Request cancelled.')}
            />
          ) : tab === 'suggest' ? (
            <UserResults
              users={suggestions}
              actionLoading={actionLoading}
              onSend={userId => run(`send-${userId}`, () => friendsApi.sendRequest(userId), 'Friend request sent.')}
              onBlock={userId => run(`block-${userId}`, () => friendsApi.block(userId), 'User blocked.')}
            />
          ) : tab === 'blocked' ? (
            <BlockedList
              blocked={blocked}
              actionLoading={actionLoading}
              onUnblock={userId => run(`unblock-${userId}`, () => friendsApi.unblock(userId), 'User unblocked.')}
            />
          ) : (
            <FriendList
              friends={filtered}
              actionLoading={actionLoading}
              onRemove={userId => run(`remove-${userId}`, () => friendsApi.removeFriend(userId), 'Friend removed.')}
              onBlock={userId => run(`block-${userId}`, () => friendsApi.block(userId), 'User blocked.')}
            />
          )}
        </div>

        <div className="col" style={{ gap: 18 }}>
          <SuggestedSidecar
            suggestions={suggestions.slice(0, 5)}
            actionLoading={actionLoading}
            onSend={userId => run(`send-${userId}`, () => friendsApi.sendRequest(userId), 'Friend request sent.')}
          />
          <FriendsActivity />
        </div>
      </div>
    </div>
  );
}

function FriendList({
  friends,
  actionLoading,
  onRemove,
  onBlock,
}: {
  friends: FriendUserSummary[];
  actionLoading: string | null;
  onRemove: (userId: string) => void;
  onBlock: (userId: string) => void;
}) {
  if (!friends.length) return <EmptyState icon="users" title="No friends yet." body="Search for players or accept incoming requests to build your roster." />;
  return (
    <div className="col" style={{ gap: 8 }}>
      {friends.map(f => (
        <div key={f.userId} className="surface row mobile-wrap" style={{ padding: 14, gap: 12 }}>
          <Avatar user={avatarFor(f)} src={f.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f.displayName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>@{f.username} - {f.profileType}</div>
          </div>
          <div className="row mobile-actions" style={{ gap: 6 }}>
            <Button size="sm" variant="ghost" icon="x" disabled={actionLoading === `remove-${f.userId}`} onClick={() => onRemove(f.userId)}>Remove</Button>
            <Button size="sm" variant="ghost" icon="shield" disabled={actionLoading === `block-${f.userId}`} onClick={() => onBlock(f.userId)}>Block</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RequestsList({
  incoming,
  outgoing,
  actionLoading,
  onAccept,
  onDecline,
  onCancel,
}: {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  actionLoading: string | null;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}) {
  if (!incoming.length && !outgoing.length) {
    return <EmptyState icon="bell" title="No friend requests." body="Incoming and outgoing requests will appear here." />;
  }
  return (
    <div className="col" style={{ gap: 14 }}>
      {incoming.length > 0 && <div className="uppercase-label">Incoming</div>}
      {incoming.map(r => (
        <RequestRow key={r.id} user={r.sender} subtitle={`${r.sender.mutualFriendsCount} mutual friends`}>
          <Button size="sm" icon="check" disabled={actionLoading === `accept-${r.id}`} onClick={() => onAccept(r.id)}>Accept</Button>
          <Button size="sm" variant="ghost" icon="x" disabled={actionLoading === `decline-${r.id}`} onClick={() => onDecline(r.id)}>Decline</Button>
        </RequestRow>
      ))}
      {outgoing.length > 0 && <div className="uppercase-label" style={{ marginTop: 4 }}>Outgoing</div>}
      {outgoing.map(r => (
        <RequestRow key={r.id} user={r.receiver} subtitle="Request sent">
          <Button size="sm" variant="ghost" icon="x" disabled={actionLoading === `cancel-${r.id}`} onClick={() => onCancel(r.id)}>Cancel</Button>
        </RequestRow>
      ))}
    </div>
  );
}

function RequestRow({ user, subtitle, children }: { user: FriendUserSummary; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="surface row mobile-wrap" style={{ padding: 14, gap: 12 }}>
      <Avatar user={avatarFor(user)} src={user.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.displayName}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{subtitle}</div>
      </div>
      <div className="row mobile-actions" style={{ gap: 6 }}>{children}</div>
    </div>
  );
}

function UserResults({
  users,
  actionLoading,
  onSend,
  onBlock,
}: {
  users: FriendUserSummary[];
  actionLoading: string | null;
  onSend: (userId: string) => void;
  onBlock: (userId: string) => void;
}) {
  if (!users.length) return <EmptyState icon="search" title="No players found." body="Try another username or display name." />;
  return (
    <div className="col" style={{ gap: 8 }}>
      {users.map(user => (
        <div key={user.userId} className="surface row mobile-wrap" style={{ padding: 14, gap: 12 }}>
          <Avatar user={avatarFor(user)} src={user.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{user.displayName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>
              @{user.username} - {user.mutualFriendsCount} mutual - {user.friendshipStatus}
            </div>
          </div>
          <div className="row mobile-actions" style={{ gap: 6 }}>
            {user.friendshipStatus === 'None' && (
              <Button size="sm" icon="plus" disabled={actionLoading === `send-${user.userId}`} onClick={() => onSend(user.userId)}>Add</Button>
            )}
            <Button size="sm" variant="ghost" icon="shield" disabled={actionLoading === `block-${user.userId}`} onClick={() => onBlock(user.userId)}>Block</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockedList({
  blocked,
  actionLoading,
  onUnblock,
}: {
  blocked: BlockedUser[];
  actionLoading: string | null;
  onUnblock: (userId: string) => void;
}) {
  if (!blocked.length) return <EmptyState icon="shield" title="No blocked players." body="Blocked players are hidden from friend requests, search, and suggestions." />;
  return (
    <div className="col" style={{ gap: 8 }}>
      {blocked.map(item => (
        <div key={item.userId} className="surface row mobile-wrap" style={{ padding: 14, gap: 12 }}>
          <Avatar user={{ initials: item.initials, color: item.avatarFallbackColor }} src={item.avatarUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.displayName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>@{item.username}</div>
          </div>
          <Button size="sm" variant="ghost" disabled={actionLoading === `unblock-${item.userId}`} onClick={() => onUnblock(item.userId)}>Unblock</Button>
        </div>
      ))}
    </div>
  );
}

function SuggestedSidecar({
  suggestions,
  actionLoading,
  onSend,
}: {
  suggestions: FriendUserSummary[];
  actionLoading: string | null;
  onSend: (userId: string) => void;
}) {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="row between">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>People to play with</div>
        <Icon name="sparkle" size={14} style={{ color: 'var(--ice-400)' }} />
      </div>
      <div className="col" style={{ marginTop: 12, gap: 10 }}>
        {suggestions.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--text-lo)' }}>Suggestions will appear as your network grows.</div>
        ) : suggestions.map(s => (
          <div key={s.userId} className="row" style={{ gap: 10 }}>
            <Avatar user={avatarFor(s)} src={s.avatarUrl} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.displayName}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{s.mutualFriendsCount} mutual</div>
            </div>
            <Button size="sm" variant="ghost" icon="plus" disabled={actionLoading === `send-${s.userId}`} onClick={() => onSend(s.userId)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendsActivity() {
  return (
    <div className="card" style={{ padding: 18 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>Friend activity</div>
      <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-lo)' }}>
        Realtime presence and activity remain planned for later modules.
      </div>
    </div>
  );
}
