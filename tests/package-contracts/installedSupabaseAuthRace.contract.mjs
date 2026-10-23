import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
const NativeWebSocket = globalThis.WebSocket;
let websocketAttempts = 0;
globalThis.WebSocket = class extends NativeWebSocket {
  constructor() {
    websocketAttempts++;
    throw new Error('Unexpected real WebSocket transport');
  }
};
const require = createRequire(
  path.join(path.resolve(process.argv[2] ?? process.cwd()), 'package.json'),
);
const { createClient } = require('@supabase/supabase-js');
const version = require('@supabase/supabase-js/package.json').version;
const base = 'https://platform1315-auth.invalid';
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const subjectA = '11111111-1111-4111-8111-111111111111';
const subjectB = '22222222-2222-4222-8222-222222222222';
const user = (id) => ({
  id,
  aud: 'authenticated',
  role: 'authenticated',
  email: id + '@example.invalid',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  created_at: '2026-10-19T00:00:00Z',
});
const token = (sub, exp) => {
  const a = Buffer.from(
    JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'synthetic-race' }),
  ).toString('base64url');
  const b = Buffer.from(
    JSON.stringify({
      sub,
      aud: 'authenticated',
      role: 'authenticated',
      iss: base + '/auth/v1',
      iat: Math.floor(Date.now() / 1000),
      exp,
    }),
  ).toString('base64url');
  return (
    a +
    '.' +
    b +
    '.' +
    sign('RSA-SHA256', Buffer.from(a + '.' + b), pair.privateKey).toString('base64url')
  );
};
const session = (sub, seconds, refresh) => ({
  access_token: token(sub, Math.floor(Date.now() / 1000) + seconds),
  refresh_token: refresh,
  expires_in: seconds,
  expires_at: Math.floor(Date.now() / 1000) + seconds,
  token_type: 'bearer',
  user: user(sub),
});
const output = [];
for (const scenario of ['winning-foreign-session', 'sign-out-after-winner']) {
  const storage = new Map();
  const storageKey = 'platform1315-' + scenario;
  const adapter = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.delete(key),
  };
  const requests = [];
  const events = [];
  let start;
  let release;
  const started = new Promise((resolve) => {
    start = resolve;
  });
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const fetcher = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    assert.equal(url.origin, base);
    requests.push({ path: url.pathname, query: url.search, method: req.method });
    if (url.pathname === '/auth/v1/token') {
      assert.equal(url.searchParams.get('grant_type'), 'refresh_token');
      assert.equal((await req.json()).refresh_token, 'refresh-a');
      start();
      await held;
      return new Response(JSON.stringify(session(subjectA, 3600, 'late-refresh-a')), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.pathname === '/auth/v1/user') {
      const encoded = req.headers.get('authorization').split(' ')[1].split('.')[1];
      const payload = JSON.parse(Buffer.from(encoded, 'base64url'));
      return new Response(JSON.stringify(user(payload.sub)), {
        headers: { 'content-type': 'application/json' },
      });
    }
    if (url.pathname === '/auth/v1/logout') {
      assert.equal(url.searchParams.get('scope'), 'local');
      return new Response(null, { status: 204 });
    }
    throw new Error('unexpected synthetic route ' + req.url);
  };
  const make = () =>
    createClient(base, 'sb_publishable_platform1315_synthetic', {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: adapter,
        storageKey,
      },
      global: { fetch: fetcher },
    });
  const a = make(),
    b = make();
  const subscriptions = [];
  try {
    await Promise.all([a.auth.getSession(), b.auth.getSession()]);
    subscriptions.push(
      a.auth.onAuthStateChange((event, value) => {
        events.push({ client: 'a', event, subject: value?.user?.id ?? null });
      }).data.subscription,
    );
    subscriptions.push(
      b.auth.onAuthStateChange((event, value) => {
        events.push({ client: 'b', event, subject: value?.user?.id ?? null });
      }).data.subscription,
    );
    storage.set(storageKey, JSON.stringify(session(subjectA, 10, 'refresh-a')));
    const pending = a.auth.getSession();
    await started;
    const winning = session(subjectB, 3600, 'refresh-b');
    const settled = await b.auth.setSession({
      access_token: winning.access_token,
      refresh_token: winning.refresh_token,
    });
    assert.equal(settled.error, null);
    assert.equal(settled.data.session.user.id, subjectB);
    if (scenario === 'sign-out-after-winner') {
      assert.equal((await b.auth.signOut({ scope: 'local' })).error, null);
      assert.equal(storage.has(storageKey), false);
    }
    release();
    const result = await pending;
    const stored = storage.has(storageKey) ? JSON.parse(storage.get(storageKey)) : null;
    assert.equal(
      stored?.user?.id ?? null,
      scenario === 'winning-foreign-session' ? subjectB : null,
      'a stale refresh must never overwrite the winning session or resurrect sign-out',
    );
    if (scenario === 'sign-out-after-winner') assert.equal(result.data.session, null);
    else {
      assert.equal(result.error, null);
      assert.equal(result.data.session.user.id, subjectB);
    }
    output.push({
      scenario,
      returnedSubject: result.data.session?.user?.id ?? null,
      returnedError: result.error?.name ?? null,
      storedSubject: stored?.user?.id ?? null,
      staleActorResurrected: false,
      requests,
      events,
    });
  } finally {
    release();
    for (const subscription of subscriptions) subscription.unsubscribe();
    for (const client of [a, b]) {
      await client.auth.stopAutoRefresh();
      await client.realtime.disconnect();
    }
    storage.clear();
  }
}
assert.equal(websocketAttempts, 0);
globalThis.WebSocket = NativeWebSocket;
console.log(
  JSON.stringify(
    {
      version,
      websocketAttempts,
      observations: output,
      scope:
        'two real installed SDK instances, shared synthetic storage and public Auth methods; no browser WebLocks/BroadcastChannel or product helper proof',
    },
    null,
    2,
  ),
);
