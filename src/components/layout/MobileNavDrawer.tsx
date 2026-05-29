'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { Avatar } from '@/components/ui/Avatar';
import { FRIEND_REQUESTS } from '@/mock/friends';
import { NOTIFICATIONS } from '@/mock/notifications';
import { ROUTES } from '@/lib/routes';
import { useAuth } from '@/features/auth/AuthProvider';

const NAV_PRIMARY = [
  { href: ROUTES.dashboard, label: 'Dashboard', icon: 'home' },
  { href: ROUTES.games, label: 'Game Library', icon: 'library' },
  { href: ROUTES.friends, label: 'Friends', icon: 'users', badgeCount: FRIEND_REQUESTS.length },
  { href: ROUTES.leaderboards, label: 'Leaderboards', icon: 'trophy' },
];
const NAV_SESSION = [
  { href: ROUTES.lobby('SP-7F-29'), label: 'Active Lobby', icon: 'controller' },
  { href: ROUTES.profile('me'), label: 'My Profile', icon: 'user' },
];
const NAV_META = [
  { href: ROUTES.settings, label: 'Settings', icon: 'settings' },
];

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const notifCount = NOTIFICATIONS.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      <div
        className="mobile-drawer-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="mobile-drawer" role="dialog" aria-label="Navigation menu" aria-modal="true">
        <div className="mobile-drawer__header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div className="brand" style={{ flexShrink: 0 }}>
              <div className="brand__logo" aria-hidden="true" />
              <div>
                <div className="brand__name">SimPle</div>
                <div className="brand__tag">v0.4 - beta</div>
              </div>
            </div>
            {notifCount > 0 && (
              <span
                className="chip chip--red chip--mono"
                style={{ fontSize: 10, padding: '2px 7px', flexShrink: 0 }}
              >
                {notifCount} new
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close navigation"
            style={{ flexShrink: 0 }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <nav className="mobile-drawer__nav">
          <DrawerNavGroup label="Play" items={NAV_PRIMARY} isActive={isActive} />
          <DrawerNavGroup label="Session" items={NAV_SESSION} isActive={isActive} />
          <DrawerNavGroup label="Account" items={NAV_META} isActive={isActive} />
        </nav>

        {user && (
          <div className="mobile-drawer__footer">
            <div className="surface" style={{ padding: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Avatar user={{ initials: user.initials, color: user.color, status: 'online' }} showPresence />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.displayName}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-lo)' }}>@{user.username}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function DrawerNavGroup({ label, items, isActive }: {
  label: string;
  items: { href: string; label: string; icon: string; badgeCount?: number }[];
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="nav-group">
      <div className="nav-group__label drawer-nav-label">{label}</div>
      {items.map(item => {
        const active = isActive(item.href);
        return (
          <Link key={item.href} href={item.href} className={`nav-item drawer-nav-item ${active ? 'nav-item--active' : ''}`}>
            <Icon name={item.icon} size={17} stroke={active ? 2 : 1.75} style={{ flexShrink: 0 }} />
            <span className="drawer-nav-label">{item.label}</span>
            {item.badgeCount ? (
              <span className="nav-item__badge">{item.badgeCount}</span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
