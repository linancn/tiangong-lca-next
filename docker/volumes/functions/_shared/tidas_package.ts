import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { corsHeaders } from './cors.ts';
import { isWorkerJobsCutoverEnabled } from './worker_jobs_cutover.ts';

export const SUPPORTED_TIDAS_TABLES = [
  'contacts',
  'sources',
  'unitgroups',
  'flowproperties',
  'flows',
  'processes',
  'lifecyclemodels',
] as const;

export type SupportedTidasTable = (typeof SUPPORTED_TIDAS_TABLES)[number];

export const OPEN_DATA_STATE_CODE_START = 100;
export const OPEN_DATA_STATE_CODE_END = 199;
export const OPEN_DATA_STATE_CODES = Array.from(
  {
    length: OPEN_DATA_STATE_CODE_END - OPEN_DATA_STATE_CODE_START + 1,
  },
  (_, index) => OPEN_DATA_STATE_CODE_START + index,
) as readonly number[];

export type TidasPackageScope = 'current_user' | 'open_data' | 'current_user_and_open_data';
export type TidasPackageManifestScope = TidasPackageScope | 'selected_roots';
export type TidasPackageJobType = 'export_package' | 'import_package';
export type TidasPackageJobStatus =
  'queued' | 'running' | 'ready' | 'completed' | 'failed' | 'stale';
export type TidasPackageArtifactKind =
  'import_source' | 'export_zip' | 'export_report' | 'import_report';

export type TidasPackageRoot = {
  table: SupportedTidasTable;
  id: string;
  version: string;
};

type JsonRecord = Record<string, unknown>;

type NormalizedExportRequest = {
  scope: TidasPackageManifestScope;
  roots: TidasPackageRoot[];
  request_payload: {
    version: string;
    operation: 'export_package';
    scope: TidasPackageManifestScope;
    roots: TidasPackageRoot[];
  };
};

type ExportRequestCacheRow = {
  id: string;
  status: string;
  job_id: string | null;
  worker_job_id?: string | null;
  export_artifact_id: string | null;
  report_artifact_id: string | null;
  hit_count: number;
};

type ExportRequestCacheLookupRow = ExportRequestCacheRow & {
  request_key: string | null;
  error_code: string | null;
  error_message: string | null;
  last_accessed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ExportCacheAction = 'cache_hit' | 'in_progress' | 'retry';

type PackageArtifactResponse = {
  artifact_id: string;
  artifact_kind: TidasPackageArtifactKind;
  status: string;
  artifact_format: string;
  content_type: string;
  artifact_sha256: string | null;
  artifact_byte_size: number | null;
  artifact_url: string;
  storage_bucket: string | null;
  storage_object_path: string | null;
  signed_download_url: string | null;
  signed_download_expires_in_seconds: number | null;
  download_status: PackageArtifactDownloadStatus;
  download_error_code: string | null;
  download_error_message: string | null;
  metadata: JsonRecord;
  expires_at: string | null;
  is_pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
};

export type PackageArtifactDownloadStatus =
  | 'available'
  | 'not_ready'
  | 'expired'
  | 'deleted'
  | 'object_missing'
  | 'storage_path_invalid'
  | 'signed_url_failed';

type PackageArtifactDownloadState = {
  status: PackageArtifactDownloadStatus;
  code: string | null;
  message: string | null;
};

type PackageRequestCacheResponse = {
  id: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  hit_count: number;
  last_accessed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  export_artifact_id: string | null;
  report_artifact_id: string | null;
};

export type PackageJobDiagnosticsSummary = {
  error_code: string | null;
  message: string | null;
  stage: string | null;
  upload_mode: string | null;
  artifact_byte_size: number | null;
  http_status: number | null;
  storage_error_code: string | null;
  is_oversize: boolean;
  source: 'diagnostics' | 'request_cache' | 'derived' | 'none';
};

type PackageJobRow = {
  id: string;
  job_type: TidasPackageJobType;
  status: TidasPackageJobStatus;
  scope: string | null;
  root_count: number;
  request_key: string | null;
  payload: unknown;
  diagnostics: unknown;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
};

type WorkerPackageJobRow = {
  id: string;
  job_kind: string;
  status: string;
  requested_by: string | null;
  request_hash: string | null;
  payload: JsonRecord;
  diagnostics: unknown;
  error_code: string | null;
  error_message: string | null;
  created_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
};

type PackageArtifactRow = {
  id: string;
  worker_job_id: string | null;
  artifact_kind: TidasPackageArtifactKind;
  status: string;
  artifact_url: string;
  artifact_sha256: string | null;
  artifact_byte_size: number | null;
  artifact_format: string;
  content_type: string;
  metadata: JsonRecord;
  expires_at: string | null;
  is_pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type RootAccessRow = {
  id: string;
  version: string;
  state_code: number | null;
  user_id: string | null;
};

type NormalizedPrepareImportUploadRequest = {
  filename?: string;
  byte_size?: number;
  content_type?: string;
};

type NormalizedEnqueueImportRequest = {
  job_id: string;
  source_artifact_id: string;
  artifact_sha256: string | null;
  artifact_byte_size: number;
  filename: string;
  content_type: string;
};

const SYSTEM_TEAM_ID = '00000000-0000-0000-0000-000000000000';
const PACKAGE_REQUEST_VERSION = 'tidas_package_v3';
const PACKAGE_ZIP_ARTIFACT_FORMAT = 'tidas-package-zip:v1';
const IMPORT_SOURCE_FILENAME = 'import-source.zip';
const DEFAULT_STORAGE_BUCKET = 'lca_results';
const DEFAULT_STORAGE_PREFIX = 'lca-results';
const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class TidasPackageError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TidasPackageError';
    this.status = status;
    this.code = code;
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function normalizeVersionString(value: unknown): string {
  const raw = normalizeString(value);
  if (!raw) {
    return '';
  }

  const parts = raw.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^\d+$/.test(part))) {
    return raw;
  }

  return parts.map((part, index) => part.padStart(index === 2 ? 3 : 2, '0')).join('.');
}

