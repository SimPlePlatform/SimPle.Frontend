// One-time local seed script for the expanded Module 3 E2E scenario (module-03-friends.spec.ts).
//
// Registers E2E_FRIEND_COUNT filler accounts plus user C, then creates and accepts friend requests
// so that E2E_USER_B has a friends list larger than one cursor page (default 24 fillers -> 24 friends,
// A's own request during the spec becomes the 25th). Idempotent: re-running skips accounts/friendships
// that already exist, so it's safe to run again if a previous run was interrupted by the auth-register
// rate limit (3 requests/min/IP - the dominant cost, ~8-9 minutes for 25 accounts).
//
// Usage: node tests/e2e/seed-b-friends.mjs
// Requires a running local backend (see README.md) with Recaptcha.DevBypassToken configured in
// appsettings.Development.json (copy from appsettings.Development.example.json). Never run against a
// deployed/production backend.

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:5147';
const CAPTCHA_BYPASS = process.env.E2E_CAPTCHA_BYPASS_TOKEN ?? 'dev-captcha-bypass-token';
const PASSWORD = process.env.E2E_PASSWORD_B ?? 'ChangeMe!Local1';

const USER_B = process.env.E2E_USER_B ?? 'e2e-user-b';
const USER_C = process.env.E2E_USER_C ?? 'e2e-user-c';
const FRIEND_COUNT = Number(process.env.E2E_FRIEND_COUNT ?? 24);
const FRIEND_PREFIX = process.env.E2E_FRIEND_PREFIX ?? 'e2e-friend';

const sleep = ms => new Promise(r => setTimeout(r, ms));

function makeJar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
    },
    absorb(res) {
      const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
      for (const raw of set) {
        const [pair] = raw.split(';');
        const eq = pair.indexOf('=');
        if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
  };
}

async function api(jar, path, method = 'GET', body) {
  // Several endpoints hit by this script (auth-register 3/min, auth-login 5/min) are
  // rate-limited per-IP. Reruns that re-check already-existing accounts/state still spend
  // that budget, so retry-with-backoff lives here once for every caller instead of being
  // duplicated per endpoint.
  for (;;) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(method !== 'GET' ? { 'X-Requested-With': 'XMLHttpRequest' } : {}),
        ...(jar ? { Cookie: jar.header() } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (jar) jar.absorb(res);
    const text = await res.text();
    const json = text ? JSON.parse(text) : null;
    if (res.status === 429) {
      const retryAtMs = Date.parse(json?.error?.retryAfterUtc ?? '');
      const waitMs = Math.max(1000, (Number.isNaN(retryAtMs) ? Date.now() + 65_000 : retryAtMs) - Date.now()) + 1000;
      console.log(`  rate-limited on ${method} ${path}, waiting ${Math.ceil(waitMs / 1000)}s...`);
      await sleep(waitMs);
      continue;
    }
    return { status: res.status, json };
  }
}

async function ensureAccount(username, password) {
  const jar = makeJar();
  const { status, json } = await api(jar, '/api/auth/register', 'POST', {
    username,
    email: `${username}@e2e.simple.test`,
    password,
    confirmPassword: password,
    captchaToken: CAPTCHA_BYPASS,
  });
  if (status === 201) {
    console.log(`  created ${username}`);
    return true;
  }
  if (status === 409) {
    console.log(`  ${username} already exists, skipping`);
    return false;
  }
  throw new Error(`Failed to register ${username}: ${status} ${JSON.stringify(json)}`);
}

async function login(username, password) {
  const jar = makeJar();
  const { status, json } = await api(jar, '/api/auth/login', 'POST', {
    emailOrUsername: username,
    password,
    captchaToken: CAPTCHA_BYPASS,
  });
  if (status !== 200) throw new Error(`Failed to log in as ${username}: ${status} ${JSON.stringify(json)}`);
  return jar;
}

async function getUserId(jar, username) {
  const { status, json } = await api(jar, `/api/profile/${encodeURIComponent(username)}`);
  if (status !== 200) throw new Error(`Failed to look up profile ${username}: ${status}`);
  return json.userId;
}

async function isAlreadyFriends(jar, targetUsername) {
  const { status, json } = await api(jar, `/api/profile/${encodeURIComponent(targetUsername)}/viewer-context`);
  if (status !== 200) return false;
  return json.relationshipState === 'Friends';
}

async function befriend(fillerJar, fillerUsername, targetUserId) {
  const sent = await api(fillerJar, '/api/friends/requests', 'POST', { targetUserId });
  if (sent.status !== 201 && sent.status !== 200) {
    throw new Error(`${fillerUsername} could not send a request: ${sent.status} ${JSON.stringify(sent.json)}`);
  }
  if (sent.json?.outcome === 'cross_request_accepted') return;

  const bJar = await login(USER_B, PASSWORD);
  const requests = await api(bJar, '/api/friends/requests?direction=incoming&limit=50');
  const match = requests.json?.items?.find(r => r.requesterUsername === fillerUsername);
  if (!match) throw new Error(`B did not see an incoming request from ${fillerUsername}`);
  const accept = await api(bJar, `/api/friends/requests/${match.requestId}/accept`, 'POST', {});
  if (accept.status !== 200) throw new Error(`B could not accept ${fillerUsername}: ${accept.status}`);
}

async function main() {
  console.log(`Seeding against ${API_BASE} — ${FRIEND_COUNT} filler friends for ${USER_B}, plus ${USER_C}.`);

  console.log(`Ensuring ${USER_B} exists...`);
  await ensureAccount(USER_B, PASSWORD);
  console.log(`Ensuring ${USER_C} exists...`);
  await ensureAccount(USER_C, process.env.E2E_PASSWORD_C ?? PASSWORD);

  const fillerUsernames = Array.from({ length: FRIEND_COUNT }, (_, i) => `${FRIEND_PREFIX}-${String(i + 1).padStart(2, '0')}`);

  // Registration is capped at 3/min/IP; ensureAccount() itself waits out real 429s, so no
  // fixed inter-batch delay is needed here (and would be wasted time on reruns where most
  // accounts already exist and only get a fast 409 skip).
  console.log(`Registering ${fillerUsernames.join(', ')}...`);
  for (const username of fillerUsernames) {
    await ensureAccount(username, PASSWORD);
  }

  const bJarForCheck = await login(USER_B, PASSWORD);
  const bUserId = await getUserId(bJarForCheck, USER_B);

  for (const username of fillerUsernames) {
    const fillerJar = await login(username, PASSWORD);
    if (await isAlreadyFriends(fillerJar, USER_B)) {
      console.log(`  ${username} is already friends with ${USER_B}, skipping`);
      continue;
    }
    console.log(`  befriending ${username} <-> ${USER_B}...`);
    await befriend(fillerJar, username, bUserId);
  }

  console.log('Done. B is ready for the pagination scenario in module-03-friends.spec.ts.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
