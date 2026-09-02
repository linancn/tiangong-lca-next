// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import {
  hasClientSuppliedSnapshotRoots,
  normalizeSingleProcessDemand,
  requestRootFromSingleProcessDemand,
  validateProcessEntriesInDataScope,
  type NormalizedSingleProcessDemand,
} from '../_shared/lca_process_scope.ts';
import { ensureLcaSnapshotBuildQueued } from '../_shared/lca_snapshot_build_queue.ts';
import {
  parseLcaSnapshotScope,
  queryLcaSnapshotCandidates,
  type LcaSnapshotScope,
} from '../_shared/lca_snapshot_capabilities.ts';
import {
  buildLcaCalculationEvidenceBinding,
  buildSnapshotContainsFilter,
  buildSnapshotProcessFilter,
  buildSnapshotVisibilityOrExpression,
  matchesSnapshotProcessFilter,
  parseLcaDataScope,
  parseSnapshotProcessFilter,
  PUBLIC_PLUS_OWNER_DRAFT_SCOPE,
  shouldAutoBuildSnapshot,
  validateCalculationEvidenceForDataScope,
  type LcaCalculationEvidenceBinding,
  type LcaDataScope,
  type LcaSnapshotRequestRoot,
  type ParsedSnapshotProcessFilter,
} from '../_shared/lca_snapshot_scope.ts';
import { verifySnapshotMatchesDataScope } from '../_shared/lca_snapshot_scope_db.ts';
import { supabaseAuthClient, supabaseClient } from '../_shared/supabase_client.ts';
import {
  isWorkerJobsCutoverEnabled,
  lcaWorkerJobKindForJobType,
  workerJobPayloadSchemaVersion,
} from '../_shared/worker_jobs_cutover.ts';

type SolveRequest = {
  scope?: string;
  snapshot_id?: string;
  data_scope?: LcaDataScope;
  demand_mode?: string;
  demand?: {
    process_index?: number;
    process_id?: string;
    process_version?: string;
    amount?: number;
  };
  solve?: {
    return_x?: boolean;
    return_g?: boolean;
    return_h?: boolean;
  };
  print_level?: number;
  unit_batch_size?: number;
};

type SolveResponse = {
  mode: 'queued' | 'in_progress' | 'cache_hit';
  snapshot_id: string;
  cache_key: string;
  job_id?: string;
  worker_job_id?: string | null;
  result_id?: string;
  calculation_evidence?: LcaCalculationEvidenceBinding;
};

type ReadySnapshotMeta = {
  snapshot_id: string;
  process_count: number;
  artifact_url: string;
};

type SnapshotIndexProcessEntry = {
  process_id: string;
  process_index: number;
  process_version?: string;
};

type SnapshotIndexDocument = {
  snapshot_id: string;
  process_map: SnapshotIndexProcessEntry[];
  calculation_evidence?: unknown;
};

type ScopedSnapshotResolution =
  | { kind: 'fresh'; data: ReadySnapshotMeta }
  | { kind: 'stale'; snapshot_id: string }
  | { kind: 'none' };

