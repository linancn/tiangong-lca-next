import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash, generateKeyPairSync, sign } from 'node:crypto';
import path from 'node:path';
const root = path.resolve(process.argv[2] ?? process.cwd());
const NativeWebSocket = globalThis.WebSocket;
let websocketAttempts = 0;
globalThis.WebSocket = class extends NativeWebSocket {
  constructor() {
    websocketAttempts++;
    throw new Error('Unexpected real WebSocket transport');
  }
};
const require = createRequire(path.join(root, 'package.json'));
const sdk = require('@supabase/supabase-js');
const metadata = require('@supabase/supabase-js/package.json');
assert.equal(metadata.version, '2.118.0');
const base = 'https://platform1315.invalid';
const key = 'sb_publishable_platform1315_synthetic';
const actor = '11111111-1111-4111-8111-111111111111';
const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = {
  ...pair.publicKey.export({ format: 'jwk' }),
  kid: 'platform1315-kid',
  alg: 'RS256',
  use: 'sig',
};
const token = (payload, privateKey = pair.privateKey) => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: jwk.kid, typ: 'JWT' })).toString(
    'base64url',
  );
  const body = Buffer.from(
    JSON.stringify({
      sub: actor,
      iss: base + '/auth/v1',
      aud: 'authenticated',
      role: 'authenticated',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload,
    }),
  ).toString('base64url');
  return (
    header +
    '.' +
    body +
    '.' +
    sign('RSA-SHA256', Buffer.from(header + '.' + body), privateKey).toString('base64url')
  );
};
const accessToken = token({});
const requests = [];
const outcomes = [];
const clients = [];
let handler;
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
const transport = async (input, init) => {
  const req = new Request(input, init);
  assert.equal(new URL(req.url).origin, base, 'unexpected transport destination');
  const body = Buffer.from(await req.clone().arrayBuffer());
  requests.push({
    url: req.url,
    method: req.method,
    headers: Object.fromEntries(req.headers),
    bytes: body.length,
    bodySha256: createHash('sha256').update(body).digest('hex'),
    body: body.toString('base64'),
  });
  return handler(req);
};
const client = (authenticated = true) => {
  const result = sdk.createClient(base, key, {
    db: { schema: 'api' },
    ...(authenticated
      ? { accessToken: async () => accessToken }
      : { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }),
    global: { fetch: transport },
  });
  clients.push({ result, authenticated });
  return result;
};
const headers = () => new Headers(requests.at(-1).headers);
const mark = (name, facts) => outcomes.push({ name, ...facts });
try {
  const c = client();
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/rest/v1/rpc/platform1315_rpc');
    assert.deepEqual(await req.json(), { p_value: '钢' });
    return json([{ id: 'row' }]);
  };
  const rpc = await c.rpc('platform1315_rpc', { p_value: '钢' });
  assert.deepEqual(rpc.data, [{ id: 'row' }]);
  assert.equal(rpc.error, null);
  assert.equal(headers().get('content-profile'), 'api');
  assert.equal(headers().get('authorization'), 'Bearer ' + accessToken);
  assert.equal(headers().get('apikey'), key);
  mark('rpc', { profile: 'api', actor: true });
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/rest/v1/processes');
    return json([{ id: 'public' }]);
  };
  assert.equal((await c.schema('public').from('processes').select('id')).data[0].id, 'public');
  assert.equal(headers().get('accept-profile'), 'public');
  mark('public-read', { profile: 'public' });
  handler = async (req) => {
    const u = new URL(req.url);
    assert.equal(u.pathname, '/functions/v1/platform1315_function');
    assert.equal(u.searchParams.get('forceFunctionRegion'), 'us-east-1');
    assert.deepEqual(await req.json(), { hello: '钢' });
    return json({ ok: true });
  };
  assert.deepEqual(
    (
      await c.functions.invoke('platform1315_function', {
        region: sdk.FunctionRegion.UsEast1,
        body: { hello: '钢' },
      })
    ).data,
    { ok: true },
  );
  assert.equal(headers().get('x-region'), 'us-east-1');
  assert.equal(headers().get('content-type'), 'application/json');
  mark('functions-json', { region: 'us-east-1', actor: true });
  handler = async () => json({ code: 'fixture_denied' }, 400);
  const failure = await c.functions.invoke('platform1315_function', { body: { hello: 'error' } });
  assert.ok(failure.error instanceof sdk.FunctionsHttpError);
  assert.deepEqual(await failure.error.context.json(), { code: 'fixture_denied' });
  mark('functions-http-error', { name: failure.error.name, status: failure.error.context.status });
  handler = async () => json({ code: 'relay' }, 200, { 'x-relay-error': 'true' });
  const relayFailure = await c.functions.invoke('platform1315_function', { body: {} });
  assert.ok(relayFailure.error instanceof sdk.FunctionsRelayError);
  mark('functions-relay-error', { name: relayFailure.error.name });
  handler = async () => {
    throw new TypeError('synthetic fetch failure');
  };
  const fetchFailure = await c.functions.invoke('platform1315_function', { body: {} });
  assert.ok(fetchFailure.error instanceof sdk.FunctionsFetchError);
  mark('functions-fetch-error', { name: fetchFailure.error.name });
  let blobType;
  handler = async (req) => {
    blobType = req.headers.get('content-type');
    assert.equal(await req.text(), 'raw-function-bytes');
    return json({ ok: true });
  };
  await c.functions.invoke('platform1315_function', {
    body: new Blob(['raw-function-bytes'], { type: 'application/x-platform1315' }),
  });
  assert.equal(
    blobType,
    metadata.version === '2.118.0' ? 'application/x-platform1315' : 'application/octet-stream',
  );
  mark('functions-blob-capability', { contentType: blobType, expectedVersionedFix: true });
  handler = async () =>
    json({ code: '42501', message: 'synthetic denied', details: null, hint: null }, 403);
  const denied = await c.rpc('platform1315_rpc', { p_value: 'denied' });
  assert.equal(denied.status, 403);
  assert.equal(denied.error.code, '42501');
  mark('rpc-error', { status: denied.status, code: denied.error.code });
  const anonymous = client(false);
  handler = async () => json({ ok: true });
  await anonymous.functions.invoke('platform1315_function', { body: {} });
  assert.equal(headers().has('authorization'), false);
  assert.equal(headers().get('apikey'), key);
  mark('anonymous-functions-capability', { authorizationAbsent: true });
  let jwksCalls = 0,
    userCalls = 0;
  handler = async (req) => {
    const u = new URL(req.url);
    if (u.pathname === '/auth/v1/.well-known/jwks.json') {
      jwksCalls++;
      return json({ keys: [jwk] });
    }
    if (u.pathname === '/auth/v1/user') {
      userCalls++;
      throw new Error('known-kid claims must not fall back to user');
    }
    throw new Error('unexpected claims route ' + u.pathname);
  };
  assert.equal((await anonymous.auth.getClaims(accessToken)).data.claims.sub, actor);
  assert.equal((await anonymous.auth.getClaims(accessToken)).data.claims.sub, actor);
  const expired = await anonymous.auth.getClaims(token({ exp: 1 }));
  assert.ok(expired.error);
  assert.equal(expired.data, null);
  const wrong = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const invalid = await anonymous.auth.getClaims(token({}, wrong.privateKey));
  assert.ok(invalid.error);
  assert.equal(invalid.data, null);
  assert.equal(userCalls, 0);
  assert.equal(jwksCalls, 1);
  mark('claims', {
    knownKid: true,
    jwksCalls,
    userCalls,
    expiredRejected: true,
    wrongSignatureRejected: true,
  });
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/storage/v1/object/upload/sign/external_docs/a.zip');
    assert.equal(req.method, 'PUT');
    assert.equal(new URL(req.url).searchParams.get('token'), 'synthetic-signed-token');
    assert.equal(req.headers.get('x-upsert'), 'true');
    const data = await req.formData();
    assert.equal(data.get('cacheControl'), '3600');
    assert.equal(await data.get('').text(), 'zip-bytes');
    return json({ Key: 'external_docs/a.zip' });
  };
  const upload = await c.storage
    .from('external_docs')
    .uploadToSignedUrl(
      'a.zip',
      'synthetic-signed-token',
      new Blob(['zip-bytes'], { type: 'application/zip' }),
      { upsert: true, cacheControl: '3600' },
    );
  assert.equal(upload.error, null);
  mark('signed-upload', { method: 'PUT', upsert: true, bytes: 9 });
  let multipartFields;
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/storage/v1/object/external_docs/plain.zip');
    assert.equal(req.method, 'POST');
    const data = await req.formData();
    multipartFields = [...data.keys()];
    assert.equal(data.get('cacheControl'), '60');
    assert.equal(await data.get('').text(), 'plain-zip');
    return json({ Key: 'external_docs/plain.zip' });
  };
  assert.equal(
    (
      await c.storage
        .from('external_docs')
        .upload('plain.zip', new Blob(['plain-zip'], { type: 'application/zip' }), {
          cacheControl: '60',
        })
    ).error,
    null,
  );
  assert.deepEqual(multipartFields, ['cacheControl', '']);
  mark('multipart-upload', { fieldOrder: multipartFields });
  const providedForm = new FormData();
  providedForm.append('', new Blob(['form-zip'], { type: 'application/zip' }));
  let providedOrder;
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/storage/v1/object/external_docs/form.zip');
    const data = await req.formData();
    providedOrder = [...data.keys()];
    assert.equal(data.get('cacheControl'), '60');
    assert.equal(await data.get('').text(), 'form-zip');
    return json({ Key: 'external_docs/form.zip' });
  };
  assert.equal(
    (await c.storage.from('external_docs').upload('form.zip', providedForm, { cacheControl: '60' }))
      .error,
    null,
  );
  assert.deepEqual(
    providedOrder,
    metadata.version === '2.118.0' ? ['cacheControl', ''] : ['', 'cacheControl'],
  );
  mark('provided-formdata-capability', { fieldOrder: providedOrder, expectedVersionedFix: true });
  handler = async (req) => {
    const url = new URL(req.url);
    assert.equal(url.pathname, '/storage/v1/render/image/authenticated/external_docs/image.png');
    assert.equal(url.searchParams.get('width'), '100');
    return new Response(new Uint8Array([1, 2, 3, 255]), {
      headers: { 'content-type': 'application/octet-stream' },
    });
  };
  const downloaded = await c.storage
    .from('external_docs')
    .download('image.png', { transform: { width: 100 } });
  assert.equal(downloaded.error, null);
  assert.deepEqual([...new Uint8Array(await downloaded.data.arrayBuffer())], [1, 2, 3, 255]);
  mark('download-blob', { bytes: 4 });
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/storage/v1/object/sign/external_docs/a.zip');
    assert.deepEqual(await req.json(), { expiresIn: 60 });
    return json({ signedURL: '/object/sign/external_docs/a.zip?token=synthetic-download' });
  };
  const signed = await c.storage.from('external_docs').createSignedUrl('a.zip', 60);
  assert.equal(signed.error, null);
  assert.equal(
    signed.data.signedUrl,
    base + '/storage/v1/object/sign/external_docs/a.zip?token=synthetic-download',
  );
  mark('signed-download', { expiresIn: 60 });
  handler = async () => json({ message: 'synthetic missing', error: 'not_found' }, 404);
  const missing = await c.storage.from('external_docs').download('missing.zip');
  assert.equal(String(missing.error.statusCode), '404');
  assert.equal(missing.data, null);
  mark('storage-error', { statusCode: String(missing.error.statusCode), name: missing.error.name });
  handler = async (req) => {
    assert.equal(new URL(req.url).pathname, '/storage/v1/object/external_docs');
    assert.equal(req.method, 'DELETE');
    assert.deepEqual(await req.json(), { prefixes: ['a.zip'] });
    return json([{ name: 'a.zip' }]);
  };
  assert.equal((await c.storage.from('external_docs').remove(['a.zip'])).error, null);
  mark('remove', { method: 'DELETE' });
  let rpcStart;
  const rpcBegan = new Promise((resolve) => {
    rpcStart = resolve;
  });
  let rpcAbortCalls = 0;
  handler = (req) =>
    new Promise((_resolve, reject) => {
      rpcAbortCalls++;
      rpcStart();
      const abort = () => reject(req.signal.reason);
      if (req.signal.aborted) abort();
      else req.signal.addEventListener('abort', abort, { once: true });
    });
  const rpcController = new AbortController();
  const rpcPending = Promise.resolve(
    c.rpc('platform1315_rpc', {}).abortSignal(rpcController.signal),
  );
  await rpcBegan;
  rpcController.abort();
  const rpcAborted = await rpcPending;
  assert.ok(rpcAborted.error);
  assert.equal(rpcAborted.status, 0);
  assert.equal(rpcAbortCalls, 1);
  mark('rpc-abort', { nativeCalls: rpcAbortCalls, status: rpcAborted.status });
  let started;
  const began = new Promise((resolve) => {
    started = resolve;
  });
  let abortCalls = 0;
  handler = (req) =>
    new Promise((_resolve, reject) => {
      abortCalls++;
      started();
      const signal = req.signal;
      const onAbort = () => {
        signal.removeEventListener('abort', onAbort);
        reject(signal.reason);
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    });
  const controller = new AbortController();
  const pending = c.functions.invoke('platform1315_function', {
    body: {},
    signal: controller.signal,
  });
  await began;
  controller.abort();
  const aborted = await pending;
  assert.ok(aborted.error instanceof sdk.FunctionsFetchError);
  assert.equal(abortCalls, 1);
  mark('functions-abort', { nativeCalls: abortCalls, error: aborted.error.name });
} finally {
  for (const { result, authenticated } of clients) {
    if (!authenticated) await result.auth.stopAutoRefresh();
    await result.realtime.disconnect();
  }
}
assert.equal(websocketAttempts, 0);
globalThis.WebSocket = NativeWebSocket;
console.log(
  JSON.stringify(
    {
      websocketAttempts,
      package: {
        name: metadata.name,
        version: metadata.version,
        entry: require.resolve('@supabase/supabase-js'),
        packageSha256: createHash('sha256')
          .update(readFileSync(require.resolve('@supabase/supabase-js/package.json')))
          .digest('hex'),
      },
      outcomes,
      requests,
      cleanup: { clients: clients.length, refreshStopped: true, realtimeDisconnected: true },
      scope:
        'actual installed SDK capability corpus; production consumer bootstrap/session helpers not yet exercised',
    },
    null,
    2,
  ),
);
