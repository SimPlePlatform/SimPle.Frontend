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

## How to extend per module
Each module adds one happy-path spec named `module-XX-<slug>.spec.ts` that:
1. signs in (reuse the helper in `smoke.spec.ts`),
2. navigates to the module's primary screen,
3. performs the core action and asserts the resulting UI.
Keep it to the happy path — this is a smoke check, not full coverage.
