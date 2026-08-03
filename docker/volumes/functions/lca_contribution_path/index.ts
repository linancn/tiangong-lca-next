// Setup type definitions for built-in Supabase Runtime APIs
import '@supabase/functions-js/edge-runtime.d.ts';

import { authenticateRequest, AuthMethod } from '../_shared/auth.ts';
import {
  createLcaResultFamilyCapabilityRepository,
  type LcaResultFamilyCapabilityRepository,
} from '../_shared/capabilities/lca_result_family.ts';
import {
  createLcaSnapshotCapabilityRepository,
  type LcaSnapshotCapabilityRepository,
} from '../_shared/capabilities/lca_snapshot_family.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { validateProcessEntriesInDataScope } from '../_shared/lca_process_scope.ts';
import { ensureLcaSnapshotBuildQueued } from '../_shared/lca_snapshot_build_queue.ts';
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
import {
  enqueueCalculatorWorkerJob,
  isWorkerJobsCutoverEnabled,
  workerJobPayloadStringFromRpcData,
} from '../_shared/worker_jobs_cutover.ts';

const lcaSnapshotRepository = createLcaSnapshotCapabilityRepository(supabaseClient);
const lcaResultRepository = createLcaResultFamilyCapabilityRepository(supabaseClient);

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

type LcaContributionPathHandlerDependencies = {
  authenticateRequest: typeof authenticateRequest;
  getRedisClient: typeof getRedisClient;
  isSnapshotFresh: typeof isSnapshotFresh;
  snapshotRepository: LcaSnapshotCapabilityRepository;
  resultRepository: LcaResultFamilyCapabilityRepository;
};

export function createLcaContributionPathHandler(
  overrides: Partial<LcaContributionPathHandlerDependencies> = {},
): (req: Request) => Promise<Response> {
  const dependencies: LcaContributionPathHandlerDependencies = {
    authenticateRequest,
    getRedisClient,
    isSnapshotFresh,
    snapshotRepository: lcaSnapshotRepository,
    resultRepository: lcaResultRepository,
    ...overrides,
  };

  return (req) => handleLcaContributionPathRequest(req, dependencies);
}

