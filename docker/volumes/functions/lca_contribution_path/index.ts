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

type ContributionPathRequest = {
  scope?: string;
  snapshot_id?: string;
  data_scope?: LcaDataScope;
  process_id?: string;
  process_version?: string;
  impact_id?: string;
  amount?: number;
  options?: {
    max_depth?: number;
    top_k_children?: number;
    cutoff_share?: number;
    max_nodes?: number;
  };
  print_level?: number;
};

type ContributionPathResponse = {
  mode: 'queued' | 'in_progress' | 'cache_hit';
  snapshot_id: string;
  cache_key: string;
  job_id?: string;
  result_id?: string;
};

type SnapshotIndexProcessEntry = {
  process_id: string;
  process_index: number;
  process_version?: string;
  process_name?: string | null;
  location?: string | null;
};

type SnapshotIndexImpactEntry = {
  impact_id: string;
  impact_index: number;
  impact_key: string;
  impact_name: string;
  unit: string;
};

type SnapshotIndexDocument = {
  version: number;
  snapshot_id: string;
  process_count: number;
  impact_count: number;
  process_map: SnapshotIndexProcessEntry[];
  impact_map: SnapshotIndexImpactEntry[];
};

type SnapshotArtifactMeta = {
  snapshot_id: string;
  artifact_url: string;
};

type ReadySnapshotMeta = {
  snapshot_id: string;
};

type ScopedSnapshotResolution =
  | { kind: 'fresh'; data: ReadySnapshotMeta }
  | { kind: 'stale'; snapshot_id: string }
  | { kind: 'none' };

type BuildQueueResult =
  | { ok: true; job_id: string; snapshot_id: string }
  | { ok: false; error: string; status: number };

type ResultCacheRow = {
  id: string;
  status: string;
  job_id: string | null;
  result_id: string | null;
  hit_count: number;
};

type CacheJobState = {
  status: string;
  result_id: string | null;
};

type ProcessIndexResolution =
  | { ok: true; process_index: number }
  | { ok: false; status: number; body: Record<string, unknown> };

type ContributionPathOptions = {
  max_depth: number;
  top_k_children: number;
  cutoff_share: number;
  max_nodes: number;
};