const REQUEST_VERSION = 'lca_solve_v2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const authResult = await authenticateRequest(req, {
    authClient: supabaseAuthClient,
    allowedMethods: [AuthMethod.JWT],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const userId = authResult.principal?.userId;
  if (!userId) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: SolveRequest;
  try {
    body = (await req.json()) as SolveRequest;
  } catch (_error) {
    return json({ error: 'invalid_json' }, 400);
  }
  if (hasClientSuppliedSnapshotRoots(body)) {
    return json({ error: 'request_roots_not_allowed' }, 400);
  }

  const scope = parseLcaSnapshotScope(body.scope);
  if (!scope) {
    return json({ error: 'invalid_scope' }, 400);
  }
  const requestedSnapshotId = body.snapshot_id?.trim() || undefined;
  const dataScope = parseLcaDataScope(body.data_scope);
  const demandMode = body.demand_mode ?? 'single';
  const printLevel = body.print_level ?? 0.0;

  if (demandMode !== 'single' && demandMode !== 'all_unit') {
    return json({ error: 'invalid_demand_mode' }, 400);
  }
  if (!Number.isFinite(printLevel)) {
    return json({ error: 'invalid_print_level' }, 400);
  }

  let normalizedSingleDemand: NormalizedSingleProcessDemand | null = null;
  let requestRoots: LcaSnapshotRequestRoot[] = [];
  if (demandMode === 'single') {
    const normalizedDemand = normalizeSingleProcessDemand(body.demand);
    if (!normalizedDemand.ok) {
      return json(normalizedDemand.body, normalizedDemand.status);
    }
    normalizedSingleDemand = normalizedDemand.demand;

    if (!requestedSnapshotId) {
      const requestRoot = requestRootFromSingleProcessDemand(normalizedDemand.demand);
      if (normalizedDemand.demand.selector === 'process_id' && !requestRoot) {
        return json({ error: 'process_version_required_for_snapshot_build' }, 400);
      }
      if (requestRoot) {
        const processScopeValidation = await validateProcessEntriesInDataScope(
          [requestRoot],
          dataScope,
          userId,
          supabaseClient,
        );
        if (!processScopeValidation.ok) {
          return json(processScopeValidation.body, processScopeValidation.status);
        }
        requestRoots = [requestRoot];
      }
    }
  }

  const snapshotMeta = await resolveReadySnapshot(
    scope,
    dataScope,
    requestedSnapshotId,
    userId,
    requestRoots,
  );
  if (!snapshotMeta.ok) {
    const shouldQueueBuild =
      shouldAutoBuildSnapshot(dataScope) &&
      !requestedSnapshotId &&
      (snapshotMeta.error === 'no_ready_snapshot' ||
        snapshotMeta.error === 'snapshot_stale_rebuild_required');
    if (shouldQueueBuild) {
      if (demandMode === 'single' && requestRoots.length !== 1) {
        return json({ error: 'process_id_and_version_required_for_snapshot_build' }, 400);
      }
      const queued = await ensureLcaSnapshotBuildQueued(supabaseClient, {
        scope,
        dataScope,
        userId,
        requestRoots,
      });
      if (!queued.ok) {
        return json({ error: queued.error }, queued.status);
      }
      return json(
        {
          error: 'snapshot_build_queued',
          build_job_id: queued.job_id,
          build_worker_job_id: queued.worker_job_id ?? null,
          build_snapshot_id: queued.snapshot_id,
          calculation_contract: queued.calculation_contract,
        },
        409,
      );
    }
    return json({ error: snapshotMeta.error }, snapshotMeta.status);
  }

  const { snapshot_id: snapshotId, process_count: processCount } = snapshotMeta.data;
  const calculationEvidence = await resolveCalculationEvidenceBinding({
    dataScope,
    userId,
    snapshotId,
    artifactUrl: snapshotMeta.data.artifact_url,
  });
  if (!calculationEvidence.ok) {
    return json({ error: calculationEvidence.error }, calculationEvidence.status);
  }
  const calculationEvidenceBinding = calculationEvidence.binding;
  const newJobId = crypto.randomUUID();
  let jobType: 'solve_one' | 'solve_all_unit' = 'solve_one';
  let payload:
    | {
        type: 'solve_one';
        job_id: string;
        snapshot_id: string;
        rhs: number[];
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        print_level: number;
        calculation_evidence_binding?: LcaCalculationEvidenceBinding;
      }
    | {
        type: 'solve_all_unit';
        job_id: string;
        snapshot_id: string;
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        unit_batch_size?: number;
        print_level: number;
        calculation_evidence_binding?: LcaCalculationEvidenceBinding;
      };
  let normalizedRequest:
    | {
        version: string;
        scope: LcaSnapshotScope;
        snapshot_id: string;
        demand_mode: 'single';
        demand: { process_index: number; amount: number };
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        print_level: number;
        calculation_evidence_binding?: LcaCalculationEvidenceBinding;
      }
    | {
        version: string;
        scope: LcaSnapshotScope;
        snapshot_id: string;
        demand_mode: 'all_unit';
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        print_level: number;
        calculation_evidence_binding?: LcaCalculationEvidenceBinding;
      };

  if (demandMode === 'single') {
    if (!normalizedSingleDemand) {
      return json({ error: 'invalid_demand' }, 400);
    }
    const demandProcessVersion =
      normalizedSingleDemand.selector === 'process_id'
        ? normalizedSingleDemand.process_version
        : undefined;
    const demandAmount = normalizedSingleDemand.amount;
    const solve = {
      return_x: body.solve?.return_x ?? true,
      return_g: body.solve?.return_g ?? true,
      return_h: body.solve?.return_h ?? true,
    };

    let processIndex: number;
    if (normalizedSingleDemand.selector === 'process_id') {
      const resolved = await resolveProcessIndexFromSnapshot({
        data_scope: dataScope,
        user_id: userId,
        snapshot_id: snapshotId,
        artifact_url: snapshotMeta.data.artifact_url,
        process_id: normalizedSingleDemand.process_id,
        process_version: demandProcessVersion || undefined,
      });
      if (!resolved.ok) {
        return json(resolved.body, resolved.status);
      }
      processIndex = resolved.process_index;
    } else {
      processIndex = normalizedSingleDemand.process_index;
    }

    if (processIndex >= processCount) {
      return json(
        {
          error: 'process_index_out_of_range',
          process_index: processIndex,
          process_count: processCount,
        },
        400,
      );
    }
    if (normalizedSingleDemand.selector === 'process_index') {
      const scopeValidation = await validateProcessIndexForDataScope({
        data_scope: dataScope,
        user_id: userId,
        snapshot_id: snapshotId,
        artifact_url: snapshotMeta.data.artifact_url,
        process_index: processIndex,
      });
      if (!scopeValidation.ok) {
        return json(scopeValidation.body, scopeValidation.status);
      }
    }

    const rhs = buildRhs(processCount, processIndex, demandAmount);
    payload = {
      type: 'solve_one',
      job_id: newJobId,
      snapshot_id: snapshotId,
      rhs,
      solve,
      print_level: printLevel,
      ...(calculationEvidenceBinding
        ? { calculation_evidence_binding: calculationEvidenceBinding }
        : {}),
    };
    normalizedRequest = {
      version: REQUEST_VERSION,
      scope,
      snapshot_id: snapshotId,
      demand_mode: 'single',
      demand: {
        process_index: processIndex,
        amount: demandAmount,
      },
      solve,
      print_level: printLevel,
      ...(calculationEvidenceBinding
        ? { calculation_evidence_binding: calculationEvidenceBinding }
        : {}),
    };
    jobType = 'solve_one';
  } else {
    const solve = {
      return_x: body.solve?.return_x ?? false,
      return_g: body.solve?.return_g ?? false,
      return_h: body.solve?.return_h ?? true,
    };
    if (solve.return_x || solve.return_g || !solve.return_h) {
      return json({ error: 'invalid_solve_options_for_all_unit' }, 400);
    }

    const unitBatchSize = body.unit_batch_size;
    if (unitBatchSize !== undefined && (!Number.isInteger(unitBatchSize) || unitBatchSize < 1)) {
      return json({ error: 'invalid_unit_batch_size' }, 400);
    }

    payload = {
      type: 'solve_all_unit',
      job_id: newJobId,
      snapshot_id: snapshotId,
      solve,
      unit_batch_size: unitBatchSize === undefined ? undefined : Number(unitBatchSize),
      print_level: printLevel,
      ...(calculationEvidenceBinding
        ? { calculation_evidence_binding: calculationEvidenceBinding }
        : {}),
    };
    normalizedRequest = {
      version: REQUEST_VERSION,
      scope,
      snapshot_id: snapshotId,
      demand_mode: 'all_unit',
      solve,
      print_level: printLevel,
      ...(calculationEvidenceBinding
        ? { calculation_evidence_binding: calculationEvidenceBinding }
        : {}),
    };
    jobType = 'solve_all_unit';
  }

  const requestKey = await sha256Hex(JSON.stringify(normalizedRequest));
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const idempotencyKey = idempotencyHeader
    ? `${userId}:${idempotencyHeader}`
    : `${userId}:${requestKey}`;

  if (!isWorkerJobsCutoverEnabled('LCA_WORKER_JOBS_ENABLED')) {
    console.error('legacy lca queue fallback is disabled before job insert', {
      idempotency_key: idempotencyKey,
      request_key: requestKey,
      job_type: jobType,
    });
    return json({ error: 'legacy_queue_disabled' }, 503);
  }

  const jobKind = lcaWorkerJobKindForJobType(jobType);
  if (!jobKind) {
    return json({ error: 'worker_job_kind_unsupported' }, 500);
  }

  const { data: enqueueData, error: enqueueError } = await supabaseClient.rpc(
    'svc_lca_cached_job_enqueue',
    {
      p_scope: scope,
      p_snapshot_id: snapshotId,
      p_request_key: requestKey,
      p_request_payload: normalizedRequest,
      p_job_kind: jobKind,
      p_job_id: newJobId,
      p_payload: payload,
      p_payload_schema_version: calculationEvidenceBinding
        ? `${jobKind}.request.v2`
        : workerJobPayloadSchemaVersion(jobKind),
      p_requested_by: userId,
      p_idempotency_key: idempotencyKey,
      p_queue_key: snapshotId,
    },
  );
  if (enqueueError) {
    console.error('enqueue LCA cached job capability failed', {
      error: enqueueError.message,
      code: enqueueError.code,
      lca_job_id: newJobId,
    });
    return json({ error: 'worker_jobs_enqueue_failed' }, 500);
  }

  const enqueueResult = enqueueData as Record<string, unknown> | null;
  if (!enqueueResult || enqueueResult.ok !== true) {
    const status = Number(enqueueResult?.status ?? 500);
    return json(
      {
        error: String(enqueueResult?.code ?? 'worker_jobs_enqueue_failed'),
        details: enqueueResult,
      },
      status,
    );
  }
  if (enqueueResult.mode === 'blocked') {
    return json({ error: 'worker_job_blocked' }, 503);
  }

  const mode = String(enqueueResult.mode) as SolveResponse['mode'];
  const response: SolveResponse = {
    mode,
    snapshot_id: snapshotId,
    cache_key: requestKey,
    job_id: enqueueResult.job_id ? String(enqueueResult.job_id) : undefined,
    worker_job_id: enqueueResult.worker_job_id ? String(enqueueResult.worker_job_id) : null,
    result_id: enqueueResult.result_id ? String(enqueueResult.result_id) : undefined,
    ...(calculationEvidenceBinding ? { calculation_evidence: calculationEvidenceBinding } : {}),
  };

  return json(response, mode === 'queued' ? 202 : 200);
});

