import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';
import { corsHeaders } from './cors.ts';

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
  | 'queued'
  | 'running'
  | 'ready'
  | 'completed'
  | 'failed'
  | 'stale';
export type TidasPackageArtifactKind =
  | 'import_source'
  | 'export_zip'
  | 'export_report'
  | 'import_report';

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
  export_artifact_id: string | null;
  report_artifact_id: string | null;
  hit_count: number;
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
  metadata: JsonRecord;
  expires_at: string | null;
  is_pinned: boolean;
  created_at: string | null;
  updated_at: string | null;
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

type PackageArtifactRow = {
  id: string;
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
  const isSystemAdmin = await isSystemAdminUser(supabase, userId);

  if (!normalized.roots.length && normalized.scope !== 'current_user' && !isSystemAdmin) {
    throw new TidasPackageError(
      403,
      'EXPORT_SCOPE_FORBIDDEN',
      'Only system admins can export open data or combined datasets',
    );
  }

  if (normalized.roots.length > 0) {
    await assertRootsExportable(supabase, userId, normalized.roots);
  }

  const requestKey = await sha256Hex(JSON.stringify(normalized.request_payload));
  const nowIso = new Date().toISOString();
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const baseIdempotencyKey = idempotencyHeader
    ? `${userId}:export_package:${idempotencyHeader}`
    : `${userId}:export_package:${requestKey}`;
  let idempotencyKey = baseIdempotencyKey;

  const existingCache = await fetchExportRequestCache(supabase, userId, requestKey);
  if (existingCache) {
    await touchExportRequestCache(supabase, existingCache, nowIso);

    const existingJob = existingCache.job_id
      ? await fetchOwnedPackageJobIfExists(supabase, userId, existingCache.job_id, 'export_package')
      : null;
    const cacheAction = resolveExportCacheAction(existingCache, existingJob);

    if (cacheAction === 'cache_hit' && existingCache.job_id) {
      return {
        ok: true,
        mode: 'cache_hit' as const,
        job_id: existingCache.job_id,
        scope: normalized.scope,
        root_count: normalized.roots.length,
      };
    }

    if (cacheAction === 'in_progress' && existingCache.job_id) {
      return {
        ok: true,
        mode: 'in_progress' as const,
        job_id: existingCache.job_id,
        scope: normalized.scope,
        root_count: normalized.roots.length,
      };
    }

    idempotencyKey = buildRetryIdempotencyKey(
      baseIdempotencyKey,
      existingCache.id,
      existingCache.hit_count + 1,
    );
  }

  const newJobId = crypto.randomUUID();
  const payload = {
    type: 'export_package',
    job_id: newJobId,
    requested_by: userId,
    scope: normalized.scope,
    roots: normalized.roots,
  };

  const { error: insertJobError } = await supabase.from('lca_package_jobs').insert({
    id: newJobId,
    job_type: 'export_package',
    status: 'queued',
    payload,
    diagnostics: {},
    requested_by: userId,
    scope: normalized.scope,
    root_count: normalized.roots.length,
    request_key: requestKey,
    idempotency_key: idempotencyKey,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertJobError && !isDuplicateKey(insertJobError.code)) {
    console.error('insert lca_package_jobs failed', {
      error: insertJobError.message,
      code: insertJobError.code,
      idempotency_key: idempotencyKey,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'JOB_INSERT_FAILED', 'Failed to create export job');
  }

  const finalJobId = await readJobIdByIdempotencyKey(supabase, idempotencyKey, userId);

  if (finalJobId === newJobId) {
    const { error: enqueueError } = await supabase.rpc('lca_package_enqueue_job', {
      p_message: payload,
    });

    if (enqueueError) {
      console.error('enqueue lca_package job failed', {
        error: enqueueError.message,
        code: enqueueError.code,
        details: enqueueError.details,
        hint: enqueueError.hint,
        job_id: newJobId,
      });
      if (
        enqueueError.code === 'PGRST202' ||
        enqueueError.message.includes('lca_package_enqueue_job')
      ) {
        throw new TidasPackageError(500, 'QUEUE_RPC_MISSING', 'Package queue RPC is missing');
      }
      throw new TidasPackageError(500, 'QUEUE_ENQUEUE_FAILED', 'Failed to enqueue export job');
    }
  }

  await upsertExportRequestCache(supabase, {
    requested_by: userId,
    request_key: requestKey,
    request_payload: normalized.request_payload,
    job_id: finalJobId,
    hit_count: existingCache ? existingCache.hit_count + 1 : 1,
    nowIso,
  });

  return {
    ok: true,
    mode: 'queued' as const,
    job_id: finalJobId,
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
  const nowIso = new Date().toISOString();
  const idempotencyHeader = req.headers.get('x-idempotency-key')?.trim();
  const idempotencyKey = idempotencyHeader ? `${userId}:import_prepare:${idempotencyHeader}` : null;
  let jobId: string = crypto.randomUUID();
  let sourceArtifactId: string = crypto.randomUUID();
  let objectPath = buildImportSourceObjectPath(jobId);
  let artifactUrl = buildStorageObjectUrl(resolveStorageBucket(), objectPath);

  const payload = {
    type: 'import_package',
    job_id: jobId,
    requested_by: userId,
    source_artifact_id: sourceArtifactId,
    upload_state: 'prepared',
  };

  const { error: insertJobError } = await supabase.from('lca_package_jobs').insert({
    id: jobId,
    job_type: 'import_package',
    status: 'stale',
    payload,
    diagnostics: { phase: 'prepare_upload' },
    requested_by: userId,
    idempotency_key: idempotencyKey,
    created_at: nowIso,
    updated_at: nowIso,
  });

  if (insertJobError) {
    if (!idempotencyKey || !isDuplicateKey(insertJobError.code)) {
      console.error('insert import prepare job failed', {
        error: insertJobError.message,
        code: insertJobError.code,
        user_id: userId,
      });
      throw new TidasPackageError(500, 'JOB_INSERT_FAILED', 'Failed to prepare import upload');
    }

    const existing = await fetchPreparedImportJob(supabase, userId, idempotencyKey);
    jobId = existing.job_id;
    sourceArtifactId = existing.source_artifact_id;
    objectPath = existing.object_path;
    artifactUrl = existing.artifact_url;
  } else {
    const { error: insertArtifactError } = await supabase.from('lca_package_artifacts').insert({
      id: sourceArtifactId,
      job_id: jobId,
      artifact_kind: 'import_source',
      status: 'pending',
      artifact_url: artifactUrl,
      artifact_format: PACKAGE_ZIP_ARTIFACT_FORMAT,
      content_type: parsed.content_type,
      metadata: {
        filename: parsed.filename,
        original_filename: parsed.filename,
        upload_state: 'prepared',
      },
      created_at: nowIso,
      updated_at: nowIso,
    });

    if (insertArtifactError) {
      console.error('insert import source artifact failed', {
        error: insertArtifactError.message,
        code: insertArtifactError.code,
        user_id: userId,
        job_id: jobId,
      });
      throw new TidasPackageError(
        500,
        'IMPORT_ARTIFACT_INSERT_FAILED',
        'Failed to create import artifact',
      );
    }
  }

  const signedUpload = await createSignedUpload(supabase, objectPath);

  return {
    ok: true,
    action: 'prepare_upload' as const,
    job_id: jobId,
    source_artifact_id: sourceArtifactId,
    artifact_url: artifactUrl,
    upload: {
      bucket: resolveStorageBucket(),
      object_path: objectPath,
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
  const nowIso = new Date().toISOString();
  const job = await fetchOwnedPackageJob(supabase, userId, parsed.job_id, 'import_package');
  const sourceArtifact = await fetchPackageArtifact(supabase, parsed.source_artifact_id, job.id);

  if (sourceArtifact.artifact_kind !== 'import_source') {
    throw new TidasPackageError(
      400,
      'INVALID_IMPORT_SOURCE',
      'The provided artifact is not an import source',
    );
  }

  if (job.status === 'completed') {
    return {
      ok: true,
      mode: 'completed' as const,
      job_id: job.id,
      source_artifact_id: sourceArtifact.id,
    };
  }

  if (job.status === 'queued' || job.status === 'running') {
    return {
      ok: true,
      mode: 'in_progress' as const,
      job_id: job.id,
      source_artifact_id: sourceArtifact.id,
    };
  }

  const payload = {
    type: 'import_package',
    job_id: job.id,
    requested_by: userId,
    source_artifact_id: sourceArtifact.id,
  };

  const metadata = {
    ...sourceArtifact.metadata,
    filename: parsed.filename ?? sourceArtifact.metadata.filename ?? IMPORT_SOURCE_FILENAME,
    original_filename:
      parsed.filename ?? sourceArtifact.metadata.original_filename ?? IMPORT_SOURCE_FILENAME,
    upload_state: 'uploaded',
  };

  const { error: artifactUpdateError } = await supabase
    .from('lca_package_artifacts')
    .update({
      status: 'ready',
      artifact_sha256: parsed.artifact_sha256,
      artifact_byte_size: parsed.artifact_byte_size,
      content_type: parsed.content_type ?? sourceArtifact.content_type,
      metadata,
      updated_at: nowIso,
    })
    .eq('id', sourceArtifact.id)
    .eq('job_id', job.id);

  if (artifactUpdateError) {
    console.error('update import source artifact failed', {
      error: artifactUpdateError.message,
      code: artifactUpdateError.code,
      job_id: job.id,
      artifact_id: sourceArtifact.id,
    });
    throw new TidasPackageError(
      500,
      'IMPORT_ARTIFACT_UPDATE_FAILED',
      'Failed to finalize import artifact metadata',
    );
  }

  const { error: jobUpdateError } = await supabase
    .from('lca_package_jobs')
    .update({
      status: 'queued',
      payload,
      diagnostics: { phase: 'enqueue_import', source_artifact_id: sourceArtifact.id },
      request_key: parsed.artifact_sha256 ?? sourceArtifact.id,
      updated_at: nowIso,
    })
    .eq('id', job.id)
    .eq('requested_by', userId);

  if (jobUpdateError) {
    console.error('update import job failed', {
      error: jobUpdateError.message,
      code: jobUpdateError.code,
      job_id: job.id,
    });
    throw new TidasPackageError(500, 'JOB_UPDATE_FAILED', 'Failed to enqueue import job');
  }

  const { error: enqueueError } = await supabase.rpc('lca_package_enqueue_job', {
    p_message: payload,
  });

  if (enqueueError) {
    console.error('enqueue import job failed', {
      error: enqueueError.message,
      code: enqueueError.code,
      job_id: job.id,
    });
    if (
      enqueueError.code === 'PGRST202' ||
      enqueueError.message.includes('lca_package_enqueue_job')
    ) {
      throw new TidasPackageError(500, 'QUEUE_RPC_MISSING', 'Package queue RPC is missing');
    }
    throw new TidasPackageError(500, 'QUEUE_ENQUEUE_FAILED', 'Failed to enqueue import job');
  }

  return {
    ok: true,
    mode: 'queued' as const,
    job_id: job.id,
    source_artifact_id: sourceArtifact.id,
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

  const job = await fetchOwnedPackageJob(supabase, userId, jobId);
  const { data: artifactRows, error: artifactError } = await supabase
    .from('lca_package_artifacts')
    .select(
      'id,artifact_kind,status,artifact_url,artifact_sha256,artifact_byte_size,artifact_format,content_type,metadata,expires_at,is_pinned,created_at,updated_at',
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (artifactError) {
    console.error('query lca_package_artifacts failed', {
      error: artifactError.message,
      code: artifactError.code,
      job_id: jobId,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'ARTIFACT_LOOKUP_FAILED', 'Failed to query package artifacts');
  }

  const artifacts = await Promise.all(
    (artifactRows ?? []).map((row) => toArtifactResponse(supabase, row)),
  );

  const { data: cacheRow } = await supabase
    .from('lca_package_request_cache')
    .select(
      'id,status,error_code,error_message,hit_count,last_accessed_at,created_at,updated_at,export_artifact_id,report_artifact_id',
    )
    .eq('job_id', jobId)
    .maybeSingle();

  const artifactsByKind = Object.fromEntries(
    artifacts.map((artifact) => [artifact.artifact_kind, artifact]),
  );

  const requestCache: PackageRequestCacheResponse | null = cacheRow
    ? {
        id: String(cacheRow.id),
        status: String(cacheRow.status),
        error_code: cacheRow.error_code ? String(cacheRow.error_code) : null,
        error_message: cacheRow.error_message ? String(cacheRow.error_message) : null,
        hit_count: Number(cacheRow.hit_count ?? 0),
        last_accessed_at: cacheRow.last_accessed_at ?? null,
        created_at: cacheRow.created_at ?? null,
        updated_at: cacheRow.updated_at ?? null,
        export_artifact_id: cacheRow.export_artifact_id
          ? String(cacheRow.export_artifact_id)
          : null,
        report_artifact_id: cacheRow.report_artifact_id
          ? String(cacheRow.report_artifact_id)
          : null,
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

async function isSystemAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('roles')
    .select('role')
    .eq('user_id', userId)
    .eq('team_id', SYSTEM_TEAM_ID)
    .maybeSingle();

  if (error) {
    console.error('query system role failed', {
      error: error.message,
      code: error.code,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'ROLE_LOOKUP_FAILED', 'Failed to verify package export role');
  }

  const role = normalizeString(data?.role);
  return role === 'admin' || role === 'owner';
}

async function assertRootsExportable(
  supabase: SupabaseClient,
  userId: string,
  roots: TidasPackageRoot[],
): Promise<void> {
  const grouped = new Map<SupportedTidasTable, TidasPackageRoot[]>();
  for (const root of roots) {
    const group = grouped.get(root.table) ?? [];
    group.push(root);
    grouped.set(root.table, group);
  }

  const exportableKeys = new Set<string>();

  for (const [table, tableRoots] of grouped.entries()) {
    const ids = Array.from(new Set(tableRoots.map((root) => root.id)));
    const { data, error } = await supabase
      .from(table)
      .select('id,version,state_code,user_id')
      .in('id', ids);

    if (error) {
      console.error('query root export permissions failed', {
        error: error.message,
        code: error.code,
        table,
        user_id: userId,
      });
      throw new TidasPackageError(
        500,
        'ROOT_PERMISSION_LOOKUP_FAILED',
        'Failed to verify selected export datasets',
      );
    }

    for (const row of (data ?? []) as RootAccessRow[]) {
      const key = `${table}:${normalizeString(row.id)}:${normalizeVersionString(row.version)}`;
      const isOwnData = normalizeNullableString(row.user_id) === userId;
      const isOpenData =
        row.state_code !== null &&
        OPEN_DATA_STATE_CODES.includes(row.state_code as (typeof OPEN_DATA_STATE_CODES)[number]);

      if (isOwnData || isOpenData) {
        exportableKeys.add(key);
      }
    }
  }

  const missing = roots.filter((root) => !exportableKeys.has(rootKey(root)));
  if (missing.length > 0) {
    throw new TidasPackageError(
      403,
      'ROOT_EXPORT_FORBIDDEN',
      'Some selected datasets are not exportable for the current user',
    );
  }
}

async function fetchExportRequestCache(
  supabase: SupabaseClient,
  userId: string,
  requestKey: string,
): Promise<ExportRequestCacheRow | null> {
  const { data, error } = await supabase
    .from('lca_package_request_cache')
    .select('id,status,job_id,export_artifact_id,report_artifact_id,hit_count')
    .eq('requested_by', userId)
    .eq('operation', 'export_package')
    .eq('request_key', requestKey)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_request_cache failed', {
      error: error.message,
      code: error.code,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'REQUEST_CACHE_LOOKUP_FAILED', 'Failed to query export cache');
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    status: String(data.status),
    job_id: data.job_id ? String(data.job_id) : null,
    export_artifact_id: data.export_artifact_id ? String(data.export_artifact_id) : null,
    report_artifact_id: data.report_artifact_id ? String(data.report_artifact_id) : null,
    hit_count: Number(data.hit_count ?? 0),
  };
}

async function touchExportRequestCache(
  supabase: SupabaseClient,
  row: ExportRequestCacheRow,
  nowIso: string,
): Promise<void> {
  const { error } = await supabase
    .from('lca_package_request_cache')
    .update({
      updated_at: nowIso,
      last_accessed_at: nowIso,
      hit_count: row.hit_count + 1,
    })
    .eq('id', row.id);

  if (error) {
    console.error('touch lca_package_request_cache failed', {
      error: error.message,
      code: error.code,
      cache_id: row.id,
    });
    throw new TidasPackageError(500, 'REQUEST_CACHE_TOUCH_FAILED', 'Failed to update export cache');
  }
}

async function upsertExportRequestCache(
  supabase: SupabaseClient,
  args: {
    requested_by: string;
    request_key: string;
    request_payload: unknown;
    job_id: string;
    hit_count: number;
    nowIso: string;
  },
): Promise<void> {
  const existing = await fetchExportRequestCache(supabase, args.requested_by, args.request_key);

  if (existing) {
    const { error } = await supabase
      .from('lca_package_request_cache')
      .update({
        status: 'pending',
        job_id: args.job_id,
        request_payload: args.request_payload,
        export_artifact_id: null,
        report_artifact_id: null,
        error_code: null,
        error_message: null,
        hit_count: args.hit_count,
        last_accessed_at: args.nowIso,
        updated_at: args.nowIso,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('update lca_package_request_cache failed', {
        error: error.message,
        code: error.code,
        cache_id: existing.id,
      });
      throw new TidasPackageError(
        500,
        'REQUEST_CACHE_UPDATE_FAILED',
        'Failed to update export cache row',
      );
    }

    return;
  }

  const { error } = await supabase.from('lca_package_request_cache').insert({
    requested_by: args.requested_by,
    operation: 'export_package',
    request_key: args.request_key,
    request_payload: args.request_payload,
    status: 'pending',
    job_id: args.job_id,
    hit_count: args.hit_count,
    last_accessed_at: args.nowIso,
    created_at: args.nowIso,
    updated_at: args.nowIso,
  });

  if (error && !isDuplicateKey(error.code)) {
    console.error('insert lca_package_request_cache failed', {
      error: error.message,
      code: error.code,
      user_id: args.requested_by,
      request_key: args.request_key,
    });
    throw new TidasPackageError(
      500,
      'REQUEST_CACHE_INSERT_FAILED',
      'Failed to create export cache',
    );
  }
}

async function readJobIdByIdempotencyKey(
  supabase: SupabaseClient,
  idempotencyKey: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('lca_package_jobs')
    .select('id')
    .eq('idempotency_key', idempotencyKey)
    .eq('requested_by', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) {
    console.error('read lca_package_jobs by idempotency_key failed', {
      error: error?.message,
      code: error?.code,
      idempotency_key: idempotencyKey,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'JOB_LOOKUP_FAILED', 'Failed to read package job');
  }

  return String(data.id);
}

function buildRetryIdempotencyKey(
  baseIdempotencyKey: string,
  cacheId: string,
  nextHitCount: number,
): string {
  return `${baseIdempotencyKey}:retry:${cacheId}:${nextHitCount}`;
}

export function resolveExportCacheAction(
  cacheRow: ExportRequestCacheRow,
  jobRow: Pick<PackageJobRow, 'status'> | null,
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

async function fetchPreparedImportJob(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
): Promise<{
  job_id: string;
  source_artifact_id: string;
  object_path: string;
  artifact_url: string;
}> {
  const job = await fetchOwnedPackageJobByIdempotencyKey(supabase, userId, idempotencyKey);
  const artifact = await fetchPackageArtifactByKind(supabase, job.id, 'import_source');
  const storagePath = parseStoragePathFromArtifactUrl(artifact.artifact_url);

  if (!storagePath) {
    throw new TidasPackageError(
      500,
      'IMPORT_ARTIFACT_STORAGE_PATH_INVALID',
      'Prepared import artifact has an invalid storage path',
    );
  }

  return {
    job_id: job.id,
    source_artifact_id: artifact.id,
    object_path: storagePath.objectPath,
    artifact_url: artifact.artifact_url,
  };
}

async function fetchOwnedPackageJobByIdempotencyKey(
  supabase: SupabaseClient,
  userId: string,
  idempotencyKey: string,
): Promise<PackageJobRow> {
  const { data, error } = await supabase
    .from('lca_package_jobs')
    .select(
      'id,job_type,status,scope,root_count,request_key,payload,diagnostics,created_at,started_at,finished_at,updated_at',
    )
    .eq('requested_by', userId)
    .eq('idempotency_key', idempotencyKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_jobs by idempotency_key failed', {
      error: error.message,
      code: error.code,
      idempotency_key: idempotencyKey,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'JOB_LOOKUP_FAILED', 'Failed to query package job');
  }

  if (!data) {
    throw new TidasPackageError(404, 'JOB_NOT_FOUND', 'Package job not found');
  }

  return toPackageJobRow(data);
}

async function fetchOwnedPackageJobIfExists(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  expectedJobType?: TidasPackageJobType,
): Promise<PackageJobRow | null> {
  const { data, error } = await supabase
    .from('lca_package_jobs')
    .select(
      'id,job_type,status,scope,root_count,request_key,payload,diagnostics,created_at,started_at,finished_at,updated_at',
    )
    .eq('id', jobId)
    .eq('requested_by', userId)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_jobs failed during cache reconciliation', {
      error: error.message,
      code: error.code,
      job_id: jobId,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'JOB_LOOKUP_FAILED', 'Failed to query package job');
  }

  if (!data) {
    return null;
  }

  const row = toPackageJobRow(data);
  if (expectedJobType && row.job_type !== expectedJobType) {
    return null;
  }

  return row;
}

async function fetchOwnedPackageJob(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  expectedJobType?: TidasPackageJobType,
): Promise<PackageJobRow> {
  const { data, error } = await supabase
    .from('lca_package_jobs')
    .select(
      'id,job_type,status,scope,root_count,request_key,payload,diagnostics,created_at,started_at,finished_at,updated_at',
    )
    .eq('id', jobId)
    .eq('requested_by', userId)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_jobs failed', {
      error: error.message,
      code: error.code,
      job_id: jobId,
      user_id: userId,
    });
    throw new TidasPackageError(500, 'JOB_LOOKUP_FAILED', 'Failed to query package job');
  }

  if (!data) {
    throw new TidasPackageError(404, 'JOB_NOT_FOUND', 'Package job not found');
  }

  const row = toPackageJobRow(data);
  if (expectedJobType && row.job_type !== expectedJobType) {
    throw new TidasPackageError(400, 'JOB_TYPE_MISMATCH', 'Package job type mismatch');
  }

  return row;
}

function toPackageJobRow(data: Record<string, unknown>): PackageJobRow {
  return {
    id: String(data.id),
    job_type: String(data.job_type) as TidasPackageJobType,
    status: String(data.status) as TidasPackageJobStatus,
    scope: data.scope ? String(data.scope) : null,
    root_count: Number(data.root_count ?? 0),
    request_key: data.request_key ? String(data.request_key) : null,
    payload: data.payload ?? {},
    diagnostics: data.diagnostics ?? {},
    created_at: data.created_at ? String(data.created_at) : null,
    started_at: data.started_at ? String(data.started_at) : null,
    finished_at: data.finished_at ? String(data.finished_at) : null,
    updated_at: data.updated_at ? String(data.updated_at) : null,
  };
}

async function fetchPackageArtifact(
  supabase: SupabaseClient,
  artifactId: string,
  jobId: string,
): Promise<PackageArtifactRow> {
  const { data, error } = await supabase
    .from('lca_package_artifacts')
    .select(
      'id,artifact_kind,status,artifact_url,artifact_sha256,artifact_byte_size,artifact_format,content_type,metadata,expires_at,is_pinned,created_at,updated_at',
    )
    .eq('id', artifactId)
    .eq('job_id', jobId)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_artifacts failed', {
      error: error.message,
      code: error.code,
      artifact_id: artifactId,
      job_id: jobId,
    });
    throw new TidasPackageError(500, 'ARTIFACT_LOOKUP_FAILED', 'Failed to query package artifact');
  }

  if (!data) {
    throw new TidasPackageError(404, 'ARTIFACT_NOT_FOUND', 'Package artifact not found');
  }

  return toPackageArtifactRow(data);
}

async function fetchPackageArtifactByKind(
  supabase: SupabaseClient,
  jobId: string,
  artifactKind: TidasPackageArtifactKind,
): Promise<PackageArtifactRow> {
  const { data, error } = await supabase
    .from('lca_package_artifacts')
    .select(
      'id,artifact_kind,status,artifact_url,artifact_sha256,artifact_byte_size,artifact_format,content_type,metadata,expires_at,is_pinned,created_at,updated_at',
    )
    .eq('job_id', jobId)
    .eq('artifact_kind', artifactKind)
    .maybeSingle();

  if (error) {
    console.error('query lca_package_artifacts by kind failed', {
      error: error.message,
      code: error.code,
      job_id: jobId,
      artifact_kind: artifactKind,
    });
    throw new TidasPackageError(500, 'ARTIFACT_LOOKUP_FAILED', 'Failed to query package artifact');
  }

  if (!data) {
    throw new TidasPackageError(404, 'ARTIFACT_NOT_FOUND', 'Package artifact not found');
  }

  return toPackageArtifactRow(data);
}

function toPackageArtifactRow(data: Record<string, unknown>): PackageArtifactRow {
  return {
    id: String(data.id),
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

  if (artifact.status === 'ready' && storagePath) {
    const { data, error } = await supabase.storage
      .from(storagePath.bucket)
      .createSignedUrl(storagePath.objectPath, SIGNED_URL_EXPIRES_IN_SECONDS);

    if (error) {
      console.error('create signed artifact url failed', {
        error: error.message,
        artifact_id: artifact.id,
        artifact_url: artifact.artifact_url,
      });
    } else {
      signedDownloadUrl = data?.signedUrl ?? null;
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
    metadata: artifact.metadata,
    expires_at: artifact.expires_at,
    is_pinned: artifact.is_pinned,
    created_at: artifact.created_at,
    updated_at: artifact.updated_at,
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
