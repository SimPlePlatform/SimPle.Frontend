import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/accessibility';

/**
 * Module 7 — Real-Time Presence, Lobby Updates & Chat, composed convergence scenario.
 *
 * Two authenticated browser contexts land in the same lobby (A hosts, B joins as a public-lobby
 * viewer-turned-member): A observes B's live presence dot with no reload; B sends one multiline chat
 * message both sides see exactly once; A's connection is then interrupted (`context.setOffline`) while
 * B mutates lobby state (toggles ready); A's connection is restored and the UI must converge to the new
 * state and the earlier message with nothing duplicated. This proves eventual convergence for this
 * scenario, not exactly-once transport (per spec).
 *
 * Requires a running local stack (backend :5147 + frontend :3000) and TWO seeded local test accounts
 * (E2E_USER_A/E2E_PASSWORD_A, E2E_USER_B/E2E_PASSWORD_B — see module-03-friends.spec.ts's seeded users,
 * reused here). Uses local test credentials only — never production secrets. Executed at
 * `/simple-verify-checkpoint`.
 */

const USER_A = process.env.E2E_USER_A ?? process.env.E2E_USER ?? 'e2e-user-a';
const PASS_A = process.env.E2E_PASSWORD_A ?? process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';
const USER_B = process.env.E2E_USER_B ?? 'e2e-user-b';
const PASS_B = process.env.E2E_PASSWORD_B ?? 'ChangeMe!Local1';

// Seeded via catalog.seed.v1.json — 2-player, "multiplayer" capability, slug stable across reseeds.
const GAME_SLUG = 'chess-lite';

// Duplicated from smoke.spec.ts rather than imported — importing a sibling spec file would re-register
// its top-level tests against this file (Playwright attributes test() calls by import, not call site).
async function signInAs(page: Page, user: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email|username/i).first().fill(user);
  await page.getByLabel(/password/i).first().fill(password);
  // Exact match: a broad /sign in/i also matches the "Sign in with Google" button.
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

test.describe('Module 7 — real-time presence, lobby updates & chat', () => {
  test('two-member lobby: presence, multiline chat, then disconnect/mutate/reconnect convergence', async ({ page, browser }) => {
    test.setTimeout(180_000);

    // `page` (the built-in fixture) is A's browser — the shared axe fixture scans A's final rendered
    // state after this test passes. B is a second, independently authenticated context.
    const pageA = page;
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();

    try {
      await signInAs(pageA, USER_A, PASS_A);
      await signInAs(pageB, USER_B, PASS_B);

      // 1) A creates a public 2-player lobby via the game's live entry action (same flow as Module 6).
      await pageA.goto(`/games/${GAME_SLUG}`);
      const createLobbyBtn = pageA.getByRole('button', { name: 'Create lobby', exact: true });
      await expect(createLobbyBtn).toBeEnabled();
      await createLobbyBtn.click();
      await expect(pageA.getByText('Create a lobby')).toBeVisible();
      await pageA.getByRole('button', { name: 'Public', exact: true }).click();
      await pageA.getByRole('button', { name: 'Create & enter' }).click();
      await expect(pageA).toHaveURL(/\/lobby\//);
      const lobbyUrl = pageA.url();

      // 2) B joins the exact same lobby (public + open renders a "Join lobby" entry for a non-member).
      await pageB.goto(lobbyUrl);
      await pageB.getByRole('button', { name: 'Join lobby' }).click();
      // The Ready toggle only renders for an authenticated member, proving the join actually took.
      // Scoped to the <label> the Toggle renders (its checkbox input is display:none, so getByRole
      // finds nothing): the seat chip elsewhere on the page renders the same text as a bare <span>
      // and would otherwise match twice (strict mode).
      const readyToggleB = pageB.locator('label').getByText('Not ready', { exact: true });
      await expect(readyToggleB).toBeVisible();

      // 3) A observes the second seat and B's live presence, with no reload — driven by LobbyChanged +
      // PresenceChanged, scoped to the "Players" card so unrelated `.surface` rows (match settings) don't
      // get counted.
      const playersCardA = pageA.locator('.card-elev', { hasText: 'Players ·' });
      await expect(pageA.getByText('Players · 2 / 2')).toBeVisible({ timeout: 15_000 });
      const seatsA = playersCardA.locator('.surface');
      await expect(seatsA).toHaveCount(2);
      const bSeatA = seatsA.filter({ hasNotText: 'Host' });
      await expect(bSeatA).toHaveCount(1);
      await expect(bSeatA.locator('.avatar__presence')).toBeVisible({ timeout: 20_000 });

      // 4) B sends one multiline chat message; both sides render it (pre-wrap preserves the line break).
      // `.fill()` (not Shift+Enter keystrokes) sets the multiline value directly — the Enter-vs-Shift+Enter
      // key handling itself is already covered at the unit level (ChatPanel.test.tsx).
      const composerB = pageB.getByRole('textbox', { name: 'Chat message' });
      await composerB.fill('line one\nline two');
      await pageB.getByRole('button', { name: 'Send message' }).click();
      await expect(pageB.getByText('line one')).toBeVisible();
      await expect(pageA.getByText('line one', { exact: false })).toBeVisible({ timeout: 15_000 });
      await expect(pageA.getByText('line two', { exact: false })).toBeVisible();

      // 5) Interrupt A's connection, then mutate lobby state (B's readiness) while A is down.
      const ctxA = pageA.context();
      await ctxA.setOffline(true);
      // Scoped to the <label> the Toggle renders, not getByText: the seat chip renders the same
      // "Not ready"/"Ready" text as a bare <span> and would otherwise match twice (strict mode).
      await pageB.locator('label').getByText('Not ready', { exact: true }).click();
      await expect(pageB.locator('label').getByText('Ready', { exact: true })).toBeVisible();
      // Give the drop time to actually register before restoring the network.
      await pageA.waitForTimeout(4000);
      await ctxA.setOffline(false);

      // 6) Reconnect: the connection resumes and both the lobby snapshot and chat repair with nothing
      // duplicated — this is the convergence the spec's critical path is proving.
      await expect(bSeatA.getByText('Ready', { exact: true })).toBeVisible({ timeout: 60_000 });
      await expect(pageA.getByText('line one', { exact: false })).toHaveCount(1);
    } finally {
      await ctxB.close();
    }
  });
});
