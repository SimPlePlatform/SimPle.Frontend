import { defineConfig, devices } from '@playwright/test';

/**
 * Happy-path E2E for the every-2-modules integration checkpoint (`/simple-verify-checkpoint`).
 * Assumes the app is already running locally:
 *   - backend API (compose.auth.yml up + `dotnet run`) on http://localhost:5147
 *   - frontend on E2E_BASE_URL (default http://localhost:3000)
 * These tests do NOT use real secrets or production services.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
