'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { GameArt } from '@/components/ui/GameArt';
import { Icon } from '@/components/ui/Icons';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, Skeleton } from '@/components/ui/EmptyState';
import { ROUTES } from '@/lib/routes';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthProvider';
import { gamesApi } from '@/features/games/gamesApi';
import type { GameCatalogDto, GameDetailResult, GameEntryActionDto, GameTombstoneDto } from '@/features/games/types';
import { QuickMatchModal } from '@/components/lobby/QuickMatchModal';
import { CreateLobbyModal } from '@/components/lobby/CreateLobbyModal';
import { InviteFriendModal } from '@/components/friends/InviteFriendModal';

// Real module names (docs/ai-workflow/module-registry.md) for honest "coming later" explanations —
// never invent a name for a module not in the registry.
const MODULE_NAMES: Record<number, string> = {
  6: 'Lobby & Matchmaking System',
  8: 'Generic Match Room & Match State',
  9: 'Solo vs AI Platform Flow',
  10: 'Stats, Achievements & Leaderboards',
};

const ACTION_META: Record<GameEntryActionDto['action'], { icon: string; title: string; color: string }> = {
  'play-vs-ai':       { icon: 'ai',         title: 'Play vs AI',       color: '#F0394B' },
  'quick-match':      { icon: 'bolt',       title: 'Quick match',      color: '#34D399' },
  'create-lobby':     { icon: 'plus',       title: 'Create lobby',     color: '#A78BFA' },
  'invite-friend':    { icon: 'users',      title: 'Invite friend',    color: '#38BDF8' },
  'enter-match-room': { icon: 'controller', title: 'Enter match room', color: '#FBBF24' },
};

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

function reasonFor(a: GameEntryActionDto): string {
  const moduleName = MODULE_NAMES[a.ownerModule];
  return moduleName
    ? `Available once Module ${a.ownerModule} — ${moduleName} ships.`
    : `Available once Module ${a.ownerModule} ships.`;
}

// The action list is a fixed catalogue, not per-game — even once M6 flips an action's status to 'enabled',
// a specific game may still not actually support it, so the client re-checks it against that game.
function gatingReason(a: GameEntryActionDto, game: GameCatalogDto): string | null {
  const livePlayActions: GameEntryActionDto['action'][] = ['quick-match', 'create-lobby', 'invite-friend'];
  if (livePlayActions.includes(a.action) && game.lifecycle !== 'Available') {
    return game.lifecycle === 'ComingSoon' ? 'Coming soon.' : 'Not currently available.';
  }
  if (a.action === 'quick-match' && !game.capabilities.includes('quick-match')) return 'Not supported for this game.';
  if ((a.action === 'create-lobby' || a.action === 'invite-friend') && game.maxPlayers <= 1) return 'This is a solo game.';
  return null;
}

