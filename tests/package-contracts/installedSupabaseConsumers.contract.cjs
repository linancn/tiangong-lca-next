'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const { generateKeyPairSync, sign } = require('node:crypto');
const root = path.resolve(process.argv[2] || process.cwd());
require(require.resolve('tsx/cjs', { paths: [root] }));
const originalLoad = Module._load;
// Resolve only the product's path alias. Neither SDK exports nor service exports are replaced.
Module._load = function (id, parent, main) {
  return originalLoad(id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : id, parent, main);
};
const base = 'https://platform1315-consumers.invalid';
const key = 'sb_publishable_platform1315_synthetic';
process.env.SUPABASE_URL = base;
process.env.SUPABASE_PUBLISHABLE_KEY = key;
process.env.APP_RUNTIME_CONFIG_ENABLED = 'true';
const NativeWebSocket = globalThis.WebSocket;
let websocketAttempts = 0;
globalThis.WebSocket = class extends NativeWebSocket {
  constructor() {
    websocketAttempts++;
    throw new Error('Unexpected WebSocket transport');
  }
};
let handler;
const requests = [];
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', 'x-supabase-api-version': '2024-01-01' },
  });
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  assert.equal(new URL(request.url).origin, base, 'all product requests must remain synthetic');
  requests.push(request);
  return handler(request);
};
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const actor = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const jwk = {
  ...pair.publicKey.export({ format: 'jwk' }),
  kid: 'consumer-key',
  alg: 'RS256',
  use: 'sig',
};
const token = (subject = actor) => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: jwk.kid })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({
      sub: subject,
      aud: 'authenticated',
      iss: base + '/auth/v1',
      role: 'authenticated',
      email: 'synthetic@example.invalid',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString('base64url');
  return (
    header +
    '.' +
    payload +
    '.' +
    sign('RSA-SHA256', Buffer.from(header + '.' + payload), pair.privateKey).toString('base64url')
  );
};
const user = {
  id: actor,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'synthetic@example.invalid',
  app_metadata: {},
  user_metadata: {},
  created_at: '2026-10-19T00:00:00Z',
};
const accessToken = token();
const consumers = [];
let supabase;
(async () => {
  try {
    ({ supabase } = require(path.join(root, 'src/services/supabase/index.ts')));
    const { publicEntity } = require(path.join(root, 'src/services/supabase/public.ts'));
    const { assertTaskSession, createTaskSessionClient, TaskSessionChangedError } = require(
      path.join(root, 'src/services/taskCenter/sessionGuard.ts'),
    );
    let jwksCalls = 0;
    handler = async (request) => {
      const url = new URL(request.url);
      if (url.pathname === '/auth/v1/user') return json(user);
      if (url.pathname === '/auth/v1/.well-known/jwks.json') {
        jwksCalls++;
        return json({ keys: [jwk] });
      }
      throw new Error('unexpected auth route ' + url.pathname);
    };
    const admitted = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: 'synthetic-refresh',
    });
    assert.equal(admitted.error, null);
    const guard = { ownerId: actor, isCurrent: () => true };
    await assertTaskSession(accessToken, guard);
    await assertTaskSession(accessToken, guard);
    await assert.rejects(assertTaskSession(token(other), guard), TaskSessionChangedError);
    assert.equal(jwksCalls, 1);
    consumers.push('unchanged production bootstrap and real claims-backed owner guard');

    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/rest/v1/processes');
      assert.equal(request.headers.get('accept-profile'), 'public');
      assert.equal(request.headers.get('authorization'), 'Bearer ' + accessToken);
      assert.equal(request.headers.get('apikey'), key);
      return json([{ id: 'public-row' }]);
    };
    assert.deepEqual((await publicEntity('processes').select('id')).data, [{ id: 'public-row' }]);
    const beforeDenied = requests.length;
    assert.throws(() => publicEntity('private_sessions'), /Unsupported public entity table/);
    assert.equal(requests.length, beforeDenied);
    consumers.push('public entity allowlist, profile and actor wire');

    let current = true;
    const task = createTaskSessionClient(accessToken, { ownerId: actor, isCurrent: () => current });
    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/functions/v1/synthetic_task');
      assert.equal(request.headers.get('authorization'), 'Bearer ' + accessToken);
      assert.equal(request.headers.get('apikey'), key);
      assert.deepEqual(await request.json(), { action: 'test' });
      return json({ ok: true });
    };
    assert.equal(
      (await task.functions.invoke('synthetic_task', { body: { action: 'test' } })).error,
      null,
    );
    current = false;
    const beforeStale = requests.length;
    assert.ok((await task.functions.invoke('synthetic_task', { body: {} })).error);
    assert.equal(requests.length, beforeStale);
    await task.realtime.disconnect();
    consumers.push('stateless task client and native-dispatch invalidation fence');

    const storage = require(path.join(root, 'src/services/supabase/storage.ts'));
    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/storage/v1/object/external_docs/a.pdf');
      return new Response(new Uint8Array([1, 2, 255]));
    };
    const downloaded = await storage.getOriginalFileUrl('../external_docs/a.pdf', 'a.pdf');
    assert.equal(downloaded.previewState, 'resolved');
    try {
      assert.deepEqual(
        [
          ...new Uint8Array(
            await require('node:buffer').resolveObjectURL(downloaded.url).arrayBuffer(),
          ),
        ],
        [1, 2, 255],
      );
    } finally {
      URL.revokeObjectURL(downloaded.url);
    }
    for (const [status, expected] of [
      [401, 'permission'],
      [403, 'permission'],
      [404, 'not-found'],
    ]) {
      handler = async () => json({ message: 'synthetic storage error', error: 'denied' }, status);
      assert.equal(
        (await storage.getOriginalFileUrl('../external_docs/a.pdf', 'a.pdf')).previewError,
        expected,
      );
    }
    consumers.push('actual storage preview Blob and installed error mapping');

    const { getSystemStatus, NORMAL_SYSTEM_STATUS } = require(
      path.join(root, 'src/services/general/systemStatus.ts'),
    );
    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/rest/v1/rpc/qry_system_status');
      assert.equal(request.headers.get('content-profile'), 'api');
      return json({ schemaVersion: 1, phase: 'maintenance', reason: 'release_upgrade' });
    };
    assert.equal((await getSystemStatus()).phase, 'maintenance');
    handler = async () => json({ malformed: true });
    assert.deepEqual(await getSystemStatus(), NORMAL_SYSTEM_STATUS);
    let abortCalls = 0;
    handler = (request) =>
      new Promise((_resolve, reject) => {
        const abort = () => {
          abortCalls++;
          reject(request.signal.reason);
        };
        request.signal.addEventListener('abort', abort, { once: true });
      });
    assert.deepEqual(await getSystemStatus(), NORMAL_SYSTEM_STATUS);
    assert.equal(
      abortCalls,
      1,
      'actual four-second consumer deadline must abort native SDK transport',
    );
    consumers.push('real API RPC maintenance parsing, malformed fail-open and actual deadline');

    const authApi = require(path.join(root, 'src/services/auth/api.ts'));
    handler = async (request) => {
      const url = new URL(request.url);
      assert.equal(url.pathname, '/auth/v1/token');
      assert.equal(url.searchParams.get('grant_type'), 'password');
      const body = await request.json();
      assert.equal(body.email, 'denied@example.invalid');
      assert.equal(body.password, 'synthetic-only');
      return json({ msg: 'synthetic invalid credentials', code: 'invalid_credentials' }, 400);
    };
    assert.deepEqual(
      await authApi.login({
        email: 'denied@example.invalid',
        password: 'synthetic-only',
        type: 'login',
      }),
      {
        status: 'error',
        type: 'login',
        currentAuthority: 'guest',
        errorCode: 'invalid_credentials',
        errorStatus: 400,
      },
    );
    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/auth/v1/otp');
      assert.equal((await request.json()).email, 'otp@example.invalid');
      return json({});
    };
    assert.equal(
      (await authApi.sendMagicLink({ email: 'otp@example.invalid', type: 'otp' })).status,
      'ok',
    );
    handler = async (request) => {
      assert.equal(new URL(request.url).pathname, '/auth/v1/user');
      return json({ ...user, user_metadata: { update_data_notification_time: 123 } });
    };
    assert.equal((await authApi.getCurrentUser()).userid, actor);
    assert.equal((await authApi.getFreshUserMetadata()).update_data_notification_time, 123);
    consumers.push('actual password/OTP/claims/fresh-user service error and identity contracts');

    const recoveryStorage = new Map();
    globalThis.sessionStorage = {
      getItem: (key) => recoveryStorage.get(key) ?? null,
      setItem: (key, value) => recoveryStorage.set(key, value),
      removeItem: (key) => recoveryStorage.delete(key),
    };
    const recovery = require(path.join(root, 'src/services/auth/recovery.ts'));
    recovery.recordPasswordRecoverySession((await supabase.auth.getSession()).data.session);
    assert.equal((await recovery.getPasswordRecoveryUser()).userid, actor);
    handler = async () => json({ ...user, id: other });
    assert.equal(await recovery.getPasswordRecoveryUser(), null);
    assert.equal(recoveryStorage.size, 0);
    delete globalThis.sessionStorage;
    consumers.push('actual recovery marker requires matching fresh native SDK user');

    const oauth = require(path.join(root, 'src/services/auth/oauth.ts'));
    assert.equal(await oauth.getVerifiedOAuthSubject(), actor);
    handler = async (request) => {
      assert.equal(
        new URL(request.url).pathname,
        '/auth/v1/oauth/authorizations/opaque-handle/consent',
      );
      assert.deepEqual(await request.json(), { action: 'approve' });
      return json({ redirect_url: 'https://callback.invalid/approved' });
    };
    const result = await oauth.decideOAuthAuthorization('opaque-handle', 'approve');
    assert.equal(result.error, null);
    assert.equal(result.data.redirect_url, 'https://callback.invalid/approved');
    consumers.push('actual OAuth service delegation with native authenticated SDK wire');
  } finally {
    if (supabase) {
      await supabase.auth.stopAutoRefresh();
      await supabase.realtime.disconnect();
    }
    globalThis.WebSocket = NativeWebSocket;
    Module._load = originalLoad;
  }
  assert.equal(websocketAttempts, 0);
  console.log(
    JSON.stringify({
      consumers,
      websocketAttempts,
      scope:
        'actual unchanged product bootstrap and consumer helpers; only alias resolution and synthetic transport injected',
    }),
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
