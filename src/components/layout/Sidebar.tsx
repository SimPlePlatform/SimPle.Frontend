'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/features/auth/AuthProvider';
import { useFriendSummary } from '@/features/friends/FriendSummaryContext';

const NAV_SESSION = [
  { href: ROUTES.lobby('SP-7F-29'), label: 'Active Lobby', icon: 'controller' },
  { href: ROUTES.profile('me'), label: 'My Profile', icon: 'user' },
];
const NAV_META = [
  { href: ROUTES.settings, label: 'Settings', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const { summary, loading, error } = useFriendSummary();
  const friendBadge = (!loading && !error && summary) ? summary.incomingRequestCount : 0;

  const NAV_PRIMARY = [
    { href: ROUTES.dashboard, label: 'Dashboard', icon: 'home' },
    { href: ROUTES.games, label: 'Game Library', icon: 'library' },
    { href: ROUTES.friends, label: 'Friends', icon: 'users', badgeCount: friendBadge },
    { href: ROUTES.leaderboards, label: 'Leaderboards', icon: 'trophy' },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__logo" aria-hidden="true" />
        <div>
          <div className="brand__name">SimPle</div>
          <div className="brand__tag">v0.4 - beta</div>
        </div>
      </div>

      <NavGroup label="Play" items={NAV_PRIMARY} isActive={isActive} />
      <NavGroup label="Session" items={NAV_SESSION} isActive={isActive} />
      <NavGroup label="Account" items={NAV_META} isActive={isActive} />

      <div style={{ marginTop:'auto' }}>
        <UserCard />
      </div>
    </aside>
  );
}

interface NavItem { href: string; label: string; icon: string; badgeCount?: number; }

function NavGroup({ label, items, isActive }: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="nav-group">
      <div className="nav-group__label">{label}</div>
      {items.map(item => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} className={`nav-item ${active ? 'nav-item--active' : ''}`}>
            <Icon name={item.icon} size={17} stroke={active ? 2 : 1.75} />
            <span>{item.label}</span>
            {'badgeCount' in item && item.badgeCount ? (
              <span className="nav-item__badge">{item.badgeCount}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

function UserCard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="surface" style={{ padding:10, display:'flex', gap:10, alignItems:'center' }}>
      <Avatar user={{ initials:user.initials, color:user.color, status:'online' }} showPresence />
      <div style={{ minWidth:0, flex:1 }}>
        <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.displayName}</div>
        <div className="mono" style={{ fontSize:10.5, color:'var(--text-lo)' }}>@{user.username}</div>
      </div>
    </div>
  );
}
