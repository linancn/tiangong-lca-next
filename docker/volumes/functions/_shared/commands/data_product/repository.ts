import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import {
  createLcaSnapshotCapabilityRepository,
  type LcaSnapshotCapabilityRepository,
} from '../../capabilities/lca_snapshot_family.ts';
import {
  createServiceWorkerCapabilityRepository,
  type ServiceWorkerCapabilityRepository,
} from '../../capabilities/worker_jobs.ts';
import type { ActorContext } from '../../command_runtime/actor_context.ts';
import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callDataProductPackagePreviewRpc,
  callDataProductPackageUnpublishRpc,
  callLciaResultBuildRequestRpc,
  callLciaResultPackagePublishRpc,
  callLciaScopeClosureCheckReadRpc,
  callLciaScopeClosureCheckRequestRpc,
  callLciaScopeClosureIssuesRpc,
  callLciaScopeClosureReportDownloadRpc,
  callTaskSummaryV2FeedRpc,
  type DataProductRpcResult,
} from '../../db_rpc/data_product_commands.ts';
import {
  createSupabaseServiceClient,
  type ServiceRoleSupabaseClient,
} from '../../supabase_client.ts';
import {
  enqueueCalculatorWorkerJob,
  type WorkerJobEnqueueOutcome,
} from '../../worker_jobs_cutover.ts';
import type {
  LciaResultPackageImpactMetadata,
  LciaResultPackageProcessMetadata,
} from './package_preview_projection.ts';
import type {
  DataProductBuildCreateRequest,
  DataProductClosureArtifactRole,
  DataProductClosureCheckCreateRequest,
  DataProductClosureCheckReadRequest,
  DataProductClosureIssuesRequest,
  DataProductClosureReportDownloadRequest,
  DataProductCommandFailure,
  DataProductPackageBuildRequest,
  DataProductPackagePreviewRequest,
  DataProductPackagePublishRequest,
  DataProductPackageUnpublishRequest,
  DataProductPublicationListRequest,
  DataProductTaskFeedRequest,
} from './types.ts';

type RpcClient = Pick<SupabaseClient, 'rpc'>;

const ARTIFACT_JSON_CACHE_TTL_MS = 5 * 60 * 1000;
const ARTIFACT_JSON_CACHE_MAX_ENTRIES = 16;
const CLOSURE_ARTIFACT_SIGNED_URL_MAX_SECONDS = 900;
const CLOSURE_ARTIFACT_SIGNING_SAFETY_SECONDS = 5;
const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const artifactJsonCache = new Map<string, { expiresAt: number; data: unknown }>();

type ClosureArtifactState = 'pending' | 'ready' | 'expired' | 'deleted' | 'failed';

type ClosureArtifactDownloadDescriptor = {
  artifactId: string;
  artifactRole: DataProductClosureArtifactRole;
  artifactState: ClosureArtifactState;
  filename: string;
  format: string;
  mediaType: string;
  size: number;
  checksumSha256: string;
  artifactExpiresAt: string;
  bucket: string;
  objectPath: string;
};

type ClosureArtifactAvailability = {
  artifactRole: DataProductClosureArtifactRole;
  artifactState: ClosureArtifactState;
  filename: string;
  format: string;
  mediaType: string;
  size: number | null;
  checksumSha256: string | null;
  artifactExpiresAt: string | null;
};

type DataProductCommandRepositoryOptions = {
  now?: () => number;
};

export type DataProductPreviewMetadataRequest = {
  processes: Array<{ processId: string; processVersion: string }>;
  impactCategoryIds: string[];
};

export type DataProductPreviewMetadataResult =
  | {
      ok: true;
      data: {
        processes: LciaResultPackageProcessMetadata[];
        impacts: LciaResultPackageImpactMetadata[];
        warnings?: Array<{ code: string; message: string; details?: unknown }>;
      };
    }
  | {
      ok: false;
      code: string;
      status: number;
      message: string;
      details?: unknown;
    };

