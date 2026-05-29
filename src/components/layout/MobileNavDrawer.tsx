'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/features/auth/AuthProvider';

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const ALL_NAV = [
  { href: ROUTES.dashboard,       label: 'Dashboard',    icon: 'home' },
  { href: ROUTES.games,           label: 'Game Library', icon: 'library' },
  { href: ROUTES.friends,         label: 'Friends',      icon: 'users' },
  { href: ROUTES.leaderboards,    label: 'Leaderboards', icon: 'trophy' },
  { href: ROUTES.profile('me'),   label: 'My Profile',   icon: 'user' },
  { href: ROUTES.settings,        label: 'Settings',     icon: 'settings' },
];

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Close on route change
  useEffect(() => { onClose(); }, [pathname, onClose]);

  // Trap body scroll while open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:49 }}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position:'fixed', top:0, left:0, bottom:0, width:280, zIndex:50,
          background:'var(--bg-2)', borderRight:'1px solid var(--border-1)',
          display:'flex', flexDirection:'column', padding:'18px 14px',
          gap:4,
        }}
      >
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:14, borderBottom:'1px solid var(--border-1)', marginBottom:8 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <div className="brand__logo" style={{ width:28, height:28 }} />
            <span style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:17 }}>SimPle</span>
          </div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close menu">
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Nav links */}
        {ALL_NAV.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item${active ? ' nav-item--active' : ''}`}
              style={{ minHeight:44 }}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* User info at bottom */}
        {user && (
          <div style={{ marginTop:'auto', paddingTop:14, borderTop:'1px solid var(--border-1)', display:'flex', gap:10, alignItems:'center' }}>
            <div style={{
              width:34, height:34, borderRadius:'50%',
              background: user.color, display:'grid', placeItems:'center',
              fontFamily:'var(--font-mono)', fontSize:12, fontWeight:600, color:'#fff', flexShrink:0,
            }}>
              {user.initials}
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.displayName}</div>
              <div style={{ fontSize:11, color:'var(--text-lo)' }}>@{user.username}</div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