const QUEUE_NAME = 'lca_jobs';
const REQUEST_VERSION = 'lca_contribution_path_v1';
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

  let body: ContributionPathRequest;
  try {
    body = (await req.json()) as ContributionPathRequest;
  } catch (_error) {
    return json({ error: 'invalid_json' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid_payload' }, 400);
  }

  const scope = (body.scope ?? 'prod').trim() || 'prod';
  const dataScope = parseLcaDataScope(body.data_scope);
  const processId = body.process_id?.trim() ?? '';
  const processVersion = body.process_version?.trim() ?? '';
  const impactId = body.impact_id?.trim() ?? '';
  const amount = body.amount ?? 1.0;
  const printLevel = body.print_level ?? 0.0;

  if (!processId || !UUID_RE.test(processId)) {
    return json({ error: 'invalid_process_id' }, 400);
  }
  if (!impactId || !UUID_RE.test(impactId)) {
    return json({ error: 'invalid_impact_id' }, 400);
  }
  if (!Number.isFinite(amount) || amount === 0) {
    return json({ error: 'invalid_amount' }, 400);
  }
  if (!Number.isFinite(printLevel)) {
    return json({ error: 'invalid_print_level' }, 400);
  }

  const optionsResult = parseContributionPathOptions(body.options);
  if (!optionsResult.ok) {
    return json({ error: optionsResult.error }, 400);
  }
  const options = optionsResult.value;

  const snapshotMeta = await resolveReadySnapshot(scope, body.snapshot_id, userId, dataScope);
  if (!snapshotMeta.ok) {
    const shouldQueueBuild =
      shouldAutoBuildSnapshot(dataScope) &&
      !body.snapshot_id &&
      (snapshotMeta.error === 'no_ready_snapshot' ||
        snapshotMeta.error === 'snapshot_stale_rebuild_required');
    if (shouldQueueBuild) {
      const queued = await ensureSnapshotBuildQueued(scope, userId, dataScope);
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
  const snapshotId = snapshotMeta.data.snapshot_id;

  const snapshotArtifact = await fetchSnapshotArtifactMeta(snapshotId);
  if (!snapshotArtifact.ok) {
    return json({ error: snapshotArtifact.error }, snapshotArtifact.status);
  }

  const snapshotIndexUrl = deriveSnapshotIndexUrl(snapshotArtifact.data.artifact_url);
  const snapshotIndex = await fetchArtifactJson<SnapshotIndexDocument>(snapshotIndexUrl);
  if (!snapshotIndex.ok) {
    return json({ error: 'snapshot_index_fetch_failed', detail: snapshotIndex.error }, 502);
  }
  if (snapshotIndex.data.snapshot_id !== snapshotId) {
    return json({ error: 'snapshot_index_mismatch' }, 500);
  }

  const processIndexResolution = resolveProcessIndex(snapshotIndex.data, {
    process_id: processId,
    process_version: processVersion || undefined,
  });
  if (!processIndexResolution.ok) {
    return json(processIndexResolution.body, processIndexResolution.status);
  }
  const processIndex = processIndexResolution.process_index;
  const selectedProcessEntry = processEntryForIndex(snapshotIndex.data, processIndex);
  if (!selectedProcessEntry) {
    return json({ error: 'snapshot_index_invalid', process_id: processId }, 500);
  }
  const processScopeValidation = await validateProcessEntriesInDataScope(
    [selectedProcessEntry],
    dataScope,
    userId,
  );
  if (!processScopeValidation.ok) {
    return json(processScopeValidation.body, processScopeValidation.status);
  }

  const impactIndex = impactIndexOf(snapshotIndex.data, impactId);
  if (impactIndex === null) {
    return json({ error: 'impact_not_in_snapshot', impact_id: impactId }, 404);
  }

  const normalizedRequest = {
    version: REQUEST_VERSION,
    scope,
    snapshot_id: snapshotId,
    data_scope: dataScope,
    process_id: processId,
    process_version: processVersion || null,
    process_index: processIndex,
    impact_id: impactId,
    impact_index: impactIndex,
    amount,
    options,
    print_level: printLevel,
  };
  const requestKey = await sha256Hex(JSON.stringify(normalizedRequest));
  const nowIso = new Date().toISOString();
  let retryAfterJobId: string | null = null;

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
      const cacheHit: ContributionPathResponse = {
        mode: 'cache_hit',
        snapshot_id: snapshotId,
        cache_key: requestKey,
        result_id: existingCache.row.result_id,
      };
      return json(cacheHit, 200);
    }

    if (existingCache.row.status === 'failed' || existingCache.row.status === 'stale') {
      retryAfterJobId = existingCache.row.job_id ?? 'cache_failed';
    }

    if (
      (existingCache.row.status === 'pending' || existingCache.row.status === 'running') &&
      existingCache.row.job_id
    ) {
      const cacheJobState = await fetchCacheJobState(existingCache.row.job_id);
      if (cacheJobState.ok) {
        if (
          (cacheJobState.data.status === 'ready' || cacheJobState.data.status === 'completed') &&
          cacheJobState.data.result_id
        ) {
          await updateResultCacheState(existingCache.row.id, {
            status: 'ready',
            result_id: cacheJobState.data.result_id,
            updated_at: nowIso,
            last_accessed_at: nowIso,
            hit_count: existingCache.row.hit_count + 1,
          });
          const cacheHit: ContributionPathResponse = {
            mode: 'cache_hit',
            snapshot_id: snapshotId,
            cache_key: requestKey,
            result_id: cacheJobState.data.result_id,
          };
          return json(cacheHit, 200);
        }

        if (cacheJobState.data.status === 'queued' || cacheJobState.data.status === 'running') {
          const inProgress: ContributionPathResponse = {
            mode: 'in_progress',
            snapshot_id: snapshotId,
            cache_key: requestKey,
            job_id: existingCache.row.job_id,
          };
          return json(inProgress, 200);
        }

        if (cacheJobState.data.status === 'failed' || cacheJobState.data.status === 'stale') {
          retryAfterJobId = existingCache.row.job_id;
          await updateResultCacheState(existingCache.row.id, {
            status: 'failed',
            updated_at: nowIso,
            last_accessed_at: nowIso,
            hit_count: existingCache.row.hit_count + 1,
          });
        }
      } else {
        const inProgress: ContributionPathResponse = {
          mode: 'in_progress',
          snapshot_id: snapshotId,
          cache_key: requestKey,
          job_id: existingCache.row.job_id,
        };
        return json(inProgress, 200);
      }
    }
  }

  const idempotencyKeyBase = `${userId}:${requestKey}`;
  const idempotencyKey = retryAfterJobId
    ? `${idempotencyKeyBase}:retry_after:${retryAfterJobId}`
    : idempotencyKeyBase;

  const newJobId = crypto.randomUUID();
  const payload = {
    type: 'analyze_contribution_path',
    job_id: newJobId,
    snapshot_id: snapshotId,
    process_id: processId,
    process_index: processIndex,
    impact_id: impactId,
    impact_index: impactIndex,
    amount,
    options,
    print_level: printLevel,
  };

  const { error: insertJobError } = await supabaseClient.from('lca_jobs').insert({
    id: newJobId,
    job_type: 'analyze_contribution_path',
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

  const response: ContributionPathResponse = {
    mode: 'queued',
    snapshot_id: snapshotId,
    cache_key: requestKey,
    job_id: finalJobId,
  };
  return json(response, 202);
});

function parseContributionPathOptions(
  raw: ContributionPathRequest['options'],
): { ok: true; value: ContributionPathOptions } | { ok: false; error: string } {
  const maxDepth = raw?.max_depth ?? 4;
  const topKChildren = raw?.top_k_children ?? 5;
  const cutoffShare = raw?.cutoff_share ?? 0.01;
  const maxNodes = raw?.max_nodes ?? 200;

  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 8) {
    return { ok: false, error: 'invalid_max_depth' };
  }
  if (!Number.isInteger(topKChildren) || topKChildren < 1 || topKChildren > 20) {
    return { ok: false, error: 'invalid_top_k_children' };
  }
  if (!Number.isFinite(cutoffShare) || cutoffShare < 0 || cutoffShare > 1) {
    return { ok: false, error: 'invalid_cutoff_share' };
  }
  if (!Number.isInteger(maxNodes) || maxNodes < 10 || maxNodes > 2000) {
    return { ok: false, error: 'invalid_max_nodes' };
  }

  return {
    ok: true,
    value: {
      max_depth: maxDepth,
      top_k_children: topKChildren,
      cutoff_share: cutoffShare,
      max_nodes: maxNodes,
    },
  };
}

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
      scope,
      snapshot_id: snapshotId,
      request_key: requestKey,
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
      cache_id: row.id,
    });
  }
}

