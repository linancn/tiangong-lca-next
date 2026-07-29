import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { LcaCalculationEvidenceBinding } from './lca_snapshot_scope.ts';

import {
  enqueueCalculatorWorkerJob,
  isWorkerJobsCutoverEnabled,
  lcaWorkerJobKindForJobType,
  workerJobPayloadSchemaVersion,
  workerJobPayloadStringFromRpcData,
} from './worker_jobs_cutover.ts';

const REQUEST_VERSION = 'lca_solve_v2';

type EnvReader = (key: string) => string | undefined;

type ResultCacheRow = {
  id: string;
  status: string;
  job_id: string | null;
  worker_job_id: string | null;
  result_id: string | null;
  hit_count: number;
};

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
  supabase: SupabaseClient,
  args: {
    scope: string;
    snapshotId: string;
    userId: string;
    calculationEvidenceBinding?: LcaCalculationEvidenceBinding | null;
    readEnv?: EnvReader;
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
  const nowIso = new Date().toISOString();

  const existingCache = await fetchResultCache(supabase, args.scope, args.snapshotId, requestKey);
  if (!existingCache.ok) {
    return { ok: false, error: 'cache_lookup_failed', status: 500 };
  }

  if (existingCache.row) {
    await touchResultCache(supabase, existingCache.row, {
      updated_at: nowIso,
      last_accessed_at: nowIso,
      hit_count: existingCache.row.hit_count + 1,
    });

    if (
      (existingCache.row.status === 'pending' || existingCache.row.status === 'running') &&
      (existingCache.row.worker_job_id || existingCache.row.job_id)
    ) {
      return {
        ok: true,
        mode: 'in_progress',
        snapshot_id: args.snapshotId,
        cache_key: requestKey,
        job_id: existingCache.row.job_id ?? existingCache.row.worker_job_id ?? '',
        worker_job_id: existingCache.row.worker_job_id,
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

  if (existingCache.row) {
    const updated = await updateResultCacheForPending(supabase, existingCache.row, {
      normalizedRequest,
      nowIso,
      finalJobId,
      finalWorkerJobId,
    });
    if (!updated.ok) {
      return updated;
    }
  } else {
    const inserted = await insertResultCacheForPending(supabase, {
      scope: args.scope,
      snapshotId: args.snapshotId,
      requestKey,
      normalizedRequest,
      nowIso,
      finalJobId,
      finalWorkerJobId,
    });
    if (!inserted.ok) {
      return inserted;
    }
  }

  return {
    ok: true,
    mode: 'queued',
    snapshot_id: args.snapshotId,
    cache_key: requestKey,
    job_id: finalJobId,
    worker_job_id: finalWorkerJobId,
  };
}

async function fetchResultCache(
  supabase: SupabaseClient,
  scope: string,
  snapshotId: string,
  requestKey: string,
): Promise<{ ok: true; row: ResultCacheRow | null } | { ok: false }> {
  const { data, error } = await supabase
    .from('lca_result_cache')
    .select('id,status,job_id,worker_job_id,result_id,hit_count')
    .eq('scope', scope)
    .eq('snapshot_id', snapshotId)
    .eq('request_key', requestKey)
    .maybeSingle();

  if (error) {
    console.error('fetch all-unit lca_result_cache failed', {
      error: error.message,
      code: error.code,
      snapshot_id: snapshotId,
    });
    return { ok: false };
  }

  if (!data) {
    return { ok: true, row: null };
  }

  return {
    ok: true,
    row: {
      id: String(data.id),
      status: String(data.status),
      job_id: data.job_id ? String(data.job_id) : null,
      worker_job_id: data.worker_job_id ? String(data.worker_job_id) : null,
      result_id: data.result_id ? String(data.result_id) : null,
      hit_count: Number(data.hit_count ?? 0),
    },
  };
}

async function touchResultCache(
  supabase: SupabaseClient,
  row: ResultCacheRow,
  patch: {
    updated_at: string;
    last_accessed_at: string;
    hit_count: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from('lca_result_cache')
    .update({
      updated_at: patch.updated_at,
      last_accessed_at: patch.last_accessed_at,
      hit_count: patch.hit_count,
    })
    .eq('id', row.id);

  if (error) {
    console.warn('touch all-unit lca_result_cache failed', {
      error: error.message,
      code: error.code,
      row_id: row.id,
    });
  }
}

async function updateResultCacheForPending(
  supabase: SupabaseClient,
  row: ResultCacheRow,
  args: {
    normalizedRequest: AllUnitSolveNormalizedRequest;
    nowIso: string;
    finalJobId: string;
    finalWorkerJobId: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await supabase
    .from('lca_result_cache')
    .update({
      status: 'pending',
      job_id: args.finalJobId,
      worker_job_id: args.finalWorkerJobId,
      request_payload: args.normalizedRequest,
      hit_count: row.hit_count + 1,
      last_accessed_at: args.nowIso,
      updated_at: args.nowIso,
    })
    .eq('id', row.id);

  if (error) {
    console.error('update all-unit lca_result_cache failed', {
      error: error.message,
      code: error.code,
      row_id: row.id,
    });
    return { ok: false, error: 'cache_update_failed', status: 500 };
  }

  return { ok: true };
}

async function insertResultCacheForPending(
  supabase: SupabaseClient,
  args: {
    scope: string;
    snapshotId: string;
    requestKey: string;
    normalizedRequest: AllUnitSolveNormalizedRequest;
    nowIso: string;
    finalJobId: string;
    finalWorkerJobId: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { error } = await supabase.from('lca_result_cache').insert({
    scope: args.scope,
    snapshot_id: args.snapshotId,
    request_key: args.requestKey,
    request_payload: args.normalizedRequest,
    status: 'pending',
    job_id: args.finalJobId,
    worker_job_id: args.finalWorkerJobId,
    hit_count: 1,
    last_accessed_at: args.nowIso,
    created_at: args.nowIso,
    updated_at: args.nowIso,
  });

  if (error && error.code !== '23505') {
    console.error('insert all-unit lca_result_cache failed', {
      error: error.message,
      code: error.code,
      snapshot_id: args.snapshotId,
    });
    return { ok: false, error: 'cache_insert_failed', status: 500 };
  }

  return { ok: true };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
