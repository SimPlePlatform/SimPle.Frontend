import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';

/**
 * Module 3 — Friends & Social Graph (revision 2), composed multi-user scenario.
 *
 * A prefix-searches B from the topbar combobox and keyboard-opens the canonical profile; sends a
 * request from the profile page; B accepts from the Requests tab; both sides see the Friends state;
 * A's authorized Friends drill-down for B loads a full first page (20) then the remaining seeded
 * friends across a cursor with no duplicates; B changes friends-list visibility live and C's access
 * follows that change; an anonymous visitor sees the Public/Private split on C's own profile; the
 * `/profile/me` and legacy `/profile/{uuid}` username-route policy is exercised; and finally A blocks
 * B so that B's search, profile, friends-list, and mutual-friends surfaces all converge on the same
 * privacy-safe non-disclosure response.
 *
 * Requires THREE seeded local test users and a running local stack (backend :5147 + frontend :3000).
 * B must additionally have E2E_FRIEND_COUNT (default 24) other friends seeded beforehand — run
 * `node tests/e2e/seed-b-friends.mjs` once (see README.md) before this spec; it is not seeded by the
 * spec itself (registration is rate-limited to 3/min/IP, unsuitable for a per-run happy-path test).
 * Uses local test credentials only — never production secrets. Executed at `/simple-verify-checkpoint`.
 */

const USER_A = process.env.E2E_USER_A ?? process.env.E2E_USER ?? 'e2e-user-a';
const PASS_A = process.env.E2E_PASSWORD_A ?? process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';
const USER_B = process.env.E2E_USER_B ?? 'e2e-user-b';
const PASS_B = process.env.E2E_PASSWORD_B ?? 'ChangeMe!Local1';
const USER_C = process.env.E2E_USER_C ?? 'e2e-user-c';
const PASS_C = process.env.E2E_PASSWORD_C ?? 'ChangeMe!Local1';
// Exact normalized usernames used by safe discovery/search (the M1 handle, not the display name).
const HANDLE_A = process.env.E2E_HANDLE_A ?? USER_A;
const HANDLE_B = process.env.E2E_HANDLE_B ?? USER_B;
const HANDLE_C = process.env.E2E_HANDLE_C ?? USER_C;
// B's other, pre-seeded friends (see tests/e2e/seed-b-friends.mjs) — A becomes friend #(count + 1).
const SEEDED_FRIEND_COUNT = Number(process.env.E2E_FRIEND_COUNT ?? 24);
const PAGE_SIZE = 20;

test.describe.configure({ mode: 'serial' });

