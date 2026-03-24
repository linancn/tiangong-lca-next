import type { SupabaseClient } from '@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';
import getUserRole from './get_user_role.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_RE = /^\d{2}\.\d{2}\.\d{3}$/;

export type BundleProcessMutation =
  | {
      op: 'create';
      id: string;
      modelId: string;
      jsonOrdered: unknown;
      ruleVerification?: boolean;
    }
  | {
      op: 'update';
      id: string;
      version: string;
      modelId: string;
      jsonOrdered: unknown;
      ruleVerification?: boolean;
    }
  | {
      op: 'delete';
      id: string;
      version: string;
    };

export type SaveLifecycleModelBundlePlan = {
  mode: 'create' | 'update';
  modelId: string;
  version?: string;
  parent: {
    jsonOrdered: unknown;
    jsonTg: unknown;
    ruleVerification?: boolean;
  };
  processMutations: BundleProcessMutation[];
};

export type DeleteLifecycleModelBundleBody = {
  modelId: string;
  version: string;
};

export type BundleErrorBody = {
  ok: false;
  code: string;
  message: string;
  details?: unknown;
};

type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string };

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function validateSavePlan(body: unknown): ValidationResult<SaveLifecycleModelBundlePlan> {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'request body must be an object' };
  }

  const plan = body as Record<string, unknown>;
  const mode = plan.mode;
  const modelId = plan.modelId;
  const version = plan.version;
  const parent = plan.parent;
  const processMutations = plan.processMutations;

  if (mode !== 'create' && mode !== 'update') {
    return { ok: false, message: 'mode must be create or update' };
  }

  if (!isUuid(modelId)) {
    return { ok: false, message: 'modelId must be a UUID' };
  }

  if (mode === 'update' && !isVersion(version)) {
    return { ok: false, message: 'version must be present for update mode' };
  }

  if (!parent || typeof parent !== 'object') {
    return { ok: false, message: 'parent must be an object' };
  }

  const parentRecord = parent as Record<string, unknown>;
  if (!('jsonOrdered' in parentRecord) || !('jsonTg' in parentRecord)) {
    return { ok: false, message: 'parent.jsonOrdered and parent.jsonTg are required' };
  }

  if (!Array.isArray(processMutations)) {
    return { ok: false, message: 'processMutations must be an array' };
  }

  for (const mutation of processMutations) {
    const validation = validateProcessMutation(mutation, modelId);
    if (!validation.ok) {
      return validation;
    }
  }

  return { ok: true, value: body as SaveLifecycleModelBundlePlan };
}

export function validateDeleteBody(
  body: unknown,
): ValidationResult<DeleteLifecycleModelBundleBody> {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'request body must be an object' };
  }

  const payload = body as Record<string, unknown>;
  if (!isUuid(payload.modelId)) {
    return { ok: false, message: 'modelId must be a UUID' };
  }
  if (!isVersion(payload.version)) {
    return { ok: false, message: 'version must be in 00.00.000 format' };
  }

  return { ok: true, value: body as DeleteLifecycleModelBundleBody };
}

function validateProcessMutation(
  mutation: unknown,
  expectedModelId: string,
): ValidationResult<BundleProcessMutation> {
  if (!mutation || typeof mutation !== 'object') {
    return { ok: false, message: 'process mutation must be an object' };
  }

  const record = mutation as Record<string, unknown>;
  const op = record.op;

  if (op === 'delete') {
    if (!isUuid(record.id) || !isVersion(record.version)) {
      return { ok: false, message: 'delete mutation requires id and version' };
    }
    return { ok: true, value: mutation as BundleProcessMutation };
  }

  if (op !== 'create' && op !== 'update') {
    return { ok: false, message: 'mutation op must be create, update, or delete' };
  }

  if (!isUuid(record.id)) {
    return { ok: false, message: `${String(op)} mutation requires a UUID id` };
  }

  if (record.modelId !== expectedModelId) {
    return { ok: false, message: `${String(op)} mutation modelId must match plan.modelId` };
  }

  if (!('jsonOrdered' in record)) {
    return { ok: false, message: `${String(op)} mutation requires jsonOrdered` };
  }

  if (op === 'update' && !isVersion(record.version)) {
    return { ok: false, message: 'update mutation requires version' };
  }

  return { ok: true, value: mutation as BundleProcessMutation };
}

