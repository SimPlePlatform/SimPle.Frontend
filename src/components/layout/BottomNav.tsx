'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icons';
import { ROUTES } from '@/lib/routes';

const ITEMS = [
  { href: ROUTES.dashboard,    icon: 'home',    label: 'Home' },
  { href: ROUTES.games,        icon: 'library', label: 'Games' },
  { href: ROUTES.friends,      icon: 'users',   label: 'Friends' },
  { href: ROUTES.leaderboards, icon: 'trophy',  label: 'Rank' },
  { href: ROUTES.profile('me'),icon: 'user',    label: 'Me' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="bottomnav">
      {ITEMS.map(it => {
        const active = pathname === it.href || pathname.startsWith(it.href + '/');
        return (
          <Link key={it.href} href={it.href} className={`bottomnav__item ${active ? 'bottomnav__item--active' : ''}`}>
            <Icon name={it.icon} size={20} stroke={active ? 2 : 1.75} />
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
