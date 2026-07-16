import { supabase } from '@/services/supabase';
import type { SupabaseError } from '@/services/supabase/data';
import { FunctionRegion } from '@supabase/supabase-js';

export type CalculationBundleArtifactKind =
  | 'process_axis'
  | 'inventory_axis'
  | 'technosphere_edges'
  | 'biosphere_edges'
  | 'lci'
  | 'lcia'
  | 'coverage'
  | string;

export type CalculationBundleArtifact = {
  kind: CalculationBundleArtifactKind;
  path: string;
  schemaVersion: string;
  mediaType: string;
  compression: 'gzip' | 'none' | string;
  sha256: string;
  uncompressedSha256?: string;
  byteSize: number;
  uncompressedByteSize?: number;
  recordCount: number;
  firstProcessIndex?: number;
  lastProcessIndex?: number;
  derived?: boolean;
  signedDownloadUrl: string;
  signedDownloadExpiresInSeconds: number;
};

export type CalculationBundleSignedDownload = {
  sha256: string;
  byteSize: number;
  mediaType: string;
  signedDownloadUrl: string;
  signedDownloadExpiresInSeconds: number;
};

export type CalculationBundleManifest = {
  schemaVersion: 'tiangong.calculation-bundle.v1' | string;
  calculationContractVersion: string;
  calculationId: string;
  bundleContentHash: string;
  scope: {
    coverageMode: string;
    processCount: number;
    selectionManifestHash: string;
  };
  snapshot: {
    id: string;
    sha256: string;
    processCount: number;
    flowCount: number;
    impactCount: number;
  };
  solver: Record<string, unknown>;
  methodSet: Record<string, unknown>;
  artifacts: Omit<
    CalculationBundleArtifact,
    'signedDownloadUrl' | 'signedDownloadExpiresInSeconds'
  >[];
  calculationEvidence: Record<string, unknown>;
  hashes: Record<string, unknown>;
};

export type CalculationBundleProjection = {
  packageId: string;
  packageVersion: string;
  snapshotId: string;
  resultId: string;
  availableImpactCategories?: unknown[];
  calculationBundle: {
    schemaVersion?: string;
    calculationId?: string;
    bundleContentHash: string;
    manifestSha256: string;
    manifestByteSize: number;
    artifactCount: number;
    manifest: CalculationBundleManifest;
    manifestDownload: CalculationBundleSignedDownload;
    artifacts: CalculationBundleArtifact[];
  };
};

export type CalculationBundleProcessRecord = {
  processIndex: number;
  rootProcess: { id: string; version: string };
  quantitativeReference: {
    exchangeInternalId: string;
    flow: { id: string; version: string };
    direction: string;
    referenceUnit: string;
    meanAmount: number;
  };
};

export type CalculationBundleLciRecord = {
  processIndex: number;
  flow: { id: string; version: string };
  direction: string;
  unit: string;
  location?: string | null;
  meanAmount: number;
};

export type CalculationBundleLciaRecord = {
  processIndex: number;
  method: { id: string; version: string };
  meanAmount: number;
};

export type LcaReleaseArtifact = {
  artifactId: string;
  profileId:
    'unit-process-full-closure.v1' | 'standalone-lifecyclemodel-result-full-closure.v1' | string;
  format: 'tidas' | 'ilcd' | string;
  sha256: string;
  byteSize: number;
  mediaType: string;
  pinned: boolean;
};

export type LcaReleaseDataset = {
  datasetType: string;
  role: 'unit_process' | 'lifecycle_model' | 'result_process' | 'support' | string;
  uuid: string;
  version: string;
  sourceProcess?: { id: string; version: string };
  versionSignificantHash: string;
  semanticHash: string;
  canonicalContentHash: string;
};

export type LcaReleaseProjection = {
  releaseRunId: string;
  releaseVersion: string;
  status: string;
  scopeMode: string;
  selectionManifestHash: string;
  inputManifestHash: string;
  calculationBundleHash: string;
  publishPlanHash: string;
  releaseManifestHash?: string | null;
  artifactSetHash: string;
  createdAt: string;
  approvedAt?: string | null;
  publishedAt?: string | null;
  readbackVerifiedAt?: string | null;
  datasetCounts?: Record<string, number>;
  validation?: Record<string, string | null>;
  publication?: {
    publicationId: string;
    status: string;
    isCurrent: boolean;
    publishedAt?: string | null;
    unpublishedAt?: string | null;
  } | null;
  artifacts: LcaReleaseArtifact[];
  datasets?: LcaReleaseDataset[];
  blockers: string[];
};

export type LcaReleaseArtifactDownload = LcaReleaseArtifact & {
  releaseRunId: string;
  public: boolean;
  downloadFilename: string;
  signedDownloadUrl: string;
  signedDownloadExpiresInSeconds: number;
};

export type LcaReleaseApiResult<T> = {
  data: T | null;
  error: SupabaseError | null;
  count: null;
  status: number;
  statusText: string;
};

type ReleaseFunctionName = 'app_lca_release_commands' | 'lca_release_results';

function authRequiredResult<T>(): LcaReleaseApiResult<T> {
  return {
    data: null,
    error: { message: 'Authentication required', code: 'AUTH_REQUIRED', details: '', hint: '' },
    count: null,
    status: 401,
    statusText: 'AUTH_REQUIRED',
  };
}

