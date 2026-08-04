export const LCA_RELEASE_PROFILE_IDS = [
  'unit-process-full-closure.v1',
  'standalone-lifecyclemodel-result-full-closure.v1',
] as const;

export const LCA_RELEASE_FORMATS = ['tidas', 'ilcd'] as const;

export type LcaReleaseProfileId = (typeof LCA_RELEASE_PROFILE_IDS)[number];
export type LcaReleaseFormat = (typeof LCA_RELEASE_FORMATS)[number];

export type LcaReleaseArtifactInput = {
  profileId: LcaReleaseProfileId;
  format: LcaReleaseFormat;
  sha256: string;
  byteSize: number;
  mediaType: 'application/zip';
};

export type LcaReleaseUploadedArtifact = LcaReleaseArtifactInput & {
  storageBucket: string;
  objectKey: string;
};

export type LcaReleasePrepareRequest = {
  action: 'prepare';
  releaseRunId: string;
  releaseVersion: string;
  selectionManifestHash: string;
  inputManifestHash: string;
  calculationBundleRef: Record<string, unknown>;
  calculationBundleHash: string;
  profileLockHash: string;
  publishPlan: Record<string, unknown>;
  publishPlanHash: string;
  idempotencyKey: string;
};

export type LcaReleaseCreateArtifactUploadsRequest = {
  action: 'create_artifact_uploads';
  releaseRunId: string;
  publishPlanHash: string;
  artifacts: LcaReleaseArtifactInput[];
};

export type LcaReleaseFinalizeArtifactsRequest = {
  action: 'finalize_artifacts';
  releaseRunId: string;
  publishPlanHash: string;
  releaseManifest: Record<string, unknown>;
  releaseManifestHash: string;
  artifacts: LcaReleaseUploadedArtifact[];
};

export type LcaReleaseApproveRequest = {
  action: 'approve';
  releaseRunId: string;
  publishPlanHash: string;
  expiresAt?: string;
  reason?: string;
};

export type LcaReleasePublishRequest = {
  action: 'publish';
  releaseRunId: string;
  approvalId: string;
  approvalHash: string;
  publishPlanHash: string;
  idempotencyKey: string;
  credentialFingerprint: string;
  reason?: string;
};

export type LcaReleaseReadbackVerifyRequest = {
  action: 'readback_verify';
  releaseRunId: string;
  releaseManifestHash: string;
  artifactHashes: Array<{ artifactId: string; sha256: string }>;
};

export type LcaReleaseUnpublishRequest = {
  action: 'unpublish';
  publicationId: string;
  reason: string;
};

export type LcaReleaseGetRequest = {
  action: 'get_release';
  releaseRunId: string;
};

export type LcaReleaseGetCurrentRequest = {
  action: 'get_current';
};

export type LcaReleaseGetCalculationBundleRequest = {
  action: 'get_calculation_bundle';
  packageId: string;
};

export type LcaReleaseCreateArtifactDownloadRequest = {
  action: 'create_artifact_download';
  artifactId: string;
};

export type LcaReleaseCommandRequest =
  | LcaReleasePrepareRequest
  | LcaReleaseCreateArtifactUploadsRequest
  | LcaReleaseFinalizeArtifactsRequest
  | LcaReleaseApproveRequest
  | LcaReleasePublishRequest
  | LcaReleaseReadbackVerifyRequest
  | LcaReleaseUnpublishRequest
  | LcaReleaseGetRequest
  | LcaReleaseGetCurrentRequest
  | LcaReleaseGetCalculationBundleRequest
  | LcaReleaseCreateArtifactDownloadRequest;

export type LcaReleaseCommandFailure = {
  ok: false;
  code: string;
  message: string;
  status: number;
  details?: unknown;
};

export type LcaReleaseCommandExecutionResult =
  | { ok: true; body: unknown; status?: number }
  | LcaReleaseCommandFailure;
