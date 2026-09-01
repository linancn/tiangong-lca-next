import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts';
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';
import { assertOk, type WebhookAction } from './identity_center_core.ts';

const ISSUER = Deno.env.get('KEYCLOAK_ISSUER_URL') ?? '';
const CLIENT_ID = Deno.env.get('KEYCLOAK_CLIENT_ID') ?? 'tiangong-lca-business-app';
export const APP_CODE = Deno.env.get('IDENTITY_CENTER_APP_CODE') ?? 'tiangong-lca';
export const ACCESS_ROLE = 'tiangong_lca_access';
export const KC_CLIENT_ID = CLIENT_ID;

// JWKS 惰性构造:不在模块顶层构造——`ISSUER` 为空时 `new URL('/protocol/...')` 会抛错,
// 导致本模块在未配置 IC 的环境(如未启用 IC 认证的线上部署)无法加载。改为首次校验时
// 按需构造并缓存;`KEYCLOAK_ISSUER_URL` 未配置时直接拒绝(返回 null),优雅降级而非崩溃。
// 与 webhook 的 `if (!SECRET) 未配置` 守卫对称。
let jwksCache: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
function getJwks(): ReturnType<typeof jose.createRemoteJWKSet> | null {
  if (!ISSUER) return null;
  if (!jwksCache) {
    jwksCache = jose.createRemoteJWKSet(new URL(`${ISSUER}/protocol/openid-connect/certs`));
  }
  return jwksCache;
}

/** 验签 + iss/exp(jose) + azp/aud 归属；未配置 ISSUER 或校验失败返回 null */
export async function verifyKeycloakToken(token: string): Promise<jose.JWTPayload | null> {
  const jwks = getJwks();
  if (!jwks) return null; // KEYCLOAK_ISSUER_URL 未配置 → 无从校验,拒绝
  try {
    const { payload } = await jose.jwtVerify(token, jwks, { issuer: ISSUER });
    const azp = payload.azp ?? payload.aud;
    const belongs =
      azp === CLIENT_ID || (Array.isArray(payload.aud) && payload.aud.includes(CLIENT_ID));
    return belongs ? payload : null;
  } catch (_e) {
    return null;
  }
}

/** 期望状态落库(webhook 与登录门共用)；user_id 已绑定时同步物化 */
export async function applyActionToDesiredState(client: SupabaseClient, action: WebhookAction) {
  if (action.kind === 'ignore') return;
  const { data: current } = assertOk(
    await client.rpc('svc_identity_desired_state_upsert', {
      p_keycloak_sub: action.keycloakSub,
      p_status: action.kind === 'set-status' ? action.status : null,
      p_role_code:
        action.kind === 'assign-role' || action.kind === 'revoke-role' ? action.roleCode : null,
      p_role_operation:
        action.kind === 'assign-role'
          ? 'set'
          : action.kind === 'revoke-role'
            ? 'revoke'
            : 'preserve',
      p_metadata: null,
    }),
    '更新身份中心期望状态',
  );
  if (action.kind === 'sync-profile' && current?.user_id && action.displayName) {
    assertOk(
      await client.auth.admin.updateUserById(current.user_id, {
        user_metadata: { display_name: action.displayName },
      } as never),
      '同步 display_name',
    );
  }
  if (current?.user_id) {
    await materializeForUser(client, action.keycloakSub, current.user_id, action);
  }
}

/** 把期望状态物化到 Supabase 侧(ban/解封/会话/系统团队角色行) */
export async function materializeForUser(
  client: SupabaseClient,
  keycloakSub: string,
  userId: string,
  action?: WebhookAction,
) {
  // maybeSingle + assertOk:真正的 DB 故障抛出(交调用方转 503/500 重试),
  // 而"用户行不存在"是 data:null(非错误)→ 优雅 return,不误当故障。
  const { data: state } = assertOk(
    await client.rpc('svc_identity_desired_state_read', { p_keycloak_sub: keycloakSub }),
    '读用户状态',
  );
  if (!state) return;

  const blocked = ['disabled', 'revoked', 'deleted'].includes(state.status);
  // ban/解封:supabase-js v2 admin.updateUserById 支持 ban_duration(见 GoTrueAdminApi.updateUserById
  // 文档示例 "Ban a user for 100 years" / "'none' lifts the ban"),已按 Context7 核实。
  assertOk(
    await client.auth.admin.updateUserById(userId, {
      ban_duration: blocked ? '87600h' : 'none',
    } as never),
    'ban/解封',
  );
  if (blocked || action?.kind === 'revoke-sessions') {
    // 吊销刷新令牌:核实结论见 revokeAllSessions 注释——无按 user_id 的会话撤销 API,故此处仅 ban。
    await revokeAllSessions(client, userId);
  }

  assertOk(
    await client.rpc('svc_identity_managed_role_materialize', {
      p_keycloak_sub: keycloakSub,
      p_user_id: userId,
    }),
    '物化系统团队角色',
  );
}

/**
 * 查证结论(Context7, supabase-js v2 / @supabase/auth-js GoTrueAdminApi 源码核实,2026-07-03):
 * `client.auth.admin` 暴露的完整方法集为 signOut/inviteUserByEmail/generateLink/createUser/
 * listUsers/getUserById/updateUserById/deleteUser(+ MFA/OAuth-client/custom-provider 管理)。
 * 其中 `admin.signOut(jwt, scope)` 签名要求"该用户自己的一个有效 JWT/access_token"作为吊销
 * 凭据(GoTrueClient 内部正是这样用它实现客户端 signOut({scope:'global'})),而不是接受任意
 * `userId`——服务端在本函数场景下并不持有目标用户当前的 access_token,因此这条路径不适用。
 * GoTrue REST 面上也没有 `DELETE /admin/users/{id}/sessions` 这样"按 user_id 吊销全部会话"
 * 的管理端点(admin 路由仅有 /admin/users、/admin/users/{id}、/admin/users/{id}/factors 等,
 * 没有 sessions 子资源)。
 *
 * 结论:两种途径(supabase-js admin 方法 / GoTrue admin REST 兜底)均不存在按 user_id 直接吊销
 * 会话的能力。故按 brief 约定的兜底语义实现——仅 ban(`updateUserById` 的 `ban_duration`)。
 * ban 会立即阻止刷新令牌换发新的 access_token,但已签发、尚未过期的 access_token 在其自身
 * exp 内仍可能被重放通过 RLS/资源服务器校验;残余窗 = 该 JWT 的剩余寿命(项目默认 access
 * token 有效期,而非会话有效期)。这与设计 §4.2 所述"有界残余窗,由 webhook/对账收敛"一致。
 * 此函数因此保留为显式的 no-op 记录点,而非静默空实现或臆造一个不存在的 API。
 */
async function revokeAllSessions(client: SupabaseClient, userId: string) {
  void client;
  void userId;
  console.log(
    `[identity_center] revokeAllSessions: no per-user-id session-revoke API exists in ` +
      `supabase-js v2 / GoTrue admin REST; relying on ban_duration only for userId=${userId}. ` +
      `Residual window = remaining access-token lifetime (see design §4.2).`,
  );
}
