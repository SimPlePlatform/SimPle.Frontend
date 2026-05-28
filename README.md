# SimPle — Frontend

Next.js 14 frontend for the SimPle multiplayer game platform.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Identity Services** — OAuth Sign-In button
- **Google reCAPTCHA v2** — login and registration protection
- **Vitest** — unit and component tests

## Getting started

1. Copy the environment file and fill in values:
   ```
   cp .env.local.example .env.local
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

The backend API must be running at `NEXT_PUBLIC_API_URL` (default `http://localhost:5147`).

## Environment variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v2 site key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Running tests

```
npm test
```

47 tests across 5 files.

## CI

GitHub Actions runs on every push to `main` and `feature/**`:
type-check → lint → build → tests → npm audit (informational).
