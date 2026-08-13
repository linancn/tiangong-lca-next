// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { validateProcessEntriesInDataScope } from '../_shared/lca_process_scope.ts';
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
import { isWorkerJobsCutoverEnabled } from '../_shared/worker_jobs_cutover.ts';

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
  worker_job_id?: string | null;
  result_id?: string;
  calculation_evidence?: LcaCalculationEvidenceBinding;
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

type ProcessIndexResolution =
  | { ok: true; process_index: number }
  | { ok: false; status: number; body: Record<string, unknown> };

type ContributionPathOptions = {
  max_depth: number;
  top_k_children: number;
  cutoff_share: number;
  max_nodes: number;
};

const REQUEST_VERSION = 'lca_contribution_path_v1';
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

  let body: ContributionPathRequest;
  try {
    body = (await req.json()) as ContributionPathRequest;
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
    ...(calculationEvidenceBinding
      ? { calculation_evidence_binding: calculationEvidenceBinding }
      : {}),
  };
  const requestKey = await sha256Hex(JSON.stringify(normalizedRequest));
  const idempotencyKey = `${userId}:${requestKey}`;

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
    ...(calculationEvidenceBinding
      ? { calculation_evidence_binding: calculationEvidenceBinding }
      : {}),
  };

  if (!isWorkerJobsCutoverEnabled('LCA_WORKER_JOBS_ENABLED')) {
    console.error('legacy lca contribution queue fallback is disabled before job insert', {
      idempotency_key: idempotencyKey,
      request_key: requestKey,
    });
    return json({ error: 'legacy_queue_disabled' }, 503);
  }

  const { data: enqueueData, error: enqueueError } = await supabaseClient.rpc(
    'svc_lca_cached_job_enqueue',
    {
      p_scope: scope,
      p_snapshot_id: snapshotId,
      p_request_key: requestKey,
      p_request_payload: normalizedRequest,
      p_job_kind: 'lca.contribution_path',
      p_job_id: newJobId,
      p_payload: payload,
      p_payload_schema_version: calculationEvidenceBinding
        ? 'lca.contribution_path.request.v2'
        : 'lca.contribution_path.request.v1',
      p_requested_by: userId,
      p_idempotency_key: idempotencyKey,
      p_queue_key: snapshotId,
    },
  );
  if (enqueueError) {
    return json({ error: 'worker_jobs_enqueue_failed', details: enqueueError.message }, 500);
  }
  const enqueueResult = enqueueData as Record<string, unknown> | null;
  if (!enqueueResult || enqueueResult.ok !== true) {
    return json(
      { error: String(enqueueResult?.code ?? 'worker_jobs_enqueue_failed') },
      Number(enqueueResult?.status ?? 500),
    );
  }
  if (enqueueResult.mode === 'blocked') {
    return json({ error: 'worker_job_blocked' }, 503);
  }
  const mode = String(enqueueResult.mode) as ContributionPathResponse['mode'];
  const response: ContributionPathResponse = {
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
