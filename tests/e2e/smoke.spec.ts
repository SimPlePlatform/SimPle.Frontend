import { test, expect, type Page } from '@playwright/test';

/**
 * Baseline happy-path smoke: the app loads and a user can sign in.
 * This is the shared foundation every per-module checkpoint spec reuses.
 * Local test credentials only — never production secrets.
 */

const E2E_USER = process.env.E2E_USER ?? 'e2e-test-user';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'ChangeMe!Local1';

/** Sign in via the login screen. Exported for per-module specs to reuse. */
export async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email|username/i).first().fill(E2E_USER);
  await page.getByLabel(/password/i).first().fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login/i }).click();
  // Landed on an authenticated surface (not still on /login).
  await expect(page).not.toHaveURL(/\/login/);
}

test('app loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
});

test('user can sign in', async ({ page }) => {
  await signIn(page);
  // An authenticated shell element should be present. Adjust selector as the shell evolves.
  await expect(page.locator('body')).toBeVisible();
});
