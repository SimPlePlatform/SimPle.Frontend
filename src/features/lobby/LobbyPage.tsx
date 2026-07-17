'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState, Skeleton } from '@/components/ui/EmptyState';
import { InviteFriendModal } from '@/components/friends/InviteFriendModal';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthProvider';
import { lobbyApi } from '@/features/lobby/lobbyApi';
import { lobbyErrorMessage } from '@/features/lobby/lobbyErrors';
import { LobbyActions } from '@/features/lobby/types';
import type { GameCapabilityProfileDto, LobbyDto, LobbySeatDto, UpdateLobbySettingsRequestDto } from '@/features/lobby/types';
import { ApiError } from '@/lib/api-client';
import { ROUTES } from '@/lib/routes';

const POLL_MS = 3000;

function newIdempotencyKey(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function LobbyPage({ lobbyId }: { lobbyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [lobby, setLobby] = useState<LobbyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [revealedCredential, setRevealedCredential] = useState<{ code: string; linkToken: string } | null>(null);
  const [capProfile, setCapProfile] = useState<GameCapabilityProfileDto | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearStoredCredential = useCallback(() => {
    try { sessionStorage.removeItem(`lobby-credential:${lobbyId}`); } catch { /* best effort */ }
    setRevealedCredential(null);
  }, [lobbyId]);

  const load = useCallback(async () => {
    try {
      const next = await lobbyApi.get(lobbyId);
      setLobby(next);
      if (next.state === 'Closed') clearStoredCredential();
      setLoadError(null);
      setNotFound(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) { clearStoredCredential(); setNotFound(true); return; }
      setLoadError(lobbyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [lobbyId, clearStoredCredential]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    load();
    pollRef.current = setInterval(load, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`lobby-credential:${lobbyId}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setRevealedCredential(JSON.parse(raw));
    } catch {
      // sessionStorage unavailable — the code just stays hidden until reveal/rotate.
    }
  }, [lobbyId]);

  // Settings-editor bounds. Every game has exactly one capability version today, so the active profile always
  // equals the lobby's pinned one — this would need a version-specific read if a game ever grows a second version.
  const isHost = lobby?.hostUserId === user?.id;
  useEffect(() => {
    if (!lobby || !isHost) return;
    let cancelled = false;
    lobbyApi.getCapabilityProfile(lobby.gameSlug).then(p => { if (!cancelled) setCapProfile(p); }).catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.gameSlug, isHost]);

  async function withBusy(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(lobbyErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const setReady = (isReady: boolean) => withBusy(async () => {
    if (!lobby) return;
    setLobby(await lobbyApi.setReadiness(lobbyId, { isReady, expectedRevision: lobby.revision }));
  });

  const leave = () => withBusy(async () => {
    await lobbyApi.leave(lobbyId);
    clearStoredCredential();
    router.push(ROUTES.dashboard);
  });

  const start = () => withBusy(async () => {
    if (!lobby) return;
    const result = await lobbyApi.start(lobbyId, { expectedRevision: lobby.revision, idempotencyKey: newIdempotencyKey() });
    router.push(ROUTES.room(result.lobbyId));
  });

  const kick = (targetUserId: string) => withBusy(async () => {
    if (!lobby) return;
    setLobby(await lobbyApi.kick(lobbyId, { targetUserId, expectedRevision: lobby.revision }));
  });

  const updateSetting = (patch: Partial<Pick<UpdateLobbySettingsRequestDto, 'privacy' | 'timeControlId' | 'rated' | 'spectatorPolicy' | 'tieBreakRuleId'>>) => withBusy(async () => {
    if (!lobby) return;
    setLobby(await lobbyApi.updateSettings(lobbyId, {
      gameSlug: lobby.gameSlug,
      capabilityVersion: lobby.capabilityVersion,
      privacy: lobby.privacy,
      maxPlayers: lobby.maxPlayers,
      timeControlId: lobby.timeControlId,
      rated: lobby.rated,
      spectatorPolicy: lobby.spectatorPolicy,
      tieBreakRuleId: lobby.tieBreakRuleId,
      aiFillRequested: lobby.aiFillRequested,
      expectedRevision: lobby.revision,
      ...patch,
    }));
  });

  const joinAsNonMember = () => withBusy(async () => {
    try {
      setLobby(await lobbyApi.join({ lobbyId }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
        return;
      }
      throw e;
    }
  });

  const rotateCredential = () => withBusy(async () => {
    const cred = await lobbyApi.rotateCredential(lobbyId);
    const revealed = { code: cred.code, linkToken: cred.linkToken };
    setRevealedCredential(revealed);
    try { sessionStorage.setItem(`lobby-credential:${lobbyId}`, JSON.stringify(revealed)); } catch { /* best effort */ }
    toast.push({ kind: 'success', title: 'Code rotated', body: 'The previous code and link no longer work.' });
  });

  const copyCode = () => {
    if (!revealedCredential) return;
    navigator.clipboard.writeText(revealedCredential.code).catch(() => {});
    toast.push({ kind: 'success', title: 'Lobby code copied' });
  };

  const copyLink = () => {
    if (!revealedCredential) return;
    navigator.clipboard.writeText(`https://simple.gg/j/${revealedCredential.linkToken}`).catch(() => {});
    toast.push({ kind: 'success', title: 'Invite link copied' });
  };

  if (loading) {
    return (
      <div className="page">
        <Skeleton h={32} w={160} />
        <div style={{ marginTop: 18 }}><Skeleton h={400} /></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page">
        <EmptyState
          icon="link"
          title="Lobby not found."
          body="That lobby code or link is invalid, expired, or closed."
          action={<Button onClick={() => router.push(ROUTES.dashboard)}>Back to dashboard</Button>}
        />
      </div>
    );
  }

  if (loadError || !lobby) {
    return (
      <div className="page">
        <EmptyState
          icon="signal"
          title="Couldn't load this lobby."
          body={loadError ?? 'Something went wrong.'}
          action={<Button icon="refresh" onClick={load}>Retry</Button>}
        />
      </div>
    );
  }

  const me = lobby.seats.find(s => s.identity.userId === user?.id);
  const emptySeats = Math.max(0, lobby.maxPlayers - lobby.seats.length);
  const allReady = lobby.seats.length > 0 && lobby.seats.every(s => s.isReady);
  const canEditSettings = isHost && lobby.allowedActions.includes(LobbyActions.Settings) && !!capProfile;
  const lobbyFull = lobby.seats.length >= lobby.maxPlayers;
  const canJoinAsViewer = !me && lobby.privacy === 'Public' && lobby.state === 'Open';

  return (
    <div className="page">
      <div className="between" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div className="row" style={{ gap: 8 }}>
            <span className="chip chip--red chip--mono"><span className="dot dot--playing" />{lobby.state}</span>
            <span className="chip chip--mono">{lobby.privacy}</span>
            <span className="chip chip--mono">{lobby.timeControlId}</span>
          </div>
          <div className="page-title" style={{ marginTop: 10 }}>{lobby.gameSlug} · Lobby</div>
          <div className="page-sub">{isHost ? 'Hosted by you' : 'Hosted by another player'} · region {lobby.resolvedRegion}</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {revealedCredential ? (
            <button
              className="chip chip--mono"
              onClick={copyCode}
              style={{ height: 32, padding: '0 12px', cursor: 'pointer', border: '1px solid var(--border-2)', background: 'var(--bg-2)' }}
            >
              <Icon name="link" size={12} />
              <span style={{ color: 'var(--text-hi)', fontWeight: 600, margin: '0 6px' }}>{revealedCredential.code}</span>
              <Icon name="copy" size={12} style={{ color: 'var(--text-lo)' }} />
            </button>
          ) : lobby.allowedActions.includes(LobbyActions.RotateCredential) ? (
            <Button variant="ghost" size="sm" icon="link" onClick={rotateCredential} disabled={busy}>Reveal code</Button>
          ) : null}
          {revealedCredential && <Button variant="ghost" icon="share" onClick={copyLink}>Share invite</Button>}
          {lobby.allowedActions.includes(LobbyActions.Invite) && (
            <Button variant="ghost" icon="users" onClick={() => setInviteOpen(true)}>Invite</Button>
          )}
          {lobby.allowedActions.includes(LobbyActions.Leave) && (
            <Button variant="ghost" icon="x" onClick={leave} disabled={busy}>Leave</Button>
          )}
        </div>
      </div>

      {actionError && <div role="alert" style={{ marginTop: 12, fontSize: 12.5, color: 'var(--danger)' }}>{actionError}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18, marginTop: 22 }}>
        <div className="col" style={{ gap: 18 }}>
          <div className="card-elev" style={{ padding: 22 }}>
            <div className="row between">
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                  Players · {lobby.seats.length} / {lobby.maxPlayers}
                </div>
                <div className="page-sub">Host can kick.</div>
              </div>
            </div>

            <div className="grid grid-2" style={{ marginTop: 16 }}>
              {lobby.seats.map(s => (
                <SeatCard
                  key={s.identity.userId}
                  seat={s}
                  canKick={isHost && s.identity.userId !== user?.id && lobby.allowedActions.includes(LobbyActions.Kick)}
                  onKick={() => kick(s.identity.userId)}
                  busy={busy}
                />
              ))}
              {Array.from({ length: emptySeats }).map((_, i) => <EmptySeatCard key={i} />)}
            </div>

            <div className="row between" style={{ marginTop: 18 }}>
              <div className="row" style={{ gap: 8 }}>
                {lobby.aiFillRequested && <span className="chip chip--mono"><Icon name="ai" size={11} /> AI fill requested</span>}
              </div>
              <div className="row" style={{ gap: 8 }}>
                {lobby.allowedActions.includes(LobbyActions.Ready) && me && (
                  <Toggle on={me.isReady} onChange={setReady} label={me.isReady ? 'Ready' : 'Not ready'} />
                )}
                {canJoinAsViewer ? (
                  <Button icon="plus" onClick={joinAsNonMember} disabled={busy || lobbyFull}>
                    {lobbyFull ? 'Lobby full' : 'Join lobby'}
                  </Button>
                ) : lobby.allowedActions.includes(LobbyActions.Start) ? (
                  <Button size="lg" icon="play" onClick={start} disabled={busy}>Start match</Button>
                ) : me ? (
                  // No client may invent a room (Risk #6) — Start stays disabled, naming Module 8, until the
                  // backend's own dependencyReadiness says the runtime it hands off to actually exists.
                  <Button size="lg" disabled icon="clock">{allReady ? 'Starting arrives with Module 8' : 'Waiting for ready…'}</Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>Match settings</div>
            <div className="grid grid-3" style={{ marginTop: 12 }}>
              {canEditSettings ? (
                <>
                  <SettingSelect
                    label="Time control"
                    value={lobby.timeControlId}
                    options={capProfile!.timeControls}
                    onChange={v => updateSetting({ timeControlId: v })}
                    disabled={busy}
                  />
                  <SettingSelect
                    label="Privacy"
                    value={lobby.privacy}
                    options={['Private', 'Public']}
                    onChange={v => updateSetting({ privacy: v as 'Private' | 'Public' })}
                    disabled={busy}
                  />
                  {capProfile!.ratedEligible ? (
                    <div>
                      <div className="uppercase-label">Rated</div>
                      <div style={{ marginTop: 8 }}>
                        <Toggle on={lobby.rated} onChange={v => updateSetting({ rated: v })} label={lobby.rated ? 'Ranked' : 'Casual'} />
                      </div>
                    </div>
                  ) : (
                    <ReadonlySetting label="Rated" value={lobby.rated ? 'Ranked' : 'Casual'} />
                  )}
                  <ReadonlySetting label="Region" value={lobby.resolvedRegion} />
                  <SettingSelect
                    label="Tie-break"
                    value={lobby.tieBreakRuleId}
                    options={capProfile!.tieBreakRules}
                    onChange={v => updateSetting({ tieBreakRuleId: v })}
                    disabled={busy}
                  />
                  <SettingSelect
                    label="Spectators"
                    value={lobby.spectatorPolicy}
                    options={capProfile!.spectatorPolicies}
                    onChange={v => updateSetting({ spectatorPolicy: v })}
                    disabled={busy}
                  />
                </>
              ) : (
                <>
                  <ReadonlySetting label="Time control" value={lobby.timeControlId} />
                  <ReadonlySetting label="Privacy" value={lobby.privacy} />
                  <ReadonlySetting label="Rated" value={lobby.rated ? 'Ranked' : 'Casual'} />
                  <ReadonlySetting label="Region" value={lobby.resolvedRegion} />
                  <ReadonlySetting label="Tie-break" value={lobby.tieBreakRuleId} />
                  <ReadonlySetting label="Spectators" value={lobby.spectatorPolicy} />
                </>
              )}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 18 }}>
          {!lobby.dependencyReadiness.chat && (
            <div className="card" style={{ padding: 18 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 6 }}>Chat</div>
              <div className="page-sub">Available once Module 7 — Real-Time Presence, Lobby Updates &amp; Chat ships.</div>
            </div>
          )}
        </div>
      </div>

      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} lobbyId={lobby.lobbyId} preselectedGameId={lobby.gameSlug} />
    </div>
  );
}

function SeatCard({ seat, canKick, onKick, busy }: { seat: LobbySeatDto; canKick: boolean; onKick: () => void; busy: boolean }) {
  return (
    <div
      className="surface"
      style={{
        padding: 14, display: 'flex', alignItems: 'center', gap: 12, minHeight: 80,
        borderColor: seat.isReady ? 'rgba(52,211,153,0.25)' : 'var(--border-2)',
      }}
    >
      <Avatar user={seat.identity} src={seat.identity.avatarUrl} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13.5 }}>{seat.identity.displayName}</span>
          {seat.isHost && <span className="chip chip--red chip--mono"><Icon name="crown" size={11} /> Host</span>}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>@{seat.identity.username}</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <span className={`chip ${seat.isReady ? 'chip--success' : 'chip--warn'}`}>
          <span className={`dot ${seat.isReady ? 'dot--online' : 'dot--away'}`} />
          {seat.isReady ? 'Ready' : 'Not ready'}
        </span>
        {canKick && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onKick} disabled={busy} aria-label={`Kick ${seat.identity.displayName}`}>
            <Icon name="x" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptySeatCard() {
  return (
    <div className="surface" style={{ padding: 16, borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: 12, minHeight: 80 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-3)', color: 'var(--text-lo)', display: 'grid', placeItems: 'center', border: '1px dashed var(--border-3)' }}>
        <Icon name="plus" size={16} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-md)' }}>Empty seat</div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Invite a friend to fill it</div>
      </div>
    </div>
  );
}

function SettingSelect({ label, value, options, onChange, disabled }: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label style={{ display: 'block' }}>
      <div className="uppercase-label">{label}</div>
      <select
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        style={{ marginTop: 6, width: '100%', background: 'var(--bg-3)' }}
      >
        {!options.includes(value) && <option value={value}>{value}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

function ReadonlySetting({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="uppercase-label">{label}</div>
      <div className="surface row" style={{ padding: '10px 12px', width: '100%', marginTop: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
      </div>
    </div>
  );
}
