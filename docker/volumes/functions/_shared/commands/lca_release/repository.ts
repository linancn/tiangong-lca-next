import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2.98.0';

import type { ActorContext } from '../../command_runtime/actor_context.ts';
import type { CommandAuditPayload } from '../../command_runtime/audit_log.ts';
import {
  callCurrentLcaReleaseProcessRpc,
  callCurrentLcaReleaseRpc,
  callLcaReleaseApproveRpc,
  callLcaReleaseArtifactDownloadRpc,
  callLcaReleaseFinalizeArtifactsRpc,
  callLcaReleaseManagerAssertionRpc,
  callLcaReleasePrepareRpc,
  callLcaReleasePublishRpc,
  callLcaReleaseReadbackVerifyRpc,
  callLcaReleaseRunRpc,
  callLcaReleaseUnpublishRpc,
  callLciaResultCalculationBundleRpc,
  type LcaReleaseRpcClient,
  type LcaReleaseRpcResult,
} from '../../db_rpc/lca_release_commands.ts';
import { createSupabaseServiceClient } from '../../supabase_client.ts';
import type {
  LcaReleaseApproveRequest,
  LcaReleaseArtifactInput,
  LcaReleaseCommandFailure,
  LcaReleaseCreateArtifactUploadsRequest,
  LcaReleaseFinalizeArtifactsRequest,
  LcaReleasePrepareRequest,
  LcaReleasePublishRequest,
  LcaReleaseReadbackVerifyRequest,
  LcaReleaseUnpublishRequest,
  LcaReleaseUploadedArtifact,
} from './types.ts';

