export const APP_NAME = 'SimPle';
export const APP_VERSION = '0.4-beta';
export const CURRENT_SEASON = 4;
export const SEASON_NAME = 'Cipher';

export const PALETTE = [
  '#F0394B', '#38BDF8', '#A78BFA', '#34D399',
  '#F59E0B', '#F472B6', '#22D3EE', '#FB7185',
];

export const GAME_FILTERS = ['All', 'Multiplayer', 'Solo vs AI', 'Strategy', 'Puzzle', 'Quick Match'] as const;
export type GameFilter = typeof GAME_FILTERS[number];

export const TIME_CONTROLS = ['Bullet · 1+0', 'Blitz · 3+2', 'Rapid · 10+5', 'Classic · 30+30'] as const;
