import {
  createLcaResultFamilyCapabilityRepository,
  type LcaResultFamilyCapabilityRepository,
} from './capabilities/lca_result_family.ts';
import type { LcaCalculationEvidenceBinding } from './lca_snapshot_scope.ts';
import type { ServiceRoleSupabaseClient } from './supabase_client.ts';

import {
  enqueueCalculatorWorkerJob,
  isWorkerJobsCutoverEnabled,
  lcaWorkerJobKindForJobType,
  workerJobPayloadSchemaVersion,
  workerJobPayloadStringFromRpcData,
} from './worker_jobs_cutover.ts';

const REQUEST_VERSION = 'lca_solve_v2';

type EnvReader = (key: string) => string | undefined;

type AllUnitSolvePayload = {
  type: 'solve_all_unit';
  job_id: string;
  snapshot_id: string;
  solve: { return_x: false; return_g: false; return_h: true };
  print_level: number;
  calculation_evidence_binding?: LcaCalculationEvidenceBinding;
};

type AllUnitSolveNormalizedRequest = {
  version: string;
  scope: string;
  snapshot_id: string;
  demand_mode: 'all_unit';
  solve: { return_x: false; return_g: false; return_h: true };
  print_level: number;
  calculation_evidence_binding?: LcaCalculationEvidenceBinding;
};

export type LcaAllUnitSolveQueueResult =
  | {
      ok: true;
      mode: 'queued' | 'in_progress';
      snapshot_id: string;
      cache_key: string;
      job_id: string;
      worker_job_id: string | null;
    }
  | { ok: false; error: string; status: number; details?: unknown };

export async function ensureLcaAllUnitSolveQueued(
  supabase: ServiceRoleSupabaseClient,
  args: {
    scope: string;
    snapshotId: string;
    userId: string;
    calculationEvidenceBinding?: LcaCalculationEvidenceBinding | null;
    readEnv?: EnvReader;
    resultRepository?: LcaResultFamilyCapabilityRepository;
  },
): Promise<LcaAllUnitSolveQueueResult> {
  const solve = { return_x: false, return_g: false, return_h: true } as const;
  const normalizedRequest: AllUnitSolveNormalizedRequest = {
    version: REQUEST_VERSION,
    scope: args.scope,
    snapshot_id: args.snapshotId,
    demand_mode: 'all_unit',
    solve,
    print_level: 0,
    ...(args.calculationEvidenceBinding
      ? { calculation_evidence_binding: args.calculationEvidenceBinding }
      : {}),
  };
  const requestKey = await sha256Hex(JSON.stringify(normalizedRequest));
  const resultRepository =
    args.resultRepository ?? createLcaResultFamilyCapabilityRepository(supabase);

  const existingCache = await resultRepository.readCache({
    scope: args.scope,
    snapshotId: args.snapshotId,
    requestKey,
  });
  if (!existingCache.ok) {
    return { ok: false, error: 'cache_lookup_failed', status: 500 };
  }

  if (existingCache.data) {
    if (
      (existingCache.data.status === 'pending' || existingCache.data.status === 'running') &&
      (existingCache.data.workerJobId || existingCache.data.legacyJobId)
    ) {
      const touched = await resultRepository.touchCache(existingCache.data.cacheId);
      if (!touched.ok) {
        console.warn('touch all-unit result cache failed', {
          code: touched.code,
          error: touched.message,
          cache_id: existingCache.data.cacheId,
        });
      }
      return {
        ok: true,
        mode: 'in_progress',
        snapshot_id: args.snapshotId,
        cache_key: requestKey,
        job_id: existingCache.data.legacyJobId ?? existingCache.data.workerJobId ?? '',
        worker_job_id: existingCache.data.workerJobId,
      };
    }
  }

  if (!isWorkerJobsCutoverEnabled('LCA_WORKER_JOBS_ENABLED', args.readEnv)) {
    console.error('legacy lca queue fallback is disabled before all-unit worker job enqueue', {
      request_key: requestKey,
      snapshot_id: args.snapshotId,
    });
    return { ok: false, error: 'legacy_queue_disabled', status: 503 };
  }

  const jobType = 'solve_all_unit';
  const jobKind = lcaWorkerJobKindForJobType(jobType);
  if (!jobKind) {
    return { ok: false, error: 'worker_job_kind_unsupported', status: 500 };
  }

  const newJobId = crypto.randomUUID();
  const payload: AllUnitSolvePayload = {
    type: jobType,
    job_id: newJobId,
    snapshot_id: args.snapshotId,
    solve,
    print_level: 0,
    ...(args.calculationEvidenceBinding
      ? { calculation_evidence_binding: args.calculationEvidenceBinding }
      : {}),
  };
  const workerJob = await enqueueCalculatorWorkerJob(supabase, {
    jobKind,
    payload,
    payloadSchemaVersion: args.calculationEvidenceBinding
      ? 'lca.solve_all_unit.request.v2'
      : workerJobPayloadSchemaVersion(jobKind),
    subjectType: 'lca_job',
    subjectId: newJobId,
    subjectVersion: args.snapshotId,
    requestedBy: args.userId,
    requesterType: 'user',
    idempotencyKey: `${args.userId}:${requestKey}`,
    requestHash: requestKey,
    queueKey: args.snapshotId,
    visibility: 'user',
  });
  if (!workerJob.ok) {
    console.error('enqueue all-unit lca worker_jobs job failed', {
      error: workerJob.error,
      status: workerJob.status,
      details: workerJob.details,
      lca_job_id: newJobId,
      snapshot_id: args.snapshotId,
    });
    return {
      ok: false,
      error: 'worker_jobs_enqueue_failed',
      status: workerJob.status,
      details: workerJob.error,
    };
  }

  const finalJobId = workerJobPayloadStringFromRpcData(workerJob.data, 'job_id') ?? newJobId;
  const finalWorkerJobId = workerJob.workerJobId;

  const admitted = await resultRepository.admitCache({
    scope: args.scope,
    snapshotId: args.snapshotId,
    requestKey,
    requestPayload: normalizedRequest,
    legacyJobId: finalJobId,
    workerJobId: finalWorkerJobId,
    // This branch is reached only because the latest all-unit pointer was absent.
    // Always replace a concurrently-created ready cache binding as well as the
    // row observed by the initial read; otherwise the pointer can remain absent.
    replaceReady: true,
  });
  if (!admitted.ok) {
    console.error('admit all-unit result cache failed', {
      code: admitted.code,
      error: admitted.message,
      snapshot_id: args.snapshotId,
    });
    return { ok: false, error: 'cache_admission_failed', status: admitted.status };
  }
  if (admitted.data.outcome === 'reused') {
    const canonical = admitted.data.cache;
    return {
      ok: true,
      mode: 'in_progress',
      snapshot_id: args.snapshotId,
      cache_key: requestKey,
      job_id: canonical.legacyJobId ?? canonical.workerJobId ?? '',
      worker_job_id: canonical.workerJobId,
    };
  }

  return {
    ok: true,
    mode: 'queued',
    snapshot_id: args.snapshotId,
    cache_key: requestKey,
    job_id: admitted.data.cache.legacyJobId ?? finalJobId,
    worker_job_id: admitted.data.cache.workerJobId,
  };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