export function normalizeExportRequestBody(body: unknown): NormalizedExportRequest {
  const record = asRecord(body);
  const roots = dedupeRoots(
    Array.isArray(record.roots) ? record.roots.map(normalizeRoot).filter(isNonNullable) : [],
  );
  const scope = roots.length > 0 ? 'selected_roots' : normalizeScope(record.scope);

  return {
    scope,
    roots,
    request_payload: {
      version: PACKAGE_REQUEST_VERSION,
      operation: 'export_package',
      scope,
      roots,
    },
  };
}

export function buildImportSourceObjectPath(jobId: string): string {
  const prefix = resolveStoragePrefix();
  const key = `packages/jobs/${jobId}/${IMPORT_SOURCE_FILENAME}`;
  return prefix ? `${prefix}/${key}` : key;
}

export function buildStorageObjectUrl(bucket: string, objectPath: string): string {
  const baseUrl = resolveStorageBaseUrl();
  const normalizedBucket = bucket.trim();
  const normalizedPath = objectPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `${baseUrl}/${encodeURIComponent(normalizedBucket)}/${normalizedPath}`;
}

export function parseStoragePathFromArtifactUrl(
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

export async function queueExportTidasPackage(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
  req: Request,
) {
  const normalized = normalizeExportRequestBody(body);
  const requestKey = await sha256Hex(JSON.stringify(normalized.request_payload));
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const idempotencyKey = idempotencyHeader
    ? `${userId}:export_package:${idempotencyHeader}`
    : `${userId}:export_package:${requestKey}`;
  const newJobId = crypto.randomUUID();

  if (!isWorkerJobsCutoverEnabled('TIDAS_PACKAGE_WORKER_JOBS_ENABLED')) {
    console.error('legacy package queue fallback is disabled before export job insert', {
      idempotency_key: idempotencyKey,
      request_key: requestKey,
      user_id: userId,
    });
    throw new TidasPackageError(
      503,
      'LEGACY_QUEUE_DISABLED',
      'Package worker_jobs cutover must be enabled',
    );
  }

  const { data, error } = await supabase.rpc('svc_tidas_package_export_enqueue', {
    p_requested_by: userId,
    p_scope: normalized.scope,
    p_roots: normalized.roots,
    p_request_key: requestKey,
    p_request_payload: normalized.request_payload,
    p_job_id: newJobId,
    p_idempotency_key: idempotencyKey,
  });
  const result = requireCapabilityEnvelope(data, error, 'PACKAGE_EXPORT_ENQUEUE_FAILED');

  return {
    ok: true,
    mode: normalizeString(result.mode) || 'queued',
    job_id: normalizeString(result.job_id) || newJobId,
    ...(normalizeNullableString(result.worker_job_id)
      ? { worker_job_id: normalizeString(result.worker_job_id) }
      : {}),
    scope: normalized.scope,
    root_count: normalized.roots.length,
  };
}

export async function prepareImportTidasPackageUpload(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
  req: Request,
) {
  const parsed = parsePrepareImportRequest(body);
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const idempotencyKey = idempotencyHeader ? `${userId}:import_prepare:${idempotencyHeader}` : null;
  const requestedJobId = crypto.randomUUID();
  const requestedSourceArtifactId = crypto.randomUUID();
  const requestedObjectPath = buildImportSourceObjectPath(requestedJobId);
  const requestedArtifactUrl = buildStorageObjectUrl(resolveStorageBucket(), requestedObjectPath);
  const { data, error } = await supabase.rpc('svc_tidas_package_import_prepare', {
    p_requested_by: userId,
    p_job_id: requestedJobId,
    p_source_artifact_id: requestedSourceArtifactId,
    p_artifact_url: requestedArtifactUrl,
    p_content_type: parsed.content_type,
    p_filename: parsed.filename,
    p_idempotency_key: idempotencyKey,
  });
  const result = requireCapabilityEnvelope(data, error, 'IMPORT_PREPARE_FAILED');
  const jobId = normalizeString(result.job_id) || requestedJobId;
  const sourceArtifactId = normalizeString(result.source_artifact_id) || requestedSourceArtifactId;
  const artifactUrl = normalizeString(result.artifact_url) || requestedArtifactUrl;
  const storagePath = parseStoragePathFromArtifactUrl(artifactUrl);
  if (!storagePath) {
    throw new TidasPackageError(
      500,
      'IMPORT_ARTIFACT_STORAGE_PATH_INVALID',
      'Prepared import artifact has an invalid storage path',
    );
  }

  const signedUpload = await createSignedUpload(supabase, storagePath.objectPath);

  return {
    ok: true,
    action: 'prepare_upload' as const,
    job_id: jobId,
    source_artifact_id: sourceArtifactId,
    artifact_url: artifactUrl,
    upload: {
      bucket: storagePath.bucket,
      object_path: storagePath.objectPath,
      token: signedUpload.token,
      path: signedUpload.path,
      signed_url: signedUpload.signed_url,
      expires_in_seconds: SIGNED_URL_EXPIRES_IN_SECONDS,
      filename: parsed.filename,
      byte_size: parsed.byte_size,
      content_type: parsed.content_type,
    },
  };
}

export async function enqueueImportTidasPackage(
  supabase: SupabaseClient,
  userId: string,
  body: unknown,
) {
  const parsed = parseEnqueueImportRequest(body);
  if (!isWorkerJobsCutoverEnabled('TIDAS_PACKAGE_WORKER_JOBS_ENABLED')) {
    console.error('legacy package queue fallback is disabled before import job enqueue', {
      job_id: parsed.job_id,
      source_artifact_id: parsed.source_artifact_id,
      user_id: userId,
    });
    throw new TidasPackageError(
      503,
      'LEGACY_QUEUE_DISABLED',
      'Package worker_jobs cutover must be enabled',
    );
  }

  const { data, error } = await supabase.rpc('svc_tidas_package_import_enqueue', {
    p_requested_by: userId,
    p_job_id: parsed.job_id,
    p_source_artifact_id: parsed.source_artifact_id,
    p_artifact_sha256: parsed.artifact_sha256,
    p_artifact_byte_size: parsed.artifact_byte_size,
    p_filename: parsed.filename,
    p_content_type: parsed.content_type,
  });
  const result = requireCapabilityEnvelope(data, error, 'IMPORT_ENQUEUE_FAILED');
  const workerJobId = normalizeNullableString(result.worker_job_id);

  return {
    ok: true,
    mode: normalizeString(result.mode) || 'queued',
    job_id: normalizeString(result.job_id) || parsed.job_id,
    ...(workerJobId ? { worker_job_id: workerJobId } : {}),
    source_artifact_id: normalizeString(result.source_artifact_id) || parsed.source_artifact_id,
  };
}

export async function lookupTidasPackageJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
) {
  if (!UUID_RE.test(jobId)) {
    throw new TidasPackageError(400, 'INVALID_JOB_ID', 'Invalid job identifier');
  }

  const { data, error } = await supabase.rpc('svc_tidas_package_read', {
    p_requested_by: userId,
    p_lookup_id: jobId,
  });
  const envelope = requireCapabilityEnvelope(data, error, 'PACKAGE_JOB_LOOKUP_FAILED');
  const capabilityData = envelope.data;
  if (!isJsonRecord(capabilityData)) {
    throw new TidasPackageError(404, 'JOB_NOT_FOUND', 'Package job not found');
  }
  const effectiveJobId = normalizeString(capabilityData.jobId) || jobId;
  const artifactRows = Array.isArray(capabilityData.artifacts)
    ? capabilityData.artifacts.filter(isJsonRecord).map(packageArtifactCapabilityToRow)
    : [];
  const payload = isJsonRecord(capabilityData.payload)
    ? capabilityData.payload
    : {
        type: capabilityData.operation === 'import_package' ? 'import_package' : 'export_package',
        job_id: effectiveJobId,
      };
  const capabilityDiagnostics = isJsonRecord(capabilityData.diagnostics)
    ? capabilityData.diagnostics
    : {};
  const importSource = artifactRows.find((artifact) => artifact.artifact_kind === 'import_source');
  const importSourceMetadata = isJsonRecord(importSource?.metadata) ? importSource.metadata : {};
  const diagnostics =
    Object.keys(capabilityDiagnostics).length > 0
      ? capabilityDiagnostics
      : {
          phase: importSourceMetadata.phase ?? importSourceMetadata.upload_state ?? 'prepared',
          worker_job_id: normalizeNullableString(capabilityData.workerJobId),
        };
  const job: PackageJobRow = {
    id: effectiveJobId,
    job_type: packageJobTypeFromPayload(payload),
    status: workerStatusToPackageStatus(normalizeString(capabilityData.status)),
    scope: normalizeNullableString(capabilityData.scope),
    root_count: Number(capabilityData.rootCount ?? 0),
    request_key: normalizeNullableString(capabilityData.requestKey),
    payload,
    diagnostics,
    created_at: normalizeNullableString(capabilityData.createdAt),
    started_at: normalizeNullableString(capabilityData.startedAt),
    finished_at: normalizeNullableString(capabilityData.finishedAt),
    updated_at: normalizeNullableString(capabilityData.updatedAt),
  };

  const artifacts = await Promise.all(artifactRows.map((row) => toArtifactResponse(supabase, row)));

  const artifactsByKind = Object.fromEntries(
    artifacts.map((artifact) => [artifact.artifact_kind, artifact]),
  );

  const requestCache: PackageRequestCacheResponse | null = isJsonRecord(capabilityData.requestCache)
    ? {
        id: normalizeString(capabilityData.requestCache.id),
        status: normalizeString(capabilityData.requestCache.status),
        error_code: normalizeNullableString(capabilityData.requestCache.error_code),
        error_message: normalizeNullableString(capabilityData.requestCache.error_message),
        hit_count: Number(capabilityData.requestCache.hit_count ?? 0),
        last_accessed_at: normalizeNullableString(capabilityData.requestCache.last_accessed_at),
        created_at: normalizeNullableString(capabilityData.requestCache.created_at),
        updated_at: normalizeNullableString(capabilityData.requestCache.updated_at),
        export_artifact_id: normalizeNullableString(capabilityData.requestCache.export_artifact_id),
        report_artifact_id: normalizeNullableString(capabilityData.requestCache.report_artifact_id),
      }
    : null;
  const diagnosticsSummary = buildPackageJobDiagnosticsSummary({
    status: job.status,
    diagnostics: job.diagnostics,
    artifactsByKind,
    requestCache,
  });

  return {
    ok: true,
    job_id: job.id,
    job_type: job.job_type,
    status: job.status,
    scope: job.scope,
    root_count: job.root_count,
    request_key: job.request_key,
    timestamps: {
      created_at: job.created_at,
      started_at: job.started_at,
      finished_at: job.finished_at,
      updated_at: job.updated_at,
    },
    payload: job.payload,
    diagnostics: job.diagnostics,
    diagnostics_summary: diagnosticsSummary,
    artifacts,
    artifacts_by_kind: artifactsByKind,
    request_cache: requestCache,
  };
}