async function updateResultCacheState(
  cacheId: string,
  patch: {
    status: string;
    updated_at: string;
    last_accessed_at: string;
    hit_count: number;
    result_id?: string | null;
  },
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    status: patch.status,
    updated_at: patch.updated_at,
    last_accessed_at: patch.last_accessed_at,
    hit_count: patch.hit_count,
  };
  if (patch.result_id !== undefined) {
    updatePayload.result_id = patch.result_id;
  }

  const { error } = await supabaseClient
    .from('lca_result_cache')
    .update(updatePayload)
    .eq('id', cacheId);

  if (error) {
    console.warn('update lca_result_cache state failed', {
      error: error.message,
      cache_id: cacheId,
      next_status: patch.status,
    });
  }
}

async function fetchCacheJobState(
  jobId: string,
): Promise<{ ok: true; data: CacheJobState } | { ok: false }> {
  const { data: jobData, error: jobError } = await supabaseClient
    .from('lca_jobs')
    .select('id,status')
    .eq('id', jobId)
    .maybeSingle();

  if (jobError) {
    console.warn('fetch cache job state failed', {
      error: jobError.message,
      job_id: jobId,
    });
    return { ok: false };
  }

  if (!jobData) {
    return { ok: false };
  }

  let resultId: string | null = null;
  if (jobData.status === 'ready' || jobData.status === 'completed') {
    const { data: resultData, error: resultError } = await supabaseClient
      .from('lca_results')
      .select('id')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (resultError) {
      console.warn('fetch contribution path result by job_id failed', {
        error: resultError.message,
        job_id: jobId,
      });
      return { ok: false };
    }
    resultId = resultData?.id ? String(resultData.id) : null;
  }

  return {
    ok: true,
    data: {
      status: String(jobData.status),
      result_id: resultId,
    },
  };
}

async function resolveReadySnapshot(
  scope: string,
  requestedSnapshotId?: string,
  userId?: string,
  dataScope: LcaDataScope = 'current_user',
): Promise<{ ok: true; data: ReadySnapshotMeta } | { ok: false; error: string; status: number }> {
  const explicit = requestedSnapshotId?.trim();

  if (explicit) {
    if (!UUID_RE.test(explicit)) {
      return { ok: false, error: 'invalid_snapshot_id', status: 400 };
    }
    const ready = await fetchSnapshotArtifactMeta(explicit);
    if (!ready.ok) {
      return { ok: false, error: ready.error, status: ready.status };
    }
    return { ok: true, data: { snapshot_id: ready.data.snapshot_id } };
  }

  if (userId) {
    const scopedReady = await fetchReadySnapshotForDataScope(scope, userId, dataScope);
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
    const ready = await fetchSnapshotArtifactMeta(String(activeRow.snapshot_id));
    if (ready.ok) {
      return { ok: true, data: { snapshot_id: ready.data.snapshot_id } };
    }
  }

  const { data: latestRows, error: latestErr } = await supabaseClient
    .from('lca_snapshot_artifacts')
    .select('snapshot_id,status,created_at')
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

  return {
    ok: true,
    data: {
      snapshot_id: String(latestRows[0].snapshot_id),
    },
  };
}

