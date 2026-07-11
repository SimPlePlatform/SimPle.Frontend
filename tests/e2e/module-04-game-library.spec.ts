import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/accessibility';

/**
 * Module 4 — Game Library & Discovery, composed happy-path scenario.
 *
 * Signs in, confirms the Module 3 people-search combobox still works (regression), switches to
 * Games, browses/filters/searches the full library, opens a ComingSoon detail (every seeded game
 * starts ComingSoon per the catalog seeder — see GameCatalogSeeder.cs), asserts no fake
 * online/stat/play claim is rendered, favorites the game, verifies it on the profile's Favorite
 * games tab, unfavorites, and asserts every disabled entry action names its real owner module.
 * A separate lightweight test proves anonymous GET access to the catalog directly against the API.
 *
 * First module with `accessibilityPolicy: 'required'` — imports the shared axe fixture, which scans
 * the exercised page after every passing test.
 *
 * Requires a running local stack (backend :5147 + frontend :3000) and a seeded local test account
 * (see smoke.spec.ts / README.md). Uses local test credentials only — never production secrets.
 * Executed at `/simple-verify-checkpoint`.
 */

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:5147';
const E2E_USER = process.env.E2E_USER ?? 'e2e-test-user';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';

// Seeded via catalog.seed.v1.json — featuredRank 1, category "strategy", slug stable across reseeds.
const GAME_SLUG = 'chess-lite';
const GAME_NAME = 'Chess Lite';

// Duplicated from smoke.spec.ts rather than imported — importing a sibling spec file would re-register
// its top-level tests against this file (Playwright attributes test() calls by import, not call site).
async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email|username/i).first().fill(E2E_USER);
  await page.getByLabel(/password/i).first().fill(E2E_PASSWORD);
  // Exact match: a broad /sign in/i also matches the "Sign in with Google" button.
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('Module 4 — game library & discovery', () => {
  test('people search regression, browse/filter/search games, ComingSoon detail, favorite round-trip, deferred entry actions', async ({ page }) => {
    test.setTimeout(60_000);
    await signIn(page);

    // 1) Regression: the Module 3 topbar people-search combobox still opens the search surface.
    const combobox = page.getByRole('combobox', { name: 'Search people' });
    await combobox.fill(E2E_USER);
    await expect(page.getByRole('listbox', { name: 'People search results' })).toBeVisible();
    await combobox.press('Enter');
    await expect(page).toHaveURL(/\/search\?type=people/);

    // 2) Switch to Games and browse/filter/search the full library.
    await page.goto('/games');
    await expect(page.getByRole('main').getByText('Game Library')).toBeVisible();
    await page.getByRole('tab', { name: 'Strategy' }).click();
    await expect(page.getByText(GAME_NAME).first()).toBeVisible();
    await page.getByPlaceholder('Search games…').fill('chess');
    await expect(page.getByText(GAME_NAME).first()).toBeVisible();

    // 3) Open the ComingSoon detail — no fake online/stat/play claim is rendered.
    // The Spotlight banner repeats the game name as plain (non-clickable) text before the real grid
    // link in DOM order, so scope to the link role to click the actually-navigable element.
    await page.getByRole('link', { name: new RegExp(GAME_NAME) }).first().click();
    await expect(page).toHaveURL(new RegExp(`/games/${GAME_SLUG}$`));
    await expect(page.getByText('Coming soon')).toBeVisible();
    await expect(page.getByText(/online now|play now|\d+ (playing|online)/i)).toHaveCount(0);

    // 4) Every disabled entry action names its real owner module, not a generic label.
    // Module 6 backs 3 distinct actions (quick match/create lobby/invite friend), so this text
    // legitimately repeats — .first() only proves the honest deferred-module text is present.
    await expect(page.getByText('Available once Module 6 — Lobby & Matchmaking System ships.').first()).toBeVisible();
    await expect(page.getByText('Available once Module 8 — Generic Match Room & Match State ships.').first()).toBeVisible();
    await expect(page.getByText('Available once Module 9 — Solo vs AI Platform Flow ships.').first()).toBeVisible();

    // 5) No fake stats/leaderboard data — a deferred empty state names Module 10 instead.
    await page.getByRole('tab', { name: 'Your stats' }).click();
    await expect(page.getByText('No stats yet.')).toBeVisible();
    await expect(page.getByText('Available once Module 10 — Stats, Achievements & Leaderboards ships.')).toBeVisible();

    // 6) Favorite, then verify it on the profile's Favorite games tab.
    // Normalize first — a prior failed run could have left this game favorited from this same test user.
    const favoriteBtn = page.getByRole('button', { name: /Favorite/i });
    await expect(favoriteBtn).toHaveAttribute('aria-pressed', /true|false/);
    if ((await favoriteBtn.getAttribute('aria-pressed')) === 'true') {
      await favoriteBtn.click();
      await expect(favoriteBtn).toHaveAttribute('aria-pressed', 'false');
    }
    await favoriteBtn.click();
    await expect(favoriteBtn).toHaveAttribute('aria-pressed', 'true');

    await page.goto('/profile/me');
    await expect(page).toHaveURL(/\/u\//);
    await page.getByRole('tab', { name: 'Favorite games' }).click();
    await expect(page.getByText(GAME_NAME).first()).toBeVisible();

    // 7) Unfavorite from the detail page and confirm it disappears from the profile.
    await page.goto(`/games/${GAME_SLUG}`);
    await expect(page.getByRole('button', { name: /Favorite/i })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: /Favorite/i }).click();
    await expect(page.getByRole('button', { name: /Favorite/i })).toHaveAttribute('aria-pressed', 'false');

    await page.goto('/profile/me');
    await expect(page).toHaveURL(/\/u\//);
    await page.getByRole('tab', { name: 'Favorite games' }).click();
    await expect(page.getByText('No favorite games yet')).toBeVisible();
  });

  test('anonymous GET access to the public catalog (no auth cookie)', async ({ request }) => {
    const list = await request.get(`${API_BASE}/api/games`);
    expect(list.ok()).toBeTruthy();
    const listBody = await list.json();
    expect(Array.isArray(listBody.items)).toBe(true);

    const detail = await request.get(`${API_BASE}/api/games/${GAME_SLUG}`);
    expect(detail.ok()).toBeTruthy();
    const detailBody = await detail.json();
    expect(detailBody.slug).toBe(GAME_SLUG);
  });
});