function requireCapabilityEnvelope(
  data: unknown,
  error: { code?: string; message?: string } | null,
  fallbackCode: string,
): JsonRecord {
  if (error) {
    throw new TidasPackageError(500, error.code || fallbackCode, error.message || fallbackCode);
  }
  const envelope = asRecord(data);
  if (envelope.ok !== true) {
    throw new TidasPackageError(
      Number(envelope.status ?? 500),
      normalizeString(envelope.code) || fallbackCode,
      normalizeString(envelope.message) || normalizeString(envelope.code) || fallbackCode,
    );
  }
  return envelope;
}

function packageArtifactCapabilityToRow(artifact: JsonRecord): JsonRecord {
  return {
    id: artifact.id,
    worker_job_id: artifact.workerJobId,
    artifact_kind: artifact.artifactKind,
    status: artifact.status,
    artifact_url: artifact.artifactUrl,
    artifact_sha256: artifact.artifactSha256,
    artifact_byte_size: artifact.artifactByteSize,
    artifact_format: artifact.artifactFormat,
    content_type: artifact.contentType,
    metadata: artifact.metadata,
    expires_at: artifact.expiresAt,
    is_pinned: artifact.isPinned,
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  };
}

function packageJobTypeFromPayload(payload: JsonRecord): TidasPackageJobType {
  return payload.type === 'export_package' ? 'export_package' : 'import_package';
}

