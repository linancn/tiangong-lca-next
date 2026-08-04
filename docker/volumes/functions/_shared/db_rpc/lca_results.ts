import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { DatasetCommandFailure } from '../commands/dataset/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type LcaProjectionRpcResult = { ok: true; data: unknown } | DatasetCommandFailure;

export type LcaReadJobProjectionRequest = {
  requestedBy: string;
  workerJobId?: string | null;
  legacyJobId?: string | null;
  includeInternal?: boolean;
};

export type LcaReadResultProjectionRequest = {
  requestedBy: string;
  resultId: string;
  requiredArtifactFormat?: string | null;
  includeInternal?: boolean;
};

export type LcaReadLatestSingleSolveResultRequest = {
  requestedBy: string;
  snapshotId: string;
  processIndex: number;
};

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'LCA projection RPC failed',
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

async function callLcaProjectionRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<LcaProjectionRpcResult> {
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

export function buildLcaReadJobProjectionRpcArgs(
  request: LcaReadJobProjectionRequest,
): Record<string, unknown> {
  return {
    p_requested_by: request.requestedBy,
    p_worker_job_id: request.workerJobId ?? null,
    p_legacy_job_id: request.legacyJobId ?? null,
    p_include_internal: request.includeInternal ?? false,
  };
}

export function buildLcaReadResultProjectionRpcArgs(
  request: LcaReadResultProjectionRequest,
): Record<string, unknown> {
  return {
    p_requested_by: request.requestedBy,
    p_result_id: request.resultId,
    p_required_artifact_format: request.requiredArtifactFormat ?? null,
    p_include_internal: request.includeInternal ?? false,
  };
}

export function buildLcaReadLatestSingleSolveResultRpcArgs(
  request: LcaReadLatestSingleSolveResultRequest,
): Record<string, unknown> {
  return {
    p_requested_by: request.requestedBy,
    p_snapshot_id: request.snapshotId,
    p_process_index: request.processIndex,
  };
}

export function callLcaReadJobProjectionRpc(
  supabase: RpcClient,
  request: LcaReadJobProjectionRequest,
) {
  return callLcaProjectionRpc(
    supabase,
    'lca_read_job_projection',
    buildLcaReadJobProjectionRpcArgs(request),
  );
}

export function callLcaReadResultProjectionRpc(
  supabase: RpcClient,
  request: LcaReadResultProjectionRequest,
) {
  return callLcaProjectionRpc(
    supabase,
    'lca_read_result_projection',
    buildLcaReadResultProjectionRpcArgs(request),
  );
}

export function callLcaReadLatestSingleSolveResultRpc(
  supabase: RpcClient,
  request: LcaReadLatestSingleSolveResultRequest,
) {
  return callLcaProjectionRpc(
    supabase,
    'lca_read_latest_single_solve_result',
    buildLcaReadLatestSingleSolveResultRpcArgs(request),
  );
}
