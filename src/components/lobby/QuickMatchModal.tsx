'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icons';
import { lobbyApi } from '@/features/lobby/lobbyApi';
import { lobbyErrorMessage } from '@/features/lobby/lobbyErrors';
import { matchmakingApi } from '@/features/matchmaking/matchmakingApi';
import { matchmakingErrorMessage } from '@/features/matchmaking/matchmakingErrors';
import type { GameCapabilityProfileDto } from '@/features/lobby/types';
import type { TicketDto } from '@/features/matchmaking/types';

interface Props {
  open: boolean;
  onClose: () => void;
  gameSlug: string;
  gameName: string;
}

type Step = 'loading' | 'setup' | 'queued' | 'error';

const POLL_MS = 2000;

// Ticket create/status/cancel and expiry are fully functional pre-M8 — only the assignment step (matching a
// queued ticket to a live match) waits on Module 8's runtime, so a ticket queued today can only ever reach
// Cancelled or Expired, never Matched, until that module ships (dependencyReadiness.matchRuntime reflects this).
export function QuickMatchModal({ open, onClose, gameSlug, gameName }: Props) {
  const [step, setStep] = useState<Step>('loading');
  const [profile, setProfile] = useState<GameCapabilityProfileDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [timeControlId, setTimeControlId] = useState('');
  const [rated, setRated] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStep('loading');
    setLoadError(null);
    setSubmitError(null);
    setTicket(null);
    lobbyApi.getCapabilityProfile(gameSlug)
      .then(p => {
        if (cancelled) return;
        setProfile(p);
        setTimeControlId(p.timeControls[0] ?? '');
        setRated(false);
        setStep('setup');
      })
      .catch(e => {
        if (cancelled) return;
        setLoadError(lobbyErrorMessage(e));
        setStep('error');
      });
    return () => { cancelled = true; };
  }, [open, gameSlug]);

  useEffect(() => {
    if (step !== 'queued' || !ticket || ticket.state !== 'Queued') {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const next = await matchmakingApi.getTicket(ticket.ticketId);
        setTicket(next);
      } catch {
        // Transient poll failure — next tick retries; the ticket's own deadline/state stays server-authoritative.
      }
    }, POLL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, ticket]);

  async function handleFindMatch() {
    if (!profile || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await matchmakingApi.createTicket({
        gameSlug: profile.gameSlug,
        capabilityVersion: profile.capabilityVersion,
        mode: 'quick-match',
        playerCount: profile.minPlayers,
        timeControlId,
        rated,
      });
      setTicket(created);
      setStep('queued');
    } catch (e) {
      setSubmitError(matchmakingErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelSearch() {
    if (!ticket || cancelling) return;
    setCancelling(true);
    try {
      const cancelledTicket = await matchmakingApi.cancelTicket(ticket.ticketId);
      setTicket(cancelledTicket);
    } catch (e) {
      setSubmitError(matchmakingErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  }

  const elapsed = useElapsedSeconds(ticket?.enqueuedAtUtc, step === 'queued' && ticket?.state === 'Queued');

  return (
    <Modal open={open} onClose={onClose} title={`Quick match · ${gameName}`} icon="bolt" footer={renderFooter()}>
      {renderBody()}
    </Modal>
  );

  function renderFooter() {
    if (step === 'setup') {
      return (
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon="bolt" onClick={handleFindMatch} disabled={submitting}>
            {submitting ? 'Queuing…' : 'Find match'}
          </Button>
        </>
      );
    }
    if (step === 'queued' && ticket?.state === 'Queued') {
      return (
        <Button variant="ghost" onClick={handleCancelSearch} disabled={cancelling}>
          {cancelling ? 'Cancelling…' : 'Cancel search'}
        </Button>
      );
    }
    return <Button onClick={onClose}>Close</Button>;
  }

  function renderBody() {
    if (step === 'loading') {
      return <div className="page-sub">Loading match options…</div>;
    }

    if (step === 'error') {
      return <div role="alert" style={{ fontSize: 13, color: 'var(--danger)' }}>{loadError}</div>;
    }

    if (step === 'setup' && profile) {
      return (
        <div className="col" style={{ gap: 14 }}>
          {profile.timeControls.length > 0 && (
            <label style={{ display: 'block' }}>
              <div style={{ marginBottom: 6 }}><span className="label">Time control</span></div>
              <select
                className="input"
                value={timeControlId}
                onChange={e => setTimeControlId(e.target.value)}
                style={{ background: 'var(--bg-3)' }}
              >
                {profile.timeControls.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
          )}
          {profile.ratedEligible && (
            <div className="row" style={{ padding: '6px 0' }}>
              <Toggle on={rated} onChange={setRated} label={rated ? 'Ranked — affects ELO' : 'Casual — no ELO change'} />
            </div>
          )}
          {submitError && <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{submitError}</div>}
        </div>
      );
    }

    if (step === 'queued' && ticket) {
      return <QueueStatus ticket={ticket} elapsed={elapsed} error={submitError} />;
    }

    return null;
  }
}

function QueueStatus({ ticket, elapsed, error }: { ticket: TicketDto; elapsed: string; error: string | null }) {
  if (ticket.state === 'Matched') {
    return (
      <div className="col" style={{ gap: 10, alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
        <Icon name="check" size={22} style={{ color: 'var(--success)' }} />
        <div style={{ fontWeight: 600 }}>Match found!</div>
      </div>
    );
  }
  if (ticket.state === 'Cancelled') {
    return <div className="page-sub">Search cancelled.</div>;
  }
  if (ticket.state === 'Expired') {
    return <div className="page-sub">No match found in time. Try again later.</div>;
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: 'center' }}>
        <Icon name="signal" size={16} style={{ color: 'var(--ice-400)' }} />
        <div style={{ fontWeight: 600 }}>Searching for a match… {elapsed}</div>
      </div>
      {ticket.currentBand != null && (
        <div className="page-sub">Widening search — rating band ±{ticket.currentBand}</div>
      )}
      {!ticket.dependencyReadiness.matchRuntime && (
        <div className="surface" style={{ padding: 12, fontSize: 12.5, color: 'var(--text-lo)' }}>
          Matches can&apos;t be assigned yet — that arrives with Module 8. Your ticket will search until its deadline, then expire.
        </div>
      )}
      {error && <div role="alert" style={{ fontSize: 12.5, color: 'var(--danger)' }}>{error}</div>}
    </div>
  );
}

function useElapsedSeconds(sinceIso: string | undefined, active: boolean): string {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  if (!sinceIso || !now) return '';
  const secs = Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
