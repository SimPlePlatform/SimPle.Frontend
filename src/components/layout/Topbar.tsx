'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { NOTIFICATIONS } from '@/mock/notifications';
import { ROUTES } from '@/lib/routes';
import { CreateLobbyModal } from '@/components/lobby/CreateLobbyModal';
import { InviteFriendModal } from '@/components/friends/InviteFriendModal';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/lib/theme';

export function Topbar() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [lobbyOpen, setLobbyOpen]  = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <header className="topbar">
      <div className="row" style={{ flex:1, gap:8 }}>
        <div style={{ position:'relative', maxWidth:480, flex:1 }}>
          <Icon name="search" size={15} style={{ position:'absolute', left:11, top:11, color:'var(--text-lo)' }} />
          <input className="input" placeholder="Search games, friends, lobbies…" style={{ paddingLeft:34 }} />
          <span className="chip chip--mono" style={{ position:'absolute', right:8, top:7, height:24, fontSize:10 }}>⌘ K</span>
        </div>
      </div>
      <div className="row" style={{ gap:8 }}>
        <Button variant="ghost" size="sm" icon="plus" onClick={() => setLobbyOpen(true)}>Create Lobby</Button>
        <Button variant="ghost" size="sm" icon="users" onClick={() => setInviteOpen(true)}>Invite</Button>
        <ThemeToggleButton />
        <NotificationBell open={notifOpen} setOpen={setNotifOpen} />
        <div style={{ width:1, height:28, background:'var(--border-1)' }} />
        <UserMenuButton />
      </div>

      <CreateLobbyModal open={lobbyOpen} onClose={() => setLobbyOpen(false)} />
      <InviteFriendModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </header>
  );
}

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className="btn btn-ghost btn-icon btn-sm"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <Icon name={isDark ? 'sun' : 'moon'} size={15} />
    </button>
  );
}

function NotificationBell({ open, setOpen }: { open: boolean; setOpen: (v: boolean | ((p: boolean) => boolean)) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const count = NOTIFICATIONS.length;

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setOpen(v => !v)} aria-label="Notifications" style={{ position:'relative' }}>
        <Icon name="bell" size={16} />
        {count > 0 && <span style={{ position:'absolute', top:4, right:5, width:7, height:7, borderRadius:999, background:'var(--red-500)', boxShadow:'0 0 0 2px var(--bg-1)' }} />}
      </button>
      {open && (
        <div className="card-elev" style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:340, zIndex:40, padding:0, overflow:'hidden' }}>
          <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-2)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontWeight:600, fontFamily:'var(--font-display)' }}>Notifications</div>
            <span className="chip chip--red chip--mono">{count} new</span>
          </div>
          <div style={{ maxHeight:360, overflow:'auto' }}>
            {NOTIFICATIONS.map(n => (
              <div key={n.id} style={{ padding:'12px 14px', borderBottom:'1px solid var(--border-1)', display:'flex', gap:10, alignItems:'flex-start' }}>
                <Avatar user={{ initials:n.initials, color:n.color }} size="sm" />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5 }}><b>{n.from}</b> <span style={{ color:'var(--text-md)' }}>{n.text}</span></div>
                  <div className="mono" style={{ fontSize:10.5, color:'var(--text-lo)', marginTop:2 }}>{n.when}</div>
                </div>
                {n.kind === 'invite' && <Button size="sm">Join</Button>}
                {n.kind === 'friend' && <Button size="sm" variant="ghost" icon="check" />}
              </div>
            ))}
          </div>
          <div style={{ padding:'10px 14px', textAlign:'center', borderTop:'1px solid var(--border-2)' }}>
            <button className="btn btn-ghost btn-sm" style={{ width:'100%' }}>Mark all read</button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenuButton() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!user) return null;

  const signOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      push({ kind:'success', title:'Signed out', body:'See you next game.' });
      router.replace(ROUTES.login);
    } catch {
      push({ title:'Sign out failed', body:'Please try again.', icon:'x' });
    } finally {
      setSigningOut(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        className="row"
        onClick={() => setOpen(value => !value)}
        style={{ background:'transparent', border:'1px solid var(--border-2)', padding:'4px 10px 4px 4px', borderRadius:999, gap:8 }}
        aria-expanded={open}
        aria-label="Account menu"
      >
        <Avatar user={{ initials:user.initials, color:user.color, status:'online' }} size="sm" showPresence />
        <span style={{ fontSize:12.5, fontWeight:500 }}>{user.displayName.split(' ')[0]}</span>
        <Icon name="chevronDown" size={13} style={{ color:'var(--text-lo)' }} />
      </button>
      {open && (
        <div className="card-elev" style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:190, zIndex:40, padding:8 }}>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'flex-start' }} onClick={() => router.push(ROUTES.profile('me'))}>
            <Icon name="user" size={14} /> My Profile
          </button>
          <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'flex-start', marginTop:4 }} onClick={() => void signOut()} disabled={signingOut}>
            <Icon name="arrowRight" size={14} /> {signingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
