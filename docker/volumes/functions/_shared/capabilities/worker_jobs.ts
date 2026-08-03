import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { DatasetCommandFailure } from '../commands/dataset/types.ts';

type RpcClient = Pick<SupabaseClient, 'schema'>;

export const WORKER_CAPABILITY_CONTRACT = {
  edgeFunction: 'app_worker_jobs',
  database: {
    schema: 'api',
    routine: {
      enqueue: 'worker_enqueue_job_v1',
      read: 'worker_read_job_v1',
      readMany: 'worker_read_jobs_by_ids_v1',
      listByConcurrencyKey: 'worker_list_jobs_by_concurrency_key_v1',
      list: 'worker_list_jobs_v1',
      cancel: 'worker_cancel_job_v1',
    },
  },
} as const;

export type WorkerJobRpcResult<T = unknown> = { ok: true; data: T } | DatasetCommandFailure;

export type WorkerJobDto = {
  id?: string;
  jobKind?: string;
  workerRuntime?: string;
  workerQueue?: string;
  subjectType?: string;
  subjectId?: string;
  subjectVersion?: string;
  requestedBy?: string;
  requestHash?: string | null;
  concurrencyKey?: string | null;
  status?: string;
  payload?: Record<string, unknown> | null;
  diagnostics?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  [key: string]: unknown;
};

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

export type WorkerJobListByConcurrencyKeyRequest = {
  jobKind: string;
  concurrencyKey: string;
  statuses: string[];
  limit?: number;
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

export type ServiceWorkerCapabilityRepository = {
  readonly access: 'service-only';
  enqueue(request: WorkerJobEnqueueRequest): Promise<WorkerJobRpcResult<WorkerJobDto>>;
  read(request: WorkerJobReadRequest): Promise<WorkerJobRpcResult<WorkerJobDto | null>>;
  listByConcurrencyKey(
    request: WorkerJobListByConcurrencyKeyRequest,
  ): Promise<WorkerJobRpcResult<WorkerJobDto[]>>;
  list(request: WorkerJobListRequest): Promise<WorkerJobRpcResult<WorkerJobDto[]>>;
  cancel(request: WorkerJobCancelRequest): Promise<WorkerJobRpcResult<WorkerJobDto>>;
  readManyInternal(jobIds: readonly string[]): Promise<WorkerJobRpcResult<WorkerJobDto[]>>;
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

export function buildWorkerJobReadManyRpcArgs(
  jobIds: readonly string[],
  includeInternal = true,
): Record<string, unknown> {
  const uniqueJobIds = [...new Set(jobIds)];
  if (uniqueJobIds.length > 200) {
    throw new Error('Worker job batch reads are limited to 200 job ids');
  }
  return {
    p_job_ids: uniqueJobIds,
    p_include_internal: includeInternal,
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

async function callWorkerJobRpc<T>(
  supabase: RpcClient,
  fn: (typeof WORKER_CAPABILITY_CONTRACT.database.routine)[keyof typeof WORKER_CAPABILITY_CONTRACT.database.routine],
  args: Record<string, unknown>,
): Promise<WorkerJobRpcResult<T>> {
  const { data, error } = await supabase
    .schema(WORKER_CAPABILITY_CONTRACT.database.schema)
    .rpc(fn, args);
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
      data: (data as Record<string, unknown>).data as T,
    };
  }

  return {
    ok: true,
    data: data as T,
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

export function buildWorkerJobListByConcurrencyKeyRpcArgs(
  request: WorkerJobListByConcurrencyKeyRequest,
): Record<string, unknown> {
  const requestedLimit = request.limit ?? 20;
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 20) {
    throw new Error('Worker job concurrency reads require a limit between 1 and 20');
  }
  return {
    p_job_kind: request.jobKind,
    p_concurrency_key: request.concurrencyKey,
    p_statuses: request.statuses,
    p_limit: requestedLimit,
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
  return callWorkerJobRpc<WorkerJobDto>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.enqueue,
    buildWorkerJobEnqueueRpcArgs(request),
  );
}

export function callWorkerJobReadRpc(supabase: RpcClient, request: WorkerJobReadRequest) {
  return callWorkerJobRpc<WorkerJobDto | null>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.read,
    buildWorkerJobReadRpcArgs(request),
  );
}

export function callWorkerJobReadManyRpc(
  supabase: RpcClient,
  jobIds: readonly string[],
  includeInternal = true,
) {
  return callWorkerJobRpc<WorkerJobDto[]>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.readMany,
    buildWorkerJobReadManyRpcArgs(jobIds, includeInternal),
  );
}

export function callWorkerJobListByConcurrencyKeyRpc(
  supabase: RpcClient,
  request: WorkerJobListByConcurrencyKeyRequest,
) {
  return callWorkerJobRpc<WorkerJobDto[]>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.listByConcurrencyKey,
    buildWorkerJobListByConcurrencyKeyRpcArgs(request),
  );
}

export function callWorkerJobListRpc(supabase: RpcClient, request: WorkerJobListRequest) {
  return callWorkerJobRpc<WorkerJobDto[]>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.list,
    buildWorkerJobListRpcArgs(request),
  );
}

export function callWorkerJobCancelRpc(supabase: RpcClient, request: WorkerJobCancelRequest) {
  return callWorkerJobRpc<WorkerJobDto>(
    supabase,
    WORKER_CAPABILITY_CONTRACT.database.routine.cancel,
    buildWorkerJobCancelRpcArgs(request),
  );
}

export function createServiceWorkerCapabilityRepository(
  serviceSupabase: RpcClient,
): ServiceWorkerCapabilityRepository {
  return {
    access: 'service-only',
    enqueue: (request) => callWorkerJobEnqueueRpc(serviceSupabase, request),
    read: (request) => callWorkerJobReadRpc(serviceSupabase, request),
    listByConcurrencyKey: (request) =>
      callWorkerJobListByConcurrencyKeyRpc(serviceSupabase, request),
    list: (request) => callWorkerJobListRpc(serviceSupabase, request),
    cancel: (request) => callWorkerJobCancelRpc(serviceSupabase, request),
    readManyInternal: (jobIds) => callWorkerJobReadManyRpc(serviceSupabase, jobIds, true),
  };
}
