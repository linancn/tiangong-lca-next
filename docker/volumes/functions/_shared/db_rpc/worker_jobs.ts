import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { DatasetCommandFailure } from '../commands/dataset/types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

export type WorkerJobRpcResult = { ok: true; data: unknown } | DatasetCommandFailure;

export type WorkerJobEnqueueRequest = {
  jobKind: string;
  payload?: Record<string, unknown>;
  payloadSchemaVersion?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  subjectVersion?: string | null;
  requestedBy?: string | null;
  requesterType?: 'user' | 'system' | 'service' | 'operator';
  teamId?: string | null;
  idempotencyKey?: string | null;
  requestHash?: string | null;
  concurrencyKey?: string | null;
  priority?: number | null;
  queueKey?: string | null;
  runAfter?: string | null;
  visibility?: 'user' | 'operator' | 'system' | null;
  maxAttempts?: number | null;
  timeoutAt?: string | null;
  payloadRef?: Record<string, unknown> | null;
  parentJobId?: string | null;
  rootJobId?: string | null;
};

export type WorkerJobReadRequest = {
  jobId: string;
  includeInternal?: boolean;
};

export type WorkerJobListRequest = {
  requestedBy?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  statuses?: string[] | null;
  visibility?: 'user' | 'operator' | 'system' | null;
  limit?: number;
  includeInternal?: boolean;
};

export type WorkerJobCancelRequest = {
  jobId: string;
  cancelledBy?: string | null;
  reason?: string | null;
};

function mapRpcError(error: { code?: string; message?: string; details?: unknown }) {
  const code = error.code ?? 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;

  return {
    ok: false as const,
    code,
    status,
    message: error.message ?? 'Worker job RPC failed',
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

async function callWorkerJobRpc(
  supabase: RpcClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<WorkerJobRpcResult> {
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

export function buildWorkerJobEnqueueRpcArgs(
  request: WorkerJobEnqueueRequest,
): Record<string, unknown> {
  return {
    p_job_kind: request.jobKind,
    p_payload_json: request.payload ?? {},
    p_payload_schema_version: request.payloadSchemaVersion ?? null,
    p_subject_type: request.subjectType ?? null,
    p_subject_id: request.subjectId ?? null,
    p_subject_version: request.subjectVersion ?? null,
    p_requested_by: request.requestedBy ?? null,
    p_requester_type: request.requesterType ?? 'user',
    p_team_id: request.teamId ?? null,
    p_idempotency_key: request.idempotencyKey ?? null,
    p_request_hash: request.requestHash ?? null,
    p_concurrency_key: request.concurrencyKey ?? null,
    p_priority: request.priority ?? null,
    p_queue_key: request.queueKey ?? null,
    p_run_after: request.runAfter ?? null,
    p_visibility: request.visibility ?? null,
    p_max_attempts: request.maxAttempts ?? null,
    p_timeout_at: request.timeoutAt ?? null,
    p_payload_ref: request.payloadRef ?? null,
    p_parent_job_id: request.parentJobId ?? null,
    p_root_job_id: request.rootJobId ?? null,
  };
}

export function buildWorkerJobReadRpcArgs(request: WorkerJobReadRequest): Record<string, unknown> {
  return {
    p_job_id: request.jobId,
    p_include_internal: request.includeInternal ?? false,
  };
}

export function buildWorkerJobListRpcArgs(request: WorkerJobListRequest): Record<string, unknown> {
  return {
    p_requested_by: request.requestedBy ?? null,
    p_subject_type: request.subjectType ?? null,
    p_subject_id: request.subjectId ?? null,
    p_statuses: request.statuses ?? null,
    p_visibility: request.visibility ?? null,
    p_limit: request.limit ?? 50,
    p_include_internal: request.includeInternal ?? false,
  };
}

export function buildWorkerJobCancelRpcArgs(
  request: WorkerJobCancelRequest,
): Record<string, unknown> {
  return {
    p_job_id: request.jobId,
    p_cancelled_by: request.cancelledBy ?? null,
    p_reason: request.reason ?? null,
  };
}

export function callWorkerJobEnqueueRpc(supabase: RpcClient, request: WorkerJobEnqueueRequest) {
  return callWorkerJobRpc(supabase, 'worker_enqueue_job', buildWorkerJobEnqueueRpcArgs(request));
}

export function callWorkerJobReadRpc(supabase: RpcClient, request: WorkerJobReadRequest) {
  return callWorkerJobRpc(supabase, 'worker_read_job', buildWorkerJobReadRpcArgs(request));
}

export function callWorkerJobListRpc(supabase: RpcClient, request: WorkerJobListRequest) {
  return callWorkerJobRpc(supabase, 'worker_list_jobs', buildWorkerJobListRpcArgs(request));
}

export function callWorkerJobCancelRpc(supabase: RpcClient, request: WorkerJobCancelRequest) {
  return callWorkerJobRpc(supabase, 'worker_cancel_job', buildWorkerJobCancelRpcArgs(request));
}