function workerStatusToPackageStatus(status: string): TidasPackageJobStatus {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'queued':
    case 'waiting':
    case 'blocked':
      return 'queued';
    case 'running':
      return 'running';
    case 'ready':
      return 'ready';
    default:
      return 'stale';
  }
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? (value as JsonRecord) : {};
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNullableString(value: unknown): string | null {
  const normalized = normalizeString(value);
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value: unknown): number | null {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeErrorCode(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[\s-]+/g, '_');
}

function looksLikeOversizeError(value: string | null): boolean {
  if (!value) {
    return false;
  }

  const lowered = value.toLowerCase();
  return (
    lowered.includes('artifact_too_large') ||
    lowered.includes('entitytoolarge') ||
    lowered.includes('payload too large') ||
    lowered.includes('oversize') ||
    lowered.includes('too large') ||
    lowered.includes('upload size limit')
  );
}

export function buildPackageJobDiagnosticsSummary(args: {
  status: TidasPackageJobStatus;
  diagnostics: unknown;
  artifactsByKind: Record<string, PackageArtifactResponse>;
  requestCache: PackageRequestCacheResponse | null;
}): PackageJobDiagnosticsSummary {
  const diagnostics = asRecord(args.diagnostics);
  const exportArtifact = asRecord(args.artifactsByKind.export_zip);
  const requestErrorCode = normalizeNullableString(args.requestCache?.error_code);
  const requestErrorMessage = normalizeNullableString(args.requestCache?.error_message);
  const diagnosticsErrorCode = normalizeNullableString(diagnostics.error_code);
  const storageErrorCode = normalizeNullableString(diagnostics.storage_error_code);
  const rawMessage =
    normalizeNullableString(diagnostics.message) ??
    normalizeNullableString(diagnostics.error) ??
    requestErrorMessage;
  const normalizedErrorCode =
    looksLikeOversizeError(diagnosticsErrorCode) ||
    looksLikeOversizeError(storageErrorCode) ||
    looksLikeOversizeError(rawMessage) ||
    looksLikeOversizeError(requestErrorCode)
      ? 'artifact_too_large'
      : (normalizeErrorCode(diagnosticsErrorCode) ?? normalizeErrorCode(requestErrorCode));
  const artifactByteSize =
    normalizeNullableNumber(diagnostics.artifact_byte_size) ??
    normalizeNullableNumber(exportArtifact.artifact_byte_size);
  const stage = normalizeNullableString(diagnostics.stage ?? diagnostics.phase);
  const uploadMode = normalizeNullableString(diagnostics.upload_mode);
  const httpStatus = normalizeNullableNumber(diagnostics.http_status);
  const isOversize = normalizedErrorCode === 'artifact_too_large';
  const message =
    normalizeNullableString(diagnostics.message) ??
    (isOversize
      ? 'The export package exceeded the object storage upload size limit.'
      : (requestErrorMessage ?? normalizeNullableString(diagnostics.error)));

  let source: PackageJobDiagnosticsSummary['source'] = 'none';
  if (diagnosticsErrorCode || diagnostics.message || diagnostics.error) {
    source = 'diagnostics';
  } else if (requestErrorCode || requestErrorMessage) {
    source = 'request_cache';
  } else if (args.status === 'failed' && (normalizedErrorCode || message)) {
    source = 'derived';
  }

  return {
    error_code: normalizedErrorCode,
    message,
    stage,
    upload_mode: uploadMode,
    artifact_byte_size: artifactByteSize,
    http_status: httpStatus,
    storage_error_code: storageErrorCode,
    is_oversize: isOversize,
    source,
  };
}

