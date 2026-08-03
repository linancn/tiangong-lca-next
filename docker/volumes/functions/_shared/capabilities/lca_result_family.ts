import type { PostgrestError } from 'jsr:@supabase/supabase-js@2.98.0';

import type { ServiceRoleSupabaseClient } from '../supabase_client.ts';

export const LCA_RESULT_FAMILY_CAPABILITY_CONTRACT = Object.freeze({
  contractVersion: 'supabase-consumer.v1',
  databaseCommit: '38e15b0274cc2f87c93acbab520c110c4b907361',
  migrationHead: '20260802190427',
  transport: 'data-api-rpc',
  schema: 'api',
  callerIdentity: 'service-role',
  authPropagation: 'dedicated Edge service client; no request JWT substitution',
  fallback: 'none',
  routines: {
    readJobProjection: 'lca_read_job_projection_v1',
    readResultProjection: 'lca_read_result_projection_v1',
    readLatestSingleSolve: 'lca_read_latest_single_solve_result_v1',
    readCache: 'lca_read_result_cache_v1',
    touchCache: 'cmd_lca_touch_result_cache_v1',
    admitCache: 'cmd_lca_admit_result_cache_v1',
    reconcileCache: 'cmd_lca_reconcile_result_cache_v1',
    readLatestAllUnit: 'lca_read_latest_all_unit_result_v1',
  },
  legacyRelations: [
    'public.lca_results',
    'public.lca_result_cache',
    'public.lca_latest_all_unit_results',
    'public.lca_factorization_registry',
  ],
  legacyRemovalGate: 'static/runtime/owner consumer-zero plus burn-in and Contract approval',
} as const);

export type LcaResultCapabilityFailure = {
  ok: false;
  code: string;
  status: number;
  message: string;
  details: unknown;
};

export type LcaResultCapabilityResult<T> = { ok: true; data: T } | LcaResultCapabilityFailure;

export type LcaArtifactProjection = {
  artifactUrl?: string;
  artifactFormat?: string;
  artifactByteSize?: number;
  artifactSha256?: string;
};

export type LcaResultProjectionItem = {
  resultId: string;
  legacyJobId?: string;
  workerJobId: string;
  snapshotId: string;
  createdAt: string;
  diagnostics?: unknown;
  artifact: LcaArtifactProjection;
};

export type LcaJobProjectionItem = {
  workerJobId: string;
  legacyJobId?: string;
  snapshotId?: string;
  jobKind: string;
  jobType?: string;
  status: string;
  phase?: string;
  progress?: number;
  payload?: unknown;
  diagnostics?: unknown;
  timestamps: {
    createdAt: string;
    startedAt?: string;
    finishedAt?: string;
    updatedAt: string;
  };
};

export type LcaJobProjection = {
  job: LcaJobProjectionItem;
  workerJob: Record<string, unknown>;
  result: LcaResultProjectionItem | null;
};

export type LcaResultProjection = {
  result: LcaResultProjectionItem;
  job: LcaJobProjectionItem;
  workerJob: Record<string, unknown>;
};

