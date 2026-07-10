'use client';
import React from 'react';
import Link from 'next/link';
import { Avatar } from '@/components/ui/Avatar';
import { ROUTES } from '@/lib/routes';

/** Structurally satisfied by FriendDto, FriendSuggestionDto, DiscoveryResultDto, PublicIdentity, and the
 * requester/addressee halves of FriendRequestDto — no per-source DTO conversion needed. */
export interface PlayerIdentityLike {
  username: string;
  displayName: string;
  initials: string;
  color: string;
  avatarUrl: string | null;
}

interface PlayerIdentityProps {
  player: PlayerIdentityLike;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: React.ReactNode;
  trailing?: React.ReactNode;
}

/**
 * Shared identity link used everywhere a player's name/avatar is rendered (friends list, requests,
 * suggestions, discovery, dashboard). Wraps only the avatar + name in the link; action buttons stay as
 * sibling elements (never nested inside <Link>) to avoid nested-interactive-element a11y violations.
 */
export function PlayerIdentity({ player, size = 'md', subtitle, trailing }: PlayerIdentityProps) {
  return (
    <div className="row" style={{ gap: 12, minWidth: 0, flex: 1 }}>
      <Link
        href={ROUTES.u(player.username)}
        className="row"
        style={{ gap: 12, minWidth: 0, flex: 1, textDecoration: 'none', color: 'inherit' }}
      >
        <Avatar src={player.avatarUrl} user={{ initials: player.initials, color: player.color }} size={size} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {player.displayName}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-lo)' }}>
            {subtitle ?? `@${player.username}`}
          </div>
        </div>
      </Link>
      {trailing}
    </div>
  );
}
