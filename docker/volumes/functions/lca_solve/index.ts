// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { validateProcessEntriesInDataScope } from '../_shared/lca_process_scope.ts';
import {
  buildSnapshotBuildPayloadFields,
  buildSnapshotContainsFilter,
  buildSnapshotProcessFilter,
  matchesSnapshotProcessFilter,
  parseLcaDataScope,
  parseSnapshotProcessFilter,
  shouldAutoBuildSnapshot,
  type LcaDataScope,
  type ParsedSnapshotProcessFilter,
  type SnapshotProcessFilter,
} from '../_shared/lca_snapshot_scope.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

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
  result_id?: string;
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
};

type ScopedSnapshotResolution =
  | { kind: 'fresh'; data: ReadySnapshotMeta }
  | { kind: 'stale'; snapshot_id: string }
  | { kind: 'none' };

type ResultCacheRow = {
  id: string;
  status: string;
  job_id: string | null;
  result_id: string | null;
  hit_count: number;
};

const QUEUE_NAME = 'lca_jobs';
const REQUEST_VERSION = 'lca_solve_v2';
const SNAPSHOT_BUILD_REQUEST_VERSION = 'lca_snapshot_build_v1';
const ACTIVE_BUILD_MAX_QUEUED_MS = 10 * 60 * 1000;
const ACTIVE_BUILD_MAX_RUNNING_MS = 2 * 60 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const redis = await getRedisClient();

  const authResult = await authenticateRequest(req, {
    supabase: supabaseClient,
    redis,
    allowedMethods: [AuthMethod.JWT, AuthMethod.USER_API_KEY],
  });

  if (!authResult.isAuthenticated) {
    return authResult.response!;
  }

  const userId = authResult.user?.id;
  if (!userId) {
    return json({ error: 'unauthorized' }, 401);
  }

  let body: SolveRequest;
  try {
    body = (await req.json()) as SolveRequest;
  } catch (_error) {
    return json({ error: 'invalid_json' }, 400);
  }

  const scope = (body.scope ?? 'prod').trim() || 'prod';
  const dataScope = parseLcaDataScope(body.data_scope);
  const demandMode = body.demand_mode ?? 'single';
  const printLevel = body.print_level ?? 0.0;

  if (demandMode !== 'single' && demandMode !== 'all_unit') {
    return json({ error: 'invalid_demand_mode' }, 400);
  }
  if (!Number.isFinite(printLevel)) {
    return json({ error: 'invalid_print_level' }, 400);
  }

  const snapshotMeta = await resolveReadySnapshot(scope, dataScope, body.snapshot_id, userId);
  if (!snapshotMeta.ok) {
    const shouldQueueBuild =
      shouldAutoBuildSnapshot(dataScope) &&
      !body.snapshot_id &&
      (snapshotMeta.error === 'no_ready_snapshot' ||
        snapshotMeta.error === 'snapshot_stale_rebuild_required');
    if (shouldQueueBuild) {
      const queued = await ensureSnapshotBuildQueued(scope, dataScope, userId);
      if (!queued.ok) {
        return json({ error: queued.error }, queued.status);
      }
      return json(
        {
          error: 'snapshot_build_queued',
          build_job_id: queued.job_id,
          build_snapshot_id: queued.snapshot_id,
        },
        409,
      );
    }
    return json({ error: snapshotMeta.error }, snapshotMeta.status);
  }

  const { snapshot_id: snapshotId, process_count: processCount } = snapshotMeta.data;
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
      }
    | {
        type: 'solve_all_unit';
        job_id: string;
        snapshot_id: string;
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        unit_batch_size?: number;
        print_level: number;
      };
  let normalizedRequest:
    | {
        version: string;
        scope: string;
        snapshot_id: string;
        demand_mode: 'single';
        demand: { process_index: number; amount: number };
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        print_level: number;
      }
    | {
        version: string;
        scope: string;
        snapshot_id: string;
        demand_mode: 'all_unit';
        solve: { return_x: boolean; return_g: boolean; return_h: boolean };
        print_level: number;
      };

  if (demandMode === 'single') {
    const demandIndex = body.demand?.process_index;
    const demandProcessId = body.demand?.process_id?.trim();
    const demandProcessVersion = body.demand?.process_version?.trim();
    const demandAmount = body.demand?.amount ?? 1.0;
    const solve = {
      return_x: body.solve?.return_x ?? true,
      return_g: body.solve?.return_g ?? true,
      return_h: body.solve?.return_h ?? true,
    };

    if (!Number.isFinite(demandAmount)) {
      return json({ error: 'invalid_amount' }, 400);
    }

    const hasIndexDemand = demandIndex !== undefined && demandIndex !== null;
    const hasProcessIdDemand = !!demandProcessId;
    if (!hasIndexDemand && !hasProcessIdDemand) {
      return json({ error: 'process_index_or_process_id_required' }, 400);
    }
    if (hasIndexDemand && hasProcessIdDemand) {
      return json({ error: 'provide_process_index_or_process_id' }, 400);
    }

    let processIndex: number;
    if (hasProcessIdDemand) {
      if (!UUID_RE.test(demandProcessId)) {
        return json({ error: 'invalid_process_id' }, 400);
      }
      const resolved = await resolveProcessIndexFromSnapshot({
        data_scope: dataScope,
        user_id: userId,
        snapshot_id: snapshotId,
        artifact_url: snapshotMeta.data.artifact_url,
        process_id: demandProcessId,
        process_version: demandProcessVersion || undefined,
      });
      if (!resolved.ok) {
        return json(resolved.body, resolved.status);
      }
      processIndex = resolved.process_index;
    } else {
      if (!Number.isInteger(demandIndex) || (demandIndex as number) < 0) {
        return json({ error: 'invalid_process_index' }, 400);
      }
      processIndex = Number(demandIndex);
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
    if (!hasProcessIdDemand) {
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
    };
    normalizedRequest = {
      version: REQUEST_VERSION,
      scope,
      snapshot_id: snapshotId,
      demand_mode: 'all_unit',
      solve,
      print_level: printLevel,
    };
    jobType = 'solve_all_unit';
  }

  const requestKey = await sha256Hex(JSON.stringify(normalizedRequest));
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const idempotencyKey = idempotencyHeader
    ? `${userId}:${idempotencyHeader}`
    : `${userId}:${requestKey}`;

  const nowIso = new Date().toISOString();

  const existingCache = await fetchResultCache(scope, snapshotId, requestKey);
  if (!existingCache.ok) {
    return json({ error: 'cache_lookup_failed' }, 500);
  }

  if (existingCache.row) {
    await touchResultCache(existingCache.row, {
      updated_at: nowIso,
      last_accessed_at: nowIso,
      hit_count: existingCache.row.hit_count + 1,
    });

    if (existingCache.row.status === 'ready' && existingCache.row.result_id) {
      const cacheHit: SolveResponse = {
        mode: 'cache_hit',
        snapshot_id: snapshotId,
        cache_key: requestKey,
        result_id: existingCache.row.result_id,
      };
      return json(cacheHit, 200);
    }

    if (
      (existingCache.row.status === 'pending' || existingCache.row.status === 'running') &&
      existingCache.row.job_id
    ) {
      const inProgress: SolveResponse = {
        mode: 'in_progress',
        snapshot_id: snapshotId,
        cache_key: requestKey,
        job_id: existingCache.row.job_id,
      };
      return json(inProgress, 200);
    }
  }

  const { error: insertJobError } = await supabaseClient.from('lca_jobs').insert({
    id: newJobId,
    job_type: jobType,
    snapshot_id: snapshotId,
    status: 'queued',
    payload,
    diagnostics: {},
    requested_by: userId,
    request_key: requestKey,
    idempotency_key: idempotencyKey,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertJobError && !isDuplicateKey(insertJobError.code)) {
    console.error('insert lca_jobs failed', {
      error: insertJobError.message,
      code: insertJobError.code,
      idempotency_key: idempotencyKey,
    });
    return json({ error: 'job_insert_failed' }, 500);
  }

  const { data: jobRow, error: jobReadError } = await supabaseClient
    .from('lca_jobs')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (jobReadError || !jobRow?.id) {
    console.error('read lca_jobs by idempotency_key failed', {
      error: jobReadError?.message,
      code: jobReadError?.code,
      idempotency_key: idempotencyKey,
    });
    return json({ error: 'job_lookup_failed' }, 500);
  }

  const finalJobId = String(jobRow.id);

  if (finalJobId === newJobId) {
    const { error: enqueueError } = await supabaseClient.rpc('lca_enqueue_job', {
      p_queue_name: QUEUE_NAME,
      p_message: payload,
    });

    if (enqueueError) {
      console.error('enqueue queue message failed', {
        error: enqueueError.message,
        code: enqueueError.code,
        details: enqueueError.details,
        hint: enqueueError.hint,
      });

      // `lca_enqueue_job` RPC may be missing if DB migration is not applied.
      if (enqueueError.code === 'PGRST202' || enqueueError.message.includes('lca_enqueue_job')) {
        return json({ error: 'queue_rpc_missing' }, 500);
      }

      return json({ error: 'queue_enqueue_failed' }, 500);
    }
  }

  if (existingCache.row) {
    const { error: cacheUpdateError } = await supabaseClient
      .from('lca_result_cache')
      .update({
        status: 'pending',
        job_id: finalJobId,
        request_payload: normalizedRequest,
        hit_count: existingCache.row.hit_count + 1,
        last_accessed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', existingCache.row.id);

    if (cacheUpdateError) {
      console.error('update lca_result_cache failed', {
        error: cacheUpdateError.message,
        code: cacheUpdateError.code,
      });
      return json({ error: 'cache_update_failed' }, 500);
    }
  } else {
    const { error: cacheInsertError } = await supabaseClient.from('lca_result_cache').insert({
      scope,
      snapshot_id: snapshotId,
      request_key: requestKey,
      request_payload: normalizedRequest,
      status: 'pending',
      job_id: finalJobId,
      hit_count: 1,
      last_accessed_at: nowIso,
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (cacheInsertError && !isDuplicateKey(cacheInsertError.code)) {
      console.error('insert lca_result_cache failed', {
        error: cacheInsertError.message,
        code: cacheInsertError.code,
      });
      return json({ error: 'cache_insert_failed' }, 500);
    }
  }

  const queued: SolveResponse = {
    mode: 'queued',
    snapshot_id: snapshotId,
    cache_key: requestKey,
    job_id: finalJobId,
  };

  return json(queued, 202);
});

async function fetchResultCache(
  scope: string,
  snapshotId: string,
  requestKey: string,
): Promise<{ ok: true; row: ResultCacheRow | null } | { ok: false }> {
  const { data, error } = await supabaseClient
    .from('lca_result_cache')
    .select('id,status,job_id,result_id,hit_count')
    .eq('scope', scope)
    .eq('snapshot_id', snapshotId)
    .eq('request_key', requestKey)
    .maybeSingle();

  if (error) {
    console.error('fetch lca_result_cache failed', {
      error: error.message,
      code: error.code,
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
      result_id: data.result_id ? String(data.result_id) : null,
      hit_count: Number(data.hit_count ?? 0),
    },
  };
}

async function touchResultCache(
  row: ResultCacheRow,
  patch: {
    updated_at: string;
    last_accessed_at: string;
    hit_count: number;
  },
): Promise<void> {
  const { error } = await supabaseClient
    .from('lca_result_cache')
    .update({
      updated_at: patch.updated_at,
      last_accessed_at: patch.last_accessed_at,
      hit_count: patch.hit_count,
    })
    .eq('id', row.id);

  if (error) {
    console.warn('touch lca_result_cache failed', {
      error: error.message,
      code: error.code,
      row_id: row.id,
    });
  }
}

async function resolveReadySnapshot(
  scope: string,
  dataScope: LcaDataScope,
  requestedSnapshotId?: string,
  userId?: string,
): Promise<{ ok: true; data: ReadySnapshotMeta } | { ok: false; error: string; status: number }> {
  const explicit = requestedSnapshotId?.trim();

  if (explicit) {
    const ready = await fetchReadySnapshotMeta(explicit);
    if (!ready) {
      return { ok: false, error: 'snapshot_not_ready', status: 404 };
    }
    return { ok: true, data: ready };
  }

  if (userId) {
    const scopedReady = await fetchScopedReadySnapshot(scope, dataScope, userId);
    if (scopedReady.kind === 'fresh') {
      return { ok: true, data: scopedReady.data };
    }
    if (scopedReady.kind === 'stale') {
      return { ok: false, error: 'snapshot_stale_rebuild_required', status: 409 };
    }
    return { ok: false, error: 'no_ready_snapshot', status: 404 };
  }

  const { data: activeRow, error: activeErr } = await supabaseClient
    .from('lca_active_snapshots')
    .select('snapshot_id')
    .eq('scope', scope)
    .maybeSingle();

  if (activeErr) {
    console.warn('read lca_active_snapshots failed', { error: activeErr.message, scope });
  }

  if (activeRow?.snapshot_id) {
    const activeReady = await fetchReadySnapshotMeta(String(activeRow.snapshot_id));
    if (activeReady) {
      return { ok: true, data: activeReady };
    }
  }

  const { data: latestRows, error: latestErr } = await supabaseClient
    .from('lca_snapshot_artifacts')
    .select('snapshot_id,process_count,artifact_url,status,created_at')
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1);

  if (latestErr) {
    console.error('read latest ready snapshot failed', { error: latestErr.message });
    return { ok: false, error: 'snapshot_lookup_failed', status: 500 };
  }

  if (!latestRows || latestRows.length === 0) {
    return { ok: false, error: 'no_ready_snapshot', status: 404 };
  }

  const latest = latestRows[0];
  return {
    ok: true,
    data: {
      snapshot_id: String(latest.snapshot_id),
      process_count: Number(latest.process_count),
      artifact_url: String((latest as { artifact_url?: unknown }).artifact_url ?? ''),
    },
  };
}

async function fetchScopedReadySnapshot(
  scope: string,
  dataScope: LcaDataScope,
  userId: string,
): Promise<ScopedSnapshotResolution> {
  const expectedProcessFilter = buildSnapshotProcessFilter(dataScope, userId);
  const { data, error } = await supabaseClient
    .from('lca_network_snapshots')
    .select('id,created_at,process_filter')
    .eq('status', 'ready')
    .in('scope', scope === 'full_library' ? ['full_library'] : ['full_library', scope])
    .contains('process_filter', buildSnapshotContainsFilter(expectedProcessFilter))
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('read scoped snapshots failed', {
      error: error.message,
      scope,
      data_scope: dataScope,
      user_id: userId,
    });
    return { kind: 'none' };
  }

  let latestStaleSnapshotId: string | null = null;
  for (const row of data ?? []) {
    const snapshotId = String((row as { id?: unknown }).id ?? '').trim();
    if (!snapshotId) {
      continue;
    }
    const processFilter = (row as { process_filter?: unknown }).process_filter;
    if (!matchesSnapshotProcessFilter(processFilter, expectedProcessFilter)) {
      continue;
    }
    const ready = await fetchReadySnapshotMeta(snapshotId);
    if (ready) {
      const snapshotCreatedAt = String((row as { created_at?: unknown }).created_at ?? '');
      const freshness = await isSnapshotFresh(snapshotCreatedAt, processFilter);
      if (freshness === 'fresh') {
        return { kind: 'fresh', data: ready };
      }
      latestStaleSnapshotId = snapshotId;
      break;
    }
  }

  if (latestStaleSnapshotId) {
    return { kind: 'stale', snapshot_id: latestStaleSnapshotId };
  }
  return { kind: 'none' };
}

async function fetchReadySnapshotMeta(snapshotId: string): Promise<ReadySnapshotMeta | null> {
  const { data, error } = await supabaseClient
    .from('lca_snapshot_artifacts')
    .select('snapshot_id,process_count,artifact_url,status,created_at')
    .eq('snapshot_id', snapshotId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('fetch snapshot meta failed', { error: error.message, snapshot_id: snapshotId });
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const row = data[0];
  return {
    snapshot_id: String(row.snapshot_id),
    process_count: Number(row.process_count),
    artifact_url: String(row.artifact_url ?? ''),
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
    .from('processes')
    .select('modified_at')
    .order('modified_at', { ascending: false })
    .limit(1);

  if (!filter.allStates) {
    if (filter.processStates.length > 0 && filter.includeUserId) {
      query = query.or(
        `state_code.in.(${filter.processStates.join(',')}),user_id.eq.${filter.includeUserId}`,
      );
    } else if (filter.processStates.length > 0) {
      query = query.in('state_code', filter.processStates);
    } else if (filter.includeUserId) {
      query = query.eq('user_id', filter.includeUserId);
    }
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
    .from(table)
    .select('modified_at')
    .order('modified_at', { ascending: false })
    .limit(1);

  if (!filter.allStates) {
    if (filter.processStates.length > 0 && filter.includeUserId) {
      query = query.or(
        `state_code.in.(${filter.processStates.join(',')}),user_id.eq.${filter.includeUserId}`,
      );
    } else if (filter.processStates.length > 0) {
      query = query.in('state_code', filter.processStates);
    } else if (filter.includeUserId) {
      query = query.eq('user_id', filter.includeUserId);
    }
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn('fetch table max modified_at failed', { table, error: error.message });
    return null;
  }
  return data?.modified_at ? String(data.modified_at) : null;
}

type BuildQueueResult =
  | { ok: true; job_id: string; snapshot_id: string }
  | { ok: false; error: string; status: number };

async function ensureSnapshotBuildQueued(
  scope: string,
  dataScope: LcaDataScope,
  userId: string,
): Promise<BuildQueueResult> {
  const processFilter = buildSnapshotProcessFilter(dataScope, userId);
  const activeBuild = await findActiveBuildJob(scope, processFilter);
  if (!activeBuild.ok) {
    return activeBuild;
  }
  if (activeBuild.job_id && activeBuild.snapshot_id) {
    return { ok: true, job_id: activeBuild.job_id, snapshot_id: activeBuild.snapshot_id };
  }

  const snapshotId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const buildPayload = {
    type: 'build_snapshot',
    job_id: jobId,
    snapshot_id: snapshotId,
    scope,
    ...buildSnapshotBuildPayloadFields(processFilter),
    provider_rule: 'strict_unique_provider',
    reference_normalization_mode: 'lenient',
    allocation_fraction_mode: 'lenient',
    self_loop_cutoff: 0.999999,
    singular_eps: 1e-12,
    no_lcia: false,
  };
  const requestKey = await sha256Hex(
    JSON.stringify({
      version: SNAPSHOT_BUILD_REQUEST_VERSION,
      scope,
      process_filter: processFilter,
      payload: buildPayload,
    }),
  );

  const { error: snapshotInsertError } = await supabaseClient.from('lca_network_snapshots').insert({
    id: snapshotId,
    scope: 'full_library',
    process_filter: processFilter,
    provider_matching_rule: 'strict_unique_provider',
    status: 'draft',
    created_by: userId,
  });
  if (snapshotInsertError && snapshotInsertError.code !== '23505') {
    console.error('insert lca_network_snapshots failed', {
      error: snapshotInsertError.message,
      code: snapshotInsertError.code,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'snapshot_build_seed_failed', status: 500 };
  }

  const nowIso = new Date().toISOString();
  const { error: jobInsertError } = await supabaseClient.from('lca_jobs').insert({
    id: jobId,
    job_type: 'build_snapshot',
    snapshot_id: snapshotId,
    status: 'queued',
    payload: buildPayload,
    diagnostics: {},
    requested_by: userId,
    request_key: requestKey,
    idempotency_key: `${userId}:${requestKey}`,
    created_at: nowIso,
    updated_at: nowIso,
  });
  if (jobInsertError && jobInsertError.code !== '23505') {
    console.error('insert build lca_jobs failed', {
      error: jobInsertError.message,
      code: jobInsertError.code,
      job_id: jobId,
    });
    return { ok: false, error: 'snapshot_build_job_insert_failed', status: 500 };
  }

  const { data: jobRow, error: jobReadError } = await supabaseClient
    .from('lca_jobs')
    .select('id,snapshot_id')
    .eq('request_key', requestKey)
    .eq('job_type', 'build_snapshot')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (jobReadError || !jobRow?.id || !jobRow?.snapshot_id) {
    console.error('read build lca_jobs failed', {
      error: jobReadError?.message,
      code: jobReadError?.code,
      request_key: requestKey,
    });
    return { ok: false, error: 'snapshot_build_job_lookup_failed', status: 500 };
  }

  const finalJobId = String(jobRow.id);
  const finalSnapshotId = String(jobRow.snapshot_id);
  if (finalJobId === jobId) {
    const { error: enqueueError } = await supabaseClient.rpc('lca_enqueue_job', {
      p_queue_name: QUEUE_NAME,
      p_message: buildPayload,
    });
    if (enqueueError) {
      console.error('enqueue build snapshot message failed', {
        error: enqueueError.message,
        code: enqueueError.code,
      });
      return { ok: false, error: 'snapshot_build_enqueue_failed', status: 500 };
    }
  }

  return { ok: true, job_id: finalJobId, snapshot_id: finalSnapshotId };
}

async function findActiveBuildJob(
  scope: string,
  expectedProcessFilter: SnapshotProcessFilter,
): Promise<
  | { ok: true; job_id: string | null; snapshot_id: string | null }
  | { ok: false; error: string; status: number }
> {
  const { data: rows, error } = await supabaseClient
    .from('lca_jobs')
    .select('id,snapshot_id,payload,status,created_at,started_at')
    .eq('job_type', 'build_snapshot')
    .in('status', ['queued', 'running'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('read active build lca_jobs failed', {
      error: error.message,
      code: error.code,
    });
    return { ok: false, error: 'snapshot_build_job_lookup_failed', status: 500 };
  }

  for (const row of rows ?? []) {
    const status = String((row as { status?: unknown }).status ?? '');
    const nowMs = Date.now();
    const createdAtRaw = (row as { created_at?: unknown }).created_at;
    const createdAtMs =
      createdAtRaw === null || createdAtRaw === undefined
        ? Number.NaN
        : Date.parse(String(createdAtRaw));
    const startedAtRaw = (row as { started_at?: unknown }).started_at;
    const startedAtMs =
      startedAtRaw === null || startedAtRaw === undefined
        ? Number.NaN
        : Date.parse(String(startedAtRaw));
    if (
      status === 'queued' &&
      Number.isFinite(createdAtMs) &&
      nowMs - createdAtMs > ACTIVE_BUILD_MAX_QUEUED_MS
    ) {
      continue;
    }
    if (
      status === 'running' &&
      Number.isFinite(startedAtMs) &&
      nowMs - startedAtMs > ACTIVE_BUILD_MAX_RUNNING_MS
    ) {
      continue;
    }

    const payload = (row as { payload?: unknown }).payload as { scope?: unknown } | undefined;
    if ((payload?.scope ?? '') !== scope) {
      continue;
    }
    const jobId = String((row as { id?: unknown }).id ?? '').trim();
    const snapshotId = String((row as { snapshot_id?: unknown }).snapshot_id ?? '').trim();
    if (!jobId || !snapshotId) {
      continue;
    }
    const { data: snap, error: snapErr } = await supabaseClient
      .from('lca_network_snapshots')
      .select('process_filter')
      .eq('id', snapshotId)
      .maybeSingle();
    if (snapErr || !snap) {
      continue;
    }
    const filter = (snap as { process_filter?: unknown }).process_filter;
    if (matchesSnapshotProcessFilter(filter, expectedProcessFilter)) {
      return { ok: true, job_id: jobId, snapshot_id: snapshotId };
    }
  }

  return { ok: true, job_id: null, snapshot_id: null };
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
    const { data, error } = await supabaseClient
      .from('lca_snapshot_artifacts')
      .select('artifact_url')
      .eq('snapshot_id', snapshotId)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { ok: false, error: `snapshot_artifact_lookup_failed:${error.message}` };
    }

    resolvedArtifactUrl = String(
      (data as { artifact_url?: unknown } | null)?.artifact_url ?? '',
    ).trim();
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

function isDuplicateKey(code: string | undefined): boolean {
  return code === '23505';
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