export type DataProductCommandRepository = {
  createBuild: (
    request: DataProductBuildCreateRequest,
    audit: CommandAuditPayload,
  ) => Promise<DataProductRpcResult>;
  createClosureCheck: (
    request: DataProductClosureCheckCreateRequest,
    audit: CommandAuditPayload,
  ) => Promise<DataProductRpcResult>;
  getClosureCheck: (request: DataProductClosureCheckReadRequest) => Promise<DataProductRpcResult>;
  listClosureIssues: (request: DataProductClosureIssuesRequest) => Promise<DataProductRpcResult>;
  createClosureReportDownload: (
    request: DataProductClosureReportDownloadRequest,
  ) => Promise<DataProductRpcResult>;
  listTaskFeed: (request: DataProductTaskFeedRequest) => Promise<DataProductRpcResult>;
  enqueuePackageBuild: (
    request: DataProductPackageBuildRequest,
    actor: ActorContext,
  ) => Promise<WorkerJobEnqueueOutcome>;
  previewPackage: (request: DataProductPackagePreviewRequest) => Promise<DataProductRpcResult>;
  fetchSnapshotArtifactUrl: (snapshotId: string) => Promise<
    | { ok: true; data: { snapshotId: string; artifactUrl: string } }
    | {
        ok: false;
        code: string;
        status: number;
        message: string;
        details?: unknown;
      }
  >;
  fetchJsonArtifact: <T>(
    artifactUrl: string,
  ) => Promise<{ ok: true; data: T } | { ok: false; error: string }>;
  fetchPreviewMetadata: (
    request: DataProductPreviewMetadataRequest,
  ) => Promise<DataProductPreviewMetadataResult>;
  publishPackage: (
    request: DataProductPackagePublishRequest,
    audit: CommandAuditPayload,
  ) => Promise<DataProductRpcResult>;
  unpublishPublication: (
    request: DataProductPackageUnpublishRequest,
    audit: CommandAuditPayload,
  ) => Promise<DataProductRpcResult>;
  listPublications: (request: DataProductPublicationListRequest) => Promise<DataProductRpcResult>;
};

function requireExplicitActorClient(supabase: RpcClient | null | undefined): RpcClient {
  if (!supabase || typeof supabase.rpc !== 'function') {
    throw new Error('Data product command repository requires an explicit actor Supabase client');
  }

  return supabase;
}

export function createDataProductCommandRepository(
  actorSupabase: RpcClient,
  serviceSupabase: ServiceRoleSupabaseClient = createSupabaseServiceClient(),
  options: DataProductCommandRepositoryOptions = {},
): DataProductCommandRepository {
  const actorClient = requireExplicitActorClient(actorSupabase);
  const workerRepository = createServiceWorkerCapabilityRepository(serviceSupabase);
  const now = options.now ?? Date.now;

  return {
    createBuild: (request, audit) => callLciaResultBuildRequestRpc(actorClient, request, audit),
    createClosureCheck: (request, audit) =>
      callLciaScopeClosureCheckRequestRpc(actorClient, request, audit),
    getClosureCheck: async (request) => {
      const result = await callLciaScopeClosureCheckReadRpc(actorClient, request);
      if (!result.ok) {
        return result;
      }
      const projection = decodeClosureCheckProjection(result.data);
      return projection.ok
        ? { ok: true, data: projection.data }
        : {
            ok: false,
            code: 'closure_check_projection_invalid',
            status: 502,
            message: 'Closure check projection is invalid',
          };
    },
    listClosureIssues: (request) => callLciaScopeClosureIssuesRpc(actorClient, request),
    createClosureReportDownload: async (request) => {
      let artifact: DataProductRpcResult;
      try {
        artifact = await callLciaScopeClosureReportDownloadRpc(actorClient, request);
      } catch {
        return closureArtifactBackendFailure();
      }
      if (!artifact.ok) {
        return normalizeClosureArtifactDownloadFailure(artifact);
      }

      const descriptor = decodeClosureArtifactDownloadDescriptor(
        artifact.data,
        request.artifactRole,
      );
      if (!descriptor.ok) {
        return {
          ok: false,
          code: 'closure_report_descriptor_invalid',
          status: 502,
          message: 'Closure report descriptor is invalid',
        };
      }

      if (descriptor.data.artifactState === 'expired') {
        return closureArtifactExpired();
      }
      if (descriptor.data.artifactState !== 'ready') {
        return closureArtifactUnavailable();
      }

      const nowMs = now();
      const ttlSeconds = closureArtifactSignedUrlTtlSeconds(
        descriptor.data.artifactExpiresAt,
        nowMs,
      );
      if (ttlSeconds === null) {
        return closureArtifactExpired();
      }

      let signedUrl: string;
      try {
        const { data, error } = await serviceSupabase.storage
          .from(descriptor.data.bucket)
          .createSignedUrl(descriptor.data.objectPath, ttlSeconds, {
            download: descriptor.data.filename,
          });
        const candidateSignedUrl = strictString(data?.signedUrl);
        if (error || !candidateSignedUrl || !isValidSignedUrl(candidateSignedUrl)) {
          return closureArtifactSigningFailure();
        }
        signedUrl = candidateSignedUrl;
      } catch {
        return closureArtifactSigningFailure();
      }

      const signingCompletedAtMs = now();
      const signedUrlExpiresAtMs = signingCompletedAtMs + ttlSeconds * 1000;
      if (signedUrlExpiresAtMs > Date.parse(descriptor.data.artifactExpiresAt)) {
        return closureArtifactExpired();
      }
      const signedUrlExpiresAt = new Date(signedUrlExpiresAtMs).toISOString();
      return {
        ok: true,
        data: {
          artifactId: descriptor.data.artifactId,
          artifactRole: descriptor.data.artifactRole,
          artifactState: descriptor.data.artifactState,
          filename: descriptor.data.filename,
          format: descriptor.data.format,
          mediaType: descriptor.data.mediaType,
          size: descriptor.data.size,
          checksumSha256: descriptor.data.checksumSha256,
          artifactExpiresAt: descriptor.data.artifactExpiresAt,
          signedDownloadUrl: signedUrl,
          signedUrlExpiresAt,
          expiresInSeconds: ttlSeconds,
        },
      };
    },
    listTaskFeed: (request) => callTaskSummaryV2FeedRpc(actorClient, request),
    enqueuePackageBuild: (request, actor) =>
      enqueueCalculatorWorkerJob(serviceSupabase, {
        jobKind: request.workerJob.jobKind,
        payload: request.workerJob.payload,
        payloadSchemaVersion: request.workerJob.payloadSchemaVersion,
        subjectType: request.workerJob.subjectType,
        subjectId: request.workerJob.subjectId,
        subjectVersion: request.workerJob.subjectVersion ?? null,
        requestedBy: actor.userId,
        requesterType: request.workerJob.requesterType,
        idempotencyKey: request.idempotencyKey,
        requestHash: request.workerJob.requestHash ?? request.buildId,
        queueKey: request.workerJob.queueKey ?? request.buildId,
        visibility: request.workerJob.visibility ?? 'operator',
      }),
    previewPackage: (request) => callDataProductPackagePreviewRpc(actorClient, request),
    fetchSnapshotArtifactUrl: (snapshotId) =>
      fetchSnapshotArtifactUrl(createLcaSnapshotCapabilityRepository(serviceSupabase), snapshotId),
    fetchJsonArtifact: (artifactUrl) => fetchArtifactJson(serviceSupabase, artifactUrl),
    fetchPreviewMetadata: (request) => fetchPreviewMetadata(serviceSupabase, request),
    publishPackage: (request, audit) =>
      callLciaResultPackagePublishRpc(actorClient, request, audit),
    unpublishPublication: (request, audit) =>
      callDataProductPackageUnpublishRpc(actorClient, request, audit),
    listPublications: (request) =>
      listLciaResultPublications(serviceSupabase, workerRepository, request),
  };
}