export function GameDetailPage({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { status } = useAuth();

  const [result, setResult] = useState<GameDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [tab, setTab] = useState('overview');

  const [isFavorited, setIsFavorited] = useState<boolean | null>(null);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const [quickMatchOpen, setQuickMatchOpen] = useState(false);
  const [createLobbyOpen, setCreateLobbyOpen] = useState(false);
  const [inviteFriendOpen, setInviteFriendOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setNotFoundMessage(null);
    gamesApi.getDetail(gameId)
      .then(r => { if (!cancelled) setResult(r); })
      .catch(e => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          setNotFoundMessage("This game isn't available.");
          return;
        }
        setError(e instanceof ApiError ? e.message : 'Failed to load this game.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameId, retryTick]);

  useEffect(() => {
    if (status !== 'authenticated' || !result || result.kind !== 'game') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFavorited(status === 'authenticated' ? null : false);
      return;
    }
    let cancelled = false;
    (async () => {
      let cursor: string | undefined;
      for (let page = 0; page < 20; page++) {
        const res = await gamesApi.getFavorites({ limit: 50, cursor }).catch(() => null);
        if (!res || cancelled) return;
        if (res.items.some(f => f.slug === gameId)) { if (!cancelled) setIsFavorited(true); return; }
        if (!res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (!cancelled) setIsFavorited(false);
    })();
    return () => { cancelled = true; };
  }, [status, result, gameId]);

  function handleEntryAction(action: GameEntryActionDto['action']) {
    if (status !== 'authenticated') { setShowSignInPrompt(true); return; }
    if (action === 'quick-match') setQuickMatchOpen(true);
    else if (action === 'create-lobby') setCreateLobbyOpen(true);
    else if (action === 'invite-friend') setInviteFriendOpen(true);
  }

  async function toggleFavorite() {
    if (status !== 'authenticated') { setShowSignInPrompt(true); return; }
    if (isFavorited === null || favoriteBusy) return;
    const was = isFavorited;
    setFavoriteError(null);
    setIsFavorited(!was);
    setFavoriteBusy(true);
    try {
      if (was) await gamesApi.unfavorite(gameId);
      else await gamesApi.favorite(gameId);
    } catch (e) {
      setIsFavorited(was);
      if (e instanceof ApiError && e.status === 401) setShowSignInPrompt(true);
      else setFavoriteError(e instanceof ApiError ? e.message : 'Failed to update favorite.');
    } finally {
      setFavoriteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <Skeleton h={32} w={160} />
        <div style={{ marginTop: 18 }}><Skeleton h={400} /></div>
      </div>
    );
  }

  if (notFoundMessage) {
    return (
      <div className="page">
        <div className="card-elev" style={{ padding: 40, textAlign: 'center', color: 'var(--text-lo)' }}>
          {notFoundMessage}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon="signal"
          title="Couldn't load this game."
          body={error}
          action={<Button icon="refresh" onClick={() => setRetryTick(t => t + 1)}>Retry</Button>}
        />
      </div>
    );
  }

  if (!result) return null;

  if (result.kind === 'tombstone') {
    return <TombstonePage tombstone={result.tombstone} onBack={() => router.push(ROUTES.games)} />;
  }

  const game = result.game;

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => router.push(ROUTES.games)} style={{ alignSelf: 'flex-start' }}>
        <Icon name="chevronLeft" size={14} /> Game library
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 18 }}>
        <div className="card-elev" style={{ padding: 0, overflow: 'hidden' }}>
          <GameArt game={game} subtitle={subtitleFor(game)} h={260} />
          <div style={{ padding: 22 }}>
            <div className="row between" style={{ flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="font-display" style={{ fontSize: 32, fontWeight: 600, letterSpacing: '-0.02em' }}>{game.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-lo)', marginTop: 4 }}>{subtitleFor(game)}</div>
              </div>
              <FavoriteToggle isFavorited={isFavorited} busy={favoriteBusy} onToggle={toggleFavorite} />
            </div>

            {showSignInPrompt && (
              <div className="surface" style={{ marginTop: 12, padding: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                <Icon name="lock" size={14} style={{ color: 'var(--text-lo)' }} />
                <span style={{ fontSize: 13, flex: 1 }}>Sign in to favorite games.</span>
                <Button size="sm" onClick={() => router.push(ROUTES.login)}>Sign in</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSignInPrompt(false)}>Dismiss</Button>
              </div>
            )}
            {favoriteError && (
              <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger)' }}>{favoriteError}</div>
            )}

            <div className="row" style={{ gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
              <span className="chip">{titleCase(game.category)}</span>
              {game.tags.map(t => <span key={t} className="chip">{titleCase(t)}</span>)}
              {game.lifecycle !== 'Available' && (
                <span className="chip chip--mono">{game.lifecycle === 'ComingSoon' ? 'Coming soon' : game.lifecycle}</span>
              )}
            </div>

            <div className="row" style={{ gap: 18, marginTop: 18, flexWrap: 'wrap' }}>
              <InlineStat
                label="Players"
                value={game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}–${game.maxPlayers}`}
                icon="users"
              />
              <InlineStat label="Duration" value={formatDuration(game)} icon="clock" />
              <InlineStat label="Difficulty" value={game.difficulty} icon="signal" />
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
                {tab === 'stats'    && <ComingSoonTab ownerModule={10} what="stats" />}
                {tab === 'leader'   && <ComingSoonTab ownerModule={10} what="leaderboards" />}
              </div>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          <div className="card-elev" style={{ padding: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Start a match</div>
            <div className="page-sub">Actions below unlock as later modules ship.</div>
            <div className="col" style={{ marginTop: 16, gap: 10 }}>
              {game.entryActions.map(a => {
                if (a.status !== 'enabled') return <DisabledActionRow key={a.action} action={a} reason={reasonFor(a)} />;
                const blocked = gatingReason(a, game);
                if (blocked) return <DisabledActionRow key={a.action} action={a} reason={blocked} />;
                return <EnabledActionRow key={a.action} action={a} onClick={() => handleEntryAction(a.action)} />;
              })}
            </div>
          </div>
        </div>
      </div>

      <QuickMatchModal open={quickMatchOpen} onClose={() => setQuickMatchOpen(false)} gameSlug={game.slug} gameName={game.name} />
      <CreateLobbyModal open={createLobbyOpen} onClose={() => setCreateLobbyOpen(false)} preselectedGameSlug={game.slug} />
      <InviteFriendModal open={inviteFriendOpen} onClose={() => setInviteFriendOpen(false)} />
    </div>
  );
}

function FavoriteToggle({ isFavorited, busy, onToggle }: { isFavorited: boolean | null; busy: boolean; onToggle: () => void }) {
  const known = isFavorited !== null;
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={onToggle}
      disabled={busy}
      aria-disabled={busy}
      aria-pressed={known ? isFavorited : undefined}
      title={known ? (isFavorited ? 'Remove from favorites (Enter)' : 'Add to favorites (Enter)') : 'Favorite'}
    >
      <Icon name="star" size={14} style={{ color: known && isFavorited ? '#FBBF24' : undefined }} />
      {known && isFavorited ? 'Favorited' : 'Favorite'}
    </button>
  );
}

function DisabledActionRow({ action, reason }: { action: GameEntryActionDto; reason: string }) {
  const meta = ACTION_META[action.action];
  return (
    <button
      className="surface row"
      disabled
      aria-disabled="true"
      title={reason}
      style={{ padding: 14, gap: 12, width: '100%', textAlign: 'left', border: '1px solid var(--border-1)', opacity: 0.55, cursor: 'not-allowed' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}1f`, color: meta.color, display: 'grid', placeItems: 'center', border: `1px solid ${meta.color}44` }}>
        <Icon name={meta.icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-hi)' }}>{meta.title}</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>{reason}</div>
      </div>
    </button>
  );
}

function EnabledActionRow({ action, onClick }: { action: GameEntryActionDto; onClick: () => void }) {
  const meta = ACTION_META[action.action];
  return (
    <button
      className="surface row"
      onClick={onClick}
      style={{ padding: 14, gap: 12, width: '100%', textAlign: 'left', border: '1px solid var(--border-1)', cursor: 'pointer' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}1f`, color: meta.color, display: 'grid', placeItems: 'center', border: `1px solid ${meta.color}44` }}>
        <Icon name={meta.icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-hi)' }}>{meta.title}</div>
      </div>
      <Icon name="chevronRight" size={14} style={{ color: 'var(--text-lo)' }} />
    </button>
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

function OverviewTab({ game }: { game: GameCatalogDto }) {
  return (
    <div className="col" style={{ gap: 14 }}>
      <p style={{ fontSize: 13.5 }}>{game.summary}</p>
      <div className="grid grid-3">
        <Capsule title="Avg. session" value={formatDuration(game)} />
        <Capsule
          title="Players"
          value={game.minPlayers === game.maxPlayers ? `${game.minPlayers}` : `${game.minPlayers}–${game.maxPlayers}`}
        />
        <Capsule title="Category" value={titleCase(game.category)} />
      </div>
    </div>
  );
}

function RulesTab({ game }: { game: GameCatalogDto }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      <p style={{ fontSize: 13.5 }}>{game.rulesSummary}</p>
      <div className="surface" style={{ padding: 14, fontSize: 12.5, color: 'var(--text-lo)' }}>
        Detailed rules — coming soon.
      </div>
    </div>
  );
}

function ComingSoonTab({ ownerModule, what }: { ownerModule: number; what: string }) {
  const moduleName = MODULE_NAMES[ownerModule];
  return (
    <EmptyState
      icon="trophy"
      title={`No ${what} yet.`}
      body={moduleName ? `Available once Module ${ownerModule} — ${moduleName} ships.` : `Available once Module ${ownerModule} ships.`}
    />
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

function TombstonePage({ tombstone, onBack }: { tombstone: GameTombstoneDto; onBack: () => void }) {
  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <Icon name="chevronLeft" size={14} /> Game library
      </button>
      <div style={{ marginTop: 18 }}>
        <EmptyState
          icon="library"
          title={`${tombstone.name} has been retired.`}
          body="This game is no longer available to play."
        />
      </div>
    </div>
  );
}
