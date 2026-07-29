import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  buildLcaMethodFactorSourceContract,
  buildLciaFactorCoverageContract,
  buildSnapshotBuildPayloadFields,
  buildSnapshotProcessFilter,
  type LcaDataScope,
  type LcaMethodFactorSourceContract,
  type LcaScopeManifest,
  type LcaSnapshotRequestRoot,
  type LciaFactorCoverageContract,
  type SnapshotProcessFilter,
} from './lca_snapshot_scope.ts';
import {
  enqueueCalculatorWorkerJob,
  isWorkerJobsCutoverEnabled,
  workerJobPayloadStringFromRpcData,
} from './worker_jobs_cutover.ts';

export type LcaSnapshotBuildQueueResult =
  | {
      ok: true;
      job_id: string;
      snapshot_id: string;
      worker_job_id?: string | null;
      calculation_contract: LcaSnapshotCalculationContract;
    }
  | { ok: false; error: string; status: number };

export type LcaSnapshotCalculationContract = {
  data_scope: LcaDataScope;
  process_filter: SnapshotProcessFilter;
  scope_manifest: LcaScopeManifest | null;
  scope_manifest_sha256: string | null;
  lcia_method_factor_source: LcaMethodFactorSourceContract | null;
  lcia_factor_coverage_contract: LciaFactorCoverageContract | null;
};

const SNAPSHOT_BUILD_REQUEST_VERSION = 'lca_snapshot_build_v1';
const VERSIONED_SCOPE_SNAPSHOT_BUILD_REQUEST_VERSION = 'lca_snapshot_build_v2';
const ACTIVE_BUILD_MAX_QUEUED_MS = 10 * 60 * 1000;
const ACTIVE_BUILD_MAX_RUNNING_MS = 2 * 60 * 60 * 1000;
const ACTIVE_WORKER_STATUSES = ['queued', 'running', 'waiting', 'blocked'];