function normalizeClosureArtifactDownloadFailure(
  failure: DataProductCommandFailure,
): DataProductCommandFailure {
  if (failure.code === 'closure_report_expired' && failure.status === 410) {
    return closureArtifactExpired();
  }
  if (
    (failure.code === 'closure_check_not_found' && failure.status === 404) ||
    (failure.code === 'closure_report_unavailable' && failure.status === 404) ||
    (failure.code === 'not_data_product_manager' && failure.status === 403)
  ) {
    return closureArtifactUnavailable();
  }
  return closureArtifactBackendFailure();
}

function closureArtifactExpired(): DataProductCommandFailure {
  return {
    ok: false,
    code: 'closure_report_expired',
    status: 410,
    message: 'Closure report has expired',
  };
}

function closureArtifactUnavailable(): DataProductCommandFailure {
  return {
    ok: false,
    code: 'closure_report_unavailable',
    status: 404,
    message: 'Closure report is not available',
  };
}

function closureArtifactBackendFailure(): DataProductCommandFailure {
  return {
    ok: false,
    code: 'closure_report_backend_failed',
    status: 502,
    message: 'Unable to resolve closure report download',
  };
}

function closureArtifactSigningFailure(): DataProductCommandFailure {
  return {
    ok: false,
    code: 'closure_report_sign_failed',
    status: 502,
    message: 'Unable to create closure report download',
  };
}

function decodeClosureCheckProjection(
  value: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false } {
  if (
    !isRecord(value) ||
    containsPrivateProjectionField(value) ||
    !Array.isArray(value.artifacts) ||
    value.artifacts.length !== 2
  ) {
    return { ok: false };
  }

  const expectedRoles: DataProductClosureArtifactRole[] = [
    'closure_report_xlsx',
    'closure_issue_manifest',
  ];
  const artifacts: ClosureArtifactAvailability[] = [];
  for (const [index, artifact] of value.artifacts.entries()) {
    const decoded = decodeClosureArtifactAvailability(artifact, expectedRoles[index]);
    if (!decoded) {
      return { ok: false };
    }
    artifacts.push(decoded);
  }

  const data: Record<string, unknown> = {};
  copyPresentFields(value, data, [
    'schemaVersion',
    'closureCheckId',
    'runStatus',
    'scanCompleteness',
    'certificateValidity',
    'requestedScopeHash',
    'effectiveScopeHash',
    'policyFingerprint',
    'dataSnapshotToken',
    'blockerCodes',
    'summary',
    'scanExecutionId',
    'reusedFromCheckId',
    'createdAt',
    'updatedAt',
    'finishedAt',
  ]);

  if ('workerJob' in value) {
    if (!isRecord(value.workerJob)) {
      return { ok: false };
    }
    const workerJob: Record<string, unknown> = {};
    copyPresentFields(value.workerJob, workerJob, [
      'jobId',
      'status',
      'phase',
      'progressFraction',
      'errorCode',
      'blockerCodes',
      'createdAt',
      'updatedAt',
      'finishedAt',
    ]);
    data.workerJob = workerJob;
  }
  data.artifacts = artifacts;

  return { ok: true, data };
}