async function signInAs(page: Page, user: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.locator('input[autocomplete="username"]').fill(user);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Prefix-search from the topbar combobox and keyboard-open the first result's canonical profile. */
async function keyboardOpenProfile(page: Page, handle: string): Promise<void> {
  const combobox = page.getByRole('combobox', { name: 'Search people' });
  await combobox.fill(handle);
  await expect(page.getByRole('option', { name: new RegExp(`@${handle}\\b`) })).toBeVisible();
  await combobox.press('ArrowDown');
  await combobox.press('Enter');
  await expect(page).toHaveURL(new RegExp(`/u/${handle}$`));
}

async function openPrivacyTab(page: Page): Promise<void> {
  await page.goto('/settings');
  await page.getByRole('button', { name: 'Privacy' }).first().click();
}

test.describe('Module 3 — friends & social graph (revision 2)', () => {
  test('composed search, profile actions, authorized pagination, visibility enforcement, username-route policy, and block convergence', async ({ browser }) => {
    test.setTimeout(120_000);

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const ctxC = await browser.newContext();
    const ctxAnon = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    const pageC = await ctxC.newPage();
    const pageAnon = await ctxAnon.newPage();

    try {
      await signInAs(pageA, USER_A, PASS_A);
      await signInAs(pageB, USER_B, PASS_B);
      await signInAs(pageC, USER_C, PASS_C);

      // 1) A composed-searches B from the topbar and keyboard-opens the canonical profile.
      await keyboardOpenProfile(pageA, HANDLE_B);

      // 2) A sends a friend request from B's profile page (not the legacy Add-friend modal).
      await pageA.getByRole('button', { name: 'Add friend' }).first().click();
      await expect(pageA.getByText(/request sent|now friends/i)).toBeVisible();

      // 3) B opens the request from the Requests tab and accepts it.
      await pageB.goto('/friends');
      await pageB.getByRole('tab', { name: /requests/i }).click().catch(async () => {
        await pageB.getByText(/requests/i).first().click();
      });
      await pageB.getByRole('button', { name: /^accept$/i }).first().click();
      await expect(pageB.getByText(/friend added|now friends|request accepted/i).first()).toBeVisible();

      // 4) Both sides see the Friends relationship state on the canonical profile.
      await pageA.goto(`/u/${HANDLE_B}`);
      await expect(pageA.getByRole('button', { name: 'Remove friend' })).toBeVisible();
      await pageB.goto(`/u/${HANDLE_A}`);
      await expect(pageB.getByRole('button', { name: 'Remove friend' })).toBeVisible();

      // 5) A's authorized Friends drill-down for B loads 20, then the remaining seeded friends via
      //    the cursor, with no duplicate rows (deduped by profile href).
      await pageA.goto(`/u/${HANDLE_B}/friends`);
      await expect(pageA.locator('.friend-row')).toHaveCount(PAGE_SIZE);
      await pageA.getByRole('button', { name: /load more/i }).click();
      await expect(pageA.locator('.friend-row')).toHaveCount(SEEDED_FRIEND_COUNT + 1);
      const hrefs = await pageA.locator('.friend-row a').evaluateAll(links => links.map(a => a.getAttribute('href')));
      expect(new Set(hrefs).size).toBe(hrefs.length);

      // 6) B changes friends-list visibility live; C's access follows the change.
      await openPrivacyTab(pageB);
      await pageB.locator('.row.between', { hasText: 'Who can see your friends list' })
        .getByRole('button', { name: 'Everyone', exact: true }).click();
      await expect(pageB.getByText(/friends list visibility updated/i)).toBeVisible();
      await pageC.goto(`/u/${HANDLE_B}/friends`);
      await expect(pageC.locator('.friend-row').first()).toBeVisible();

      await openPrivacyTab(pageB);
      await pageB.locator('.row.between', { hasText: 'Who can see your friends list' })
        .getByRole('button', { name: 'Only me', exact: true }).click();
      await expect(pageB.getByText(/friends list visibility updated/i)).toBeVisible();
      await pageC.goto(`/u/${HANDLE_B}/friends`);
      await expect(pageC.getByText(/this profile is not available/i)).toBeVisible();

      // 7) Anonymous Public vs Private outcomes, exercised on C's own profile visibility.
      await openPrivacyTab(pageC);
      await pageC.locator('.row.between', { hasText: 'Profile visibility' })
        .getByRole('button', { name: 'Public', exact: true }).click();
      await expect(pageC.getByText(/visibility updated/i)).toBeVisible();
      await pageAnon.goto(`/u/${HANDLE_C}`);
      await expect(pageAnon.getByText(new RegExp(`@${HANDLE_C}`))).toBeVisible();

      await openPrivacyTab(pageC);
      await pageC.locator('.row.between', { hasText: 'Profile visibility' })
        .getByRole('button', { name: 'Private', exact: true }).click();
      await expect(pageC.getByText(/visibility updated/i)).toBeVisible();
      await pageAnon.goto(`/u/${HANDLE_C}`);
      await expect(pageAnon.getByText(/user not found/i)).toBeVisible();

      // 8) Username-route policy: `/profile/me` resolves to the canonical username URL, and a legacy
      //    `/profile/{uuid}` for anyone else never leaks a username mapping (no backend lookup exists).
      await pageA.goto('/profile/me');
      await expect(pageA).toHaveURL(new RegExp(`/u/${HANDLE_A}$`));
      await pageA.goto(`/profile/${randomUUID()}`);
      await expect(pageA.getByText(/this link has moved/i)).toBeVisible();

      // 9) A blocks B; search, profile, friends-list, and mutual-friends surfaces on B's side all
      //    converge on the same privacy-safe non-disclosure response.
      await pageA.goto(`/u/${HANDLE_B}`);
      await pageA.getByRole('button', { name: 'More actions' }).click();
      await pageA.getByRole('button', { name: 'Block user' }).click();
      await pageA.getByRole('button', { name: 'Block', exact: true }).click();
      await expect(pageA.getByText(/user blocked/i)).toBeVisible();

      await pageB.goto(`/u/${HANDLE_A}`);
      await expect(pageB.getByText(/user not found/i)).toBeVisible();

      await pageB.goto(`/search?type=people&q=${encodeURIComponent(HANDLE_A)}`);
      await expect(pageB.getByText(/no people found/i)).toBeVisible();

      await pageB.goto(`/u/${HANDLE_A}/friends`);
      await expect(pageB.getByText(/this profile is not available/i)).toBeVisible();

      await pageB.goto(`/u/${HANDLE_A}/mutual-friends`);
      await expect(pageB.getByText(/this profile is not available/i)).toBeVisible();
    } finally {
      await ctxA.close();
      await ctxB.close();
      await ctxC.close();
      await ctxAnon.close();
    }
  });
});