async function resolveCalculationEvidenceBinding(input: {
  dataScope: LcaDataScope;
  userId: string;
  snapshotId: string;
  artifactUrl: string;
}): Promise<
  | { ok: true; binding: LcaCalculationEvidenceBinding | null }
  | { ok: false; error: string; status: number }
> {
  if (input.dataScope !== PUBLIC_PLUS_OWNER_DRAFT_SCOPE) {
    return { ok: true, binding: null };
  }

  const snapshotIndex = await fetchSnapshotIndex(input.snapshotId, input.artifactUrl);
  if (!snapshotIndex.ok) {
    return { ok: false, error: 'snapshot_index_fetch_failed', status: 502 };
  }
  if (snapshotIndex.data.snapshot_id !== input.snapshotId) {
    return { ok: false, error: 'snapshot_index_mismatch', status: 500 };
  }

  const validation = await validateCalculationEvidenceForDataScope(
    input.dataScope,
    input.userId,
    snapshotIndex.data.calculation_evidence,
  );
  if (!validation.ok) {
    return { ok: false, error: validation.error, status: 409 };
  }
  return {
    ok: true,
    binding: validation.evidence ? buildLcaCalculationEvidenceBinding(validation.evidence) : null,
  };
}

async function resolveReadySnapshot(
  scope: LcaSnapshotScope,
  dataScope: LcaDataScope,
  requestedSnapshotId?: string,
  userId?: string,
  requestRoots: readonly LcaSnapshotRequestRoot[] = [],
): Promise<{ ok: true; data: ReadySnapshotMeta } | { ok: false; error: string; status: number }> {
  const explicit = requestedSnapshotId?.trim();

  if (explicit) {
    const ready = await fetchReadySnapshotMeta(explicit);
    if (!ready) {
      return { ok: false, error: 'snapshot_not_ready', status: 404 };
    }
    if (dataScope === PUBLIC_PLUS_OWNER_DRAFT_SCOPE && userId) {
      const scopeVerification = await verifySnapshotMatchesDataScope(supabaseClient, {
        snapshotId: explicit,
        dataScope,
        userId,
      });
      if (!scopeVerification.ok) {
        return {
          ok: false,
          error: scopeVerification.error,
          status: scopeVerification.status,
        };
      }
      if (!scopeVerification.matches) {
        return { ok: false, error: 'snapshot_not_in_data_scope', status: 403 };
      }
    }
    return { ok: true, data: ready };
  }

  if (userId) {
    const scopedReady = await fetchScopedReadySnapshot(scope, dataScope, userId, requestRoots);
    if (scopedReady.kind === 'fresh') {
      return { ok: true, data: scopedReady.data };
    }
    if (scopedReady.kind === 'stale') {
      return { ok: false, error: 'snapshot_stale_rebuild_required', status: 409 };
    }
    return { ok: false, error: 'no_ready_snapshot', status: 404 };
  }

  const candidates = await queryLcaSnapshotCandidates(supabaseClient, {
    scope,
    limit: 1,
  });
  if (!candidates.ok) {
    console.error('read latest ready snapshot failed', { code: candidates.code });
    return { ok: false, error: 'snapshot_lookup_failed', status: 500 };
  }
  const latest = candidates.data[0];
  if (!latest) {
    return { ok: false, error: 'no_ready_snapshot', status: 404 };
  }
  return {
    ok: true,
    data: {
      snapshot_id: latest.snapshotId,
      process_count: Number(latest.artifact.processCount ?? 0),
      artifact_url: latest.artifact.artifactUrl,
    },
  };
}

