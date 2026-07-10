// Module 4 — Game Library & Discovery frontend contract.
// Mirrors SimPLe.Backend Games DTOs exactly (camelCase). Catalog DTOs are auth-independent — deliberately
// no isFavorited, online count, lastPlayed, or stats (see spec deviation D1); favorite state comes only
// from the private favorites endpoint and is merged client-side.

export type GameLifecycle = 'Draft' | 'ComingSoon' | 'Available' | 'Maintenance' | 'Retired';
export type GameDifficulty = 'Easy' | 'Medium' | 'Hard';

export const GAME_SORTS = ['default', 'name', 'difficulty', 'duration'] as const;
export type GameSort = typeof GAME_SORTS[number];

export interface GameEntryActionDto {
  action: 'play-vs-ai' | 'quick-match' | 'create-lobby' | 'invite-friend' | 'enter-match-room';
  status: 'deferred' | 'enabled';
  reasonCode: string;
  ownerModule: number;
}

export interface GameCatalogDto {
  slug: string;
  name: string;
  summary: string;
  rulesSummary: string;
  category: string;
  tags: string[];
  difficulty: GameDifficulty;
  estimatedDurationMinMinutes: number;
  estimatedDurationMaxMinutes: number;
  minPlayers: number;
  maxPlayers: number;
  lifecycle: GameLifecycle;
  capabilities: string[];
  featuredRank: number | null;
  artToken: string;
  artColorA: string;
  artColorB: string;
  artAltText: string;
  entryActions: GameEntryActionDto[];
}

/** Minimal 410 body for a Retired game detail read — no summary, tags, capabilities, or art. */
export interface GameTombstoneDto {
  slug: string;
  name: string;
  lifecycle: GameLifecycle;
  reasonCode: string;
}

/** Private favorites-list / favorite-mutation DTO. Never shared-cached. */
export interface GameFavoriteDto {
  slug: string;
  name: string;
  lifecycle: GameLifecycle;
  artToken: string;
  artColorA: string;
  artColorB: string;
  artAltText: string;
  favoritedAt: string;
}

export type GameDetailResult =
  | { kind: 'game'; game: GameCatalogDto }
  | { kind: 'tombstone'; tombstone: GameTombstoneDto };