async function handleLcaContributionPathRequest(
  req: Request,
  dependencies: LcaContributionPathHandlerDependencies,
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const redis = await dependencies.getRedisClient();
  const authResult = await dependencies.authenticateRequest(req, {
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

  const snapshotMeta = await resolveReadySnapshot(
    scope,
    body.snapshot_id,
    userId,
    dataScope,
    dependencies.snapshotRepository,
    dependencies.isSnapshotFresh,
  );
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

  const snapshotArtifact = await fetchSnapshotArtifactMeta(
    snapshotId,
    dependencies.snapshotRepository,
  );
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
  const cacheDecision = await resolveContributionPathCache({
    scope,
    snapshotId,
    requestKey,
    userId,
    calculationEvidenceBinding,
    repository: dependencies.resultRepository,
  });
  if (cacheDecision.kind === 'respond') {
    return json(cacheDecision.body, cacheDecision.status);
  }
  const retryAfterJobId = cacheDecision.retryAfterJobId;

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

  const workerJob = await enqueueCalculatorWorkerJob(supabaseClient, {
    jobKind: 'lca.contribution_path',
    payload,
    payloadSchemaVersion: calculationEvidenceBinding
      ? 'lca.contribution_path.request.v2'
      : 'lca.contribution_path.request.v1',
    subjectType: 'lca_job',
    subjectId: newJobId,
    subjectVersion: snapshotId,
    requestedBy: userId,
    requesterType: 'user',
    idempotencyKey,
    requestHash: requestKey,
    queueKey: snapshotId,
    visibility: 'user',
  });
  if (!workerJob.ok) {
    console.error('enqueue contribution path worker_jobs job failed', {
      error: workerJob.error,
      status: workerJob.status,
      details: workerJob.details,
      lca_job_id: newJobId,
    });
    return json(
      { error: 'worker_jobs_enqueue_failed', details: workerJob.error },
      workerJob.status,
    );
  }
  const finalJobId = workerJobPayloadStringFromRpcData(workerJob.data, 'job_id') ?? newJobId;
  const finalWorkerJobId = workerJob.workerJobId;

  const admission = await admitContributionPathCache({
    scope,
    snapshotId,
    requestKey,
    requestPayload: normalizedRequest,
    legacyJobId: finalJobId,
    workerJobId: finalWorkerJobId,
    calculationEvidenceBinding,
    repository: dependencies.resultRepository,
  });
  return json(admission.body, admission.status);
}

type ContributionCacheDecision =
  | { kind: 'continue'; retryAfterJobId: string | null }
  | { kind: 'respond'; status: number; body: Record<string, unknown> };

export async function resolveContributionPathCache(args: {
  scope: string;
  snapshotId: string;
  requestKey: string;
  userId: string;
  calculationEvidenceBinding?: LcaCalculationEvidenceBinding | null;
  repository: LcaResultFamilyCapabilityRepository;
}): Promise<ContributionCacheDecision> {
  const existing = await args.repository.readCache({
    scope: args.scope,
    snapshotId: args.snapshotId,
    requestKey: args.requestKey,
  });
  if (!existing.ok) {
    return { kind: 'respond', status: 500, body: { error: 'cache_lookup_failed' } };
  }
  if (!existing.data) return { kind: 'continue', retryAfterJobId: null };

  const evidence = args.calculationEvidenceBinding
    ? { calculation_evidence: args.calculationEvidenceBinding }
    : {};
  const row = existing.data;
  if (row.status === 'ready' && row.resultId) {
    const touched = await args.repository.touchCache(row.cacheId);
    if (!touched.ok) {
      console.warn('touch contribution-path cache failed', {
        code: touched.code,
        error: touched.message,
        cache_id: row.cacheId,
      });
    }
    return {
      kind: 'respond',
      status: 200,
      body: {
        mode: 'cache_hit',
        snapshot_id: args.snapshotId,
        cache_key: args.requestKey,
        result_id: row.resultId,
        ...evidence,
      },
    };
  }

  if (row.status === 'failed' || row.status === 'stale') {
    return {
      kind: 'continue',
      retryAfterJobId: row.legacyJobId ?? 'cache_failed',
    };
  }

  if ((row.status === 'pending' || row.status === 'running') && row.workerJobId) {
    const reconciled = await args.repository.reconcileCache({
      requestedBy: args.userId,
      cacheId: row.cacheId,
    });
    if (!reconciled.ok) {
      console.error('reconcile contribution-path cache failed', {
        code: reconciled.code,
        error: reconciled.message,
        details: reconciled.details,
        cache_id: row.cacheId,
      });
      return { kind: 'respond', status: 500, body: { error: 'cache_reconcile_failed' } };
    }
    if (reconciled.data.code === 'cache_not_found' || reconciled.data.code === 'job_not_found') {
      return { kind: 'respond', status: 500, body: { error: 'cache_reconcile_failed' } };
    }

    const canonical = reconciled.data.cache;
    if (!canonical) {
      return { kind: 'respond', status: 500, body: { error: 'cache_reconcile_failed' } };
    }
    if (canonical.resultId) {
      return {
        kind: 'respond',
        status: 200,
        body: {
          mode: 'cache_hit',
          snapshot_id: args.snapshotId,
          cache_key: args.requestKey,
          result_id: canonical.resultId,
          ...evidence,
        },
      };
    }

    // The reconciliation command already increments hit_count exactly once.
    // Terminal failed/stale (including DB-normalized cancelled) intentionally
    // converges on the next poll, which will take the admission branch.
    return {
      kind: 'respond',
      status: 200,
      body: {
        mode: 'in_progress',
        snapshot_id: args.snapshotId,
        cache_key: args.requestKey,
        job_id: canonical.legacyJobId ?? undefined,
        worker_job_id: canonical.workerJobId,
        ...evidence,
      },
    };
  }

  if ((row.status === 'pending' || row.status === 'running') && row.legacyJobId) {
    const touched = await args.repository.touchCache(row.cacheId);
    if (!touched.ok) {
      console.warn('touch legacy-only contribution-path cache failed', {
        code: touched.code,
        error: touched.message,
        cache_id: row.cacheId,
      });
    }
    return {
      kind: 'respond',
      status: 200,
      body: {
        mode: 'in_progress',
        snapshot_id: args.snapshotId,
        cache_key: args.requestKey,
        job_id: row.legacyJobId,
        worker_job_id: null,
        ...evidence,
      },
    };
  }

  return { kind: 'continue', retryAfterJobId: null };
}

export async function admitContributionPathCache(args: {
  scope: string;
  snapshotId: string;
  requestKey: string;
  requestPayload: Record<string, unknown>;
  legacyJobId: string;
  workerJobId: string | null;
  calculationEvidenceBinding?: LcaCalculationEvidenceBinding | null;
  repository: LcaResultFamilyCapabilityRepository;
}): Promise<{ status: number; body: Record<string, unknown> }> {
  const admitted = await args.repository.admitCache({
    scope: args.scope,
    snapshotId: args.snapshotId,
    requestKey: args.requestKey,
    requestPayload: args.requestPayload,
    legacyJobId: args.legacyJobId,
    workerJobId: args.workerJobId,
    replaceReady: false,
  });
  if (!admitted.ok) {
    console.error('admit contribution-path cache failed', {
      code: admitted.code,
      error: admitted.message,
      details: admitted.details,
    });
    return { status: 500, body: { error: 'cache_admission_failed' } };
  }

  const canonical = admitted.data.cache;
  const evidence = args.calculationEvidenceBinding
    ? { calculation_evidence: args.calculationEvidenceBinding }
    : {};
  if (admitted.data.outcome === 'reused') {
    return {
      status: 200,
      body: canonical.resultId
        ? {
            mode: 'cache_hit',
            snapshot_id: args.snapshotId,
            cache_key: args.requestKey,
            result_id: canonical.resultId,
            ...evidence,
          }
        : {
            mode: 'in_progress',
            snapshot_id: args.snapshotId,
            cache_key: args.requestKey,
            job_id: canonical.legacyJobId ?? undefined,
            worker_job_id: canonical.workerJobId,
            ...evidence,
          },
    };
  }

  return {
    status: 202,
    body: {
      mode: 'queued',
      snapshot_id: args.snapshotId,
      cache_key: args.requestKey,
      job_id: canonical.legacyJobId ?? args.legacyJobId,
      worker_job_id: canonical.workerJobId,
      ...evidence,
    },
  };
}

if (import.meta.main) {
  Deno.serve(createLcaContributionPathHandler());
}

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
  scope: string,
  requestedSnapshotId?: string,
  userId: string = '',
  dataScope: LcaDataScope = 'current_user',
  repository: LcaSnapshotCapabilityRepository = lcaSnapshotRepository,
  freshnessCheck: typeof isSnapshotFresh = isSnapshotFresh,
): Promise<{ ok: true; data: ReadySnapshotMeta } | { ok: false; error: string; status: number }> {
  const explicit = requestedSnapshotId?.trim();

  if (explicit) {
    if (!UUID_RE.test(explicit)) {
      return { ok: false, error: 'invalid_snapshot_id', status: 400 };
    }
    const ready = await fetchSnapshotArtifactMeta(explicit, repository);
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

  const scopedReady = await fetchReadySnapshotForDataScope(
    scope,
    userId,
    dataScope,
    repository,
    freshnessCheck,
  );
  if (scopedReady.kind === 'fresh') {
    return { ok: true, data: scopedReady.data };
  }
  if (scopedReady.kind === 'stale') {
    return { ok: false, error: 'snapshot_stale_rebuild_required', status: 409 };
  }
  return { ok: false, error: 'no_ready_snapshot', status: 404 };
}

async function fetchReadySnapshotForDataScope(
  scope: string,
  userId: string,
  dataScope: LcaDataScope,
  repository: LcaSnapshotCapabilityRepository = lcaSnapshotRepository,
  freshnessCheck: typeof isSnapshotFresh = isSnapshotFresh,
): Promise<ScopedSnapshotResolution> {
  const expectedProcessFilter = await buildSnapshotProcessFilter(dataScope, userId);
  const { data, error } = await repository.resolveReady(
    scope,
    buildSnapshotContainsFilter(expectedProcessFilter),
  );

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

    const ready = await fetchSnapshotArtifactMeta(snapshotId, repository);
    if (ready.ok) {
      const snapshotCreatedAt = String((row as { created_at?: unknown }).created_at ?? '');
      const freshness = await freshnessCheck(snapshotCreatedAt, processFilter);
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
  const relation =
    table === 'flows' ? supabaseClient.from('flows') : supabaseClient.from('lciamethods');
  let query = relation.select('modified_at').order('modified_at', { ascending: false }).limit(1);

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
  repository: LcaSnapshotCapabilityRepository = lcaSnapshotRepository,
): Promise<
  { ok: true; data: SnapshotArtifactMeta } | { ok: false; error: string; status: number }
> {
  const { data, error } = await repository.readArtifact(snapshotId);

  if (error) {
    console.error('read LCA snapshot artifact capability failed', {
      error: error.message,
      snapshot_id: snapshotId,
    });
    return { ok: false, error: 'snapshot_artifact_lookup_failed', status: 500 };
  }

  if (!data) {
    return { ok: false, error: 'snapshot_not_ready', status: 404 };
  }

  return {
    ok: true,
    data: {
      snapshot_id: String(data.snapshot_id),
      artifact_url: String(data.artifact_url),
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