async function fetchScopedReadySnapshot(
  scope: LcaSnapshotScope,
  dataScope: LcaDataScope,
  userId: string,
  requestRoots: readonly LcaSnapshotRequestRoot[] = [],
): Promise<ScopedSnapshotResolution> {
  const expectedProcessFilter = await buildSnapshotProcessFilter(dataScope, userId, requestRoots);
  const result = await queryLcaSnapshotCandidates(supabaseClient, {
    scope,
    processFilterContains: buildSnapshotContainsFilter(expectedProcessFilter),
    limit: 100,
  });

  if (!result.ok) {
    console.warn('read scoped snapshots failed', {
      code: result.code,
      scope,
      data_scope: dataScope,
      user_id: userId,
    });
    return { kind: 'none' };
  }

  let latestStaleSnapshotId: string | null = null;
  for (const row of result.data) {
    const snapshotId = row.snapshotId.trim();
    if (!snapshotId) {
      continue;
    }
    const processFilter = row.processFilter;
    if (!matchesSnapshotProcessFilter(processFilter, expectedProcessFilter)) {
      continue;
    }
    const freshness = await isSnapshotFresh(row.createdAt, processFilter);
    if (freshness === 'fresh') {
      return {
        kind: 'fresh',
        data: {
          snapshot_id: snapshotId,
          process_count: Number(row.artifact.processCount ?? 0),
          artifact_url: row.artifact.artifactUrl,
        },
      };
    }
    latestStaleSnapshotId = snapshotId;
    break;
  }

  if (latestStaleSnapshotId) {
    return { kind: 'stale', snapshot_id: latestStaleSnapshotId };
  }
  return { kind: 'none' };
}

