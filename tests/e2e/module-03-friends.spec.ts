import { test, expect, type Page } from '@playwright/test';

/**
 * Module 3 — Friends & Social Graph happy path (E2E manifest owner: frontend-final-scope).
 *
 * Scenario (manifest `plannedScenario`): user A discovers user B by exact username and sends a
 * request; B accepts; both list the friendship; A blocks B; both lose the friendship; and B then
 * receives the same non-disclosing "User not found." result as for an absent account and can neither
 * discover nor request A (BOLA / enumeration / block-policy defense).
 *
 * Requires TWO seeded local test users and a running local stack (backend :5147 + frontend). Uses
 * local test credentials only — never production secrets. Executed at `/simple-verify-checkpoint`.
 */

const USER_A = process.env.E2E_USER_A ?? process.env.E2E_USER ?? 'e2e-user-a';
const PASS_A = process.env.E2E_PASSWORD_A ?? process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';
const USER_B = process.env.E2E_USER_B ?? 'e2e-user-b';
const PASS_B = process.env.E2E_PASSWORD_B ?? 'ChangeMe!Local1';
// Exact normalized usernames used by safe discovery (the M1 handle, not the display name).
const HANDLE_A = process.env.E2E_HANDLE_A ?? USER_A;
const HANDLE_B = process.env.E2E_HANDLE_B ?? USER_B;

async function signInAs(page: Page, user: string, password: string): Promise<void> {
  await page.goto('/login');
  // Target the inputs by their stable autocomplete attributes: the password Field wraps a
  // "Forgot?" button inside its <label>, so getByLabel(/password/i) resolves to that button.
  await page.locator('input[autocomplete="username"]').fill(user);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Open Friends, launch the Add-friend modal, search an exact username, and send the request. */
async function sendFriendRequest(page: Page, handle: string): Promise<void> {
  await page.goto('/friends');
  await page.getByRole('button', { name: /add friend/i }).first().click();
  await page.getByPlaceholder('@username').fill(handle);
  await page.getByRole('button', { name: /^search$/i }).click();
  await page.getByRole('button', { name: /send request/i }).click();
}

test.describe('Module 3 — friends happy path', () => {
  test('discover, request, accept, list, block, and non-disclosure', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    try {
      await signInAs(pageA, USER_A, PASS_A);
      await signInAs(pageB, USER_B, PASS_B);

      // 1) A discovers B by exact username via safe discovery and sends a request.
      await sendFriendRequest(pageA, HANDLE_B);
      // Server-owned confirmation (request sent OR immediate cross-accept — both are success).
      await expect(pageA.getByText(/request sent|are now friends/i)).toBeVisible();

      // 2) B sees the incoming request and accepts it.
      await pageB.goto('/friends');
      await pageB.getByRole('tab', { name: /requests/i }).click().catch(async () => {
        await pageB.getByText(/requests/i).first().click();
      });
      await pageB.getByRole('button', { name: /^accept$/i }).first().click();
      await expect(pageB.getByText(/friend added|now friends/i).first()).toBeVisible();

      // 3) Both users list the friendship (All-friends tab).
      await pageA.goto('/friends');
      await expect(pageA.getByText(new RegExp(`@${HANDLE_B}`, 'i')).first()).toBeVisible();
      await pageB.goto('/friends');
      await expect(pageB.getByText(new RegExp(`@${HANDLE_A}`, 'i')).first()).toBeVisible();

      // 4) A blocks B (via the per-friend More menu → Block user → confirm).
      await pageA.goto('/friends');
      const friendRow = pageA.locator('.friend-row', { hasText: new RegExp(`@${HANDLE_B}`, 'i') });
      await friendRow.getByRole('button', { name: /more actions/i }).click();
      await pageA.getByRole('button', { name: /block user/i }).click();
      // Confirm in the block modal.
      await pageA.getByRole('button', { name: /^block$/i }).click();
      await expect(pageA.getByText(/blocked/i).first()).toBeVisible();

      // 5) Both lose the friendship.
      await pageA.goto('/friends');
      await expect(pageA.getByText(new RegExp(`@${HANDLE_B}`, 'i'))).toHaveCount(0);
      await pageB.goto('/friends');
      await expect(pageB.getByText(new RegExp(`@${HANDLE_A}`, 'i'))).toHaveCount(0);

      // 6) Non-disclosure: B cannot discover A — the blocked target returns the SAME privacy-safe
      //    "User not found." as a never-existent account (no 403, no existence leak).
      await pageB.goto('/friends');
      await pageB.getByRole('button', { name: /add friend/i }).first().click();
      await pageB.getByPlaceholder('@username').fill(HANDLE_A);
      await pageB.getByRole('button', { name: /^search$/i }).click();
      await expect(pageB.getByText(/user not found/i)).toBeVisible();

      // A ghost username yields the identical result (indistinguishable).
      await pageB.getByPlaceholder('@username').fill('nonexistent_ghost_user');
      await pageB.getByRole('button', { name: /^search$/i }).click();
      await expect(pageB.getByText(/user not found/i)).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
