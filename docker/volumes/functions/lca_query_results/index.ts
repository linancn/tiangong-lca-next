// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callLcaReadLatestSingleSolveResultRpc } from '../_shared/db_rpc/lca_results.ts';
import {
  parseAllUnitQueryArtifact,
  readImpactColumn,
  readProcessImpactRow,
  type AllUnitQueryResult,
} from '../_shared/lca_all_unit_query_artifact.ts';
import { ensureLcaAllUnitSolveQueued } from '../_shared/lca_all_unit_solve_queue.ts';
import {
  fetchProcessScopeLookup,
  matchesProcessDataScope,
  processScopeLookupKey,
  validateProcessEntriesInDataScope,
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
  type ParsedSnapshotProcessFilter,
} from '../_shared/lca_snapshot_scope.ts';
import { verifySnapshotMatchesDataScope } from '../_shared/lca_snapshot_scope_db.ts';
import { getRedisClient } from '../_shared/redis_client.ts';
import { supabaseAuthClient, supabaseClient } from '../_shared/supabase_client.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_HOTSPOT_LIMIT = 20;
const MAX_HOTSPOT_LIMIT = 200;

type QueryMode = 'process_all_impacts' | 'processes_one_impact';
type HotspotSortBy = 'absolute_value' | 'value' | 'process_index';
type SortDirection = 'asc' | 'desc';

type QueryRequest = {
  scope?: string;
  snapshot_id?: string;
  data_scope?: LcaDataScope;
  mode?: QueryMode;
  process_id?: string;
  process_version?: string;
  process_ids?: string[];
  impact_id?: string;
  allow_fallback?: boolean;
  top_n?: number;
  offset?: number;
  sort_by?: HotspotSortBy;
  sort_direction?: SortDirection;
};

type SnapshotIndexProcessEntry = {
  process_id: string;
  process_index: number;
  process_version: string;
};