async function fetchReadySnapshotMeta(snapshotId: string): Promise<ReadySnapshotMeta | null> {
  const result = await queryLcaSnapshotCandidates(supabaseClient, {
    scope: 'full_library',
    snapshotId,
    limit: 1,
  });

  if (!result.ok) {
    console.error('fetch snapshot meta failed', { code: result.code, snapshot_id: snapshotId });
    return null;
  }
  const row = result.data[0];
  if (!row) {
    return null;
  }
  return {
    snapshot_id: row.snapshotId,
    process_count: Number(row.artifact.processCount ?? 0),
    artifact_url: row.artifact.artifactUrl,
  };
}

type SnapshotFreshness = 'fresh' | 'stale';

async function isSnapshotFresh(
  snapshotCreatedAtIso: string,
  processFilterRaw: unknown,
): Promise<SnapshotFreshness> {
  const snapshotCreatedAt = Date.parse(snapshotCreatedAtIso);
  if (!Number.isFinite(snapshotCreatedAt)) {
    return 'stale';
  }

  const processFilter = parseSnapshotProcessFilter(processFilterRaw);

  const [processMax, flowMax, methodMax] = await Promise.all([
    fetchProcessMaxModifiedAt(processFilter),
    fetchTableMaxModifiedAt('flows', processFilter),
    fetchTableMaxModifiedAt('lciamethods', processFilter),
  ]);

  const latest = [processMax, flowMax, methodMax]
    .map((iso) => (iso ? Date.parse(iso) : Number.NaN))
    .filter((ts) => Number.isFinite(ts))
    .reduce((acc, ts) => Math.max(acc, ts), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(latest)) {
    return 'fresh';
  }
  return snapshotCreatedAt >= latest ? 'fresh' : 'stale';
}

