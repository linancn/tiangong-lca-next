import { execFileSync } from 'node:child_process';

/** Runs outside Jest transforms/mocks so the installed SDK owns its async transport. */
it('fences real SDK function and signed-storage native dispatch after async token resolution', () => {
  const script = String.raw`
    const assert = require('node:assert/strict');
    const Module = require('node:module');
    const root = process.cwd();
    require(require.resolve('tsx/cjs', { paths: [root] }));
    const sdk = require(require.resolve('@supabase/supabase-js', { paths: [root] }));
    let current = true;
    let releaseToken;
    let nativeCalls = [];
    const originalLoad = Module._load;
    const shared = { auth: {
      getSession: async () => ({ data: { session: { access_token: 'token-a' } }, error: null }),
      getClaims: async () => ({ data: { claims: { sub: 'owner-a' } }, error: null }),
    } };
    Module._load = function (id, parent, main) {
      if (id === '@/services/supabase') return { supabase: shared };
      if (id === '@/services/supabase/key') return {
        supabaseUrl: 'https://example.invalid', supabasePublishableKey: 'sb_publishable_test',
      };
      if (id === '@/services/taskCenter/sessionGuard')
        return originalLoad(root + '/src/services/taskCenter/sessionGuard.ts', parent, main);
      if (id === '@supabase/supabase-js') return { ...sdk, createClient: (url, key, options) => {
        let tokenCalls = 0;
        const getToken = options.accessToken;
        return sdk.createClient(url, key, { ...options, accessToken: () => {
          tokenCalls++;
          // Constructor sets inert Realtime auth once; actual transport awaits again.
          if (tokenCalls === 1) return getToken();
          return new Promise(resolve => { releaseToken = () => resolve('token-a'); });
        } });
      } };
      return originalLoad(id, parent, main);
    };
    globalThis.fetch = async (input, init) => {
      nativeCalls.push({ url: String(input), init, current });
      return new Response(JSON.stringify({ ok: true, data: { buildId: 'build-a' },
        mode: 'cache_hit', result_id: 'result-a', Key: 'bucket/a.zip' }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    };
    const lca = require(root + '/src/services/lca/api.ts');
    const dp = require(root + '/src/services/dataProducts/api.ts');
    const { createTaskSessionClient } = require(root + '/src/services/taskCenter/sessionGuard.ts');
    const guard = { ownerId: 'owner-a', isCurrent: () => current };
    async function run(start, invalidate) {
      current = true; releaseToken = undefined; nativeCalls = [];
      const pending = start();
      for (let i = 0; i < 100 && !releaseToken; i++) await Promise.resolve();
      assert.equal(typeof releaseToken, 'function', 'actual SDK must await token before native dispatch');
      assert.equal(nativeCalls.length, 0);
      if (invalidate) current = false;
      releaseToken();
      await pending.catch(() => undefined);
      assert.equal(nativeCalls.length, invalidate ? 0 : 1);
      if (!invalidate) {
        assert.equal(new Headers(nativeCalls[0].init.headers).get('Authorization'), 'Bearer token-a');
        assert.equal(new Headers(nativeCalls[0].init.headers).get('apikey'), 'sb_publishable_test');
        assert.equal(nativeCalls[0].current, true);
        return nativeCalls[0];
      }
    }
    (async () => {
      for (const start of [
        () => lca.submitLcaSolve({ demand_mode: 'all_unit' }, { taskSession: guard }),
        () => dp.createLciaResultBuildRequest({ name: 'test', lciaMethodSet: [] }, { taskSession: guard }),
        () => createTaskSessionClient('token-a', guard).functions.invoke('export_tidas_package', {
          region: sdk.FunctionRegion.UsEast1, body: { scope: 'current_user' },
        }),
        () => createTaskSessionClient('token-a', guard).storage.from('bucket')
          .uploadToSignedUrl('a.zip', 'signed-token', new Blob(['zip']), {
            cacheControl: '3600', contentType: 'application/zip', upsert: true,
          }),
      ]) {
        await run(start, true);
        const call = await run(start, false);
        assert.equal(call.init.method, call.url.includes('/storage/') ? 'PUT' : 'POST');
        if (call.url.includes('/storage/')) {
          assert.equal(call.url, 'https://example.invalid/storage/v1/object/upload/sign/bucket/a.zip?token=signed-token');
          assert.equal(new Headers(call.init.headers).get('x-upsert'), 'true');
        }
      }
      console.log('real SDK final dispatch: LCA, Data Product, function, signed upload passed');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  expect(
    execFileSync(process.execPath, ['-e', script], { cwd: process.cwd(), encoding: 'utf8' }),
  ).toContain('real SDK final dispatch: LCA, Data Product, function, signed upload passed');
});