async function parseFunctionErrorPayload(error: any): Promise<Record<string, any> | null> {
  if (!error?.context || typeof error.context.json !== 'function') return null;
  try {
    return await error.context.json();
  } catch {
    return null;
  }
}

function normalizeError(error: any, payload: Record<string, any> | null): SupabaseError {
  return {
    message: payload?.message || payload?.detail || error?.message || 'Request failed',
    code: payload?.code || payload?.error || 'FUNCTION_ERROR',
    details: payload?.details ?? '',
    hint: payload?.hint ?? '',
  };
}

function isFailure(payload: unknown): payload is Record<string, any> & { ok: false } {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as { ok?: unknown }).ok === false,
  );
}

function unwrap<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    (payload as { ok?: unknown }).ok === true &&
    'data' in (payload as Record<string, unknown>)
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function invokeReleaseFunction<T>(
  functionName: ReleaseFunctionName,
  body: Record<string, unknown>,
  options: { requireAuth?: boolean } = {},
): Promise<LcaReleaseApiResult<T>> {
  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (options.requireAuth && !accessToken) return authRequiredResult<T>();

  const result = await supabase.functions.invoke(functionName, {
    body,
    region: FunctionRegion.UsEast1,
    ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
  });
  if (result.error) {
    const payload = await parseFunctionErrorPayload(result.error);
    const error = normalizeError(result.error, payload);
    return {
      data: null,
      error,
      count: null,
      status: result.error.context?.status ?? 500,
      statusText: error.code,
    };
  }
  if (isFailure(result.data)) {
    const error = normalizeError(null, result.data);
    return {
      data: null,
      error,
      count: null,
      status: typeof result.data.status === 'number' ? result.data.status : 400,
      statusText: error.code,
    };
  }
  return { data: unwrap<T>(result.data), error: null, count: null, status: 200, statusText: 'OK' };
}

export function getCalculationBundle(packageId: string) {
  return invokeReleaseFunction<CalculationBundleProjection>(
    'app_lca_release_commands',
    { action: 'get_calculation_bundle', packageId },
    { requireAuth: true },
  );
}

export function getCurrentLcaRelease() {
  return invokeReleaseFunction<LcaReleaseProjection>('lca_release_results', { mode: 'current' });
}

export function getCurrentLcaReleaseForProcess(processId: string, processVersion: string) {
  return invokeReleaseFunction<LcaReleaseProjection>('lca_release_results', {
    mode: 'process',
    processId,
    processVersion,
  });
}

export function getLcaRelease(releaseRunId: string) {
  return invokeReleaseFunction<LcaReleaseProjection>('lca_release_results', {
    mode: 'release',
    releaseRunId,
  });
}

export function createLcaReleaseArtifactDownload(artifactId: string) {
  return invokeReleaseFunction<LcaReleaseArtifactDownload>('lca_release_results', {
    mode: 'artifact_download',
    artifactId,
  });
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('SHA-256 verification is not supported by this browser.');
  }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function decodeArtifactBytes(bytes: ArrayBuffer, compression: string): Promise<string> {
  const view = new Uint8Array(bytes);
  const hasGzipHeader = view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b;
  if (compression !== 'gzip' || !hasGzipHeader) return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream === 'undefined') {
    throw new Error(
      'Gzip preview is not supported by this browser. Download the raw artifact instead.',
    );
  }
  const source = new Response(bytes).body!;
  return await new Response(source.pipeThrough(new DecompressionStream('gzip'))).text();
}

export async function fetchCalculationBundleArtifactText(
  artifact: Pick<
    CalculationBundleArtifact,
    | 'signedDownloadUrl'
    | 'sha256'
    | 'byteSize'
    | 'compression'
    | 'uncompressedSha256'
    | 'uncompressedByteSize'
  >,
): Promise<string> {
  const response = await fetch(artifact.signedDownloadUrl, { credentials: 'omit' });
  if (!response.ok) throw new Error(`Calculation artifact download failed (${response.status})`);
  const bytes = await response.arrayBuffer();
  const view = new Uint8Array(bytes);
  const hasGzipHeader = view.length >= 2 && view[0] === 0x1f && view[1] === 0x8b;
  const transparentlyDecoded = artifact.compression === 'gzip' && !hasGzipHeader;
  const expectedByteSize = transparentlyDecoded ? artifact.uncompressedByteSize : artifact.byteSize;
  const expectedSha256 = transparentlyDecoded ? artifact.uncompressedSha256 : artifact.sha256;
  if (expectedByteSize === undefined || !expectedSha256) {
    throw new Error('Calculation artifact lacks transparent-decompression integrity metadata.');
  }
  if (bytes.byteLength !== expectedByteSize) {
    throw new Error(
      `Calculation artifact size mismatch: expected ${expectedByteSize}, received ${bytes.byteLength}`,
    );
  }
  const digest = await sha256Hex(bytes);
  if (digest !== expectedSha256) {
    throw new Error('Calculation artifact SHA-256 mismatch');
  }
  return decodeArtifactBytes(bytes, artifact.compression);
}

export async function fetchCalculationBundleRecords<T>(
  artifact: CalculationBundleArtifact,
): Promise<T[]> {
  const text = await fetchCalculationBundleArtifactText(artifact);
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}
