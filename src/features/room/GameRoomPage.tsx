'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import { CURRENT_USER } from '@/mock/users';
import { GAMES } from '@/mock/games';
import { ROUTES } from '@/lib/routes';

const SUDOKU_GIVEN = [
  5,3,0, 0,7,0, 0,0,0,
  6,0,0, 1,9,5, 0,0,0,
  0,9,8, 0,0,0, 0,6,0,
  8,0,0, 0,6,0, 0,0,3,
  4,0,0, 8,0,3, 0,0,1,
  7,0,0, 0,2,0, 0,0,6,
  0,6,0, 0,0,0, 2,8,0,
  0,0,0, 4,1,9, 0,0,5,
  0,0,0, 0,8,0, 0,7,9,
];

export function GameRoomPage({ matchId }: { matchId: string }) {
  const router = useRouter();
  const game = GAMES.find(g => matchId.startsWith(g.id)) ?? GAMES[0];
  const isAi = matchId.includes('ai');

  const [paused, setPaused] = useState(false);
  const [resolved, setResolved] = useState<'win' | 'loss' | null>(null);
  const [seconds, setSeconds] = useState(7 * 60 + 22);
  const [turn, setTurn] = useState<'you' | 'opp'>('you');
  const [score] = useState({ you: 24, opp: 19 });
  const [selected, setSelected] = useState(40);

  useEffect(() => {
    if (paused || resolved) return;
    const t = setInterval(() => setSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [paused, resolved]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  const opp: PlayerUser = isAi
    ? { display: 'AI · Hard', initials: 'AI', color: '#A78BFA', elo: 0, region: 'local' }
    : { display: 'Priya Raman', initials: 'PR', color: '#38BDF8', elo: 1910, region: 'NL' };

  return (
    <div style={{ padding: '22px 36px 36px', maxWidth: 1440, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => router.push(ROUTES.games)}>
            <Icon name="chevronLeft" size={14} /> Exit
          </button>
          <span className="chip chip--mono"><Icon name="controller" size={12} /> {game.name}</span>
          <span className="chip chip--mono">{isAi ? 'Vs AI · Hard' : 'Vs Friend'}</span>
          <span className="chip chip--mono">Lobby SP-7F-29</span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button size="sm" variant="ghost" icon="pause" onClick={() => setPaused(true)}>Pause</Button>
          <Button size="sm" variant="ghost" icon="flag" onClick={() => setResolved('loss')}>Forfeit</Button>
          <Button size="sm" variant="ghost" icon="settings">Settings</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gap: 18, alignItems: 'start' }}>
        <div className="col" style={{ gap: 14 }}>
          <PlayerPanel user={CURRENT_USER} you turn={turn === 'you'} score={score.you} timer="04:18" />
          <div className="card" style={{ padding: 18 }}>
            <div className="uppercase-label">Round timer</div>
            <div className="font-display" style={{ fontSize: 36, fontWeight: 600, fontVariantNumeric: 'tabular-nums', marginTop: 6 }}>{mm}:{ss}</div>
            <div className="bar" style={{ marginTop: 10 }}><div className="bar__fill" style={{ width: `${(seconds / (7 * 60 + 22)) * 100}%` }} /></div>
          </div>
          <PlayerPanel user={opp} turn={turn === 'opp'} score={score.opp} timer="05:02" />
        </div>

        <div className="card-elev" style={{ padding: 20 }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip chip--red chip--mono"><span className="dot dot--playing" /> {turn === 'you' ? 'Your move' : "Opponent's move"}</span>
              <span className="chip chip--mono">Round 3 / 5</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <Button size="sm" variant="ghost" icon="bolt">Hint</Button>
              <Button size="sm" variant="ghost" icon="refresh">Undo</Button>
            </div>
          </div>
          <SudokuBoard selected={selected} setSelected={setSelected} />
          <NumberPad onPick={() => setTurn(t => t === 'you' ? 'opp' : 'you')} />
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="row between">
              <div className="uppercase-label">Score</div>
              <span className="chip chip--mono">Best of 5</span>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 14 }}>
              <ScorePill label="You" value={score.you} />
              <ScorePill label={opp.display.split(' ')[0]} value={score.opp} dim />
            </div>
          </div>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 6 }}>Match chat</div>
            <div className="page-sub">Available once match-scoped realtime ships in a later module.</div>
          </div>
        </div>
      </div>

      <Modal
        open={paused}
        onClose={() => setPaused(false)}
        title="Game paused"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setResolved('loss'); setPaused(false); }}>Forfeit match</Button>
            <Button onClick={() => setPaused(false)} icon="play">Resume</Button>
          </>
        }
      >
        <p>The match is paused for both players. Your opponent has been notified.</p>
        <div className="surface" style={{ marginTop: 14, padding: 12 }}>
          <div className="row" style={{ gap: 8 }}>
            <Icon name="shield" size={14} style={{ color: 'var(--text-lo)' }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>Pauses are limited to 2 per match (1 used).</span>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!resolved}
        onClose={() => setResolved(null)}
        title={resolved === 'win' ? 'Victory' : 'Defeat'}
        footer={
          <>
            <Button variant="ghost" onClick={() => router.push(ROUTES.dashboard)}>Back to dashboard</Button>
            <Button icon="refresh" onClick={() => { setResolved(null); setSeconds(7 * 60 + 22); }}>Rematch</Button>
          </>
        }
      >
        <div style={{ textAlign: 'center', padding: '6px 0 8px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 600, color: resolved === 'win' ? 'var(--success)' : 'var(--danger)' }}>
            {resolved === 'win' ? '+18 ELO' : '-12 ELO'}
          </div>
          <div style={{ marginTop: 6, color: 'var(--text-lo)' }}>
            {resolved === 'win' ? "Smooth finish. You're now 4 ELO from Diamond II." : 'Hard one. Replay or queue a fresh match.'}
          </div>
        </div>
        <div className="grid grid-3" style={{ marginTop: 14 }}>
          <Capsule title="Accuracy" value="94%" />
          <Capsule title="Best move" value="g7→f6" />
          <Capsule title="Duration" value={`${mm}:${ss}`} />
        </div>
      </Modal>
    </div>
  );
}

