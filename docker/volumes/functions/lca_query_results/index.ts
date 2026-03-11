// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALL_UNIT_QUERY_FORMAT = 'all-unit-query:v1';
const DEFAULT_PROCESS_STATES = [100];

type QueryMode = 'process_all_impacts' | 'processes_one_impact';

type QueryRequest = {
  scope?: string;
  snapshot_id?: string;
  mode?: QueryMode;
  process_id?: string;
  process_version?: string;
  process_ids?: string[];
  impact_id?: string;
  allow_fallback?: boolean;
};

type SnapshotIndexProcessEntry = {
  process_id: string;
  process_index: number;
  process_version: string;
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

type AllUnitQueryEnvelope = {
  version: number;
  format: string;
  snapshot_id: string;
  job_id: string;
  process_count: number;
  impact_count: number;
  h_matrix: number[][];
};

type SnapshotArtifactMeta = {
  snapshot_id: string;
  artifact_url: string;
};

type ReadySnapshotMeta = {
  snapshot_id: string;
};

type UserScopedSnapshotResolution =
  | { kind: 'fresh'; data: ReadySnapshotMeta }
  | { kind: 'stale'; snapshot_id: string }
  | { kind: 'none' };

type LatestAllUnitRow = {
  snapshot_id: string;
  result_id: string;
  computed_at: string;
  query_artifact_url: string;
  query_artifact_format: string;
};

type LatestSingleSolveRow = {
  result_id: string;
  computed_at: string;
  amount: number;
};

type ProcessIndexResolution =
  | { ok: true; process_index: number }
  | { ok: false; status: number; body: Record<string, unknown> };

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

  let body: QueryRequest;
  try {
    body = (await req.json()) as QueryRequest;
  } catch (_error) {
    return json({ error: 'invalid_json' }, 400);
  }

  if (!body || typeof body !== 'object') {
    return json({ error: 'invalid_payload' }, 400);
  }

  const scope = (body.scope ?? 'prod').trim() || 'prod';
  const mode = body.mode;
  const allowFallback = body.allow_fallback ?? true;

  if (mode !== 'process_all_impacts' && mode !== 'processes_one_impact') {
    return json({ error: 'invalid_mode' }, 400);
  }

  const snapshotMeta = await resolveReadySnapshot(scope, body.snapshot_id, userId);
  if (!snapshotMeta.ok) {
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

  const latestAllUnit = await fetchLatestAllUnit(snapshotId);
  if (!latestAllUnit.ok) {
    return json({ error: latestAllUnit.error }, latestAllUnit.status);
  }
  if (!latestAllUnit.row) {
    if (allowFallback) {
      return json({ error: 'fallback_not_implemented_yet' }, 501);
    }
    return json({ error: 'all_unit_result_not_ready' }, 409);
  }

  const queryArtifact = await fetchArtifactJson<AllUnitQueryEnvelope>(
    latestAllUnit.row.query_artifact_url,
  );
  if (!queryArtifact.ok) {
    return json(
      { error: 'all_unit_query_artifact_fetch_failed', detail: queryArtifact.error },
      502,
    );
  }

  if (queryArtifact.data.format !== ALL_UNIT_QUERY_FORMAT) {
    return json({ error: 'unsupported_query_artifact_format' }, 500);
  }

  if (queryArtifact.data.snapshot_id !== snapshotId) {
    return json({ error: 'query_artifact_snapshot_mismatch' }, 500);
  }

  if (mode === 'process_all_impacts') {
    const processId = body.process_id?.trim();
    if (!processId || !UUID_RE.test(processId)) {
      return json({ error: 'invalid_process_id' }, 400);
    }

    const processVersion = body.process_version?.trim();
    const processIndexResolution = resolveProcessIndex(snapshotIndex.data, {
      process_id: processId,
      process_version: processVersion || undefined,
    });
    if (!processIndexResolution.ok) {
      return json(processIndexResolution.body, processIndexResolution.status);
    }
    const processIndex = processIndexResolution.process_index;

    const hRow = queryArtifact.data.h_matrix[processIndex];
    if (!Array.isArray(hRow)) {
      return json({ error: 'query_artifact_shape_invalid' }, 500);
    }

    const impacts = [...snapshotIndex.data.impact_map].sort(
      (a, b) => a.impact_index - b.impact_index,
    );

    let source: 'all_unit' | 'fallback_solve_one' = 'all_unit';
    let resultId = latestAllUnit.row.result_id;
    let computedAt = latestAllUnit.row.computed_at;
    let scale = 1;
    const latestSingle = await fetchLatestSingleSolveForProcess(snapshotId, userId, processIndex);
    if (latestSingle.ok && latestSingle.row) {
      const allUnitTs = Date.parse(latestAllUnit.row.computed_at);
      const singleTs = Date.parse(latestSingle.row.computed_at);
      const preferSingle =
        Number.isFinite(singleTs) && (!Number.isFinite(allUnitTs) || singleTs >= allUnitTs);
      if (preferSingle) {
        source = 'fallback_solve_one';
        resultId = latestSingle.row.result_id;
        computedAt = latestSingle.row.computed_at;
        scale = latestSingle.row.amount;
      }
    }

    const values = impacts.map((impact) => ({
      impact_id: impact.impact_id,
      impact_index: impact.impact_index,
      impact_key: impact.impact_key,
      impact_name: impact.impact_name,
      unit: impact.unit,
      value: Number(hRow[impact.impact_index] ?? 0) * scale,
    }));

    return json(
      {
        snapshot_id: snapshotId,
        result_id: resultId,
        source,
        mode,
        data: {
          process_id: processId,
          values,
        },
        meta: {
          cache_hit: false,
          computed_at: computedAt,
          query_artifact_format: latestAllUnit.row.query_artifact_format,
          ...(source === 'fallback_solve_one'
            ? {
                scaled_from_all_unit_result_id: latestAllUnit.row.result_id,
                scaled_amount: scale,
              }
            : {}),
        },
      },
      200,
    );
  }

  const impactId = body.impact_id?.trim();
  if (!impactId || !UUID_RE.test(impactId)) {
    return json({ error: 'invalid_impact_id' }, 400);
  }

  const impactIndex = impactIndexOf(snapshotIndex.data, impactId);
  if (impactIndex === null) {
    return json({ error: 'impact_not_in_snapshot', impact_id: impactId }, 404);
  }

  const processIds = (body.process_ids ?? []).map((id) => id.trim()).filter(Boolean);
  if (processIds.length === 0) {
    return json({ error: 'process_ids_required' }, 400);
  }

  const invalidProcessIds = processIds.filter((id) => !UUID_RE.test(id));
  if (invalidProcessIds.length > 0) {
    return json({ error: 'invalid_process_ids', process_ids: invalidProcessIds }, 400);
  }

  const missingProcessIds: string[] = [];
  const values: Record<string, number> = {};
  for (const processId of processIds) {
    const processIndex = processIndexOf(snapshotIndex.data, processId);
    if (processIndex === null) {
      missingProcessIds.push(processId);
      continue;
    }
    const hRow = queryArtifact.data.h_matrix[processIndex];
    if (!Array.isArray(hRow)) {
      return json({ error: 'query_artifact_shape_invalid' }, 500);
    }
    values[processId] = Number(hRow[impactIndex] ?? 0);
  }

  if (missingProcessIds.length > 0) {
    return json(
      {
        error: 'process_not_in_snapshot',
        process_ids: missingProcessIds,
      },
      404,
    );
  }

  return json(
    {
      snapshot_id: snapshotId,
      result_id: latestAllUnit.row.result_id,
      source: 'all_unit',
      mode,
      data: {
        impact_id: impactId,
        impact_index: impactIndex,
        values,
      },
      meta: {
        cache_hit: false,
        computed_at: latestAllUnit.row.computed_at,
        query_artifact_format: latestAllUnit.row.query_artifact_format,
      },
    },
    200,
  );
});

