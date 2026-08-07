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
import { isWorkerJobsCutoverEnabled } from './worker_jobs_cutover.ts';

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
    ...buildPayloadFields,
  };

  const { data, error } = await supabase.rpc('svc_lca_snapshot_build_enqueue', {
    p_scope: args.scope,
    p_process_filter: processFilter,
    p_requested_by: args.userId,
    p_request_key: requestKey,
    p_job_id: jobId,
    p_snapshot_id: snapshotId,
    p_payload: payload,
    p_payload_schema_version: processFilter.scope_manifest
      ? 'lca.build_snapshot.request.v2'
      : 'lca.build_snapshot.request.v1',
  });
  if (error) {
    console.error('enqueue snapshot build capability failed', {
      error: error.message,
      code: error.code,
      lca_job_id: jobId,
      snapshot_id: snapshotId,
    });
    return {
      ok: false,
      error: 'snapshot_build_worker_jobs_enqueue_failed',
      status: 500,
    };
  }

  const result = data as Record<string, unknown> | null;
  if (!result || result.ok !== true) {
    return {
      ok: false,
      error: String(result?.code ?? 'snapshot_build_worker_jobs_enqueue_failed'),
      status: Number(result?.status ?? 500),
    };
  }

  return {
    ok: true,
    job_id: String(result.job_id ?? jobId),
    snapshot_id: String(result.snapshot_id ?? snapshotId),
    worker_job_id: result.worker_job_id ? String(result.worker_job_id) : null,
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

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
