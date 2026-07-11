'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { GameArt } from '@/components/ui/GameArt';
import { Toggle } from '@/components/ui/Toggle';
import { Icon } from '@/components/ui/Icons';
import { GAMES } from '@/mock/games';
import { ROUTES } from '@/lib/routes';
import { TIME_CONTROLS } from '@/lib/constants';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateLobbyModal({ open, onClose }: Props) {
  const router = useRouter();
  const [game, setGame]     = useState(GAMES[3]);
  const [privacy, setPrivacy] = useState<'private'|'public'>('private');
  const [seats, setSeats]   = useState(4);
  const [time, setTime]     = useState<string>(TIME_CONTROLS[1]);
  const [rated, setRated]   = useState(true);

  const handleCreate = () => {
    onClose();
    router.push(ROUTES.lobby('SP-7F-29'));
  };

  return (
    <Modal open={open} onClose={onClose} title="Create a lobby" icon="plus" size="lg" footer={
      <>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button icon="play" onClick={handleCreate}>Create &amp; enter</Button>
      </>
    }>
      <div className="col" style={{ gap:14 }}>
        <label style={{ display:'block' }}>
          <div style={{ marginBottom:8 }}>
            <span className="label">Game</span>
          </div>
          <div className="grid grid-4" style={{ gap:10 }}>
            {GAMES.slice(0,8).map(g => (
              <button key={g.id} onClick={() => setGame(g)} className="surface" style={{ padding:8, cursor:'pointer', border: game.id === g.id ? '1px solid rgba(240,57,75,0.4)' : '1px solid var(--border-1)', background: game.id === g.id ? 'var(--red-soft)' : undefined }}>
                <GameArt game={{ artToken: g.art.kind, artColorA: g.art.a, artColorB: g.art.b, artAltText: g.name, name: g.name }} h={70} />
                <div style={{ fontSize:11.5, fontWeight:600, marginTop:6, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{g.name}</div>
              </button>
            ))}
          </div>
        </label>

        <div className="grid grid-2">
          <label style={{ display:'block' }}>
            <div style={{ marginBottom:6 }}><span className="label">Privacy</span></div>
            <div className="tabs" style={{ width:'100%' }}>
              {(['private','public'] as const).map(k => (
                <button key={k} onClick={() => setPrivacy(k)} className={`tab ${privacy === k ? 'tab--active' : ''}`} style={{ flex:1 }}>
                  {k === 'private' ? 'Private (link)' : 'Public'}
                </button>
              ))}
            </div>
          </label>
          <label style={{ display:'block' }}>
            <div style={{ marginBottom:6 }}><span className="label">Seats</span></div>
            <div className="tabs" style={{ width:'100%' }}>
              {[2,4,6,8].map(n => (
                <button key={n} onClick={() => setSeats(n)} className={`tab ${seats === n ? 'tab--active' : ''}`} style={{ flex:1 }}>{n}</button>
              ))}
            </div>
          </label>
          <label style={{ display:'block' }}>
            <div style={{ marginBottom:6 }}><span className="label">Time control</span></div>
            <select className="input" value={time} onChange={e => setTime(e.target.value)} style={{ background:'var(--bg-3)' }}>
              {TIME_CONTROLS.map(o => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label style={{ display:'block' }}>
            <div style={{ marginBottom:6 }}><span className="label">Rated</span></div>
            <div className="row" style={{ padding:'6px 0' }}>
              <Toggle on={rated} onChange={setRated} label={rated ? 'Ranked — affects ELO' : 'Casual — no ELO change'} />
            </div>
          </label>
        </div>

        <div className="surface" style={{ padding:12 }}>
          <div className="row" style={{ gap:10 }}>
            <Icon name="link" size={14} style={{ color:'var(--text-lo)' }} />
            <span className="mono" style={{ fontSize:12, color:'var(--text-md)' }}>simple.gg/j/SP-7F-29</span>
            <div className="grow" />
            <span className="chip chip--mono">Auto-expires 30m</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