async function fetchProcessMaxModifiedAt(
  filter: ParsedSnapshotProcessFilter,
): Promise<string | null> {
  let query = supabaseClient
    .schema('public')
    .from('processes')
    .select('modified_at')
    .order('modified_at', { ascending: false })
    .limit(1);

  const visibilityExpression = buildSnapshotVisibilityOrExpression(filter);
  if (!filter.allStates && visibilityExpression) {
    query = query.or(visibilityExpression);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn('fetch process max modified_at failed', { error: error.message });
    return null;
  }
  return data?.modified_at ? String(data.modified_at) : null;
}

async function fetchTableMaxModifiedAt(
  table: 'flows' | 'lciamethods',
  filter: ParsedSnapshotProcessFilter,
): Promise<string | null> {
  let query = supabaseClient
    .schema('public')
    .from(table)
    .select('modified_at')
    .order('modified_at', { ascending: false })
    .limit(1);

  const visibilityExpression = buildSnapshotVisibilityOrExpression(filter, {
    supportsCollaborationColumns: table === 'flows',
  });
  if (!filter.allStates && visibilityExpression) {
    query = query.or(visibilityExpression);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn('fetch table max modified_at failed', { table, error: error.message });
    return null;
  }
  return data?.modified_at ? String(data.modified_at) : null;
}

async function resolveProcessIndexFromSnapshot(input: {
  data_scope: LcaDataScope;
  user_id: string;
  snapshot_id: string;
  artifact_url?: string;
  process_id: string;
  process_version?: string;
}): Promise<
  { ok: true; process_index: number } | { ok: false; status: number; body: Record<string, unknown> }
> {
  const snapshotIndex = await fetchSnapshotIndex(input.snapshot_id, input.artifact_url);
  if (!snapshotIndex.ok) {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'snapshot_index_fetch_failed',
        detail: snapshotIndex.error,
      },
    };
  }

  if (snapshotIndex.data.snapshot_id !== input.snapshot_id) {
    return {
      ok: false,
      status: 500,
      body: { error: 'snapshot_index_mismatch' },
    };
  }

  const candidates = snapshotIndex.data.process_map.filter(
    (entry) => entry.process_id === input.process_id,
  );
  if (candidates.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: 'process_not_in_snapshot', process_id: input.process_id },
    };
  }

  let selected: SnapshotIndexProcessEntry | null = null;
  if (input.process_version) {
    selected =
      candidates.find(
        (entry) => String(entry.process_version ?? '').trim() === input.process_version,
      ) ?? null;
    if (!selected) {
      return {
        ok: false,
        status: 404,
        body: {
          error: 'process_version_not_in_snapshot',
          process_id: input.process_id,
          process_version: input.process_version,
        },
      };
    }
  } else if (candidates.length > 1) {
    const candidateVersions = [
      ...new Set(candidates.map((entry) => String(entry.process_version ?? ''))),
    ]
      .map((version) => version.trim())
      .filter((version) => version.length > 0);
    return {
      ok: false,
      status: 400,
      body: {
        error: 'process_version_required',
        process_id: input.process_id,
        process_versions: candidateVersions,
      },
    };
  } else {
    selected = candidates[0];
  }

  if (!selected || !Number.isInteger(selected.process_index) || selected.process_index < 0) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'snapshot_index_invalid',
        process_id: input.process_id,
      },
    };
  }

  const processScopeValidation = await validateProcessEntriesInDataScope(
    [selected],
    input.data_scope,
    input.user_id,
  );
  if (!processScopeValidation.ok) {
    return processScopeValidation;
  }

  return { ok: true, process_index: selected.process_index };
}

