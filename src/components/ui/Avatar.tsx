'use client';
import React from 'react';
import { shade, presenceColor } from '@/lib/utils';

interface AvatarUser {
  initials?: string;
  color?: string;
  status?: string;
}

interface AvatarProps {
  user?: AvatarUser;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showPresence?: boolean;
}

export function Avatar({ user, size = 'md', showPresence = false }: AvatarProps) {
  const cls = [
    'avatar',
    size === 'sm' ? 'avatar--sm' : size === 'lg' ? 'avatar--lg' : size === 'xl' ? 'avatar--xl' : '',
  ].filter(Boolean).join(' ');

  const bg = user?.color ?? '#F0394B';
  const grad = `radial-gradient(circle at 25% 20%, rgba(255,255,255,0.30), transparent 55%), linear-gradient(135deg, ${bg} 0%, ${shade(bg, -30)} 100%)`;

  return (
    <span className={cls} style={{ background: grad }}>
      {user?.initials ?? '??'}
      {showPresence && user?.status && (
        <span
          className="avatar__presence"
          style={{ background: presenceColor(user.status) }}
        />
      )}
    </span>
  );
}
