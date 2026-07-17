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
| `NEXT_PUBLIC_API_URL` | Backend API base URL in local development. Omit it from a production build to use the browser's own origin. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v2 site key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## Container and same-origin delivery

The production image runs the standalone Next.js server as an unprivileged
user on port `3000`.

```sh
docker build -t simple-frontend \
  --build-arg NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-public-site-key \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-public-client-id \
  .
docker run --rm -p 3000:3000 simple-frontend
```

`NEXT_PUBLIC_*` values are embedded during `next build`; only use public browser
configuration as build arguments. Never pass server credentials, API keys, or
secrets to this image.

In production, leave `NEXT_PUBLIC_API_URL` unset. The frontend then calls
relative `/api/*` URLs, allowing the public Caddy gateway to route those
requests to the backend while keeping session cookies first-party. Caddy also
owns future SignalR/WebSocket routes; this frontend does not proxy them.

For an isolated frontend container smoke test without Caddy, pass the
server-only `SIMPLE_API_PROXY_TARGET` build argument (for example,
`--build-arg SIMPLE_API_PROXY_TARGET=http://backend:8080`). Next.js will
rewrite `/api/*` to that internal target. Do not set it in the Caddy deployment.

## Running tests

```
npm test
```

177 tests across 17 files.

## CI

GitHub Actions runs on every push to `main` and `feature/**`:
type-check → lint → build → tests → npm audit (informational).