async function fetchReadySnapshotForDataScope(
  scope: string,
  userId: string,
  dataScope: LcaDataScope,
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
      user_id: userId,
      data_scope: dataScope,
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

    const ready = await fetchSnapshotArtifactMeta(snapshotId);
    if (ready.ok) {
      const snapshotCreatedAt = String((row as { created_at?: unknown }).created_at ?? '');
      const freshness = await isSnapshotFresh(snapshotCreatedAt, processFilter);
      if (freshness === 'fresh') {
        return { kind: 'fresh', data: { snapshot_id: ready.data.snapshot_id } };
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

async function ensureSnapshotBuildQueued(
  scope: string,
  userId: string,
  dataScope: LcaDataScope = 'current_user',
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
  if (snapshotInsertError && !isDuplicateKey(snapshotInsertError.code)) {
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
  if (jobInsertError && !isDuplicateKey(jobInsertError.code)) {
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

async function fetchSnapshotArtifactMeta(
  snapshotId: string,
): Promise<
  { ok: true; data: SnapshotArtifactMeta } | { ok: false; error: string; status: number }
> {
  const { data, error } = await supabaseClient
    .from('lca_snapshot_artifacts')
    .select('snapshot_id,artifact_url,status,created_at')
    .eq('snapshot_id', snapshotId)
    .eq('status', 'ready')
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('query lca_snapshot_artifacts failed', {
      error: error.message,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'snapshot_artifact_lookup_failed', status: 500 };
  }

  if (!data || data.length === 0) {
    return { ok: false, error: 'snapshot_not_ready', status: 404 };
  }

  return {
    ok: true,
    data: {
      snapshot_id: String(data[0].snapshot_id),
      artifact_url: String(data[0].artifact_url),
    },
  };
}

function isDuplicateKey(code: string | undefined): boolean {
  return code === '23505';
}

function processEntryForIndex(
  snapshotIndex: SnapshotIndexDocument,
  processIndex: number,
): SnapshotIndexProcessEntry | null {
  const hit = snapshotIndex.process_map.find((entry) => entry.process_index === processIndex);
  if (!hit) {
    return null;
  }
  return hit;
}

function resolveProcessIndex(
  snapshotIndex: SnapshotIndexDocument,
  demand: { process_id: string; process_version?: string },
): ProcessIndexResolution {
  const processId = demand.process_id.trim();
  const processVersion = (demand.process_version ?? '').trim();
  const candidates = snapshotIndex.process_map.filter((entry) => entry.process_id === processId);
  if (candidates.length === 0) {
    return {
      ok: false,
      status: 404,
      body: { error: 'process_not_in_snapshot', process_id: processId },
    };
  }

  let selected: SnapshotIndexProcessEntry | null = null;
  if (processVersion) {
    selected =
      candidates.find((entry) => String(entry.process_version ?? '').trim() === processVersion) ??
      null;
    if (!selected) {
      const processVersions = [
        ...new Set(candidates.map((entry) => String(entry.process_version ?? ''))),
      ]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      return {
        ok: false,
        status: 404,
        body: {
          error: 'process_version_not_in_snapshot',
          process_id: processId,
          process_version: processVersion,
          process_versions: processVersions,
        },
      };
    }
  } else if (candidates.length > 1) {
    const processVersions = [
      ...new Set(candidates.map((entry) => String(entry.process_version ?? ''))),
    ]
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
    return {
      ok: false,
      status: 400,
      body: {
        error: 'process_version_required',
        process_id: processId,
        process_versions: processVersions,
      },
    };
  } else {
    selected = candidates[0];
  }

  if (!selected || !Number.isInteger(selected.process_index) || selected.process_index < 0) {
    return {
      ok: false,
      status: 500,
      body: { error: 'snapshot_index_invalid', process_id: processId },
    };
  }

  return { ok: true, process_index: selected.process_index };
}

function impactIndexOf(snapshotIndex: SnapshotIndexDocument, impactId: string): number | null {
  const hit = snapshotIndex.impact_map.find((entry) => entry.impact_id === impactId);
  if (!hit || !Number.isInteger(hit.impact_index) || hit.impact_index < 0) {
    return null;
  }
  return hit.impact_index;
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