export async function ensureLcaSnapshotBuildQueued(
  supabase: SupabaseClient,
  args: {
    scope: string;
    dataScope: LcaDataScope;
    userId: string;
    requestRoots?: readonly LcaSnapshotRequestRoot[];
  },
): Promise<LcaSnapshotBuildQueueResult> {
  const processFilter = await buildSnapshotProcessFilter(
    args.dataScope,
    args.userId,
    args.requestRoots,
  );
  const calculationContract = buildCalculationContract(args.dataScope, processFilter);
  const requestVersion = processFilter.scope_manifest
    ? VERSIONED_SCOPE_SNAPSHOT_BUILD_REQUEST_VERSION
    : SNAPSHOT_BUILD_REQUEST_VERSION;
  const buildPayloadFields = {
    scope: args.scope,
    ...buildSnapshotBuildPayloadFields(processFilter),
    reference_normalization_mode: 'lenient',
    allocation_fraction_mode: 'lenient',
    self_loop_cutoff: 0.999999,
    singular_eps: 1e-12,
    no_lcia: false,
  };
  const requestKey = await sha256Hex(
    JSON.stringify({
      version: requestVersion,
      scope: args.scope,
      process_filter: processFilter,
      payload: buildPayloadFields,
    }),
  );
  const concurrencyKey = `lca.build_snapshot:${args.scope}:${requestKey}`;

  const activeBuild = await findActiveSnapshotBuildWorkerJob(supabase, concurrencyKey);
  if (!activeBuild.ok) {
    return activeBuild;
  }
  if (activeBuild.job_id && activeBuild.snapshot_id) {
    return {
      ok: true,
      job_id: activeBuild.job_id,
      snapshot_id: activeBuild.snapshot_id,
      worker_job_id: activeBuild.worker_job_id,
      calculation_contract: calculationContract,
    };
  }

  if (!isWorkerJobsCutoverEnabled('LCA_WORKER_JOBS_ENABLED')) {
    console.error('legacy lca snapshot queue fallback is disabled before worker job enqueue', {
      request_key: requestKey,
      scope: args.scope,
    });
    return { ok: false, error: 'legacy_queue_disabled', status: 503 };
  }

  const snapshotId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const payload = {
    type: 'build_snapshot',
    job_id: jobId,
    snapshot_id: snapshotId,
    ...buildPayloadFields,
  };

  const { error: snapshotInsertError } = await supabase.from('lca_network_snapshots').insert({
    id: snapshotId,
    scope: 'full_library',
    process_filter: processFilter,
    status: 'draft',
    created_by: args.userId,
  });
  if (snapshotInsertError && snapshotInsertError.code !== '23505') {
    console.error('insert lca_network_snapshots failed', {
      error: snapshotInsertError.message,
      code: snapshotInsertError.code,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'snapshot_build_seed_failed', status: 500 };
  }

  const workerJob = await enqueueCalculatorWorkerJob(supabase, {
    jobKind: 'lca.build_snapshot',
    payload,
    payloadSchemaVersion: processFilter.scope_manifest
      ? 'lca.build_snapshot.request.v2'
      : 'lca.build_snapshot.request.v1',
    subjectType: 'lca_job',
    subjectId: jobId,
    subjectVersion: snapshotId,
    requestedBy: args.userId,
    requesterType: 'user',
    idempotencyKey: `${args.userId}:${requestKey}`,
    requestHash: requestKey,
    concurrencyKey,
    queueKey: args.scope,
    visibility: 'user',
  });
  if (!workerJob.ok) {
    if (workerJob.error === 'WORKER_JOB_CONCURRENCY_CONFLICT') {
      const activeAfterConflict = await findActiveSnapshotBuildWorkerJob(supabase, concurrencyKey);
      if (activeAfterConflict.ok && activeAfterConflict.job_id && activeAfterConflict.snapshot_id) {
        return {
          ok: true,
          job_id: activeAfterConflict.job_id,
          snapshot_id: activeAfterConflict.snapshot_id,
          worker_job_id: activeAfterConflict.worker_job_id,
          calculation_contract: calculationContract,
        };
      }
    }

    console.error('enqueue build snapshot worker_jobs job failed', {
      error: workerJob.error,
      status: workerJob.status,
      details: workerJob.details,
      lca_job_id: jobId,
      snapshot_id: snapshotId,
    });
    return {
      ok: false,
      error: 'snapshot_build_worker_jobs_enqueue_failed',
      status: workerJob.status,
    };
  }

  return {
    ok: true,
    job_id: workerJobPayloadStringFromRpcData(workerJob.data, 'job_id') ?? jobId,
    snapshot_id: workerJobPayloadStringFromRpcData(workerJob.data, 'snapshot_id') ?? snapshotId,
    worker_job_id: workerJob.workerJobId,
    calculation_contract: calculationContract,
  };
}

function buildCalculationContract(
  dataScope: LcaDataScope,
  processFilter: SnapshotProcessFilter,
): LcaSnapshotCalculationContract {
  const isVersionedScope = !!processFilter.scope_manifest && !!processFilter.scope_manifest_sha256;
  return {
    data_scope: dataScope,
    process_filter: processFilter,
    scope_manifest: processFilter.scope_manifest ?? null,
    scope_manifest_sha256: processFilter.scope_manifest_sha256 ?? null,
    lcia_method_factor_source: isVersionedScope ? buildLcaMethodFactorSourceContract() : null,
    lcia_factor_coverage_contract: isVersionedScope ? buildLciaFactorCoverageContract() : null,
  };
}

async function findActiveSnapshotBuildWorkerJob(
  supabase: SupabaseClient,
  concurrencyKey: string,
): Promise<
  | { ok: true; job_id: string | null; snapshot_id: string | null; worker_job_id: string | null }
  | { ok: false; error: string; status: number }
> {
  const { data: rows, error } = await supabase
    .from('worker_jobs')
    .select('id,payload_json,status,created_at,started_at')
    .eq('job_kind', 'lca.build_snapshot')
    .eq('concurrency_key', concurrencyKey)
    .in('status', ACTIVE_WORKER_STATUSES)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('read active build worker_jobs failed', {
      error: error.message,
      code: error.code,
      concurrency_key: concurrencyKey,
    });
    return { ok: false, error: 'snapshot_build_job_lookup_failed', status: 500 };
  }

  for (const row of rows ?? []) {
    const status = String((row as { status?: unknown }).status ?? '');
    if (isExpiredActiveStatus(status, row)) {
      continue;
    }

    const payload = (row as { payload_json?: unknown }).payload_json;
    const jobId = payloadString(payload, 'job_id');
    const snapshotId = payloadString(payload, 'snapshot_id');
    const workerJobId = String((row as { id?: unknown }).id ?? '').trim();
    if (jobId && snapshotId && workerJobId) {
      return {
        ok: true,
        job_id: jobId,
        snapshot_id: snapshotId,
        worker_job_id: workerJobId,
      };
    }
  }

  return { ok: true, job_id: null, snapshot_id: null, worker_job_id: null };
}

function isExpiredActiveStatus(status: string, row: unknown): boolean {
  const nowMs = Date.now();
  const createdAtMs = dateMs((row as { created_at?: unknown }).created_at);
  if (
    status === 'queued' &&
    Number.isFinite(createdAtMs) &&
    nowMs - createdAtMs > ACTIVE_BUILD_MAX_QUEUED_MS
  ) {
    return true;
  }

  const startedAtMs = dateMs((row as { started_at?: unknown }).started_at);
  return (
    status === 'running' &&
    Number.isFinite(startedAtMs) &&
    nowMs - startedAtMs > ACTIVE_BUILD_MAX_RUNNING_MS
  );
}

function payloadString(payload: unknown, field: string): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  const value = (payload as Record<string, unknown>)[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function dateMs(value: unknown): number {
  return value === null || value === undefined ? Number.NaN : Date.parse(String(value));
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