async function validateProcessIndexForDataScope(input: {
  data_scope: LcaDataScope;
  user_id: string;
  snapshot_id: string;
  artifact_url?: string;
  process_index: number;
}): Promise<{ ok: true } | { ok: false; status: number; body: Record<string, unknown> }> {
  const snapshotIndex = await fetchSnapshotIndex(input.snapshot_id, input.artifact_url);
  if (!snapshotIndex.ok) {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'snapshot_index_fetch_failed',
        detail: snapshotIndex.error,
      },
    };
  }

  if (snapshotIndex.data.snapshot_id !== input.snapshot_id) {
    return {
      ok: false,
      status: 500,
      body: { error: 'snapshot_index_mismatch' },
    };
  }

  const selected = snapshotIndex.data.process_map.find(
    (entry) => entry.process_index === input.process_index,
  );
  if (!selected) {
    return {
      ok: false,
      status: 500,
      body: {
        error: 'snapshot_index_invalid',
        process_index: input.process_index,
      },
    };
  }

  return await validateProcessEntriesInDataScope([selected], input.data_scope, input.user_id);
}

async function fetchSnapshotIndex(
  snapshotId: string,
  artifactUrl?: string,
): Promise<{ ok: true; data: SnapshotIndexDocument } | { ok: false; error: string }> {
  let resolvedArtifactUrl = (artifactUrl ?? '').trim();

  if (!resolvedArtifactUrl) {
    const result = await queryLcaSnapshotCandidates(supabaseClient, {
      scope: 'full_library',
      snapshotId,
      limit: 1,
    });
    if (!result.ok) {
      return { ok: false, error: `snapshot_artifact_lookup_failed:${result.code}` };
    }
    resolvedArtifactUrl = result.data[0]?.artifact.artifactUrl?.trim() ?? '';
  }

  if (!resolvedArtifactUrl) {
    return { ok: false, error: 'snapshot_artifact_missing' };
  }

  const snapshotIndexUrl = deriveSnapshotIndexUrl(resolvedArtifactUrl);
  return await fetchArtifactJson<SnapshotIndexDocument>(snapshotIndexUrl);
}

function deriveSnapshotIndexUrl(snapshotArtifactUrl: string): string {
  const slash = snapshotArtifactUrl.lastIndexOf('/');
  if (slash < 0) {
    return `${snapshotArtifactUrl}/snapshot-index-v1.json`;
  }
  return `${snapshotArtifactUrl.slice(0, slash + 1)}snapshot-index-v1.json`;
}

async function fetchArtifactJson<T>(
  artifactUrl: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const storagePath = parseStoragePathFromArtifactUrl(artifactUrl);
  let storageError: string | null = null;
  if (storagePath) {
    const downloaded = await supabaseClient.storage
      .from(storagePath.bucket)
      .download(storagePath.objectPath);
    if (!downloaded.error) {
      try {
        const parsed = JSON.parse(await downloaded.data.text()) as T;
        return { ok: true, data: parsed };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error ? `json_parse_failed:${error.message}` : 'json_parse_failed',
        };
      }
    } else {
      storageError = `storage_download_failed:${downloaded.error.message}`;
    }
  }

  const httpResult = await fetchJsonByHttp<T>(artifactUrl);
  if (!httpResult.ok && storageError) {
    return { ok: false, error: `${storageError};${httpResult.error}` };
  }
  return httpResult;
}

function parseStoragePathFromArtifactUrl(
  artifactUrl: string,
): { bucket: string; objectPath: string } | null {
  try {
    const url = new URL(artifactUrl);
    const marker = '/storage/v1/s3/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) {
      return null;
    }
    const remainder = url.pathname.slice(markerIndex + marker.length);
    const splitIndex = remainder.indexOf('/');
    if (splitIndex <= 0 || splitIndex >= remainder.length - 1) {
      return null;
    }
    const bucket = decodeURIComponent(remainder.slice(0, splitIndex));
    const objectPath = decodeURIComponent(remainder.slice(splitIndex + 1));
    if (!bucket || !objectPath) {
      return null;
    }
    return { bucket, objectPath };
  } catch (_error) {
    return null;
  }
}

async function fetchJsonByHttp<T>(
  url: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return { ok: false, error: `http_${response.status}` };
    }
    const parsed = (await response.json()) as T;
    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'fetch_failed' };
  }
}

function buildRhs(processCount: number, processIndex: number, amount: number): number[] {
  const rhs = new Array<number>(processCount).fill(0);
  rhs[processIndex] = amount;
  return rhs;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