function normalizeScope(value: unknown): TidasPackageScope {
  if (value === 'open_data' || value === 'current_user_and_open_data' || value === 'current_user') {
    return value;
  }
  return 'current_user';
}

function isSupportedTable(value: unknown): value is SupportedTidasTable {
  return typeof value === 'string' && SUPPORTED_TIDAS_TABLES.includes(value as SupportedTidasTable);
}

function normalizeRoot(value: unknown): TidasPackageRoot | null {
  const record = asRecord(value);
  const table = record.table;
  const id = normalizeString(record.id);
  const version = normalizeVersionString(record.version);

  if (!isSupportedTable(table) || !UUID_RE.test(id) || !version) {
    return null;
  }

  return {
    table,
    id,
    version,
  };
}

function dedupeRoots(roots: TidasPackageRoot[]): TidasPackageRoot[] {
  const unique = new Map<string, TidasPackageRoot>();
  for (const root of roots) {
    unique.set(rootKey(root), root);
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.table !== right.table) {
      return left.table.localeCompare(right.table);
    }
    if (left.id !== right.id) {
      return left.id.localeCompare(right.id);
    }
    return left.version.localeCompare(right.version);
  });
}

function rootKey(root: TidasPackageRoot): string {
  return `${root.table}:${root.id}:${root.version}`;
}