export async function ensureOwnerOrReviewAdmin(
  supabase: SupabaseClient,
  userId: string,
  modelId: string,
  version: string,
): Promise<{ ok: true } | { ok: false; error: BundleErrorBody }> {
  const { data: row, error } = await supabase
    .from('lifecyclemodels')
    .select('id,version,user_id')
    .eq('id', modelId)
    .eq('version', version)
    .maybeSingle();

  if (error) {
    console.error('query lifecycle model owner failed', {
      model_id: modelId,
      version,
      error: error.message,
      code: error.code,
    });
    return {
      ok: false,
      error: {
        ok: false,
        code: 'MODEL_LOOKUP_FAILED',
        message: 'Failed to load lifecycle model metadata',
      },
    };
  }

  if (!row) {
    return {
      ok: false,
      error: {
        ok: false,
        code: 'MODEL_NOT_FOUND',
        message: 'Lifecycle model not found',
      },
    };
  }

  const isReviewAdmin = await userHasReviewAdminRole(supabase, userId);
  if (!isReviewAdmin && row.user_id !== userId) {
    return {
      ok: false,
      error: {
        ok: false,
        code: 'FORBIDDEN',
        message: 'You do not have permission to mutate this lifecycle model',
      },
    };
  }

  return { ok: true };
}

export async function userHasReviewAdminRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data: roles, error } = await getUserRole(userId, supabase);
  if (error) {
    console.error('query user role failed', {
      user_id: userId,
      error: error.message,
      code: error.code,
    });
    return false;
  }

  return Array.isArray(roles) && roles.some((item: any) => item?.role === 'review-admin');
}

export function mapRpcError(error: { message?: string; code?: string; details?: unknown }) {
  const code = normalizeRpcErrorCode(error);
  return {
    ok: false as const,
    code,
    message: rpcErrorMessage(code),
    details: error.details ?? error.message ?? null,
  };
}

export function normalizeSaveRpcPayload(payload: any) {
  return {
    ok: true as const,
    modelId: String(payload?.model_id ?? ''),
    version: String(payload?.version ?? ''),
    lifecycleModel: normalizeLifecycleModelRow(payload?.lifecycle_model ?? {}),
  };
}

export function normalizeDeleteRpcPayload(payload: any) {
  return {
    ok: true as const,
    modelId: String(payload?.model_id ?? ''),
    version: String(payload?.version ?? ''),
  };
}

export function normalizeLifecycleModelRow(row: any) {
  return {
    id: String(row?.id ?? ''),
    version: String(row?.version ?? ''),
    json: row?.json ?? row?.json_ordered ?? null,
    json_tg: row?.json_tg ?? null,
    ruleVerification: Boolean(row?.rule_verification),
  };
}

export function permissionErrorStatusCode(error: { code?: string }) {
  switch (error.code) {
    case 'FORBIDDEN':
      return 403;
    case 'MODEL_NOT_FOUND':
      return 404;
    case 'MODEL_LOOKUP_FAILED':
      return 500;
    default:
      return 400;
  }
}

function normalizeRpcErrorCode(error: { message?: string; code?: string }) {
  const message = String(error?.message ?? '').trim();

  if (message === 'MODEL_NOT_FOUND') {
    return 'MODEL_NOT_FOUND';
  }
  if (message === 'PROCESS_NOT_FOUND') {
    return 'PROCESS_PERSIST_FAILED';
  }
  if (message === 'INVALID_PLAN') {
    return 'INVALID_PAYLOAD';
  }
  if (message === 'VERSION_CONFLICT') {
    return 'VERSION_CONFLICT';
  }
  if (error?.code === '23505') {
    return 'VERSION_CONFLICT';
  }

  return 'PROCESS_PERSIST_FAILED';
}

function rpcErrorMessage(code: string) {
  switch (code) {
    case 'MODEL_NOT_FOUND':
      return 'Lifecycle model not found';
    case 'INVALID_PAYLOAD':
      return 'Invalid lifecycle model bundle payload';
    case 'VERSION_CONFLICT':
      return 'A record with the same id and version already exists';
    case 'PROCESS_PERSIST_FAILED':
    default:
      return 'Failed to persist lifecycle model bundle';
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function isVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION_RE.test(value);
}
