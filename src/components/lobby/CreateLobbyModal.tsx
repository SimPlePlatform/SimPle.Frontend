'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameArt } from '@/components/ui/GameArt';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icons';
import { gamesApi } from '@/features/games/gamesApi';
import type { GameCatalogDto } from '@/features/games/types';
import { lobbyApi } from '@/features/lobby/lobbyApi';
import { lobbyErrorMessage } from '@/features/lobby/lobbyErrors';
import type { GameCapabilityProfileDto } from '@/features/lobby/types';
import { ROUTES } from '@/lib/routes';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-selects this game in the picker (e.g. from a game's detail page), if it's eligible to host. */
  preselectedGameSlug?: string;
}

type Step = 'loading' | 'form' | 'error';

export function CreateLobbyModal({ open, onClose, preselectedGameSlug }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<Step>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [games, setGames] = useState<GameCatalogDto[]>([]);
  const [game, setGame] = useState<GameCatalogDto | null>(null);

  const [profile, setProfile] = useState<GameCapabilityProfileDto | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [privacy, setPrivacy] = useState<'Private' | 'Public'>('Private');
  const [seats, setSeats] = useState(2);
  const [timeControlId, setTimeControlId] = useState('');
  const [rated, setRated] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('loading');
    setLoadError(null);
    setCreateError(null);
    gamesApi.list({ lifecycle: ['Available'], sort: 'name', limit: 50 })
      .then(page => {
        if (cancelled) return;
        // Create Lobby needs more than one seat — single-player games have no lobby to create.
        const eligible = page.items.filter(g => g.maxPlayers > 1);
        setGames(eligible);
        const preselected = preselectedGameSlug ? eligible.find(g => g.slug === preselectedGameSlug) : undefined;
        setGame(preselected ?? eligible[0] ?? null);
        setStep('form');
      })
      .catch(e => {
        if (cancelled) return;
        setLoadError(lobbyErrorMessage(e));
        setStep('error');
      });
    return () => { cancelled = true; };
  }, [open, preselectedGameSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!game) { setProfile(null); return; }
    let cancelled = false;
    setProfileLoading(true);
    setProfile(null);
    lobbyApi.getCapabilityProfile(game.slug)
      .then(p => {
        if (cancelled) return;
        setProfile(p);
        setSeats(Math.min(Math.max(2, p.minPlayers), p.maxPlayers));
        setTimeControlId(p.timeControls[0] ?? '');
        setRated(false);
      })
      .catch(e => { if (!cancelled) setCreateError(lobbyErrorMessage(e)); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [game]);

  async function handleCreate() {
    if (!game || !profile || creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const result = await lobbyApi.create({
        gameSlug: game.slug,
        capabilityVersion: profile.capabilityVersion,
        privacy,
        maxPlayers: seats,
        timeControlId,
        rated,
        spectatorPolicy: profile.spectatorPolicies[0] ?? '',
        tieBreakRuleId: profile.tieBreakRules[0] ?? '',
        aiFillRequested: false,
      });
      try {
        sessionStorage.setItem(
          `lobby-credential:${result.lobby.lobbyId}`,
          JSON.stringify({ code: result.credential.code, linkToken: result.credential.linkToken }),
        );
      } catch { /* sessionStorage unavailable — the host can still re-reveal via rotate. */ }
      onClose();
      router.push(ROUTES.lobby(result.lobby.lobbyId));
    } catch (e) {
      setCreateError(lobbyErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  const seatOptions = profile
    ? Array.from({ length: profile.maxPlayers - profile.minPlayers + 1 }, (_, i) => profile.minPlayers + i)
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a lobby"
      icon="plus"
      size="lg"
      footer={
        step === 'form' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button icon="play" onClick={handleCreate} disabled={!game || !profile || creating}>
              {creating ? 'Creating…' : 'Create & enter'}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>Close</Button>
        )
      }
    >
      {step === 'loading' && <div className="page-sub">Loading games…</div>}

      {step === 'error' && (
        <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{loadError}</div>
      )}

      {step === 'form' && (
        games.length === 0 ? (
          <div className="page-sub">No multiplayer games are available to host right now.</div>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            <label style={{ display: 'block' }}>
              <div style={{ marginBottom: 8 }}><span className="label">Game</span></div>
              <div className="grid grid-4" style={{ gap: 10 }}>
                {games.map(g => (
                  <button
                    key={g.slug}
                    onClick={() => setGame(g)}
                    className="surface"
                    style={{
                      padding: 8, cursor: 'pointer',
                      border: game?.slug === g.slug ? '1px solid rgba(240,57,75,0.4)' : '1px solid var(--border-1)',
                      background: game?.slug === g.slug ? 'var(--red-soft)' : undefined,
                    }}
                  >
                    <GameArt game={{ artToken: g.artToken, artColorA: g.artColorA, artColorB: g.artColorB, artAltText: g.artAltText, name: g.name }} h={70} />
                    <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{g.name}</div>
                  </button>
                ))}
              </div>
            </label>

            {profileLoading && <div className="page-sub">Loading match options…</div>}

            {profile && (
              <div className="grid grid-2">
                <label style={{ display: 'block' }}>
                  <div style={{ marginBottom: 6 }}><span className="label">Privacy</span></div>
                  <div className="tabs" style={{ width: '100%' }}>
                    {(['Private', 'Public'] as const).map(k => (
                      <button key={k} onClick={() => setPrivacy(k)} className={`tab ${privacy === k ? 'tab--active' : ''}`} style={{ flex: 1 }}>
                        {k === 'Private' ? 'Private (link)' : 'Public'}
                      </button>
                    ))}
                  </div>
                </label>
                <label style={{ display: 'block' }}>
                  <div style={{ marginBottom: 6 }}><span className="label">Seats</span></div>
                  <div className="tabs" style={{ width: '100%' }}>
                    {seatOptions.map(n => (
                      <button key={n} onClick={() => setSeats(n)} className={`tab ${seats === n ? 'tab--active' : ''}`} style={{ flex: 1 }}>{n}</button>
                    ))}
                  </div>
                </label>
                {profile.timeControls.length > 0 && (
                  <label style={{ display: 'block' }}>
                    <div style={{ marginBottom: 6 }}><span className="label">Time control</span></div>
                    <select className="input" value={timeControlId} onChange={e => setTimeControlId(e.target.value)} style={{ background: 'var(--bg-3)' }}>
                      {profile.timeControls.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                )}
                {profile.ratedEligible && (
                  <label style={{ display: 'block' }}>
                    <div style={{ marginBottom: 6 }}><span className="label">Rated</span></div>
                    <div className="row" style={{ padding: '6px 0' }}>
                      <Toggle on={rated} onChange={setRated} label={rated ? 'Ranked — affects ELO' : 'Casual — no ELO change'} />
                    </div>
                  </label>
                )}
              </div>
            )}

            <div className="surface" style={{ padding: 12 }}>
              <div className="row" style={{ gap: 10 }}>
                <Icon name="link" size={14} style={{ color: 'var(--text-lo)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-md)' }}>
                  {privacy === 'Private' ? 'A private code and link are generated once you create the lobby.' : 'Anyone can find this lobby in public search once created.'}
                </span>
              </div>
            </div>

            {createError && <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{createError}</div>}
          </div>
        )
      )}
    </Modal>
  );
}
