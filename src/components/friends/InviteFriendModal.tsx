'use client';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { FRIENDS } from '@/mock/friends';
import { GAMES } from '@/mock/games';

interface Props {
  open: boolean;
  onClose: () => void;
  preselectedGameId?: string;
}

export function InviteFriendModal({ open, onClose, preselectedGameId }: Props) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [game, setGame] = useState(preselectedGameId ?? GAMES[3].id);

  useEffect(() => {
    if (!open) return;
    // A newly opened invite starts with an empty selection and search.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(new Set());
    setQ('');
    if (preselectedGameId) setGame(preselectedGameId);
  }, [open, preselectedGameId]);

  const online = FRIENDS.filter(f => f.status !== 'offline');
  const friends = online.filter(f => !q || f.display.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setPicked(p => {
    const next = new Set(p);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    return next;
  });

  const send = () => {
    const g = GAMES.find(x => x.id === game);
    toast.push({ kind:'success', title:`Invite sent to ${picked.size} friend${picked.size===1?'':'s'}`, body:`${g?.name} · lobby SP-7F-29` });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite friends" icon="users" size="lg" footer={
      <>
        <Button variant="ghost" icon="copy" onClick={() => toast.push({ kind:'info', title:'Link copied', body:'https://simple.gg/j/SP-7F-29' })}>Copy link</Button>
        <div className="grow" />
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button disabled={picked.size === 0} icon="send" onClick={send}>Send invite ({picked.size})</Button>
      </>
    }>
      <div className="col" style={{ gap:14 }}>
        <label style={{ display:'block' }}>
          <div className="row between" style={{ marginBottom:6 }}>
            <span className="label">Game</span>
          </div>
          <div className="row mobile-wrap" style={{ gap:6, flexWrap:'wrap' }}>
            {GAMES.slice(0,6).map(g => (
              <button key={g.id} onClick={() => setGame(g.id)} className="chip" style={{
                cursor:'pointer', height:30,
                background: game === g.id ? 'var(--red-soft)' : undefined,
                color:      game === g.id ? 'var(--red-400)' : undefined,
                borderColor:game === g.id ? 'rgba(240,57,75,0.3)' : undefined,
              }}>{g.name}</button>
            ))}
          </div>
        </label>

        <label style={{ display:'block' }}>
          <div className="row between" style={{ marginBottom:6 }}>
            <span className="label">Friends online · {friends.length}</span>
          </div>
          <div style={{ position:'relative' }}>
            <Icon name="search" size={14} style={{ position:'absolute', left:10, top:11, color:'var(--text-lo)' }} />
            <input className="input" placeholder="Search by name…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft:32 }} />
          </div>
        </label>

        <div style={{ maxHeight:280, overflow:'auto', borderRadius:10, border:'1px solid var(--border-1)' }}>
          {friends.length === 0 ? (
            <EmptyState icon="users" title="Nobody online." body="Try inviting via shareable link instead." />
          ) : friends.map(f => {
            const on = picked.has(f.id);
            return (
              <button key={f.id} onClick={() => toggle(f.id)} className="row mobile-wrap" style={{ width:'100%', padding:'10px 12px', borderBottom:'1px solid var(--border-1)', background: on ? 'var(--red-soft)' : 'transparent', gap:12, textAlign:'left' }}>
                <Avatar user={f} showPresence size="sm" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>{f.display}</div>
                  <div className="mono" style={{ fontSize:11, color:'var(--text-lo)' }}>{f.activity}</div>
                </div>
                <span className="chip chip--mono" style={{ height:22 }}>{f.elo}</span>
                <span style={{ width:18, height:18, borderRadius:5, background: on ? 'var(--red-500)' : 'transparent', border:`1.5px solid ${on ? 'var(--red-500)' : 'var(--border-3)'}`, display:'grid', placeItems:'center' }}>
                  {on && <Icon name="check" size={12} style={{ color:'#fff' }} />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