function copyPresentFields(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  fields: string[],
): void {
  for (const field of fields) {
    if (field in source) {
      target[field] = source[field];
    }
  }
}

const PRIVATE_PROJECTION_FIELDS = new Set([
  'artifactid',
  'bucket',
  'objectpath',
  'storagebucket',
  'storagepath',
  'storageurl',
  'artifacturl',
  'signedurl',
  'signeddownloadurl',
  'service',
  'servicecredential',
  'servicecredentials',
  'servicerolekey',
  'credential',
  'credentials',
  'secret',
  'secretkey',
]);

function containsPrivateProjectionField(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsPrivateProjectionField);
  }
  if (!isRecord(value)) {
    return false;
  }
  return Object.entries(value).some(
    ([key, nestedValue]) =>
      PRIVATE_PROJECTION_FIELDS.has(key.toLowerCase().replaceAll(/[^a-z0-9]/g, '')) ||
      containsPrivateProjectionField(nestedValue),
  );
}

function decodeClosureArtifactAvailability(
  value: unknown,
  expectedRole: DataProductClosureArtifactRole,
): ClosureArtifactAvailability | null {
  if (!isRecord(value)) {
    return null;
  }
  const artifactRole = strictString(value.artifactRole);
  const artifactState = strictString(value.artifactState);
  if (artifactRole !== expectedRole || !artifactState || !isClosureArtifactState(artifactState)) {
    return null;
  }

  if (
    !hasExactKeys(value, [
      'artifactRole',
      'artifactState',
      'filename',
      'format',
      'mediaType',
      'size',
      'checksumSha256',
      'artifactExpiresAt',
    ])
  ) {
    return null;
  }

  const filename = strictString(value.filename);
  const format = strictString(value.format);
  const mediaType = strictString(value.mediaType);
  const checksumSha256 = value.checksumSha256 === null ? null : strictString(value.checksumSha256);
  const artifactExpiresAt =
    value.artifactExpiresAt === null ? null : strictString(value.artifactExpiresAt);
  const size =
    value.size === null
      ? null
      : typeof value.size === 'number' && Number.isSafeInteger(value.size) && value.size >= 0
        ? value.size
        : null;
  if (
    !filename ||
    !isSemanticDownloadFilename(filename) ||
    !format ||
    !mediaType ||
    (value.size !== null && size === null) ||
    (value.checksumSha256 !== null &&
      (!checksumSha256 || !SHA256_HEX_PATTERN.test(checksumSha256))) ||
    (value.artifactExpiresAt !== null &&
      (!artifactExpiresAt ||
        !RFC3339_PATTERN.test(artifactExpiresAt) ||
        !Number.isFinite(Date.parse(artifactExpiresAt)))) ||
    (artifactState === 'ready' &&
      (size === null || checksumSha256 === null || artifactExpiresAt === null)) ||
    !isAllowedClosureDownloadRole(artifactRole, format, mediaType)
  ) {
    return null;
  }

  return {
    artifactRole,
    artifactState,
    filename,
    format,
    mediaType,
    size,
    checksumSha256,
    artifactExpiresAt,
  };
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: string[]): boolean {
  const actualKeys = Object.keys(value).sort();
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys
      .slice()
      .sort()
      .every((key, index) => key === actualKeys[index])
  );
}

function decodeClosureArtifactDownloadDescriptor(
  value: unknown,
  expectedArtifactRole: DataProductClosureReportDownloadRequest['artifactRole'],
): { ok: true; data: ClosureArtifactDownloadDescriptor } | { ok: false; reason: string } {
  if (!isRecord(value)) {
    return { ok: false, reason: 'not_an_object' };
  }
  if (
    !hasExactKeys(value, [
      'artifactId',
      'artifactRole',
      'artifactState',
      'filename',
      'format',
      'mediaType',
      'size',
      'checksumSha256',
      'artifactExpiresAt',
      'bucket',
      'objectPath',
    ])
  ) {
    return { ok: false, reason: 'unexpected_fields' };
  }

  const artifactId = strictString(value.artifactId);
  const artifactRole = strictString(value.artifactRole);
  const artifactState = strictString(value.artifactState);
  const filename = strictString(value.filename);
  const format = strictString(value.format);
  const mediaType = strictString(value.mediaType);
  const checksumSha256 = strictString(value.checksumSha256);
  const artifactExpiresAt = strictString(value.artifactExpiresAt);
  const bucket = strictString(value.bucket);
  const objectPath = strictString(value.objectPath);
  const size =
    typeof value.size === 'number' && Number.isSafeInteger(value.size) && value.size >= 0
      ? value.size
      : null;

  if (
    !artifactId ||
    !UUID_PATTERN.test(artifactId) ||
    !artifactRole ||
    artifactRole !== expectedArtifactRole ||
    !artifactState ||
    !isClosureArtifactState(artifactState) ||
    !filename ||
    !isSemanticDownloadFilename(filename) ||
    !format ||
    !mediaType ||
    size === null ||
    !checksumSha256 ||
    !SHA256_HEX_PATTERN.test(checksumSha256) ||
    !artifactExpiresAt ||
    !RFC3339_PATTERN.test(artifactExpiresAt) ||
    !Number.isFinite(Date.parse(artifactExpiresAt)) ||
    !bucket ||
    !objectPath ||
    !isAllowedClosureDownloadRole(artifactRole, format, mediaType)
  ) {
    return { ok: false, reason: 'field_validation_failed' };
  }

  return {
    ok: true,
    data: {
      artifactId,
      artifactRole,
      artifactState,
      filename,
      format,
      mediaType,
      size,
      checksumSha256,
      artifactExpiresAt,
      bucket,
      objectPath,
    },
  };
}

