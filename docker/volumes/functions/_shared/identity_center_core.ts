export type WebhookEnvelope = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  [key: string]: unknown;
};

export type WebhookAction =
  | { kind: 'ignore'; reason: string }
  | {
      kind: 'set-status';
      keycloakSub: string;
      status: 'active' | 'disabled' | 'revoked' | 'deleted';
    }
  | { kind: 'assign-role'; keycloakSub: string; roleCode: string }
  | { kind: 'revoke-role'; keycloakSub: string; roleCode: string | null }
  | { kind: 'sync-profile'; keycloakSub: string; displayName?: string }
  | { kind: 'revoke-sessions'; keycloakSub: string };

export const MANAGED_ROLES = ['admin', 'review-admin', 'review-member'] as const;
export const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';
const TOLERANCE_SECONDS = 300;

/**
 * supabase-js 的 DB/admin 调用把错误以 `{ error }` 带内返回、而非抛出。物化副作用要求"失败即抛",
 * 交由调用方统一收敛为可重试响应(登录门 → 503 SYNC_PENDING;webhook → 删幂等行 + 500 触发平台重试)。
 * 因此每个写/读结果都应经此断言:`error` 非空即抛,并原样返回结果以便链式取 `data`。
 */
export function assertOk<T extends { error: unknown }>(result: T, op: string): T {
  if (result.error) {
    throw new Error(`[identity_center] ${op} 失败: ${JSON.stringify(result.error)}`);
  }
  return result;
}

function sub(e: WebhookEnvelope): string | null {
  const s = e.keycloakSub;
  return typeof s === 'string' && s.length > 0 ? s : null;
}

/** 平台事件 → 本地动作(设计 §4.4/§4.5 矩阵;无关/异常一律 ignore,由调用方回 2xx) */
export function decideWebhookAction(e: WebhookEnvelope, appCode: string): WebhookAction {
  const keycloakSub = sub(e);
  if (!keycloakSub) return { kind: 'ignore', reason: 'no keycloakSub' };

  const isAccess = e.eventType.startsWith('access.application.');
  const isRole = e.eventType.startsWith('application.role.');
  if ((isAccess || isRole) && e.applicationCode !== appCode) {
    return { kind: 'ignore', reason: `applicationCode ${String(e.applicationCode)} != ${appCode}` };
  }
  if (isRole && e.scopeType !== 'global') return { kind: 'ignore', reason: 'non-global scope' };

  switch (e.eventType) {
    case 'identity.user.disabled':
      return { kind: 'set-status', keycloakSub, status: 'disabled' };
    case 'identity.user.enabled':
      return { kind: 'set-status', keycloakSub, status: 'active' };
    case 'identity.user.deleted':
      return { kind: 'set-status', keycloakSub, status: 'deleted' };
    case 'identity.user.logout':
      return { kind: 'revoke-sessions', keycloakSub };
    case 'identity.user.updated':
      return {
        kind: 'sync-profile',
        keycloakSub,
        displayName: typeof e.displayName === 'string' ? e.displayName : undefined,
      };
    case 'access.application.granted':
      return { kind: 'set-status', keycloakSub, status: 'active' };
    case 'access.application.revoked':
    case 'access.application.expired':
      return { kind: 'set-status', keycloakSub, status: 'revoked' };
    case 'application.role.assigned':
    case 'application.role.updated':
      return typeof e.roleCode === 'string'
        ? { kind: 'assign-role', keycloakSub, roleCode: e.roleCode }
        : { kind: 'ignore', reason: 'no roleCode' };
    case 'application.role.revoked':
      return {
        kind: 'revoke-role',
        keycloakSub,
        roleCode: typeof e.roleCode === 'string' ? e.roleCode : null,
      };
    default:
      return { kind: 'ignore', reason: `unhandled eventType ${e.eventType}` };
  }
}

/** 系统团队单行角色的写决策(current=当前行 role;不触碰非受管角色行) */
export function decideLocalRole(
  current: string | undefined,
  action: WebhookAction,
): { write: false } | { write: true; role: string } {
  if (action.kind === 'assign-role') return { write: true, role: action.roleCode };
  if (action.kind === 'revoke-role') {
    if (
      current &&
      (action.roleCode === null || current === action.roleCode) &&
      (MANAGED_ROLES as readonly string[]).includes(current)
    ) {
      return { write: true, role: 'member' };
    }
    return { write: false };
  }
  return { write: false };
}

const encoder = new TextEncoder();

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** x-webhook-signature 验证:sha256=base64(HMAC-SHA256(secret, `${timestamp}.${rawBody}`)),±300s */
export async function verifyWebhookSignature(input: {
  secret: string;
  timestamp: string;
  rawBody: string;
  signature: string;
  nowSeconds?: number;
}): Promise<{ valid: boolean; reason?: string }> {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return { valid: false, reason: 'invalid timestamp' };
  if (Math.abs(now - ts) > TOLERANCE_SECONDS)
    return { valid: false, reason: 'timestamp out of window' };

  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(input.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await globalThis.crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${input.timestamp}.${input.rawBody}`),
  );
  const expected = `sha256=${btoa(String.fromCharCode(...new Uint8Array(mac)))}`;
  return timingSafeEqualStr(expected, input.signature)
    ? { valid: true }
    : { valid: false, reason: 'signature mismatch' };
}

/** resource_access[clientId].roles 是否含准入/指定角色 */
export function hasAccessRole(claims: unknown, clientId: string, role: string): boolean {
  const ra = (claims as { resource_access?: Record<string, { roles?: string[] }> })
    ?.resource_access;
  return Boolean(ra?.[clientId]?.roles?.includes(role));
}
