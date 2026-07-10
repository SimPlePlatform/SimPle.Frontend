# E2E happy-path smoke tests

Run by `/simple-verify-checkpoint` every ~2 modules to prove the app actually runs end-to-end (the one
thing unit + mocked-frontend tests can't verify).

## Prerequisites (local, no real secrets)
- Backend running: `docker compose -f ../SimPLe.Backend/compose.auth.yml up -d` + the API (`dotnet run`) on
  `http://localhost:5147`.
- Frontend running on `E2E_BASE_URL` (default `http://localhost:3000`): `npm run dev` (or `build` + `start`).
- A local test account seeded (or the sign-up flow used by `auth.setup`).

## Run
```
npm install
npx playwright install --with-deps chromium   # first run only
npm run test:e2e
```
Set `E2E_USER` / `E2E_PASSWORD` env vars for the sign-in test (local test creds only — never production).

### Module 3 (friends & social graph) one-time seed
`module-03-friends.spec.ts` requires three local accounts (`E2E_USER_A/B/C`, `E2E_HANDLE_A/B/C`,
`E2E_PASSWORD_A/B/C` env vars — see the spec header for defaults) plus B having `E2E_FRIEND_COUNT`
(default 24) other accepted friends already seeded, so the spec can prove Friends-list drill-down
pagination (first page of 20, then the remainder via cursor) without duplicates. Run once, before the
first execution of this spec:
```
node tests/e2e/seed-b-friends.mjs
```
It registers the filler accounts and user C via the backend's dev CAPTCHA bypass (`Recaptcha.DevBypassToken`
in `appsettings.Development.json` — copy it from `appsettings.Development.example.json` if not already
set locally) and creates/accepts the friendships. It's idempotent (safe to re-run) and slow on first run
(~8-9 minutes) because account registration is rate-limited to 3/min/IP. Never run it against a
deployed/production backend.

## How to extend per module
Each module adds one happy-path spec named `module-XX-<slug>.spec.ts` that:
1. signs in (reuse the helper in `smoke.spec.ts`),
2. navigates to the module's primary screen,
3. performs the core action and asserts the resulting UI.
Keep it to the happy path — this is a smoke check, not full coverage.