export const LCA_RELEASE_MAX_ARTIFACT_BYTES = 50 * 1024 * 1024;
export const LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS = 15 * 60;
export const LCA_CALCULATION_BUNDLE_MAX_MANIFEST_BYTES = 5 * 1024 * 1024;
const DEFAULT_RELEASE_STORAGE_BUCKET = 'lca_results';
const RELEASE_STORAGE_PREFIX = 'lca-releases/v1';
const SUPPORTED_CALCULATION_BUNDLE_SCHEMAS = new Set([
  'tiangong.calculation-bundle.v1',
  'tiangong.calculation-bundle.v2',
]);
const CALCULATION_DOWNLOAD_ROLES = new Map([
  [
    'lcia_results_xlsx',
    [
      'results',
      'lcia-results.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  ],
  ['lcia_results_csv_zip', ['results', 'lcia-results.csv.zip', 'application/zip']],
  [
    'lci_inventory_parquet',
    ['advanced_data', 'lci-inventory.parquet', 'application/vnd.apache.parquet'],
  ],
  ['lci_inventory_csv_zip', ['advanced_data', 'lci-inventory-csv.zip', 'application/zip']],
  [
    'calculation_evidence_bundle',
    ['audit_evidence', 'calculation-evidence-bundle.zip', 'application/zip'],
  ],
]);

export type LcaReleaseArtifactUpload = LcaReleaseUploadedArtifact & {
  token: string;
  signedUploadUrl: string | null;
};

export type LcaReleaseCommandRepository = {
  assertManager: () => Promise<LcaReleaseRpcResult>;
  prepare: (
    request: LcaReleasePrepareRequest,
    audit: CommandAuditPayload,
  ) => Promise<LcaReleaseRpcResult>;
  getRun: (releaseRunId: string) => Promise<LcaReleaseRpcResult>;
  getCurrent: () => Promise<LcaReleaseRpcResult>;
  getCurrentProcess: (processId: string, processVersion: string) => Promise<LcaReleaseRpcResult>;
  createArtifactUploads: (
    request: LcaReleaseCreateArtifactUploadsRequest,
  ) => Promise<{ ok: true; data: LcaReleaseArtifactUpload[] } | LcaReleaseCommandFailure>;
  verifyArtifacts: (
    request: LcaReleaseFinalizeArtifactsRequest,
  ) => Promise<{ ok: true; data: LcaReleaseUploadedArtifact[] } | LcaReleaseCommandFailure>;
  finalizeArtifacts: (
    request: LcaReleaseFinalizeArtifactsRequest,
    audit: Record<string, unknown>,
  ) => Promise<LcaReleaseRpcResult>;
  approve: (
    request: LcaReleaseApproveRequest,
    audit: CommandAuditPayload,
  ) => Promise<LcaReleaseRpcResult>;
  publish: (
    request: LcaReleasePublishRequest,
    audit: CommandAuditPayload,
  ) => Promise<LcaReleaseRpcResult>;
  readbackVerify: (
    request: LcaReleaseReadbackVerifyRequest,
    audit: CommandAuditPayload,
  ) => Promise<LcaReleaseRpcResult>;
  unpublish: (
    request: LcaReleaseUnpublishRequest,
    audit: CommandAuditPayload,
  ) => Promise<LcaReleaseRpcResult>;
  getCalculationBundle: (packageId: string) => Promise<LcaReleaseRpcResult>;
  createArtifactDownload: (artifactId: string) => Promise<LcaReleaseRpcResult>;
};

function failure(
  code: string,
  status: number,
  message: string,
  details?: unknown,
): LcaReleaseCommandFailure {
  return {
    ok: false,
    code,
    status,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function finiteInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function withoutStorageLocator(value: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...value };
  delete sanitized.storageBucket;
  delete sanitized.objectKey;
  delete sanitized.manifestUrl;
  delete sanitized.artifactUrl;
  return sanitized;
}

function releaseArtifactDownloadFilename(
  releaseVersion: string,
  profileId: string,
  format: string,
): string | null {
  if (!/^\d{2}\.\d{2}\.\d{3}$/.test(releaseVersion)) return null;
  const profile =
    profileId === 'unit-process-full-closure.v1'
      ? 'unit-process'
      : profileId === 'standalone-lifecyclemodel-result-full-closure.v1'
        ? 'model-result'
        : null;
  if (!profile || (format !== 'tidas' && format !== 'ilcd')) return null;
  return `tiangong-lca-${releaseVersion}-${profile}.${format}.zip`;
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
    if (markerIndex < 0) return null;
    const remainder = url.pathname.slice(markerIndex + marker.length);
    const splitIndex = remainder.indexOf('/');
    if (splitIndex <= 0 || splitIndex >= remainder.length - 1) return null;
    const bucket = decodeURIComponent(remainder.slice(0, splitIndex));
    const objectPath = decodeURIComponent(remainder.slice(splitIndex + 1));
    return bucket && objectPath ? { bucket, objectPath } : null;
  } catch (_error) {
    return null;
  }
}

function childObjectPath(manifestObjectPath: string, relativePath: string): string | null {
  const segments = relativePath.split('/');
  if (
    !relativePath ||
    relativePath.startsWith('/') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null;
  }
  const splitIndex = manifestObjectPath.lastIndexOf('/');
  if (splitIndex <= 0) return null;
  return `${manifestObjectPath.slice(0, splitIndex)}/${relativePath}`;
}

export function resolveLcaReleaseStorageBucket(): string {
  try {
    const configured = Deno.env.get('LCA_RELEASE_STORAGE_BUCKET')?.trim();
    if (configured) {
      return configured;
    }
    const shared = Deno.env.get('S3_BUCKET')?.trim();
    return shared || DEFAULT_RELEASE_STORAGE_BUCKET;
  } catch (_error) {
    return DEFAULT_RELEASE_STORAGE_BUCKET;
  }
}

export function lcaReleaseObjectKey(
  releaseRunId: string,
  publishPlanHash: string,
  artifact: LcaReleaseArtifactInput,
): string {
  return [
    RELEASE_STORAGE_PREFIX,
    releaseRunId,
    publishPlanHash,
    artifact.profileId,
    artifact.format,
    `${artifact.sha256}.zip`,
  ].join('/');
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function createArtifactUploads(
  serviceSupabase: SupabaseClient,
  request: LcaReleaseCreateArtifactUploadsRequest,
): Promise<{ ok: true; data: LcaReleaseArtifactUpload[] } | LcaReleaseCommandFailure> {
  const bucket = resolveLcaReleaseStorageBucket();
  const uploads: LcaReleaseArtifactUpload[] = [];

  for (const artifact of request.artifacts) {
    const objectKey = lcaReleaseObjectKey(request.releaseRunId, request.publishPlanHash, artifact);
    const { data, error } = await serviceSupabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectKey, { upsert: true });
    if (error || !data?.token || !data.path) {
      return failure(
        'release_signed_upload_create_failed',
        502,
        'Failed to create a signed upload URL for a release artifact',
        {
          profileId: artifact.profileId,
          format: artifact.format,
          detail: error?.message ?? 'Signed upload response was incomplete',
        },
      );
    }
    if (data.path !== objectKey) {
      return failure(
        'release_signed_upload_path_mismatch',
        502,
        'Storage returned a signed upload path that differs from the canonical object key',
        { expected: objectKey, actual: data.path },
      );
    }
    uploads.push({
      ...artifact,
      storageBucket: bucket,
      objectKey,
      token: data.token,
      signedUploadUrl: data.signedUrl ?? null,
    });
  }

  return { ok: true, data: uploads };
}

async function verifyArtifacts(
  serviceSupabase: SupabaseClient,
  request: LcaReleaseFinalizeArtifactsRequest,
): Promise<{ ok: true; data: LcaReleaseUploadedArtifact[] } | LcaReleaseCommandFailure> {
  const bucket = resolveLcaReleaseStorageBucket();

  for (const artifact of request.artifacts) {
    const expectedObjectKey = lcaReleaseObjectKey(
      request.releaseRunId,
      request.publishPlanHash,
      artifact,
    );
    if (artifact.storageBucket !== bucket || artifact.objectKey !== expectedObjectKey) {
      return failure(
        'release_artifact_storage_ref_invalid',
        400,
        'Release artifact storage refs must match the canonical signed-upload destination',
        {
          profileId: artifact.profileId,
          format: artifact.format,
          expectedStorageBucket: bucket,
          expectedObjectKey,
        },
      );
    }

    const { data, error } = await serviceSupabase.storage.from(bucket).download(expectedObjectKey);
    if (error || !data) {
      return failure(
        'release_artifact_download_failed',
        502,
        'Failed to read an uploaded release artifact for verification',
        {
          profileId: artifact.profileId,
          format: artifact.format,
          detail: error?.message ?? 'Storage returned no artifact bytes',
        },
      );
    }
    if (data.size > LCA_RELEASE_MAX_ARTIFACT_BYTES || data.size !== artifact.byteSize) {
      return failure(
        'release_artifact_size_mismatch',
        409,
        'Uploaded release artifact byte size differs from the immutable manifest',
        {
          profileId: artifact.profileId,
          format: artifact.format,
          expected: artifact.byteSize,
          actual: data.size,
          maximum: LCA_RELEASE_MAX_ARTIFACT_BYTES,
        },
      );
    }
    const observedSha256 = await sha256Blob(data);
    if (observedSha256 !== artifact.sha256) {
      return failure(
        'release_artifact_hash_mismatch',
        409,
        'Uploaded release artifact SHA-256 differs from the immutable manifest',
        {
          profileId: artifact.profileId,
          format: artifact.format,
          expected: artifact.sha256,
          actual: observedSha256,
        },
      );
    }
  }

  return { ok: true, data: request.artifacts };
}

async function createArtifactDownload(
  actorSupabase: LcaReleaseRpcClient,
  serviceSupabase: SupabaseClient,
  artifactId: string,
): Promise<LcaReleaseRpcResult> {
  const metadata = await callLcaReleaseArtifactDownloadRpc(actorSupabase, artifactId);
  if (!metadata.ok) {
    return metadata;
  }
  const value = recordValue(metadata.data);
  const bucket = stringValue(value?.storageBucket);
  const objectKey = stringValue(value?.objectKey);
  const releaseRunId = stringValue(value?.releaseRunId);
  const profileId = stringValue(value?.profileId);
  const format = stringValue(value?.format);
  if (!value || !bucket || !objectKey || !releaseRunId || !profileId || !format) {
    return failure(
      'release_artifact_storage_ref_missing',
      502,
      'Release artifact metadata does not contain a storage ref',
      metadata.data,
    );
  }
  const release = await callLcaReleaseRunRpc(actorSupabase, releaseRunId);
  if (!release.ok) return release;
  const releaseVersion = stringValue(recordValue(release.data)?.releaseVersion);
  const downloadFilename = releaseVersion
    ? releaseArtifactDownloadFilename(releaseVersion, profileId, format)
    : null;
  if (!downloadFilename) {
    return failure(
      'release_artifact_filename_invalid',
      502,
      'Release artifact metadata cannot produce a safe download filename',
      { releaseRunId, profileId, format, releaseVersion },
    );
  }
  const { data, error } = await serviceSupabase.storage
    .from(bucket)
    .createSignedUrl(objectKey, LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS, {
      download: downloadFilename,
    });
  if (error || !data?.signedUrl) {
    return failure(
      'release_artifact_signed_download_failed',
      502,
      'Failed to create a signed download URL for the release artifact',
      error?.message ?? null,
    );
  }
  return {
    ok: true,
    data: {
      ...withoutStorageLocator(value),
      downloadFilename,
      signedDownloadUrl: data.signedUrl,
      signedDownloadExpiresInSeconds: LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS,
    },
  };
}

async function getCalculationBundle(
  actorSupabase: LcaReleaseRpcClient,
  serviceSupabase: SupabaseClient,
  packageId: string,
): Promise<LcaReleaseRpcResult> {
  const projection = await callLciaResultCalculationBundleRpc(actorSupabase, packageId);
  if (!projection.ok) return projection;

  const data = recordValue(projection.data);
  const bundleRef = recordValue(data?.calculationBundle);
  const productDownloadValues = Array.isArray(data?.productDownloads)
    ? data.productDownloads
    : null;
  const manifestUrl = stringValue(bundleRef?.manifestUrl);
  const manifestSha256 = stringValue(bundleRef?.manifestSha256);
  const manifestByteSize = finiteInteger(bundleRef?.manifestByteSize);
  const bundleContentHash = stringValue(bundleRef?.bundleContentHash);
  const artifactCount = finiteInteger(bundleRef?.artifactCount);
  const durableSchemaVersion = stringValue(bundleRef?.schemaVersion);
  if (
    !data ||
    !bundleRef ||
    !manifestUrl ||
    !manifestSha256 ||
    manifestByteSize === null ||
    !bundleContentHash ||
    artifactCount === null ||
    !durableSchemaVersion ||
    !SUPPORTED_CALCULATION_BUNDLE_SCHEMAS.has(durableSchemaVersion) ||
    !productDownloadValues ||
    ![0, 5].includes(productDownloadValues.length)
  ) {
    return failure(
      'calculation_bundle_ref_invalid',
      502,
      'Calculation Bundle metadata is incomplete or invalid',
      projection.data,
    );
  }
  if (manifestByteSize > LCA_CALCULATION_BUNDLE_MAX_MANIFEST_BYTES) {
    return failure(
      'calculation_bundle_manifest_too_large',
      409,
      'Calculation Bundle manifest exceeds the maximum readable size',
      { manifestByteSize, maximum: LCA_CALCULATION_BUNDLE_MAX_MANIFEST_BYTES },
    );
  }

  const storagePath = parseStoragePathFromArtifactUrl(manifestUrl);
  if (!storagePath) {
    return failure(
      'calculation_bundle_storage_ref_invalid',
      502,
      'Calculation Bundle manifest URL is not a supported private storage ref',
    );
  }
  const downloaded = await serviceSupabase.storage
    .from(storagePath.bucket)
    .download(storagePath.objectPath);
  if (downloaded.error || !downloaded.data) {
    return failure(
      'calculation_bundle_manifest_download_failed',
      502,
      'Failed to read the Calculation Bundle manifest',
      downloaded.error?.message ?? null,
    );
  }
  if (downloaded.data.size !== manifestByteSize) {
    return failure(
      'calculation_bundle_manifest_size_mismatch',
      409,
      'Calculation Bundle manifest byte size differs from its durable reference',
      { expected: manifestByteSize, actual: downloaded.data.size },
    );
  }
  const observedManifestSha256 = await sha256Blob(downloaded.data);
  if (observedManifestSha256 !== manifestSha256) {
    return failure(
      'calculation_bundle_manifest_hash_mismatch',
      409,
      'Calculation Bundle manifest SHA-256 differs from its durable reference',
      { expected: manifestSha256, actual: observedManifestSha256 },
    );
  }

  let manifest: Record<string, unknown>;
  try {
    manifest = recordValue(JSON.parse(await downloaded.data.text())) ?? {};
  } catch (error) {
    return failure(
      'calculation_bundle_manifest_invalid_json',
      502,
      'Calculation Bundle manifest is not valid JSON',
      error instanceof Error ? error.message : String(error),
    );
  }
  const manifestArtifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : null;
  if (
    manifest.schemaVersion !== durableSchemaVersion ||
    manifest.bundleContentHash !== bundleContentHash ||
    !manifestArtifacts ||
    manifestArtifacts.length !== artifactCount
  ) {
    return failure(
      'calculation_bundle_manifest_binding_mismatch',
      409,
      'Calculation Bundle manifest does not bind its durable schema, content hash, and artifact count',
    );
  }

  const signedManifest = await serviceSupabase.storage
    .from(storagePath.bucket)
    .createSignedUrl(storagePath.objectPath, LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS);
  if (signedManifest.error || !signedManifest.data?.signedUrl) {
    return failure(
      'calculation_bundle_manifest_sign_failed',
      502,
      'Failed to create a signed Calculation Bundle manifest URL',
      signedManifest.error?.message ?? null,
    );
  }

  const artifacts: Array<Record<string, unknown>> = [];
  for (const artifactValue of manifestArtifacts) {
    const artifact = recordValue(artifactValue);
    const relativePath = stringValue(artifact?.path);
    const sha256 = stringValue(artifact?.sha256);
    const byteSize = finiteInteger(artifact?.byteSize);
    const objectPath = relativePath ? childObjectPath(storagePath.objectPath, relativePath) : null;
    if (!artifact || !relativePath || !sha256 || byteSize === null || !objectPath) {
      return failure(
        'calculation_bundle_artifact_ref_invalid',
        409,
        'Calculation Bundle contains an invalid or unsafe artifact reference',
        artifactValue,
      );
    }
    const signed = await serviceSupabase.storage
      .from(storagePath.bucket)
      .createSignedUrl(objectPath, LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      return failure(
        'calculation_bundle_artifact_sign_failed',
        502,
        'Failed to create a signed Calculation Bundle artifact URL',
        { path: relativePath, detail: signed.error?.message ?? null },
      );
    }
    artifacts.push({
      ...withoutStorageLocator(artifact),
      signedDownloadUrl: signed.data.signedUrl,
      signedDownloadExpiresInSeconds: LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS,
    });
  }

  const downloads: Array<Record<string, unknown>> = [];
  const observedRoles = new Set<string>();
  for (const downloadValue of productDownloadValues) {
    const download = recordValue(downloadValue);
    const role = stringValue(download?.role);
    const group = stringValue(download?.group);
    const fileName = stringValue(download?.fileName);
    const schemaVersion = stringValue(download?.schemaVersion);
    const mediaType = stringValue(download?.mediaType);
    const sha256 = stringValue(download?.sha256);
    const byteSize = finiteInteger(download?.byteSize);
    const recordCount = finiteInteger(download?.recordCount);
    const artifactUrl = stringValue(download?.artifactUrl);
    const expected = role ? CALCULATION_DOWNLOAD_ROLES.get(role) : undefined;
    const productStoragePath = artifactUrl ? parseStoragePathFromArtifactUrl(artifactUrl) : null;
    const expectedProductObjectPath = fileName
      ? childObjectPath(storagePath.objectPath, `downloads/${fileName}`)
      : null;
    if (
      !download ||
      !role ||
      !expected ||
      observedRoles.has(role) ||
      group !== expected[0] ||
      fileName !== expected[1] ||
      mediaType !== expected[2] ||
      schemaVersion !== 'tiangong.calculation-download.v1' ||
      !sha256?.match(/^[0-9a-f]{64}$/) ||
      byteSize === null ||
      byteSize === 0 ||
      recordCount === null ||
      !productStoragePath ||
      productStoragePath.bucket !== storagePath.bucket ||
      productStoragePath.objectPath !== expectedProductObjectPath
    ) {
      return failure(
        'calculation_download_ref_invalid',
        409,
        'Calculation product download metadata is incomplete or invalid',
        downloadValue,
      );
    }
    observedRoles.add(role);
    const signed = await serviceSupabase.storage
      .from(productStoragePath.bucket)
      .createSignedUrl(productStoragePath.objectPath, LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS, {
        download: fileName,
      });
    if (signed.error || !signed.data?.signedUrl) {
      return failure(
        'calculation_download_sign_failed',
        502,
        'Failed to create a signed calculation product download URL',
        { role, detail: signed.error?.message ?? null },
      );
    }
    downloads.push({
      ...withoutStorageLocator(download),
      signedDownloadUrl: signed.data.signedUrl,
      signedDownloadExpiresInSeconds: LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS,
    });
  }

  return {
    ok: true,
    data: {
      ...withoutStorageLocator(data),
      calculationBundle: {
        ...withoutStorageLocator(bundleRef),
        manifest,
        manifestDownload: {
          sha256: manifestSha256,
          byteSize: manifestByteSize,
          mediaType: 'application/json',
          signedDownloadUrl: signedManifest.data.signedUrl,
          signedDownloadExpiresInSeconds: LCA_RELEASE_SIGNED_URL_EXPIRES_IN_SECONDS,
        },
        artifacts,
        downloads,
      },
    },
  };
}

function requireExplicitActorClient(client: LcaReleaseRpcClient | null | undefined) {
  if (!client || typeof client.rpc !== 'function') {
    throw new Error('LCA release repository requires an explicit actor Supabase client');
  }
  return client;
}

export function createLcaReleaseCommandRepository(
  actorSupabase: LcaReleaseRpcClient,
  serviceSupabase: SupabaseClient = createSupabaseServiceClient(),
): LcaReleaseCommandRepository {
  const actorClient = requireExplicitActorClient(actorSupabase);
  return {
    assertManager: () => callLcaReleaseManagerAssertionRpc(actorClient),
    prepare: (request, audit) => callLcaReleasePrepareRpc(actorClient, request, audit),
    getRun: (releaseRunId) => callLcaReleaseRunRpc(actorClient, releaseRunId),
    getCurrent: () => callCurrentLcaReleaseRpc(actorClient),
    getCurrentProcess: (processId, processVersion) =>
      callCurrentLcaReleaseProcessRpc(actorClient, processId, processVersion),
    createArtifactUploads: (request) => createArtifactUploads(serviceSupabase, request),
    verifyArtifacts: (request) => verifyArtifacts(serviceSupabase, request),
    finalizeArtifacts: (request, audit) =>
      callLcaReleaseFinalizeArtifactsRpc(serviceSupabase, request, audit),
    approve: (request, audit) => callLcaReleaseApproveRpc(actorClient, request, audit),
    publish: (request, audit) => callLcaReleasePublishRpc(actorClient, request, audit),
    readbackVerify: (request, audit) =>
      callLcaReleaseReadbackVerifyRpc(actorClient, request, audit),
    unpublish: (request, audit) => callLcaReleaseUnpublishRpc(actorClient, request, audit),
    getCalculationBundle: (packageId) =>
      getCalculationBundle(actorClient, serviceSupabase, packageId),
    createArtifactDownload: (artifactId) =>
      createArtifactDownload(actorClient, serviceSupabase, artifactId),
  };
}

export function createPublicLcaReleaseRepository(
  serviceSupabase: SupabaseClient = createSupabaseServiceClient(),
): Pick<
  LcaReleaseCommandRepository,
  'getRun' | 'getCurrent' | 'getCurrentProcess' | 'createArtifactDownload'
> {
  return {
    getRun: (releaseRunId) => callLcaReleaseRunRpc(serviceSupabase, releaseRunId),
    getCurrent: () => callCurrentLcaReleaseRpc(serviceSupabase),
    getCurrentProcess: (processId, processVersion) =>
      callCurrentLcaReleaseProcessRpc(serviceSupabase, processId, processVersion),
    createArtifactDownload: (artifactId) =>
      createArtifactDownload(serviceSupabase, serviceSupabase, artifactId),
  };
}

export function lcaReleaseRepositoryForActor(
  actor: ActorContext,
  serviceSupabase?: SupabaseClient,
) {
  return createLcaReleaseCommandRepository(actor.supabase, serviceSupabase);
}