type SnapshotIndexImpactEntry = {
  impact_id: string;
  impact_index: number;
  impact_version?: string;
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
  calculation_evidence?: unknown;
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

type LatestAllUnitRow = {
  snapshot_id: string;
  result_id: string;
  computed_at: string;
  query_artifact_url: string;
  query_artifact_format: string;
  query_artifact_sha256: string;
  query_artifact_byte_size: number;
};

type LatestSingleSolveRow = {
  result_id: string;
  computed_at: string;
  amount: number;
};

type ProcessIndexResolution =
  | { ok: true; process_index: number }
  | { ok: false; status: number; body: Record<string, unknown> };

type RankedProcessValue = {
  process_id: string;
  process_version: string;
  process_index: number;
  value: number;
  absolute_value: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const redis = await getRedisClient();
  const authResult = await authenticateRequest(req, {
    authClient: supabaseAuthClient,
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

  const scope = parseLcaSnapshotScope(body.scope);
  if (!scope) {
    return json({ error: 'invalid_scope' }, 400);
  }
  const dataScope = parseLcaDataScope(body.data_scope);
  const mode = body.mode;
  const allowFallback = body.allow_fallback ?? true;

  if (mode !== 'process_all_impacts' && mode !== 'processes_one_impact') {
    return json({ error: 'invalid_mode' }, 400);
  }

  const snapshotMeta = await resolveReadySnapshot(scope, body.snapshot_id, userId, dataScope);
  if (!snapshotMeta.ok) {
    const shouldQueueBuild =
      shouldAutoBuildSnapshot(dataScope) &&
      !body.snapshot_id &&
      (snapshotMeta.error === 'no_ready_snapshot' ||
        snapshotMeta.error === 'snapshot_stale_rebuild_required');
    if (shouldQueueBuild) {
      const queued = await ensureLcaSnapshotBuildQueued(supabaseClient, {
        scope,
        dataScope,
        userId,
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
  const calculationEvidence = await resolveCalculationEvidenceBinding(
    snapshotIndex.data.calculation_evidence,
    dataScope,
    userId,
  );
  if (!calculationEvidence.ok) {
    return json({ error: calculationEvidence.error }, 409);
  }
  const calculationEvidenceBinding = calculationEvidence.binding;

  const latestAllUnit = await fetchLatestAllUnit(snapshotId, userId);
  if (!latestAllUnit.ok) {
    return json({ error: latestAllUnit.error }, latestAllUnit.status);
  }
  if (!latestAllUnit.row) {
    const queued = await ensureLcaAllUnitSolveQueued(supabaseClient, {
      scope,
      snapshotId,
      userId,
      calculationEvidenceBinding,
    });
    if (!queued.ok) {
      return json({ error: queued.error, details: queued.details ?? null }, queued.status);
    }
    return json(
      {
        error: 'all_unit_result_queued',
        mode: queued.mode,
        snapshot_id: queued.snapshot_id,
        cache_key: queued.cache_key,
        solve_job_id: queued.job_id,
        solve_worker_job_id: queued.worker_job_id,
        fallback_requested: allowFallback,
        ...(calculationEvidenceBinding ? { calculation_evidence: calculationEvidenceBinding } : {}),
      },
      409,
    );
  }

  const queryArtifact = await fetchVerifiedQueryArtifactJson(latestAllUnit.row);
  if (!queryArtifact.ok) {
    return queryArtifactReadErrorResponse(queryArtifact);
  }

  const impacts = [...snapshotIndex.data.impact_map].sort(
    (left, right) => left.impact_index - right.impact_index,
  );
  const parsedQueryArtifact = parseAllUnitQueryArtifact(queryArtifact.data, {
    expectedFormat: latestAllUnit.row.query_artifact_format,
    snapshotId,
    processCount: snapshotIndex.data.process_count,
    impacts,
  });
  if (!parsedQueryArtifact.ok) {
    return json(
      {
        error: parsedQueryArtifact.error,
        ...(parsedQueryArtifact.detail ? { detail: parsedQueryArtifact.detail } : {}),
      },
      500,
    );
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

    const hRow = await readProcessImpactRow(
      parsedQueryArtifact.data,
      impacts,
      processIndex,
      fetchArtifactBytes,
    );
    if (!hRow.ok) {
      return queryArtifactReadErrorResponse(hRow);
    }

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
      value: hRow.data[impact.impact_index] * scale,
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
          ...(calculationEvidenceBinding
            ? { calculation_evidence: calculationEvidenceBinding }
            : {}),
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
  const rankingRequested =
    body.top_n !== undefined ||
    body.offset !== undefined ||
    body.sort_by !== undefined ||
    body.sort_direction !== undefined;

  if (processIds.length === 0 && !rankingRequested) {
    return json({ error: 'process_ids_required' }, 400);
  }

  const invalidProcessIds = processIds.filter((id) => !UUID_RE.test(id));
  if (invalidProcessIds.length > 0) {
    return json({ error: 'invalid_process_ids', process_ids: invalidProcessIds }, 400);
  }

  if (processIds.length === 0) {
    const scopeMeta = await fetchProcessScopeLookup(snapshotIndex.data.process_map);
    if (!scopeMeta.ok) {
      return json({ error: scopeMeta.error }, 500);
    }
    const processScopeLookup = scopeMeta.data;

    const topN = parseHotspotLimit(body.top_n);
    if (!topN.ok) {
      return json({ error: 'invalid_top_n' }, 400);
    }

    const offset = parseHotspotOffset(body.offset);
    if (!offset.ok) {
      return json({ error: 'invalid_offset' }, 400);
    }

    const sortBy = parseHotspotSortBy(body.sort_by);
    if (!sortBy.ok) {
      return json({ error: 'invalid_sort_by' }, 400);
    }

    const sortDirection = parseSortDirection(body.sort_direction);
    if (!sortDirection.ok) {
      return json({ error: 'invalid_sort_direction' }, 400);
    }

    const rankedValues: RankedProcessValue[] = [];
    let totalAbsoluteValue = 0;
    const impactColumn = await readImpactColumn(
      parsedQueryArtifact.data,
      impacts,
      impactIndex,
      null,
      fetchArtifactBytes,
    );
    if (!impactColumn.ok) {
      return queryArtifactReadErrorResponse(impactColumn);
    }

    for (const entry of snapshotIndex.data.process_map) {
      if (
        !matchesProcessDataScope(
          processScopeLookup.get(processScopeLookupKey(entry.process_id, entry.process_version)),
          dataScope,
          userId,
        )
      ) {
        continue;
      }

      if (!Number.isInteger(entry.process_index) || entry.process_index < 0) {
        return json({ error: 'snapshot_index_invalid', process_id: entry.process_id }, 500);
      }

      const value = impactColumn.data.get(entry.process_index);
      if (value === undefined) {
        return json({ error: 'query_artifact_shape_invalid' }, 500);
      }
      const absoluteValue = Math.abs(value);
      totalAbsoluteValue += absoluteValue;

      rankedValues.push({
        process_id: entry.process_id,
        process_version: String(entry.process_version ?? '').trim(),
        process_index: entry.process_index,
        value,
        absolute_value: absoluteValue,
      });
    }

    rankedValues.sort((left, right) =>
      compareRankedProcessValues(left, right, sortBy.value, sortDirection.value),
    );

    const offsetValue = offset.value;
    const limitValue = topN.value;
    const slicedValues = rankedValues.slice(offsetValue, offsetValue + limitValue).map((item) => ({
      process_id: item.process_id,
      process_version: item.process_version,
      process_index: item.process_index,
      value: item.value,
      absolute_value: item.absolute_value,
    }));

    return json(
      {
        snapshot_id: snapshotId,
        result_id: latestAllUnit.row.result_id,
        source: 'all_unit',
        mode,
        data: {
          kind: 'ranked_processes',
          impact_id: impactId,
          impact_index: impactIndex,
          sort_by: sortBy.value,
          sort_direction: sortDirection.value,
          offset: offsetValue,
          limit: limitValue,
          returned_count: slicedValues.length,
          total_process_count: rankedValues.length,
          total_absolute_value: totalAbsoluteValue,
          values: slicedValues,
        },
        meta: {
          cache_hit: false,
          computed_at: latestAllUnit.row.computed_at,
          query_artifact_format: latestAllUnit.row.query_artifact_format,
          ...(calculationEvidenceBinding
            ? { calculation_evidence: calculationEvidenceBinding }
            : {}),
        },
      },
      200,
    );
  }

  const missingProcessIds: string[] = [];
  const requestedEntries: SnapshotIndexProcessEntry[] = [];
  const values: Record<string, number> = {};
  for (const processId of processIds) {
    const processEntry = processEntryForId(snapshotIndex.data, processId);
    if (!processEntry) {
      missingProcessIds.push(processId);
      continue;
    }
    requestedEntries.push(processEntry);
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

  const processScopeValidation = await validateProcessEntriesInDataScope(
    requestedEntries,
    dataScope,
    userId,
  );
  if (!processScopeValidation.ok) {
    return json(processScopeValidation.body, processScopeValidation.status);
  }

  const impactColumn = await readImpactColumn(
    parsedQueryArtifact.data,
    impacts,
    impactIndex,
    requestedEntries.map((entry) => entry.process_index),
    fetchArtifactBytes,
  );
  if (!impactColumn.ok) {
    return queryArtifactReadErrorResponse(impactColumn);
  }
  for (const processEntry of requestedEntries) {
    const value = impactColumn.data.get(processEntry.process_index);
    if (value === undefined) {
      return json({ error: 'query_artifact_shape_invalid' }, 500);
    }
    values[processEntry.process_id] = value;
  }

  return json(
    {
      snapshot_id: snapshotId,
      result_id: latestAllUnit.row.result_id,
      source: 'all_unit',
      mode,
      data: {
        kind: 'selected_processes',
        impact_id: impactId,
        impact_index: impactIndex,
        values,
      },
      meta: {
        cache_hit: false,
        computed_at: latestAllUnit.row.computed_at,
        query_artifact_format: latestAllUnit.row.query_artifact_format,
        ...(calculationEvidenceBinding ? { calculation_evidence: calculationEvidenceBinding } : {}),
      },
    },
    200,
  );
});

async function resolveCalculationEvidenceBinding(
  raw: unknown,
  dataScope: LcaDataScope,
  userId: string,
): Promise<
  { ok: true; binding: LcaCalculationEvidenceBinding | null } | { ok: false; error: string }
> {
  const validation = await validateCalculationEvidenceForDataScope(dataScope, userId, raw);
  if (!validation.ok) {
    return validation;
  }
  return {
    ok: true,
    binding: validation.evidence ? buildLcaCalculationEvidenceBinding(validation.evidence) : null,
  };
}

async function resolveReadySnapshot(
  scope: LcaSnapshotScope,
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
    },
  };
}

async function fetchReadySnapshotForDataScope(
  scope: LcaSnapshotScope,
  userId: string,
  dataScope: LcaDataScope,
): Promise<ScopedSnapshotResolution> {
  const expectedProcessFilter = await buildSnapshotProcessFilter(dataScope, userId);
  const result = await queryLcaSnapshotCandidates(supabaseClient, {
    scope,
    processFilterContains: buildSnapshotContainsFilter(expectedProcessFilter),
    limit: 100,
  });

  if (!result.ok) {
    console.warn('read scoped snapshots failed', {
      code: result.code,
      scope,
      user_id: userId,
      data_scope: dataScope,
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
      return { kind: 'fresh', data: { snapshot_id: snapshotId } };
    }
    latestStaleSnapshotId = snapshotId;
    break;
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

async function fetchSnapshotArtifactMeta(
  snapshotId: string,
): Promise<
  { ok: true; data: SnapshotArtifactMeta } | { ok: false; error: string; status: number }
> {
  const result = await queryLcaSnapshotCandidates(supabaseClient, {
    scope: 'full_library',
    snapshotId,
    limit: 1,
  });

  if (!result.ok) {
    console.error('query lca_snapshot_artifacts failed', {
      code: result.code,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'snapshot_artifact_lookup_failed', status: 500 };
  }

  const row = result.data[0];
  if (!row) {
    return { ok: false, error: 'snapshot_not_ready', status: 404 };
  }

  return {
    ok: true,
    data: {
      snapshot_id: row.snapshotId,
      artifact_url: row.artifact.artifactUrl,
    },
  };
}

async function fetchLatestAllUnit(
  snapshotId: string,
  userId: string,
): Promise<
  { ok: true; row: LatestAllUnitRow | null } | { ok: false; error: string; status: number }
> {
  const { data: envelope, error } = await supabaseClient.rpc('svc_lca_latest_all_unit_result', {
    p_snapshot_id: snapshotId,
    p_requested_by: userId,
  });

  if (error) {
    console.error('query lca_latest_all_unit_results failed', {
      error: error.message,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'latest_all_unit_lookup_failed', status: 500 };
  }

  const data = (envelope as { data?: Record<string, unknown> | null } | null)?.data ?? null;
  if (!data) {
    return { ok: true, row: null };
  }

  return {
    ok: true,
    row: {
      snapshot_id: String(data.snapshotId),
      result_id: String(data.resultId),
      computed_at: String(data.computedAt),
      query_artifact_url: String(data.queryArtifactUrl),
      query_artifact_format: String(data.queryArtifactFormat),
      query_artifact_sha256: String(data.queryArtifactSha256),
      query_artifact_byte_size: Number(data.queryArtifactByteSize),
    },
  };
}

async function fetchLatestSingleSolveForProcess(
  snapshotId: string,
  userId: string,
  processIndex: number,
): Promise<{ ok: true; row: LatestSingleSolveRow | null } | { ok: false; error: string }> {
  const projection = await callLcaReadLatestSingleSolveResultRpc(supabaseClient, {
    requestedBy: userId,
    snapshotId,
    processIndex,
  });

  if (!projection.ok) {
    console.warn('query latest solve_one projection failed', {
      error: projection.message,
      code: projection.code,
      details: projection.details,
      snapshot_id: snapshotId,
      user_id: userId,
    });
    return { ok: false, error: 'latest_single_lookup_failed' };
  }

  const data = asRecord(projection.data);
  if (!data) {
    return { ok: true, row: null };
  }

  const result = asRecord(data.result);
  if (!result) {
    console.warn('latest solve_one projection missing result payload', {
      snapshot_id: snapshotId,
      user_id: userId,
      process_index: processIndex,
    });
    return { ok: false, error: 'latest_single_lookup_failed' };
  }

  const amount = Number(data.amount ?? 1);
  return {
    ok: true,
    row: {
      result_id: stringField(result, 'resultId'),
      computed_at: stringField(result, 'createdAt'),
      amount: Number.isFinite(amount) && amount !== 0 ? amount : 1,
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === 'string' && value.trim().length > 0 ? value : '';
}

function processEntryForId(
  snapshotIndex: SnapshotIndexDocument,
  processId: string,
): SnapshotIndexProcessEntry | null {
  const hit = snapshotIndex.process_map.find((entry) => entry.process_id === processId);
  if (!hit || !Number.isInteger(hit.process_index) || hit.process_index < 0) {
    return null;
  }
  return hit;
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

function parseHotspotLimit(input: unknown): { ok: true; value: number } | { ok: false } {
  if (input === undefined || input === null) {
    return { ok: true, value: DEFAULT_HOTSPOT_LIMIT };
  }
  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_HOTSPOT_LIMIT) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

function parseHotspotOffset(input: unknown): { ok: true; value: number } | { ok: false } {
  if (input === undefined || input === null) {
    return { ok: true, value: 0 };
  }
  const parsed = Number(input);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

function parseHotspotSortBy(input: unknown): { ok: true; value: HotspotSortBy } | { ok: false } {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: 'absolute_value' };
  }
  if (input === 'absolute_value' || input === 'value' || input === 'process_index') {
    return { ok: true, value: input };
  }
  return { ok: false };
}

function parseSortDirection(input: unknown): { ok: true; value: SortDirection } | { ok: false } {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: 'desc' };
  }
  if (input === 'asc' || input === 'desc') {
    return { ok: true, value: input };
  }
  return { ok: false };
}

function compareRankedProcessValues(
  left: RankedProcessValue,
  right: RankedProcessValue,
  sortBy: HotspotSortBy,
  sortDirection: SortDirection,
): number {
  const primary =
    sortBy === 'value'
      ? left.value - right.value
      : sortBy === 'process_index'
        ? left.process_index - right.process_index
        : left.absolute_value - right.absolute_value;

  if (primary !== 0) {
    return sortDirection === 'asc' ? primary : -primary;
  }

  if (left.process_index !== right.process_index) {
    return left.process_index - right.process_index;
  }

  return left.process_id.localeCompare(right.process_id);
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

async function fetchVerifiedQueryArtifactJson(
  row: LatestAllUnitRow,
): Promise<AllUnitQueryResult<unknown>> {
  const expectedSha256 = row.query_artifact_sha256.trim().toLowerCase();
  if (
    !/^[0-9a-f]{64}$/.test(expectedSha256) ||
    !Number.isSafeInteger(row.query_artifact_byte_size) ||
    row.query_artifact_byte_size <= 0
  ) {
    return {
      ok: false,
      error: 'all_unit_query_artifact_integrity_invalid',
      detail: 'persisted query artifact integrity metadata is invalid',
    };
  }
  const fetched = await fetchArtifactBytes(
    row.query_artifact_url,
    'all_unit_query_artifact_fetch_failed',
  );
  if (!fetched.ok) {
    return fetched;
  }
  if (fetched.data.byteLength !== row.query_artifact_byte_size) {
    return {
      ok: false,
      error: 'all_unit_query_artifact_integrity_invalid',
      detail: `expected_bytes=${row.query_artifact_byte_size} actual_bytes=${fetched.data.byteLength}`,
    };
  }
  if ((await sha256Hex(fetched.data)) !== expectedSha256) {
    return {
      ok: false,
      error: 'all_unit_query_artifact_integrity_invalid',
      detail: 'sha256_mismatch',
    };
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(fetched.data)) };
  } catch (error) {
    return {
      ok: false,
      error: 'all_unit_query_artifact_fetch_failed',
      detail: error instanceof Error ? `json_parse_failed:${error.message}` : 'json_parse_failed',
    };
  }
}

async function fetchArtifactBytes(
  artifactUrl: string,
  fetchError = 'all_unit_query_artifact_chunk_fetch_failed',
): Promise<AllUnitQueryResult<Uint8Array>> {
  const storagePath = parseStoragePathFromArtifactUrl(artifactUrl);
  let storageError: string | null = null;
  if (storagePath) {
    const downloaded = await supabaseClient.storage
      .from(storagePath.bucket)
      .download(storagePath.objectPath);
    if (!downloaded.error) {
      return { ok: true, data: new Uint8Array(await downloaded.data.arrayBuffer()) };
    }
    storageError = `storage_download_failed:${downloaded.error.message}`;
  }

  try {
    const response = await fetch(artifactUrl, { method: 'GET' });
    if (!response.ok) {
      const httpError = `http_${response.status}`;
      return {
        ok: false,
        error: fetchError,
        detail: storageError ? `${storageError};${httpError}` : httpError,
      };
    }
    return { ok: true, data: new Uint8Array(await response.arrayBuffer()) };
  } catch (error) {
    const httpError = error instanceof Error ? error.message : 'fetch_failed';
    return {
      ok: false,
      error: fetchError,
      detail: storageError ? `${storageError};${httpError}` : httpError,
    };
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function queryArtifactReadErrorResponse(result: {
  ok: false;
  error: string;
  detail?: string;
}): Response {
  return json(
    {
      error: result.error,
      ...(result.detail ? { detail: result.detail } : {}),
    },
    result.error === 'all_unit_query_artifact_chunk_fetch_failed' ||
      result.error === 'all_unit_query_artifact_fetch_failed'
      ? 502
      : 500,
  );
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
