import type { User } from '@/types';

export const CURRENT_USER: User = {
  id: 'u-001',
  username: 'alex.kuznetsov',
  display: 'Alex Kuznetsov',
  initials: 'AK',
  color: '#F0394B',
  level: 24,
  xp: 6320,
  xpToNext: 8000,
  rank: 'Diamond III',
  elo: 1842,
  region: '',
  joined: 'Mar 2024',
  bio: 'CS @ TU Delft. Building games, chasing ELO.',
  status: 'online',
};

export const PALETTE = [
  '#F0394B', '#38BDF8', '#A78BFA', '#34D399',
  '#F59E0B', '#F472B6', '#22D3EE', '#FB7185',
];