interface PlayerUser { display: string; initials: string; color: string; elo: number; region: string; status?: string; }

function PlayerPanel({ user, you, turn, score, timer }: {
  user: PlayerUser;
  you?: boolean; turn: boolean; score: number; timer: string;
}) {
  return (
    <div className="card" style={{
      padding: 16,
      border: turn ? '1px solid rgba(240,57,75,0.4)' : '1px solid var(--border-1)',
      boxShadow: turn ? '0 0 0 1px rgba(240,57,75,0.18), 0 12px 30px rgba(240,57,75,0.16)' : 'none',
      transition: '.2s',
    }}>
      <div className="row" style={{ gap: 12 }}>
        <Avatar user={user} showPresence />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{user.display}</span>
            {you && <span className="chip chip--red chip--mono">You</span>}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>
            {user.elo ? `${user.elo} ELO · ${user.region}` : '—'}
          </div>
        </div>
      </div>
      <div className="row between" style={{ marginTop: 12 }}>
        <div>
          <div className="uppercase-label">Score</div>
          <div className="font-display" style={{ fontSize: 24, fontWeight: 600 }}>{score}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="uppercase-label">Clock</div>
          <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{timer}</div>
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value, dim }: { label: string; value: number; dim?: boolean }) {
  return (
    <div style={{
      flex: 1, textAlign: 'center', padding: '10px 6px', borderRadius: 10,
      background: dim ? 'var(--bg-3)' : 'var(--red-soft)',
      border: `1px solid ${dim ? 'var(--border-2)' : 'rgba(240,57,75,0.3)'}`,
    }}>
      <div className="uppercase-label" style={{ color: dim ? 'var(--text-lo)' : 'var(--red-400)' }}>{label}</div>
      <div className="font-display" style={{ fontSize: 24, fontWeight: 600, color: dim ? 'var(--text-hi)' : 'var(--red-400)' }}>{value}</div>
    </div>
  );
}

function SudokuBoard({ selected, setSelected }: { selected: number; setSelected: (i: number) => void }) {
  const row = Math.floor(selected / 9);
  const col = selected % 9;
  const box = [Math.floor(row / 3), Math.floor(col / 3)];
  return (
    <div className="sudoku" style={{ maxWidth: 520, margin: '0 auto' }}>
      {Array.from({ length: 81 }).map((_, i) => {
        const v = SUDOKU_GIVEN[i];
        const r = Math.floor(i / 9), c = i % 9;
        const isSel = i === selected;
        const isPeer = !isSel && (r === row || c === col || (Math.floor(r / 3) === box[0] && Math.floor(c / 3) === box[1]));
        const isHint = i === selected + 1;
        const cls = ['sudoku__cell'];
        if (v) cls.push('sudoku__cell--given');
        if (isPeer) cls.push('sudoku__cell--peer');
        if (isSel) cls.push('sudoku__cell--selected');
        if (isHint) cls.push('sudoku__cell--hint');
        return (
          <button key={i} className={cls.join(' ')} onClick={() => setSelected(i)}>
            {v || (isHint ? <span style={{ fontSize: 12, opacity: 0.65 }}>4</span> : '')}
          </button>
        );
      })}
    </div>
  );
}

function NumberPad({ onPick }: { onPick: (n: number) => void }) {
  return (
    <div className="row" style={{ marginTop: 16, gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
        <button key={n} className="btn btn-secondary mono" style={{ width: 44, height: 44, fontSize: 18 }} onClick={() => onPick(n)}>{n}</button>
      ))}
      <button className="btn btn-ghost" style={{ width: 44, height: 44 }}><Icon name="x" /></button>
      <button className="btn btn-ghost" style={{ width: 44, height: 44 }}><Icon name="edit" /></button>
    </div>
  );
}

function Capsule({ title, value }: { title: string; value: string }) {
  return (
    <div className="surface" style={{ padding: 12 }}>
      <div className="uppercase-label">{title}</div>
      <div className="mono" style={{ fontWeight: 600, fontSize: 15, marginTop: 4 }}>{value}</div>
    </div>
  );
}