async function resolveReadySnapshot(
  scope: string,
  requestedSnapshotId?: string,
  userId?: string,
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
    const userScopedReady = await fetchUserScopedReadySnapshot(scope, userId);
    if (userScopedReady.kind === 'fresh') {
      return { ok: true, data: userScopedReady.data };
    }
    if (userScopedReady.kind === 'stale') {
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

async function fetchUserScopedReadySnapshot(
  scope: string,
  userId: string,
): Promise<UserScopedSnapshotResolution> {
  const { data, error } = await supabaseClient
    .from('lca_network_snapshots')
    .select('id,created_at,process_filter')
    .eq('status', 'ready')
    .in('scope', scope === 'full_library' ? ['full_library'] : ['full_library', scope])
    .contains('process_filter', {
      all_states: false,
      process_states: DEFAULT_PROCESS_STATES,
      include_user_id: userId,
    })
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.warn('read user scoped snapshots failed', {
      error: error.message,
      scope,
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
    const ready = await fetchSnapshotArtifactMeta(snapshotId);
    if (ready.ok) {
      const snapshotCreatedAt = String((row as { created_at?: unknown }).created_at ?? '');
      const processFilter = (row as { process_filter?: unknown }).process_filter;
      const freshness = await isSnapshotFresh(snapshotCreatedAt, processFilter, userId);
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

type ParsedProcessFilter = {
  allStates: boolean;
  processStates: number[];
  includeUserId: string | null;
};

function parseProcessFilter(raw: unknown, fallbackUserId: string): ParsedProcessFilter {
  const obj = (raw ?? {}) as {
    all_states?: unknown;
    process_states?: unknown;
    include_user_id?: unknown;
  };
  const allStates = obj.all_states === true;
  const includeUserIdRaw =
    typeof obj.include_user_id === 'string' && obj.include_user_id.trim().length > 0
      ? obj.include_user_id.trim()
      : fallbackUserId;
  const includeUserId = includeUserIdRaw.length > 0 ? includeUserIdRaw : null;

  const processStates: number[] = [];
  if (Array.isArray(obj.process_states)) {
    for (const item of obj.process_states) {
      const n = Number(item);
      if (Number.isInteger(n)) {
        processStates.push(n);
      }
    }
  } else if (typeof obj.process_states === 'string') {
    for (const token of obj.process_states.split(',')) {
      const n = Number(token.trim());
      if (Number.isInteger(n)) {
        processStates.push(n);
      }
    }
  }

  return {
    allStates,
    processStates: [...new Set(processStates)],
    includeUserId,
  };
}

async function isSnapshotFresh(
  snapshotCreatedAtIso: string,
  processFilterRaw: unknown,
  fallbackUserId: string,
): Promise<SnapshotFreshness> {
  const snapshotCreatedAt = Date.parse(snapshotCreatedAtIso);
  if (!Number.isFinite(snapshotCreatedAt)) {
    return 'stale';
  }

  const processFilter = parseProcessFilter(processFilterRaw, fallbackUserId);

  const [processMax, flowMax, methodMax] = await Promise.all([
    fetchProcessMaxModifiedAt(processFilter),
    fetchTableMaxModifiedAt('flows'),
    fetchTableMaxModifiedAt('lciamethods'),
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

async function fetchProcessMaxModifiedAt(filter: ParsedProcessFilter): Promise<string | null> {
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

async function fetchTableMaxModifiedAt(table: 'flows' | 'lciamethods'): Promise<string | null> {
  const { data, error } = await supabaseClient
    .from(table)
    .select('modified_at')
    .order('modified_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn('fetch table max modified_at failed', { table, error: error.message });
    return null;
  }
  return data?.modified_at ? String(data.modified_at) : null;
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

async function fetchLatestAllUnit(
  snapshotId: string,
): Promise<
  { ok: true; row: LatestAllUnitRow | null } | { ok: false; error: string; status: number }
> {
  const { data, error } = await supabaseClient
    .from('lca_latest_all_unit_results')
    .select(
      'snapshot_id,result_id,computed_at,query_artifact_url,query_artifact_format,status,updated_at',
    )
    .eq('snapshot_id', snapshotId)
    .eq('status', 'ready')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('query lca_latest_all_unit_results failed', {
      error: error.message,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'latest_all_unit_lookup_failed', status: 500 };
  }

  if (!data) {
    return { ok: true, row: null };
  }

  return {
    ok: true,
    row: {
      snapshot_id: String(data.snapshot_id),
      result_id: String(data.result_id),
      computed_at: String(data.computed_at),
      query_artifact_url: String(data.query_artifact_url),
      query_artifact_format: String(data.query_artifact_format),
    },
  };
}

async function fetchLatestSingleSolveForProcess(
  snapshotId: string,
  userId: string,
  processIndex: number,
): Promise<{ ok: true; row: LatestSingleSolveRow | null } | { ok: false; error: string }> {
  const { data: jobs, error: jobsError } = await supabaseClient
    .from('lca_jobs')
    .select('id,payload,created_at')
    .eq('snapshot_id', snapshotId)
    .eq('job_type', 'solve_one')
    .eq('status', 'completed')
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (jobsError) {
    console.warn('query latest solve_one jobs failed', {
      error: jobsError.message,
      snapshot_id: snapshotId,
      user_id: userId,
    });
    return { ok: false, error: 'latest_single_lookup_failed' };
  }

  for (const row of jobs ?? []) {
    const jobId = String((row as { id?: unknown }).id ?? '').trim();
    if (!jobId) {
      continue;
    }

    const amount = amountForProcessIndex((row as { payload?: unknown }).payload, processIndex);
    if (amount === null) {
      continue;
    }

    const { data: resultRow, error: resultError } = await supabaseClient
      .from('lca_results')
      .select('id,created_at')
      .eq('job_id', jobId)
      .maybeSingle();

    if (resultError) {
      console.warn('query result by solve_one job failed', {
        error: resultError.message,
        snapshot_id: snapshotId,
        user_id: userId,
        job_id: jobId,
      });
      continue;
    }
    if (!resultRow) {
      continue;
    }

    return {
      ok: true,
      row: {
        result_id: String(resultRow.id),
        computed_at: String(resultRow.created_at),
        amount,
      },
    };
  }

  return { ok: true, row: null };
}

function amountForProcessIndex(payload: unknown, processIndex: number): number | null {
  const obj = (payload ?? {}) as {
    demand?: unknown;
    rhs?: unknown;
  };

  const demand = obj.demand as { process_index?: unknown; amount?: unknown } | undefined;
  if (
    demand &&
    Number.isInteger(demand.process_index) &&
    Number(demand.process_index) === processIndex
  ) {
    const amount = Number(demand.amount ?? 1);
    if (Number.isFinite(amount) && amount !== 0) {
      return amount;
    }
  }

  if (!Array.isArray(obj.rhs)) {
    return null;
  }
  if (!Number.isInteger(processIndex) || processIndex < 0 || processIndex >= obj.rhs.length) {
    return null;
  }
  const amount = Number(obj.rhs[processIndex]);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }
  return amount;
}

function processIndexOf(snapshotIndex: SnapshotIndexDocument, processId: string): number | null {
  const hit = snapshotIndex.process_map.find((entry) => entry.process_id === processId);
  if (!hit || !Number.isInteger(hit.process_index) || hit.process_index < 0) {
    return null;
  }
  return hit.process_index;
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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}
