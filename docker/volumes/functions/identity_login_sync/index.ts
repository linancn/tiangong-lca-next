import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { AuthMethod, authenticateRequest, handleCors } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  ACCESS_ROLE,
  KC_CLIENT_ID,
  materializeForUser,
  verifyKeycloakToken,
} from '../_shared/identity_center.ts';
import { assertOk, hasAccessRole } from '../_shared/identity_center_core.ts';
import { supabaseAuthClient, supabaseServiceClient } from '../_shared/supabase_client.ts';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  // `authenticateRequest` requires an `authClient` to validate the Supabase JWT (see
  // `_shared/auth.ts` `authClientNotConfiguredResult`); omitting it silently degrades to a 500,
  // which would defeat the gate. Pass the shared auth client explicitly.
  const auth = await authenticateRequest(req, {
    authClient: supabaseAuthClient,
    allowedMethods: [AuthMethod.JWT],
  });
  if (!auth.isAuthenticated || !auth.user)
    return auth.response ?? json(401, { code: 'UNAUTHENTICATED' });

  const { providerToken } = await req.json().catch(() => ({}));
  if (typeof providerToken !== 'string' || !providerToken) {
    return json(401, { code: 'UNAUTHENTICATED', reason: 'missing providerToken' });
  }

  const payload = await verifyKeycloakToken(providerToken);
  if (!payload?.sub)
    return json(401, { code: 'UNAUTHENTICATED', reason: 'invalid provider token' });

  // token 主体必须就是当前 Supabase 用户的 keycloak 身份(防挪用他人 token)。
  // `UserIdentity.id`(@supabase/auth-js 2.98.0 `src/lib/types.ts`)是身份提供方自身的
  // subject id(OIDC `sub`),而非 `identity_id`(Supabase 该行的内部主键)或
  // `user_id`(Supabase 本地用户 id)——已核实并据此选定 `.id`。
  const { data: got } = await supabaseServiceClient.auth.admin.getUserById(auth.user.id);
  const kcIdentity = got?.user?.identities?.find((i) => i.provider === 'keycloak');
  if (!kcIdentity || kcIdentity.id !== payload.sub) {
    return json(401, { code: 'UNAUTHENTICATED', reason: 'identity mismatch' });
  }

  if (!hasAccessRole(payload, KC_CLIENT_ID, ACCESS_ROLE)) {
    return json(403, { code: 'APP_ACCESS_DENIED', reason: `缺少准入角色 ${ACCESS_ROLE}` });
  }

  // 准入已通过 hasAccessRole 403 门(以上)——以下均为准入之后的本地物化副作用。
  // 这些写入可能因瞬时 DB/admin 故障失败;准入结论不应因此回退,故单独 try/catch,
  // 失败时返回可重试的 503,让客户端/下次登录/reconcile 任务收敛状态。
  try {
    // 绑定映射(user_id 回填)并物化期望状态(先分配角色后首登的时序在此收敛)。
    // assertOk:supabase-js 把 DB 错误以 { error } 带内返回而非抛出;此处显式断言,
    // 使写失败抛入下方 catch → 503 SYNC_PENDING(可重试),而非静默返回 200。
    assertOk(
      await supabaseServiceClient.rpc('svc_identity_login_bind', {
        p_keycloak_sub: payload.sub,
        p_user_id: auth.user.id,
      }),
      '绑定映射',
    );
    await materializeForUser(supabaseServiceClient, payload.sub, auth.user.id);

    // 资料同步:display_name 缺失时取 Keycloak name/preferred_username
    const displayName = (payload.name ?? payload.preferred_username) as string | undefined;
    if (displayName && !auth.user.user_metadata?.display_name) {
      assertOk(
        await supabaseServiceClient.auth.admin.updateUserById(auth.user.id, {
          user_metadata: { ...auth.user.user_metadata, display_name: displayName },
        }),
        '同步 display_name',
      );
    }
  } catch (e) {
    console.error('[identity_login_sync] post-admission materialization failed:', e);
    return json(503, { code: 'SYNC_PENDING' });
  }

  return json(200, { ok: true });
});
