import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import type { CommandAuditPayload } from '../command_runtime/audit_log.ts';
import type {
  AssignTeamRequest,
  CreateRequest,
  CreateVersionRequest,
  DatasetCommandFailure,
  DeleteRequest,
  PublishRequest,
  SaveDraftRequest,
  SubmitReviewRequest,
} from '../commands/dataset/types.ts';
type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type DatasetRpcResult = { ok: true; data: unknown } | DatasetCommandFailure;

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Dataset command RPC failed',
    details: error.details ?? null,
  };
}

function isDatasetCommandFailure(data: unknown): data is DatasetCommandFailure {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const candidate = data as Partial<DatasetCommandFailure> & { ok?: unknown };
  return (
    candidate.ok === false &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.status === 'number'
  );
}

async function callDatasetRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<DatasetRpcResult> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return mapRpcError(error);
  }

  if (isDatasetCommandFailure(data)) {
    return data;
  }

  if (
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (data as { ok?: unknown }).ok === true &&
    'data' in (data as Record<string, unknown>)
  ) {
    return {
      ok: true,
      data: (data as Record<string, unknown>).data,
    };
  }

  return {
    ok: true,
    data,
  };
}

export function buildDatasetSaveDraftRpcArgs(
  request: SaveDraftRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_version: request.version,
    p_json_ordered: request.jsonOrdered,
    p_model_id: request.modelId ?? null,
    p_audit: audit,
    p_rule_verification: request.ruleVerification ?? null,
  };
}

export function buildDatasetCreateRpcArgs(
  request: CreateRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_json_ordered: request.jsonOrdered,
    p_model_id: request.modelId ?? null,
    p_rule_verification: request.ruleVerification ?? null,
    p_audit: audit,
  };
}

export function buildDatasetCreateVersionRpcArgs(
  request: CreateVersionRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_source_version: request.sourceVersion,
    p_json_ordered: request.jsonOrdered,
    p_model_id: request.modelId ?? null,
    p_rule_verification: request.ruleVerification ?? null,
    p_audit: audit,
  };
}

export function buildDatasetDeleteRpcArgs(
  request: DeleteRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_version: request.version,
    p_audit: audit,
  };
}

export function buildDatasetAssignTeamRpcArgs(
  request: AssignTeamRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_version: request.version,
    p_team_id: request.teamId,
    p_audit: audit,
  };
}

export function buildDatasetPublishRpcArgs(
  request: PublishRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_table: request.table,
    p_id: request.id,
    p_version: request.version,
    p_audit: audit,
  };
}

export function buildDatasetSubmitReviewRpcArgs(
  request: SubmitReviewRequest,
  audit: CommandAuditPayload,
): Record<string, unknown> {
  return {
    p_target_table: request.table,
    p_target_id: request.id,
    p_target_version: request.version,
    p_audit: audit,
  };
}

export function callDatasetSaveDraftRpc(
  supabase: RpcClient,
  request: SaveDraftRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(
    supabase,
    'cmd_dataset_save_draft',
    buildDatasetSaveDraftRpcArgs(request, audit),
  );
}

export function callDatasetCreateRpc(
  supabase: RpcClient,
  request: CreateRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(supabase, 'cmd_dataset_create', buildDatasetCreateRpcArgs(request, audit));
}

export function callDatasetCreateVersionRpc(
  supabase: RpcClient,
  request: CreateVersionRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(
    supabase,
    'cmd_dataset_create_version',
    buildDatasetCreateVersionRpcArgs(request, audit),
  );
}

export function callDatasetDeleteRpc(
  supabase: RpcClient,
  request: DeleteRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(supabase, 'cmd_dataset_delete', buildDatasetDeleteRpcArgs(request, audit));
}

export function callDatasetAssignTeamRpc(
  supabase: RpcClient,
  request: AssignTeamRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(
    supabase,
    'cmd_dataset_assign_team',
    buildDatasetAssignTeamRpcArgs(request, audit),
  );
}

export function callDatasetPublishRpc(
  supabase: RpcClient,
  request: PublishRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(
    supabase,
    'cmd_dataset_publish',
    buildDatasetPublishRpcArgs(request, audit),
  );
}

export function callDatasetSubmitReviewRpc(
  supabase: RpcClient,
  request: SubmitReviewRequest,
  audit: CommandAuditPayload,
) {
  return callDatasetRpc(
    supabase,
    'cmd_review_submit',
    buildDatasetSubmitReviewRpcArgs(request, audit),
  );
}