export function resolveExportCacheAction(
  cacheRow: ExportRequestCacheRow,
  jobRow: { status: string } | null,
): ExportCacheAction {
  if (!cacheRow.job_id || !jobRow) {
    return 'retry';
  }

  if (jobRow.status === 'queued' || jobRow.status === 'running') {
    return 'in_progress';
  }

  return 'retry';
}

function parsePrepareImportRequest(body: unknown): Required<NormalizedPrepareImportUploadRequest> {
  const record = asRecord(body);
  const filename = sanitizeFilename(normalizeString(record.filename) || IMPORT_SOURCE_FILENAME);
  const byteSize = Number(record.byte_size ?? 0);
  const normalizedByteSize = Number.isFinite(byteSize) && byteSize >= 0 ? byteSize : 0;
  const contentType =
    normalizeString(record.content_type) ||
    (filename.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream');

  return {
    filename,
    byte_size: normalizedByteSize,
    content_type: contentType,
  };
}

function parseEnqueueImportRequest(body: unknown): NormalizedEnqueueImportRequest {
  const record = asRecord(body);
  const jobId = normalizeString(record.job_id);
  const sourceArtifactId = normalizeString(record.source_artifact_id);
  const artifactSha256 = normalizeNullableString(record.artifact_sha256);
  const artifactByteSize = Number(record.artifact_byte_size ?? 0);
  const normalizedArtifactByteSize =
    Number.isFinite(artifactByteSize) && artifactByteSize >= 0 ? artifactByteSize : 0;
  const filename = sanitizeFilename(normalizeString(record.filename) || IMPORT_SOURCE_FILENAME);
  const contentType =
    normalizeString(record.content_type) ||
    (filename.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream');

  if (!UUID_RE.test(jobId)) {
    throw new TidasPackageError(400, 'INVALID_JOB_ID', 'Invalid import job identifier');
  }
  if (!UUID_RE.test(sourceArtifactId)) {
    throw new TidasPackageError(
      400,
      'INVALID_SOURCE_ARTIFACT_ID',
      'Invalid import source artifact identifier',
    );
  }
  if (artifactSha256 && !/^[0-9a-f]{64}$/i.test(artifactSha256)) {
    throw new TidasPackageError(400, 'INVALID_ARTIFACT_SHA256', 'Invalid SHA-256 checksum');
  }

  return {
    job_id: jobId,
    source_artifact_id: sourceArtifactId,
    artifact_sha256: artifactSha256,
    artifact_byte_size: normalizedArtifactByteSize,
    filename,
    content_type: contentType,
  };
}

function toPackageArtifactRow(data: Record<string, unknown>): PackageArtifactRow {
  return {
    id: String(data.id),
    worker_job_id: data.worker_job_id ? String(data.worker_job_id) : null,
    artifact_kind: String(data.artifact_kind) as TidasPackageArtifactKind,
    status: String(data.status),
    artifact_url: String(data.artifact_url),
    artifact_sha256: data.artifact_sha256 ? String(data.artifact_sha256) : null,
    artifact_byte_size:
      data.artifact_byte_size === null || data.artifact_byte_size === undefined
        ? null
        : Number(data.artifact_byte_size),
    artifact_format: String(data.artifact_format),
    content_type: String(data.content_type),
    metadata: isJsonRecord(data.metadata) ? data.metadata : {},
    expires_at: data.expires_at ? String(data.expires_at) : null,
    is_pinned: Boolean(data.is_pinned),
    created_at: data.created_at ? String(data.created_at) : null,
    updated_at: data.updated_at ? String(data.updated_at) : null,
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isNonNullable<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

async function toArtifactResponse(supabase: SupabaseClient, row: Record<string, unknown>) {
  const artifact = toPackageArtifactRow(row);
  const storagePath = parseStoragePathFromArtifactUrl(artifact.artifact_url);
  let signedDownloadUrl: string | null = null;
  let downloadState: PackageArtifactDownloadState = getPackageArtifactDownloadUnavailableState(
    artifact,
    {
      hasStoragePath: storagePath !== null,
    },
  ) ?? {
    status: 'available',
    code: null,
    message: null,
  };

  if (downloadState.status === 'available' && storagePath) {
    const { data, error } = await supabase.storage
      .from(storagePath.bucket)
      .createSignedUrl(storagePath.objectPath, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (error) {
      console.error('create signed artifact url failed', {
        error: error.message,
        artifact_id: artifact.id,
        artifact_url: artifact.artifact_url,
      });
      downloadState = classifySignedUrlError(error);
    } else {
      signedDownloadUrl = data?.signedUrl ?? null;
      if (!signedDownloadUrl) {
        downloadState = {
          status: 'signed_url_failed',
          code: 'PACKAGE_ARTIFACT_SIGNED_URL_FAILED',
          message: 'Package artifact signed download URL could not be created',
        };
      }
    }
  }

  return {
    artifact_id: artifact.id,
    artifact_kind: artifact.artifact_kind,
    status: artifact.status,
    artifact_format: artifact.artifact_format,
    content_type: artifact.content_type,
    artifact_sha256: artifact.artifact_sha256,
    artifact_byte_size: artifact.artifact_byte_size,
    artifact_url: artifact.artifact_url,
    storage_bucket: storagePath?.bucket ?? null,
    storage_object_path: storagePath?.objectPath ?? null,
    signed_download_url: signedDownloadUrl,
    signed_download_expires_in_seconds: signedDownloadUrl ? SIGNED_URL_EXPIRES_IN_SECONDS : null,
    download_status: downloadState.status,
    download_error_code: downloadState.code,
    download_error_message: downloadState.message,
    metadata: artifact.metadata,
    expires_at: artifact.expires_at,
    is_pinned: artifact.is_pinned,
    created_at: artifact.created_at,
    updated_at: artifact.updated_at,
  };
}

function getPackageArtifactDownloadUnavailableState(
  artifact: PackageArtifactRow,
  options: { hasStoragePath: boolean },
): PackageArtifactDownloadState | null {
  if (artifact.status === 'deleted') {
    return {
      status: 'deleted',
      code: 'PACKAGE_ARTIFACT_DELETED',
      message: 'Package artifact payload has been deleted; create a new package job',
    };
  }

  if (artifact.status === 'ready' && isPackageArtifactExpired(artifact)) {
    return {
      status: 'expired',
      code: 'PACKAGE_ARTIFACT_EXPIRED',
      message: 'Package artifact has expired; create a new package job',
    };
  }

  if (artifact.status !== 'ready') {
    return {
      status: 'not_ready',
      code: artifact.status === 'stale' ? 'PACKAGE_ARTIFACT_STALE' : 'PACKAGE_ARTIFACT_NOT_READY',
      message:
        artifact.status === 'stale'
          ? 'Package artifact is stale; create a new package job'
          : 'Package artifact is not ready for download',
    };
  }

  if (!options.hasStoragePath) {
    return {
      status: 'storage_path_invalid',
      code: 'PACKAGE_ARTIFACT_STORAGE_PATH_INVALID',
      message: 'Package artifact storage path is invalid',
    };
  }

  return null;
}

function isPackageArtifactExpired(artifact: PackageArtifactRow): boolean {
  if (artifact.is_pinned || !artifact.expires_at) {
    return false;
  }

  const expiresAtMs = Date.parse(artifact.expires_at);
  return Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
}

function classifySignedUrlError(error: unknown): PackageArtifactDownloadState {
  const record = asRecord(error);
  const message = normalizeNullableString(record.message) ?? 'Package artifact is unavailable';
  const code = normalizeNullableString(record.code);
  const statusCode = normalizeNullableString(record.statusCode ?? record.status);
  const searchable = `${code ?? ''} ${statusCode ?? ''} ${message}`.toLowerCase();

  if (
    statusCode === '404' ||
    searchable.includes('nosuchkey') ||
    searchable.includes('no such key') ||
    searchable.includes('not found')
  ) {
    return {
      status: 'object_missing',
      code: 'PACKAGE_ARTIFACT_OBJECT_MISSING',
      message: 'Package artifact object is missing; create a new package job',
    };
  }

  return {
    status: 'signed_url_failed',
    code: 'PACKAGE_ARTIFACT_SIGNED_URL_FAILED',
    message,
  };
}

async function createSignedUpload(
  supabase: SupabaseClient,
  objectPath: string,
): Promise<{ path: string; token: string; signed_url: string | null }> {
  const bucket = resolveStorageBucket();
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(objectPath);

  if (error || !data?.token || !data?.path) {
    console.error('create signed upload url failed', {
      error: error?.message,
      bucket,
      object_path: objectPath,
    });
    throw new TidasPackageError(
      500,
      'SIGNED_UPLOAD_CREATE_FAILED',
      'Failed to create signed upload URL',
    );
  }

  return {
    path: data.path,
    token: data.token,
    signed_url: data.signedUrl ?? null,
  };
}

function sanitizeFilename(value: string): string {
  const fallback = IMPORT_SOURCE_FILENAME;
  const sanitized = value
    .replaceAll('\\', '/')
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/[^A-Za-z0-9._-]/g, '_')
    .trim();

  return sanitized || fallback;
}

function resolveStorageBucket(): string {
  return normalizeString(Deno.env.get('S3_BUCKET')) || DEFAULT_STORAGE_BUCKET;
}

function resolveStoragePrefix(): string {
  return normalizeString(Deno.env.get('S3_PREFIX') ?? DEFAULT_STORAGE_PREFIX).replace(
    /^\/+|\/+$/g,
    '',
  );
}

function resolveStorageBaseUrl(): string {
  const explicitEndpoint = normalizeString(Deno.env.get('S3_ENDPOINT'));
  if (explicitEndpoint) {
    return explicitEndpoint.replace(/\/+$/, '');
  }

  const supabaseUrl =
    normalizeString(Deno.env.get('REMOTE_SUPABASE_URL')) ||
    normalizeString(Deno.env.get('SUPABASE_URL'));
  if (!supabaseUrl) {
    throw new TidasPackageError(
      500,
      'STORAGE_BASE_URL_MISSING',
      'Missing S3 endpoint or Supabase URL for package artifacts',
    );
  }

  const parsedUrl = new URL(supabaseUrl);
  if (parsedUrl.host.includes('.storage.supabase.co')) {
    const basePath = parsedUrl.pathname.replace(/\/+$/, '');
    return `${parsedUrl.origin}${basePath || ''}/storage/v1/s3`.replace(
      /\/storage\/v1\/s3\/storage\/v1\/s3$/,
      '/storage/v1/s3',
    );
  }

  parsedUrl.host = parsedUrl.host.replace('.supabase.co', '.storage.supabase.co');
  parsedUrl.pathname = '/storage/v1/s3';
  parsedUrl.search = '';
  parsedUrl.hash = '';
  return parsedUrl.toString().replace(/\/+$/, '');
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
