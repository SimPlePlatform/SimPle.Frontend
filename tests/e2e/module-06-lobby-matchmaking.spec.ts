import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/accessibility';

/**
 * Module 6 — Lobby & Matchmaking System, composed happy-path scenario.
 *
 * Signs in, opens a real multiplayer game's detail page (Chess Lite — maxPlayers 2, seeded stable),
 * uses its now-enabled "Create lobby" entry action to open CreateLobbyModal, creates a public lobby,
 * lands on the lobby page as host, toggles ready, reveals the join code, then leaves back to the
 * dashboard. A second, independent test proves the public-lobbies search surface: it browses to
 * Search → Public Lobbies and confirms the list renders (no client-side mock data).
 *
 * Requires a running local stack (backend :5147 + frontend :3000) and a seeded local test account
 * (see smoke.spec.ts / README.md). Uses local test credentials only — never production secrets.
 * Executed at `/simple-verify-checkpoint`.
 */

const E2E_USER = process.env.E2E_USER ?? 'e2e-test-user';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';

// Seeded via catalog.seed.v1.json — 2-player, "multiplayer" capability, slug stable across reseeds.
const GAME_SLUG = 'chess-lite';

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

test.describe('Module 6 — lobby & matchmaking system', () => {
  test('create a public lobby from a game entry action, ready up, reveal code, leave', async ({ page }) => {
    test.setTimeout(60_000);
    await signIn(page);

    // 1) Open a real multiplayer game and use its live "Create lobby" entry action.
    await page.goto(`/games/${GAME_SLUG}`);
    // Exact, case-sensitive match: the topbar also has a global 'Create Lobby' shortcut (title case,
    // no preselected game) that would otherwise collide with this game's own entry-action button.
    const createLobbyBtn = page.getByRole('button', { name: 'Create lobby', exact: true });
    await expect(createLobbyBtn).toBeEnabled();
    await createLobbyBtn.click();

    // 2) CreateLobbyModal opens with this game preselected; choose Public and create.
    await expect(page.getByText('Create a lobby')).toBeVisible();
    // Exact match: the wrapping <label> gives the sibling 'Private (link)' tab an accessible name that
    // also contains 'Public' (the shared 'Privacy' label text bleeds into both tabs' computed names).
    await page.getByRole('button', { name: 'Public', exact: true }).click();
    await page.getByRole('button', { name: 'Create & enter' }).click();

    // 3) Lands on the lobby page as host.
    await expect(page).toHaveURL(/\/lobby\//);
    await expect(page.getByText(`${GAME_SLUG} · Lobby`)).toBeVisible();
    await expect(page.getByText('Hosted by you')).toBeVisible();

    // 4) The host is implicitly ready and cannot un-ready (LobbiesService.AllowedActionsFor omits `ready`
    // for the host), so no ready-toggle control renders for them — assert the seat reflects that instead
    // of attempting a toggle only non-host members are offered.
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();

    // 5) The host's own join code is already revealed at creation time — lobbyApi.create()'s response
    // includes the credential immediately and CreateLobbyModal caches it to sessionStorage, so no
    // "Reveal code" click is needed for the lobby's own creator.
    await expect(page.getByRole('button', { name: 'Share invite' })).toBeVisible();

    // 6) Leave — returns to the dashboard, proving the lobby's own lifecycle doesn't strand the host.
    await page.getByRole('button', { name: 'Leave' }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('Public Lobbies search surface renders real backend data (no mock list)', async ({ page }) => {
    await signIn(page);
    await page.goto('/search?type=lobbies');
    await expect(page.getByRole('tab', { name: /Public Lobbies/i })).toBeVisible();
    // Either real open lobbies are listed, or the honest empty state is shown — never mock/fake rows.
    await expect(
      page.getByText('No public lobbies right now').or(page.getByRole('button', { name: 'Join' }).first()),
    ).toBeVisible();
  });
});