function strictString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value === value.trim() ? value : null;
}

function isClosureArtifactState(value: string): value is ClosureArtifactState {
  return ['pending', 'ready', 'expired', 'deleted', 'failed'].includes(value);
}

function isSemanticDownloadFilename(value: string): boolean {
  return (
    value.length <= 255 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function isAllowedClosureDownloadRole(
  artifactRole: string,
  format: string,
  mediaType: string,
): boolean {
  if (artifactRole === 'closure_report_xlsx') {
    return (
      format === 'xlsx' &&
      mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
  if (artifactRole === 'closure_issue_manifest') {
    return (
      format === 'json' && mediaType === 'application/vnd.tiangong.scope-closure-manifest+json'
    );
  }
  return false;
}

function closureArtifactSignedUrlTtlSeconds(
  artifactExpiresAt: string,
  nowMs: number,
): number | null {
  const remainingSeconds = Math.floor((Date.parse(artifactExpiresAt) - nowMs) / 1000);
  const safeRemainingSeconds = remainingSeconds - CLOSURE_ARTIFACT_SIGNING_SAFETY_SECONDS;
  if (safeRemainingSeconds < 1) {
    return null;
  }
  return Math.min(CLOSURE_ARTIFACT_SIGNED_URL_MAX_SECONDS, safeRemainingSeconds);
}

function isValidSignedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function listLciaResultPublications(
  supabase: SupabaseClient,
  workerRepository: ServiceWorkerCapabilityRepository,
  request: DataProductPublicationListRequest,
): Promise<DataProductRpcResult> {
  const { data: publicationRows, error: publicationError } = await supabase
    .from('lcia_result_publications')
    .select(
      [
        'id',
        'package_id',
        'publication_series_key',
        'publication_channel',
        'visibility_scope',
        'is_current',
        'status',
        'display_default_impact_category',
        'published_at',
        'unpublished_at',
        'reason',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .order('is_current', { ascending: false })
    .order('published_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(request.limit ?? 50);

  if (publicationError) {
    return {
      ok: false,
      code: 'lcia_result_publications_lookup_failed',
      status: 500,
      message: 'Failed to read LCIA result publications',
      details: publicationError.message,
    };
  }

  const publications = ((publicationRows ?? []) as unknown[]).filter(isRecord);
  const packageIds = uniqueStrings(
    publications
      .map((publication) => stringValue(publication.package_id))
      .filter((value): value is string => Boolean(value)),
  );
  const { data: packageRows, error: packageError } =
    packageIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from('lcia_result_packages')
          .select(
            [
              'id',
              'build_worker_job_id',
              'package_version',
              'coverage_mode',
              'eligible_input_count',
              'included_input_count',
              'default_impact_category',
              'status',
              'created_at',
              'updated_at',
            ].join(','),
          )
          .in('id', packageIds);

  if (packageError) {
    return {
      ok: false,
      code: 'lcia_result_publication_packages_lookup_failed',
      status: 500,
      message: 'Failed to read LCIA result package metadata for publications',
      details: packageError.message,
    };
  }

  const packagesById = new Map<string, Record<string, unknown>>();
  for (const row of (packageRows ?? []) as unknown[]) {
    if (!isRecord(row)) {
      continue;
    }
    const packageId = stringValue(row.id);
    if (packageId) {
      packagesById.set(packageId, row);
    }
  }

  const workerJobIds = uniqueStrings(
    Array.from(packagesById.values())
      .map((row) => stringValue(row.build_worker_job_id))
      .filter((value): value is string => Boolean(value)),
  );
  const workerResult =
    workerJobIds.length === 0
      ? ({ ok: true, data: [] } as const)
      : await workerRepository.readManyInternal(workerJobIds);

  if (!workerResult.ok) {
    return {
      ok: false,
      code: 'lcia_result_publication_worker_jobs_lookup_failed',
      status: 500,
      message: 'Failed to read LCIA result package worker metadata',
      details: workerResult.message,
    };
  }

  const workerPayloadById = new Map<string, Record<string, unknown>>();
  for (const row of (Array.isArray(workerResult.data) ? workerResult.data : []) as unknown[]) {
    if (!isRecord(row)) {
      continue;
    }
    const workerJobId = stringValue(row.id);
    const payload = recordValue(row, 'payload') ?? recordValue(row, 'payload_json');
    if (workerJobId && payload) {
      workerPayloadById.set(workerJobId, payload);
    }
  }

  return {
    ok: true,
    data: publications.map((publication) => {
      const packageId = stringValue(publication.package_id);
      const packageRow = packageId ? packagesById.get(packageId) : undefined;
      const workerPayload = packageRow
        ? workerPayloadById.get(stringValue(packageRow.build_worker_job_id) ?? '')
        : undefined;
      const packageName = firstStringValue(
        workerPayload?.name,
        workerPayload?.packageName,
        workerPayload?.package_name,
      );
      return {
        publicationId: stringValue(publication.id),
        packageId,
        packageName,
        packageVersion: stringValue(packageRow?.package_version),
        status: stringValue(publication.status),
        isCurrent: Boolean(publication.is_current),
        publicationSeriesKey: stringValue(publication.publication_series_key),
        publicationChannel: stringValue(publication.publication_channel),
        visibilityScope: stringValue(publication.visibility_scope),
        displayDefaultImpactCategory: stringValue(publication.display_default_impact_category),
        publishedAt: stringValue(publication.published_at),
        unpublishedAt: stringValue(publication.unpublished_at),
        reason: stringValue(publication.reason),
        eligibleInputCount: numberValue(packageRow?.eligible_input_count),
        includedInputCount: numberValue(packageRow?.included_input_count),
        packageStatus: stringValue(packageRow?.status),
      };
    }),
  };
}

async function fetchSnapshotArtifactUrl(
  snapshotRepository: LcaSnapshotCapabilityRepository,
  snapshotId: string,
): Promise<
  | { ok: true; data: { snapshotId: string; artifactUrl: string } }
  | {
      ok: false;
      code: string;
      status: number;
      message: string;
      details?: unknown;
    }
> {
  const { data, error } = await snapshotRepository.readArtifact(snapshotId);

  if (error) {
    return {
      ok: false,
      code: 'snapshot_artifact_lookup_failed',
      status: 500,
      message: 'Failed to read snapshot artifact metadata',
      details: error.message,
    };
  }

  if (!data?.artifact_url) {
    return {
      ok: false,
      code: 'snapshot_not_ready',
      status: 404,
      message: 'Snapshot artifact is not ready',
    };
  }

  return {
    ok: true,
    data: {
      snapshotId: String(data.snapshot_id),
      artifactUrl: String(data.artifact_url),
    },
  };
}

async function fetchArtifactJson<T>(
  supabase: SupabaseClient,
  artifactUrl: string,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const cached = artifactJsonCache.get(artifactUrl);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return { ok: true, data: cached.data as T };
  }

  const storagePath = parseStoragePathFromArtifactUrl(artifactUrl);
  let storageError: string | null = null;
  if (storagePath) {
    const downloaded = await supabase.storage
      .from(storagePath.bucket)
      .download(storagePath.objectPath);
    if (!downloaded.error) {
      const parsed = parseArtifactJsonText<T>(await downloaded.data.text());
      if (parsed.ok) {
        rememberArtifactJson(artifactUrl, parsed.data);
      }
      return parsed;
    }
    storageError = `storage_download_failed:${downloaded.error.message}`;
  }

  const httpResult = await fetchJsonByHttp<T>(artifactUrl);
  if (httpResult.ok) {
    rememberArtifactJson(artifactUrl, httpResult.data);
  }
  if (!httpResult.ok && storageError) {
    return { ok: false, error: `${storageError};${httpResult.error}` };
  }
  return httpResult;
}

function rememberArtifactJson(artifactUrl: string, data: unknown): void {
  artifactJsonCache.set(artifactUrl, {
    data,
    expiresAt: Date.now() + ARTIFACT_JSON_CACHE_TTL_MS,
  });
  while (artifactJsonCache.size > ARTIFACT_JSON_CACHE_MAX_ENTRIES) {
    const firstKey = artifactJsonCache.keys().next().value;
    if (!firstKey) {
      break;
    }
    artifactJsonCache.delete(firstKey);
  }
}

async function fetchPreviewMetadata(
  supabase: SupabaseClient,
  request: DataProductPreviewMetadataRequest,
): Promise<DataProductPreviewMetadataResult> {
  const processRefs = uniqueProcessRefs(request.processes);
  const impactCategoryIds = uniqueStrings(request.impactCategoryIds);
  const warnings: Array<{ code: string; message: string; details?: unknown }> = [];

  const processesResult =
    processRefs.length === 0
      ? { ok: true as const, data: [] }
      : await fetchProcessMetadata(supabase, processRefs);
  if (!processesResult.ok) {
    warnings.push({
      code: processesResult.code,
      message: processesResult.message,
      details: processesResult.details,
    });
  }

  const impactsResult =
    impactCategoryIds.length === 0
      ? { ok: true as const, data: [] }
      : await fetchImpactMetadata(supabase, impactCategoryIds);
  if (!impactsResult.ok) {
    warnings.push({
      code: impactsResult.code,
      message: impactsResult.message,
      details: impactsResult.details,
    });
  }

  const processes = processesResult.ok ? processesResult.data : [];
  const impacts = impactsResult.ok ? impactsResult.data : [];

  if (warnings.length > 0 && processes.length === 0 && impacts.length === 0) {
    return {
      ok: false,
      code: warnings[0].code,
      status: 500,
      message: warnings[0].message,
      details: warnings,
    };
  }

  return {
    ok: true,
    data: {
      processes,
      impacts,
      ...(warnings.length > 0 ? { warnings } : {}),
    },
  };
}

async function fetchProcessMetadata(
  supabase: SupabaseClient,
  processRefs: Array<{ processId: string; processVersion: string }>,
): Promise<
  | { ok: true; data: LciaResultPackageProcessMetadata[] }
  | {
      ok: false;
      code: string;
      status: number;
      message: string;
      details?: unknown;
    }
> {
  const processIds = uniqueStrings(processRefs.map((process) => process.processId));
  const processVersions = uniqueStrings(processRefs.map((process) => process.processVersion));
  const wantedKeys = new Set(
    processRefs.map((process) => processLookupKey(process.processId, process.processVersion)),
  );
  const { data, error } = await supabase
    .from('processes')
    .select('id,version,json,json_ordered')
    .in('id', processIds)
    .in('version', processVersions);

  if (error) {
    return {
      ok: false,
      code: 'preview_process_metadata_lookup_failed',
      status: 500,
      message: 'Failed to read process metadata for package preview',
      details: error.message,
    };
  }

  return {
    ok: true,
    data: (data ?? [])
      .map((row) => {
        const record = (isRecord(row) ? row : {}) as Record<string, unknown>;
        const processId = stringValue(record.id);
        const processVersion = stringValue(record.version);
        if (
          !processId ||
          !processVersion ||
          !wantedKeys.has(processLookupKey(processId, processVersion))
        ) {
          return null;
        }
        const processName =
          processNameFromDocument(record.json_ordered ?? record.json) ?? processId;
        return { processId, processVersion, processName };
      })
      .filter((metadata): metadata is LciaResultPackageProcessMetadata => Boolean(metadata)),
  };
}

async function fetchImpactMetadata(
  supabase: SupabaseClient,
  impactCategoryIds: string[],
): Promise<
  | { ok: true; data: LciaResultPackageImpactMetadata[] }
  | {
      ok: false;
      code: string;
      status: number;
      message: string;
      details?: unknown;
    }
> {
  const { data, error } = await supabase
    .from('lciamethods')
    .select('id,version,json,json_ordered')
    .in('id', impactCategoryIds)
    .order('version', { ascending: false });

  if (error) {
    return {
      ok: false,
      code: 'preview_impact_metadata_lookup_failed',
      status: 500,
      message: 'Failed to read LCIA method metadata for package preview',
      details: error.message,
    };
  }

  const wantedIds = new Set(impactCategoryIds);
  const byId = new Map<string, LciaResultPackageImpactMetadata>();
  for (const row of data ?? []) {
    const record = (isRecord(row) ? row : {}) as Record<string, unknown>;
    const impactCategoryId = stringValue(record.id);
    if (!impactCategoryId || !wantedIds.has(impactCategoryId) || byId.has(impactCategoryId)) {
      continue;
    }
    const document = record.json_ordered ?? record.json;
    byId.set(impactCategoryId, {
      impactCategoryId,
      impactVersion: stringValue(record.version),
      impactName: impactNameFromDocument(document),
      unit: impactUnitFromDocument(document),
    });
  }

  return { ok: true, data: Array.from(byId.values()) };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function uniqueProcessRefs(
  values: Array<{ processId: string; processVersion: string }>,
): Array<{ processId: string; processVersion: string }> {
  const seen = new Set<string>();
  const refs: Array<{ processId: string; processVersion: string }> = [];
  for (const value of values) {
    if (!value.processId || !value.processVersion) {
      continue;
    }
    const key = processLookupKey(value.processId, value.processVersion);
    if (!seen.has(key)) {
      seen.add(key);
      refs.push(value);
    }
  }
  return refs;
}

function processLookupKey(processId: string, processVersion: string): string {
  return `${processId}@${processVersion}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function recordValue(value: unknown, field: string): Record<string, unknown> | null {
  if (!isRecord(value)) {
    return null;
  }
  const fieldValue = value[field];
  return isRecord(fieldValue) ? fieldValue : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function firstStringValue(...values: unknown[]): string | null {
  for (const value of values) {
    const text = stringValue(value);
    if (text) {
      return text;
    }
  }
  return null;
}

function numberValue(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function localizedText(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    for (const lang of ['zh', 'zh-cn', 'en']) {
      const localized = value.find(
        (item) => isRecord(item) && String(item['@xml:lang'] ?? '').toLowerCase() === lang,
      );
      const text = localizedText(localized);
      if (text) {
        return text;
      }
    }
    for (const item of value) {
      const text = localizedText(item);
      if (text) {
        return text;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['#text', 'text', 'value', '@value']) {
    const text = stringValue(value[key]);
    if (text) {
      return text;
    }
  }

  for (const key of [
    'baseName',
    'common:baseName',
    'shortName',
    'common:shortName',
    'name',
    'common:name',
    'description',
    'common:shortDescription',
  ]) {
    const text = localizedText(value[key]);
    if (text) {
      return text;
    }
  }

  return null;
}

function firstLocalizedText(...values: unknown[]): string | null {
  for (const value of values) {
    const text = localizedText(value);
    if (text) {
      return text;
    }
  }
  return null;
}

function processNameFromDocument(document: unknown): string | null {
  const processDataSet =
    recordValue(document, 'processDataSet') ?? recordValue(document, 'process_dataset');
  const processInformation =
    recordValue(processDataSet, 'processInformation') ??
    recordValue(processDataSet, 'process_information');
  const dataSetInformation =
    recordValue(processInformation, 'dataSetInformation') ??
    recordValue(processInformation, 'data_set_information');
  const name = recordValue(dataSetInformation, 'name');

  return firstLocalizedText(
    name?.baseName,
    name?.['common:baseName'],
    name,
    dataSetInformation?.name,
    dataSetInformation?.['common:name'],
    dataSetInformation?.description,
  );
}

function lciaMethodDataSetFromDocument(document: unknown): Record<string, unknown> | null {
  if (!isRecord(document)) {
    return null;
  }
  return (
    recordValue(document, 'LCIAMethodDataSet') ??
    recordValue(document, 'lciaMethodDataSet') ??
    recordValue(document, 'lcia_method_data_set') ??
    document
  );
}

function lciaMethodDataSetInformation(document: unknown): Record<string, unknown> | null {
  const dataSet = lciaMethodDataSetFromDocument(document);
  const methodInformation =
    recordValue(dataSet, 'LCIAMethodInformation') ??
    recordValue(dataSet, 'lciaMethodInformation') ??
    recordValue(dataSet, 'methodInformation') ??
    dataSet;
  return (
    recordValue(methodInformation, 'dataSetInformation') ??
    recordValue(methodInformation, 'data_set_information') ??
    recordValue(dataSet, 'dataSetInformation') ??
    recordValue(dataSet, 'data_set_information')
  );
}

function impactNameFromDocument(document: unknown): string | null {
  const dataSet = lciaMethodDataSetFromDocument(document);
  const dataSetInformation = lciaMethodDataSetInformation(document);
  return firstLocalizedText(
    dataSetInformation?.name,
    dataSetInformation?.description,
    dataSet?.name,
    dataSet?.description,
    isRecord(document) ? document.description : null,
  );
}

function impactUnitFromDocument(document: unknown): string | null {
  const dataSet = lciaMethodDataSetFromDocument(document);
  const dataSetInformation = lciaMethodDataSetInformation(document);
  const dataSetReferenceQuantity = recordValue(dataSet, 'referenceQuantity');
  const dataSetInformationReferenceQuantity = recordValue(dataSetInformation, 'referenceQuantity');
  const rootReferenceQuantity = isRecord(document)
    ? recordValue(document, 'referenceQuantity')
    : null;

  return firstLocalizedText(
    dataSetInformationReferenceQuantity?.['common:shortDescription'],
    dataSetInformationReferenceQuantity?.shortDescription,
    dataSetReferenceQuantity?.['common:shortDescription'],
    dataSetReferenceQuantity?.shortDescription,
    rootReferenceQuantity?.['common:shortDescription'],
    rootReferenceQuantity?.shortDescription,
  );
}

function parseStoragePathFromArtifactUrl(
  artifactUrl: string,
): { bucket: string; objectPath: string } | null {
  try {
    const url = new URL(artifactUrl);
    if (url.protocol === 's3:') {
      const objectPath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      return url.hostname && objectPath ? { bucket: url.hostname, objectPath } : null;
    }

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
    return bucket && objectPath ? { bucket, objectPath } : null;
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
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return { ok: false, error: `http_${response.status}` };
    }
    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'fetch_failed',
    };
  }
}

function parseArtifactJsonText<T>(
  text: string,
): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: JSON.parse(text) as T };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? `json_parse_failed:${error.message}` : 'json_parse_failed',
    };
  }
}