export type LcaLatestSingleSolveResult = {
  snapshotId: string;
  processIndex: number;
  amount: number;
  cache: {
    cacheId: string;
    requestKey: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  result: LcaResultProjectionItem;
  workerJob: Record<string, unknown>;
};

export type LcaResultCacheEntry = {
  cacheId: string;
  scope: string;
  snapshotId: string;
  requestKey: string;
  status: string;
  legacyJobId: string | null;
  workerJobId: string | null;
  resultId: string | null;
  hitCount: number;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LcaResultCacheMutation = Pick<
  LcaResultCacheEntry,
  | 'cacheId'
  | 'status'
  | 'legacyJobId'
  | 'workerJobId'
  | 'resultId'
  | 'hitCount'
  | 'lastAccessedAt'
  | 'updatedAt'
>;

export type LcaLatestAllUnitResult = {
  snapshotId: string;
  resultId: string;
  computedAt: string;
  queryArtifactUrl: string;
  queryArtifactFormat: string;
};

export type LcaCacheAdmission = {
  outcome: 'accepted' | 'reused';
  cache: LcaResultCacheEntry;
};

export type LcaCacheReconciliation =
  | {
      code: 'reconciled' | 'result_pending';
      cache: LcaResultCacheMutation;
      workerStatus: string;
      jobProjection: { ok: true; data: LcaJobProjection };
    }
  | {
      code: 'cache_not_found' | 'job_not_found';
      cache: null;
      workerStatus: null;
      jobProjection: null;
    };

export type LcaResultFamilyCapabilityRepository = {
  readonly access: 'service-only';
  readJobProjection(request: {
    requestedBy: string;
    workerJobId?: string | null;
    legacyJobId?: string | null;
    includeInternal?: boolean;
  }): Promise<LcaResultCapabilityResult<LcaJobProjection | null>>;
  readResultProjection(request: {
    requestedBy: string;
    resultId: string;
    requiredArtifactFormat?: string | null;
    includeInternal?: boolean;
  }): Promise<LcaResultCapabilityResult<LcaResultProjection | null>>;
  readLatestSingleSolve(request: {
    requestedBy: string;
    snapshotId: string;
    processIndex: number;
  }): Promise<LcaResultCapabilityResult<LcaLatestSingleSolveResult | null>>;
  readCache(request: {
    scope: string;
    snapshotId: string;
    requestKey: string;
  }): Promise<LcaResultCapabilityResult<LcaResultCacheEntry | null>>;
  touchCache(cacheId: string): Promise<LcaResultCapabilityResult<LcaResultCacheMutation | null>>;
  admitCache(request: {
    scope: string;
    snapshotId: string;
    requestKey: string;
    requestPayload: Record<string, unknown>;
    legacyJobId: string;
    workerJobId?: string | null;
    replaceReady?: boolean;
  }): Promise<LcaResultCapabilityResult<LcaCacheAdmission>>;
  reconcileCache(request: {
    requestedBy: string;
    cacheId: string;
  }): Promise<LcaResultCapabilityResult<LcaCacheReconciliation>>;
  readLatestAllUnit(
    snapshotId: string,
  ): Promise<LcaResultCapabilityResult<LcaLatestAllUnitResult | null>>;
};

type RpcClient = Pick<ServiceRoleSupabaseClient, 'schema'>;
type Routine =
  (typeof LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.routines)[keyof typeof LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.routines];

function failure(code: string, status: number, message: string, details: unknown = null) {
  return { ok: false as const, code, status, message, details };
}

function mapRpcError(error: Pick<PostgrestError, 'code' | 'message' | 'details'>) {
  const code = error.code || 'RPC_ERROR';
  const status =
    code === '42501' ? 403 : code === 'PGRST116' ? 404 : code === 'AUTH_REQUIRED' ? 401 : 400;
  return failure(code, status, error.message || 'LCA result capability RPC failed', error.details);
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function requiredString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RFC3339_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function uuid(value: unknown): string | undefined {
  const decoded = requiredString(value);
  return decoded && UUID_RE.test(decoded) ? decoded : undefined;
}

function optionalUuid(value: unknown): string | undefined {
  return value === undefined ? undefined : uuid(value);
}

function timestamp(value: unknown): string | undefined {
  const decoded = requiredString(value);
  return decoded && RFC3339_RE.test(decoded) && Number.isFinite(Date.parse(decoded))
    ? decoded
    : undefined;
}

function optionalTimestamp(value: unknown): string | undefined {
  return value === undefined ? undefined : timestamp(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalFiniteNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : finiteNumber(value);
}

const LCA_JOB_KINDS = new Set([
  'lca.solve_one',
  'lca.solve_batch',
  'lca.solve_all_unit',
  'lca.build_snapshot',
  'lca.contribution_path',
  'lca.factorization_prepare',
]);

const WORKER_STATUSES = new Set([
  'queued',
  'running',
  'waiting',
  'completed',
  'blocked',
  'stale',
  'failed',
  'cancelled',
]);

const CACHE_STATUSES = new Set(['pending', 'running', 'ready', 'failed', 'stale']);
const ACTIVE_WORKER_STATUSES = new Set(['queued', 'running', 'waiting', 'blocked']);
const TERMINAL_FAILURE_WORKER_STATUSES = new Set(['stale', 'failed', 'cancelled']);

function decodeArtifact(value: unknown): LcaArtifactProjection | undefined {
  const item = record(value);
  if (!item) return undefined;
  const artifactUrl = item.artifactUrl === undefined ? undefined : requiredString(item.artifactUrl);
  const artifactFormat =
    item.artifactFormat === undefined ? undefined : requiredString(item.artifactFormat);
  const artifactByteSize = optionalFiniteNumber(item.artifactByteSize);
  const artifactSha256 =
    item.artifactSha256 === undefined ? undefined : requiredString(item.artifactSha256);
  if (
    (item.artifactUrl !== undefined && !artifactUrl) ||
    (item.artifactFormat !== undefined && !artifactFormat) ||
    (item.artifactByteSize !== undefined &&
      (artifactByteSize === undefined ||
        !Number.isInteger(artifactByteSize) ||
        artifactByteSize < 0)) ||
    (item.artifactSha256 !== undefined && !artifactSha256)
  )
    return undefined;
  return {
    ...(artifactUrl ? { artifactUrl } : {}),
    ...(artifactFormat ? { artifactFormat } : {}),
    ...(artifactByteSize !== undefined ? { artifactByteSize } : {}),
    ...(artifactSha256 ? { artifactSha256 } : {}),
  };
}

function decodeResultItem(value: unknown): LcaResultProjectionItem | undefined {
  const item = record(value);
  if (!item) return undefined;
  const resultId = uuid(item.resultId);
  const legacyJobId = optionalUuid(item.legacyJobId);
  const workerJobId = uuid(item.workerJobId);
  const snapshotId = uuid(item.snapshotId);
  const createdAt = timestamp(item.createdAt);
  const artifact = decodeArtifact(item.artifact);
  if (
    !resultId ||
    !workerJobId ||
    !snapshotId ||
    !createdAt ||
    !artifact ||
    (item.legacyJobId !== undefined && !legacyJobId)
  )
    return undefined;
  return {
    resultId,
    ...(legacyJobId ? { legacyJobId } : {}),
    workerJobId,
    snapshotId,
    createdAt,
    ...(item.diagnostics !== undefined ? { diagnostics: item.diagnostics } : {}),
    artifact,
  };
}

function decodeJobItem(value: unknown): LcaJobProjectionItem | undefined {
  const item = record(value);
  if (!item) return undefined;
  const workerJobId = uuid(item.workerJobId);
  const legacyJobId = optionalUuid(item.legacyJobId);
  const snapshotId = optionalUuid(item.snapshotId);
  const jobKind = requiredString(item.jobKind);
  const jobType = item.jobType === undefined ? undefined : requiredString(item.jobType);
  const status = requiredString(item.status);
  const phase = item.phase === undefined ? undefined : requiredString(item.phase);
  const progress = optionalFiniteNumber(item.progress);
  const times = record(item.timestamps);
  const createdAt = timestamp(times?.createdAt);
  const startedAt = optionalTimestamp(times?.startedAt);
  const finishedAt = optionalTimestamp(times?.finishedAt);
  const updatedAt = timestamp(times?.updatedAt);
  if (
    !workerJobId ||
    !jobKind ||
    !LCA_JOB_KINDS.has(jobKind) ||
    !status ||
    !WORKER_STATUSES.has(status) ||
    !times ||
    !createdAt ||
    !updatedAt ||
    (item.legacyJobId !== undefined && !legacyJobId) ||
    (item.snapshotId !== undefined && !snapshotId) ||
    (item.jobType !== undefined && !jobType) ||
    (item.phase !== undefined && !phase) ||
    (item.progress !== undefined && progress === undefined) ||
    (times.startedAt !== undefined && !startedAt) ||
    (times.finishedAt !== undefined && !finishedAt)
  )
    return undefined;
  return {
    workerJobId,
    ...(legacyJobId ? { legacyJobId } : {}),
    ...(snapshotId ? { snapshotId } : {}),
    jobKind,
    ...(jobType ? { jobType } : {}),
    status,
    ...(phase ? { phase } : {}),
    ...(progress !== undefined ? { progress } : {}),
    ...(item.payload !== undefined ? { payload: item.payload } : {}),
    ...(item.diagnostics !== undefined ? { diagnostics: item.diagnostics } : {}),
    timestamps: {
      createdAt,
      ...(startedAt ? { startedAt } : {}),
      ...(finishedAt ? { finishedAt } : {}),
      updatedAt,
    },
  };
}

function decodeJobProjection(value: unknown): LcaJobProjection | null | undefined {
  if (value === null) return null;
  const item = record(value);
  const job = decodeJobItem(item?.job);
  const workerJob = record(item?.workerJob);
  // The database uses jsonb_strip_nulls for a pending job projection, so an
  // omitted result member and an explicit null both represent "not persisted".
  const result = item?.result == null ? null : decodeResultItem(item.result);
  if (!item || !job || !workerJob || result === undefined) return undefined;
  if (
    result &&
    (result.workerJobId !== job.workerJobId ||
      result.legacyJobId !== job.legacyJobId ||
      (job.snapshotId !== undefined && result.snapshotId !== job.snapshotId))
  ) {
    return undefined;
  }
  return { job, workerJob, result };
}

function decodeResultProjection(value: unknown): LcaResultProjection | null | undefined {
  if (value === null) return null;
  const item = record(value);
  const result = decodeResultItem(item?.result);
  const job = decodeJobItem(item?.job);
  const workerJob = record(item?.workerJob);
  if (
    !item ||
    !result ||
    !job ||
    !workerJob ||
    result.workerJobId !== job.workerJobId ||
    result.legacyJobId !== job.legacyJobId ||
    (job.snapshotId !== undefined && result.snapshotId !== job.snapshotId)
  ) {
    return undefined;
  }
  return { result, job, workerJob };
}

function decodeLatestSingle(value: unknown): LcaLatestSingleSolveResult | null | undefined {
  if (value === null) return null;
  const item = record(value);
  const snapshotId = uuid(item?.snapshotId);
  const processIndex = finiteNumber(item?.processIndex);
  const amount = finiteNumber(item?.amount);
  const cache = record(item?.cache);
  const cacheId = uuid(cache?.cacheId);
  const requestKey = requiredString(cache?.requestKey);
  const status = requiredString(cache?.status);
  const createdAt = timestamp(cache?.createdAt);
  const updatedAt = timestamp(cache?.updatedAt);
  const result = decodeResultItem(item?.result);
  const workerJob = record(item?.workerJob);
  if (
    !item ||
    !snapshotId ||
    processIndex === undefined ||
    !Number.isInteger(processIndex) ||
    processIndex < 0 ||
    amount === undefined ||
    !cache ||
    !cacheId ||
    !requestKey ||
    !status ||
    status !== 'ready' ||
    !createdAt ||
    !updatedAt ||
    !result ||
    !workerJob
  )
    return undefined;
  return {
    snapshotId,
    processIndex,
    amount,
    cache: { cacheId, requestKey, status, createdAt, updatedAt },
    result,
    workerJob,
  };
}

function decodeCache(value: unknown): LcaResultCacheEntry | null | undefined {
  if (value === null) return null;
  const item = record(value);
  if (!item) return undefined;
  const cacheId = uuid(item.cacheId);
  const scope = requiredString(item.scope);
  const snapshotId = uuid(item.snapshotId);
  const requestKey = requiredString(item.requestKey);
  const status = requiredString(item.status);
  const legacyJobId = item.legacyJobId === null ? null : uuid(item.legacyJobId);
  const workerJobId = item.workerJobId === null ? null : uuid(item.workerJobId);
  const resultId = item.resultId === null ? null : uuid(item.resultId);
  const hitCount = item.hitCount;
  const lastAccessedAt = item.lastAccessedAt === null ? null : timestamp(item.lastAccessedAt);
  const createdAt = timestamp(item.createdAt);
  const updatedAt = timestamp(item.updatedAt);
  if (
    !cacheId ||
    !scope ||
    !snapshotId ||
    !requestKey ||
    !status ||
    !CACHE_STATUSES.has(status) ||
    legacyJobId === undefined ||
    workerJobId === undefined ||
    resultId === undefined ||
    !Number.isInteger(hitCount) ||
    Number(hitCount) < 0 ||
    lastAccessedAt === undefined ||
    !createdAt ||
    !updatedAt
  )
    return undefined;
  return {
    cacheId,
    scope,
    snapshotId,
    requestKey,
    status,
    legacyJobId,
    workerJobId,
    resultId,
    hitCount: Number(hitCount),
    lastAccessedAt,
    createdAt,
    updatedAt,
  };
}

function decodeCacheMutation(value: unknown): LcaResultCacheMutation | null | undefined {
  if (value === null) return null;
  const item = record(value);
  if (!item) return undefined;
  const cacheId = uuid(item.cacheId);
  const status = requiredString(item.status);
  const legacyJobId = item.legacyJobId === null ? null : uuid(item.legacyJobId);
  const workerJobId = item.workerJobId === null ? null : uuid(item.workerJobId);
  const resultId = item.resultId === null ? null : uuid(item.resultId);
  const hitCount = item.hitCount;
  const lastAccessedAt = item.lastAccessedAt === null ? null : timestamp(item.lastAccessedAt);
  const updatedAt = timestamp(item.updatedAt);
  if (
    !cacheId ||
    !status ||
    !CACHE_STATUSES.has(status) ||
    legacyJobId === undefined ||
    workerJobId === undefined ||
    resultId === undefined ||
    !Number.isInteger(hitCount) ||
    Number(hitCount) < 0 ||
    lastAccessedAt === undefined ||
    !updatedAt
  )
    return undefined;
  return {
    cacheId,
    status,
    legacyJobId,
    workerJobId,
    resultId,
    hitCount: Number(hitCount),
    lastAccessedAt,
    updatedAt,
  };
}

function reconciliationPairingIsValid(
  code: 'reconciled' | 'result_pending',
  cache: LcaResultCacheMutation,
  workerStatus: string,
  projection: LcaJobProjection,
): boolean {
  const job = projection.job;
  const projectedResult = projection.result;
  if (
    job.status !== workerStatus ||
    cache.workerJobId !== job.workerJobId ||
    cache.legacyJobId !== (job.legacyJobId ?? null)
  ) {
    return false;
  }
  if (
    projectedResult &&
    (projectedResult.workerJobId !== job.workerJobId ||
      projectedResult.legacyJobId !== job.legacyJobId ||
      (job.snapshotId !== undefined && projectedResult.snapshotId !== job.snapshotId))
  ) {
    return false;
  }
  if (
    cache.resultId !== null &&
    (!projectedResult || projectedResult.resultId !== cache.resultId)
  ) {
    return false;
  }
  if (code === 'result_pending') {
    return (
      workerStatus === 'completed' &&
      (cache.status === 'pending' || cache.status === 'running') &&
      cache.resultId === null &&
      projectedResult === null
    );
  }
  if (workerStatus === 'completed') {
    return (
      cache.status === 'ready' &&
      cache.resultId !== null &&
      projectedResult?.resultId === cache.resultId
    );
  }
  if (TERMINAL_FAILURE_WORKER_STATUSES.has(workerStatus)) {
    return cache.status === 'failed';
  }
  return (
    ACTIVE_WORKER_STATUSES.has(workerStatus) &&
    (cache.status === 'pending' || cache.status === 'running') &&
    cache.resultId === null &&
    projectedResult === null
  );
}

function decodeEnvelope(data: unknown): LcaResultCapabilityResult<unknown> {
  const envelope = record(data);
  if (!envelope || typeof envelope.ok !== 'boolean') {
    return failure(
      'INVALID_LCA_RESULT_FACADE_RESPONSE',
      500,
      'LCA result facade response is invalid',
    );
  }
  if (envelope.ok === false) {
    if (
      !requiredString(envelope.code) ||
      !Number.isInteger(envelope.status) ||
      Number(envelope.status) < 100 ||
      Number(envelope.status) > 599 ||
      !requiredString(envelope.message)
    ) {
      return failure(
        'INVALID_LCA_RESULT_FACADE_RESPONSE',
        500,
        'LCA result facade failure is invalid',
      );
    }
    return failure(
      envelope.code as string,
      envelope.status as number,
      envelope.message as string,
      envelope.details ?? null,
    );
  }
  if (!('data' in envelope)) {
    return failure('INVALID_LCA_RESULT_FACADE_RESPONSE', 500, 'LCA result facade data is missing');
  }
  return { ok: true, data: envelope.data };
}

async function call(client: RpcClient, routine: Routine, args: Record<string, unknown>) {
  const { data, error } = await client
    .schema(LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.schema)
    .rpc(routine, args);
  return error ? mapRpcError(error) : decodeEnvelope(data);
}

export function createLcaResultFamilyCapabilityRepository(
  client: ServiceRoleSupabaseClient,
): LcaResultFamilyCapabilityRepository {
  const routines = LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.routines;
  return Object.freeze({
    access: 'service-only' as const,
    async readJobProjection(request) {
      const result = await call(client, routines.readJobProjection, {
        p_requested_by: request.requestedBy,
        p_worker_job_id: request.workerJobId ?? null,
        p_legacy_job_id: request.legacyJobId ?? null,
        p_include_internal: request.includeInternal ?? false,
      });
      if (!result.ok) return result;
      const decoded = decodeJobProjection(result.data);
      const identityMatches =
        decoded !== undefined &&
        (decoded === null ||
          ((request.workerJobId == null || decoded.job.workerJobId === request.workerJobId) &&
            (request.legacyJobId == null || decoded.job.legacyJobId === request.legacyJobId)));
      return decoded === undefined || !identityMatches
        ? failure('INVALID_LCA_JOB_PROJECTION', 500, 'LCA job projection is invalid')
        : { ok: true, data: decoded };
    },
    async readResultProjection(request) {
      const result = await call(client, routines.readResultProjection, {
        p_requested_by: request.requestedBy,
        p_result_id: request.resultId,
        p_required_artifact_format: request.requiredArtifactFormat ?? null,
        p_include_internal: request.includeInternal ?? false,
      });
      if (!result.ok) return result;
      const decoded = decodeResultProjection(result.data);
      return decoded === undefined ||
        (decoded !== null && decoded.result.resultId !== request.resultId)
        ? failure('INVALID_LCA_RESULT_PROJECTION', 500, 'LCA result projection is invalid')
        : { ok: true, data: decoded };
    },
    async readLatestSingleSolve(request) {
      const result = await call(client, routines.readLatestSingleSolve, {
        p_requested_by: request.requestedBy,
        p_snapshot_id: request.snapshotId,
        p_process_index: request.processIndex,
      });
      if (!result.ok) return result;
      const decoded = decodeLatestSingle(result.data);
      return decoded === undefined ||
        (decoded !== null &&
          (decoded.snapshotId !== request.snapshotId ||
            decoded.processIndex !== request.processIndex))
        ? failure(
            'INVALID_LCA_SINGLE_SOLVE_PROJECTION',
            500,
            'Latest single solve projection is invalid',
          )
        : { ok: true, data: decoded };
    },
    async readCache(request) {
      const result = await call(client, routines.readCache, {
        p_scope: request.scope,
        p_snapshot_id: request.snapshotId,
        p_request_key: request.requestKey,
      });
      if (!result.ok) return result;
      const decoded = decodeCache(result.data);
      return decoded === undefined ||
        (decoded !== null &&
          (decoded.scope !== request.scope ||
            decoded.snapshotId !== request.snapshotId ||
            decoded.requestKey !== request.requestKey))
        ? failure('INVALID_LCA_RESULT_CACHE_RESPONSE', 500, 'LCA result cache response is invalid')
        : { ok: true, data: decoded };
    },
    async touchCache(cacheId) {
      const result = await call(client, routines.touchCache, { p_cache_id: cacheId });
      if (!result.ok) return result;
      const decoded = decodeCacheMutation(result.data);
      return decoded === undefined || (decoded !== null && decoded.cacheId !== cacheId)
        ? failure('INVALID_LCA_RESULT_CACHE_RESPONSE', 500, 'LCA result cache mutation is invalid')
        : { ok: true, data: decoded };
    },
    async admitCache(request) {
      const { data, error } = await client
        .schema(LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.schema)
        .rpc(routines.admitCache, {
          p_scope: request.scope,
          p_snapshot_id: request.snapshotId,
          p_request_key: request.requestKey,
          p_request_payload: request.requestPayload,
          p_legacy_job_id: request.legacyJobId,
          p_worker_job_id: request.workerJobId ?? null,
          p_replace_ready: request.replaceReady ?? false,
        });
      if (error) return mapRpcError(error);
      const envelope = record(data);
      const decoded = decodeCache(envelope?.data);
      if (
        envelope?.ok !== true ||
        (envelope.outcome !== 'accepted' && envelope.outcome !== 'reused') ||
        !decoded ||
        decoded.scope !== request.scope ||
        decoded.snapshotId !== request.snapshotId ||
        decoded.requestKey !== request.requestKey
      ) {
        return failure(
          'INVALID_LCA_RESULT_CACHE_RESPONSE',
          500,
          'LCA cache admission response is invalid',
        );
      }
      return { ok: true, data: { outcome: envelope.outcome, cache: decoded } };
    },
    async reconcileCache(request) {
      const { data, error } = await client
        .schema(LCA_RESULT_FAMILY_CAPABILITY_CONTRACT.schema)
        .rpc(routines.reconcileCache, {
          p_requested_by: request.requestedBy,
          p_cache_id: request.cacheId,
        });
      if (error) return mapRpcError(error);
      const envelope = record(data);
      if (envelope?.ok === false) {
        if (
          requiredString(envelope.code) &&
          Number.isInteger(envelope.status) &&
          Number(envelope.status) >= 100 &&
          Number(envelope.status) <= 599 &&
          requiredString(envelope.message)
        ) {
          return failure(
            envelope.code as string,
            envelope.status as number,
            envelope.message as string,
            envelope.details ?? null,
          );
        }
        return failure(
          'INVALID_LCA_RESULT_FACADE_RESPONSE',
          500,
          'LCA cache reconciliation failure is invalid',
        );
      }
      const code = envelope?.code;
      if (
        envelope?.ok !== true ||
        (code !== 'reconciled' &&
          code !== 'result_pending' &&
          code !== 'cache_not_found' &&
          code !== 'job_not_found')
      )
        return failure(
          'INVALID_LCA_RESULT_FACADE_RESPONSE',
          500,
          'LCA cache reconciliation response is invalid',
        );
      if (code === 'cache_not_found' || code === 'job_not_found') {
        if (envelope.data !== null) {
          return failure(
            'INVALID_LCA_RESULT_FACADE_RESPONSE',
            500,
            'LCA cache reconciliation code/data pairing is invalid',
          );
        }
        return {
          ok: true,
          data: {
            code,
            cache: null,
            workerStatus: null,
            jobProjection: null,
          },
        };
      }
      if (envelope.data === null) {
        return failure(
          'INVALID_LCA_RESULT_FACADE_RESPONSE',
          500,
          'LCA cache reconciliation data is missing',
        );
      }
      const body = record(envelope.data);
      const cache = decodeCacheMutation(body?.cache);
      const workerStatus = requiredString(body?.workerStatus);
      const jobProjectionEnvelope = record(body?.jobProjection);
      const jobProjection =
        jobProjectionEnvelope?.ok === true
          ? decodeJobProjection(jobProjectionEnvelope.data)
          : undefined;
      if (
        !body ||
        !cache ||
        cache.cacheId !== request.cacheId ||
        !workerStatus ||
        !WORKER_STATUSES.has(workerStatus) ||
        !jobProjection ||
        !reconciliationPairingIsValid(code, cache, workerStatus, jobProjection)
      ) {
        return failure(
          'INVALID_LCA_RESULT_CACHE_RESPONSE',
          500,
          'LCA cache reconciliation data is invalid',
        );
      }
      return {
        ok: true,
        data: { code, cache, workerStatus, jobProjection: { ok: true, data: jobProjection } },
      };
    },
    async readLatestAllUnit(snapshotId) {
      const result = await call(client, routines.readLatestAllUnit, { p_snapshot_id: snapshotId });
      if (!result.ok) return result;
      if (result.data === null) return { ok: true, data: null };
      const item = record(result.data);
      const decoded = item && {
        snapshotId: uuid(item.snapshotId),
        resultId: uuid(item.resultId),
        computedAt: timestamp(item.computedAt),
        queryArtifactUrl: requiredString(item.queryArtifactUrl),
        queryArtifactFormat: requiredString(item.queryArtifactFormat),
      };
      if (
        !decoded ||
        Object.values(decoded).some((value) => !value) ||
        decoded.snapshotId !== snapshotId
      ) {
        return failure(
          'INVALID_LCA_LATEST_ALL_UNIT_RESPONSE',
          500,
          'Latest all-unit response is invalid',
        );
      }
      return { ok: true, data: decoded as LcaLatestAllUnitResult };
    },
  });
}
