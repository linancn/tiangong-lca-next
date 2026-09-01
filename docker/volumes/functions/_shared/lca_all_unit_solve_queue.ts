import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.112.4';

import type { LcaSnapshotScope } from './lca_snapshot_capabilities.ts';
import type { LcaCalculationEvidenceBinding } from './lca_snapshot_scope.ts';

import {
  isWorkerJobsCutoverEnabled,
  lcaWorkerJobKindForJobType,
  workerJobPayloadSchemaVersion,
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
  scope: LcaSnapshotScope;
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
    scope: LcaSnapshotScope;
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
  const { data, error } = await supabase.rpc('svc_lca_cached_job_enqueue', {
    p_scope: args.scope,
    p_snapshot_id: args.snapshotId,
    p_request_key: requestKey,
    p_request_payload: normalizedRequest,
    p_job_kind: jobKind,
    p_job_id: newJobId,
    p_payload: payload,
    p_payload_schema_version: args.calculationEvidenceBinding
      ? 'lca.solve_all_unit.request.v2'
      : workerJobPayloadSchemaVersion(jobKind),
    p_requested_by: args.userId,
    p_idempotency_key: `${args.userId}:${requestKey}`,
    p_queue_key: args.snapshotId,
  });
  if (error) {
    return {
      ok: false,
      error: 'worker_jobs_enqueue_failed',
      status: 500,
      details: error,
    };
  }
  const result = data as Record<string, unknown> | null;
  if (!result || result.ok !== true || result.mode === 'blocked') {
    return {
      ok: false,
      error: String(
        result?.code ??
          (result?.mode === 'blocked' ? 'worker_job_blocked' : 'worker_jobs_enqueue_failed'),
      ),
      status: Number(result?.status ?? 503),
      details: result,
    };
  }

  return {
    ok: true,
    mode: result.mode === 'queued' ? 'queued' : 'in_progress',
    snapshot_id: args.snapshotId,
    cache_key: requestKey,
    job_id: String(result.job_id ?? newJobId),
    worker_job_id: result.worker_job_id ? String(result.worker_job_id) : null,
  };
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
