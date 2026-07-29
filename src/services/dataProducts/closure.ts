import { invokeDataProductCommand, type DataProductApiResult } from './api';

/**
 * Safe, versioned Data Product command contracts.  Scope construction and
 * evidence stay server-owned: this module never accepts a client Snapshot or
 * raw closure rows.
 */
export type ClosureCheckStatus =
  'queued' | 'running' | 'passed' | 'blocked' | 'failed' | 'cancelled';
export type CertificateValidity = 'unavailable' | 'valid' | 'stale' | 'revoked';

/**
 * Safe worker-job projection shared by the create receipt and the closure
 * summary. The database worker envelope contains more public fields than the
 * Data Product UI needs; do not leak its result or transport metadata through
 * this feature-specific contract.
 */
export type ClosureCheckWorkerJobV1 = {
  jobId: string;
  jobKind?: string;
  status?: ClosureCheckStatus | 'waiting' | 'completed' | 'stale';
  phase?: string;
  progressFraction?: number;
  errorCode?: string;
  blockerCodes?: string[];
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
};

/** The response to `create_closure_check`; it is not a closure summary. */
export type ClosureCheckCreateResultV1 = {
  closureCheckId: string;
  requestedScopeHash: string;
  policyFingerprint: string;
  workerJob: ClosureCheckWorkerJobV1 | null;
  reused: boolean;
};

export type ClosureCheckSummaryV1 = {
  schemaVersion: 'lcia.scope-closure-check.v1';
  closureCheckId: string;
  runStatus: ClosureCheckStatus;
  certificateValidity: CertificateValidity;
  scanCompleteness: 'complete' | 'incomplete' | 'unknown';
  requestedScopeHash?: string;
  effectiveScopeHash?: string;
  policyFingerprint?: string;
  dataSnapshotToken?: string;
  blockerCodes?: string[];
  summary?: Record<string, unknown>;
  artifacts?: ClosureArtifactV1[];
  scanExecutionId?: string;
  reusedFromCheckId?: string;
  workerJob?: ClosureCheckWorkerJobV1 | null;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
};

export type ClosureArtifactLifecycleState =
  'preparing' | 'available' | 'expired' | 'unavailable' | 'failed';

export type ClosurePrimaryArtifactRole = 'closure_report_xlsx' | 'closure_issue_manifest';
export type ClosureArtifactRole = ClosurePrimaryArtifactRole;
export type ClosureArtifactState = 'pending' | 'ready' | 'expired' | 'deleted' | 'failed';
export type ClosureArtifactFormat = 'xlsx' | 'json';
export type ClosureArtifactMediaType =
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  | 'application/vnd.tiangong.scope-closure-manifest+json';

type ClosureArtifactProjectionBase = {
  artifactRole: ClosureArtifactRole;
};

export type ClosureArtifactV1 =
  | (ClosureArtifactProjectionBase & {
      artifactState: 'ready';
      filename: string;
      format: ClosureArtifactFormat;
      mediaType: ClosureArtifactMediaType;
      size: number;
      checksumSha256: string;
      artifactExpiresAt: string;
    })
  | (ClosureArtifactProjectionBase & {
      artifactState: Exclude<ClosureArtifactState, 'ready'>;
      filename: string | null;
      format: ClosureArtifactFormat | null;
      mediaType: ClosureArtifactMediaType | null;
      size: number | null;
      checksumSha256: string | null;
      artifactExpiresAt: string | null;
    });

export type ClosureScopeIdentityV1 = {
  id: string;
  version: string;
};

export type ClosureCheckRequestV1 = {
  requestedScope: {
    coverageMode: 'global_eligible' | 'subset';
    processes?: ClosureScopeIdentityV1[];
    lciaMethods: ClosureScopeIdentityV1[];
    certificateFreshnessPolicy?: string;
    linkPolicy?: {
      linkSemanticsVersion: string;
      [key: string]: unknown;
    };
  };
  requestIdempotencyToken: string;
};

/** A curated issue row; never a raw worker log, stack trace, or closure artifact. */
export type ClosureCheckIssueV1 = {
  issueId: string;
  severity: 'blocking' | 'warning' | 'info';
  blocking: boolean;
  code: string;
  title: string;
  summary?: string;
  suggestedAction?: string;
  occurrenceCount: number;
  affectedRootCount: number;
};

export type ClosureCheckIssuePageV1 = {
  schemaVersion: 'lcia.scope-closure-issues-page.v1';
  closureCheckId: string;
  issues: ClosureCheckIssueV1[];
  totalCount: number;
  nextCursor?: string;
};

/**
 * The report command deliberately returns a descriptor rather than an artifact
 * row.  The URL is a short-lived, server-authorized capability; callers must
 * not infer storage paths or retain any raw command payload.
 */
export type ClosureReportDownloadDescriptorV1 = {
  signedDownloadUrl: string;
  artifactId: string;
  artifactRole: ClosureArtifactRole;
  artifactState: 'ready';
  format: ClosureArtifactFormat;
  filename: string;
  mediaType: ClosureArtifactMediaType;
  size: number;
  checksumSha256: string;
  artifactExpiresAt: string;
  signedUrlExpiresAt: string;
  expiresInSeconds: number;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_error) {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => isNonEmptyString(item));
}

function isTimestamp(value: unknown): value is string {
  return isNonEmptyString(value) && Number.isFinite(Date.parse(value));
}

const closureArtifactIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const closureArtifactChecksumPattern = /^[a-f0-9]{64}$/;
function isClosureArtifactRole(value: unknown): value is ClosureArtifactRole {
  return value === 'closure_report_xlsx' || value === 'closure_issue_manifest';
}

function hasSemanticFilename(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    value.length <= 255 &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function matchesClosureArtifactRepresentation(
  role: ClosureArtifactRole,
  format: unknown,
  mediaType: unknown,
): boolean {
  if (role === 'closure_report_xlsx') {
    return (
      format === 'xlsx' &&
      mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
  return format === 'json' && mediaType === 'application/vnd.tiangong.scope-closure-manifest+json';
}

export function decodeClosureArtifact(value: unknown): ClosureArtifactV1 | null {
  if (!isRecord(value)) return null;
  const exactFields = [
    'artifactRole',
    'artifactState',
    'filename',
    'format',
    'mediaType',
    'size',
    'checksumSha256',
    'artifactExpiresAt',
  ];
  if (
    Object.keys(value).length !== exactFields.length ||
    exactFields.some((field) => !Object.prototype.hasOwnProperty.call(value, field))
  ) {
    return null;
  }
  const artifactRole = value.artifactRole;
  const artifactState = value.artifactState;
  if (
    !isClosureArtifactRole(artifactRole) ||
    !['pending', 'ready', 'expired', 'deleted', 'failed'].includes(String(artifactState))
  ) {
    return null;
  }

  const hasFormat = value.format !== undefined && value.format !== null;
  const hasFilename = value.filename !== undefined && value.filename !== null;
  const hasMediaType = value.mediaType !== undefined && value.mediaType !== null;
  const hasSize = value.size !== undefined && value.size !== null;
  const hasChecksum = value.checksumSha256 !== undefined && value.checksumSha256 !== null;
  const hasExpiry = value.artifactExpiresAt !== undefined && value.artifactExpiresAt !== null;
  const parsedSize = numberValue(value.size);

  if (
    (hasFilename && !hasSemanticFilename(value.filename)) ||
    (hasSize &&
      (parsedSize === undefined || !Number.isSafeInteger(parsedSize) || parsedSize < 0)) ||
    (hasChecksum &&
      (!isNonEmptyString(value.checksumSha256) ||
        !closureArtifactChecksumPattern.test(value.checksumSha256))) ||
    (hasExpiry && !isTimestamp(value.artifactExpiresAt)) ||
    ((hasFormat || hasMediaType) &&
      !matchesClosureArtifactRepresentation(artifactRole, value.format, value.mediaType))
  ) {
    return null;
  }

  if (artifactState === 'ready') {
    if (![hasFilename, hasFormat, hasMediaType, hasSize, hasChecksum, hasExpiry].every(Boolean)) {
      return null;
    }
    return {
      artifactRole,
      artifactState: 'ready',
      filename: value.filename as string,
      format: value.format as ClosureArtifactFormat,
      mediaType: value.mediaType as ClosureArtifactMediaType,
      size: parsedSize!,
      checksumSha256: value.checksumSha256 as string,
      artifactExpiresAt: value.artifactExpiresAt as string,
    };
  }

  return {
    artifactRole,
    artifactState: artifactState as Exclude<ClosureArtifactState, 'ready'>,
    filename: hasFilename ? (value.filename as string) : null,
    format: hasFormat ? (value.format as ClosureArtifactFormat) : null,
    mediaType: hasMediaType ? (value.mediaType as ClosureArtifactMediaType) : null,
    size: hasSize ? parsedSize! : null,
    checksumSha256: hasChecksum ? (value.checksumSha256 as string) : null,
    artifactExpiresAt: hasExpiry ? (value.artifactExpiresAt as string) : null,
  };
}

/**
 * Accept the two server-safe worker-job shapes (`id`/`progress` from create,
 * `jobId`/`progressFraction` from read) and drop every other field.
 */
export function decodeClosureCheckWorkerJob(value: unknown): ClosureCheckWorkerJobV1 | null {
  if (!isRecord(value)) return null;
  const jobId = isNonEmptyString(value.jobId)
    ? value.jobId
    : isNonEmptyString(value.id)
      ? value.id
      : undefined;
  if (!jobId) return null;
  const status = value.status;
  const progress = numberValue(value.progressFraction) ?? numberValue(value.progress);
  const blockerCodes = stringArray(value.blockerCodes);
  return {
    jobId,
    ...(isNonEmptyString(value.jobKind) ? { jobKind: value.jobKind } : {}),
    ...(typeof status === 'string' ? { status: status as ClosureCheckWorkerJobV1['status'] } : {}),
    ...(isNonEmptyString(value.phase) ? { phase: value.phase } : {}),
    ...(progress !== undefined ? { progressFraction: progress } : {}),
    ...(isNonEmptyString(value.errorCode) ? { errorCode: value.errorCode } : {}),
    ...(blockerCodes ? { blockerCodes } : {}),
    ...(isNonEmptyString(value.createdAt) ? { createdAt: value.createdAt } : {}),
    ...(isNonEmptyString(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
    ...(isNonEmptyString(value.finishedAt) ? { finishedAt: value.finishedAt } : {}),
  };
}

export function decodeClosureCheckCreateResult(value: unknown): ClosureCheckCreateResultV1 | null {
  if (!isRecord(value)) return null;
  const closureCheckId = value.closureCheckId;
  const requestedScopeHash = value.requestedScopeHash;
  const policyFingerprint = value.policyFingerprint;
  if (
    !isNonEmptyString(closureCheckId) ||
    !isNonEmptyString(requestedScopeHash) ||
    !isNonEmptyString(policyFingerprint) ||
    typeof value.reused !== 'boolean'
  ) {
    return null;
  }
  const workerJob = value.workerJob === null ? null : decodeClosureCheckWorkerJob(value.workerJob);
  if (value.workerJob !== null && !workerJob) return null;
  return {
    closureCheckId,
    requestedScopeHash,
    policyFingerprint,
    workerJob,
    reused: value.reused,
  };
}

export function decodeClosureCheckSummary(value: unknown): ClosureCheckSummaryV1 | null {
  if (!isRecord(value)) return null;
  const closureCheckId = value.closureCheckId;
  const runStatus = value.runStatus;
  const certificateValidity = value.certificateValidity;
  const scanCompleteness = value.scanCompleteness;
  if (
    value.schemaVersion !== 'lcia.scope-closure-check.v1' ||
    !isNonEmptyString(closureCheckId) ||
    !['queued', 'running', 'passed', 'blocked', 'failed', 'cancelled'].includes(
      String(runStatus),
    ) ||
    !['unavailable', 'valid', 'stale', 'revoked'].includes(String(certificateValidity)) ||
    !['complete', 'incomplete', 'unknown'].includes(String(scanCompleteness))
  ) {
    return null;
  }
  const blockerCodes = stringArray(value.blockerCodes);
  const workerJob = decodeClosureCheckWorkerJob(value.workerJob);
  let artifacts: ClosureArtifactV1[] | undefined;
  if (value.artifacts !== undefined && value.artifacts !== null) {
    if (!Array.isArray(value.artifacts) || value.artifacts.length !== 2) return null;
    const decodedArtifacts = value.artifacts.map(decodeClosureArtifact);
    if (
      decodedArtifacts.some((artifact) => artifact === null) ||
      decodedArtifacts[0]?.artifactRole !== 'closure_report_xlsx' ||
      decodedArtifacts[1]?.artifactRole !== 'closure_issue_manifest'
    ) {
      return null;
    }
    artifacts = decodedArtifacts as ClosureArtifactV1[];
  }
  return {
    schemaVersion: 'lcia.scope-closure-check.v1',
    closureCheckId,
    runStatus: runStatus as ClosureCheckStatus,
    certificateValidity: certificateValidity as CertificateValidity,
    scanCompleteness: scanCompleteness as ClosureCheckSummaryV1['scanCompleteness'],
    ...(isNonEmptyString(value.requestedScopeHash)
      ? { requestedScopeHash: value.requestedScopeHash }
      : {}),
    ...(isNonEmptyString(value.effectiveScopeHash)
      ? { effectiveScopeHash: value.effectiveScopeHash }
      : {}),
    ...(isNonEmptyString(value.policyFingerprint)
      ? { policyFingerprint: value.policyFingerprint }
      : {}),
    ...(isNonEmptyString(value.dataSnapshotToken)
      ? { dataSnapshotToken: value.dataSnapshotToken }
      : {}),
    ...(blockerCodes ? { blockerCodes } : {}),
    ...(isRecord(value.summary) ? { summary: value.summary } : {}),
    ...(artifacts ? { artifacts } : {}),
    ...(isNonEmptyString(value.scanExecutionId) ? { scanExecutionId: value.scanExecutionId } : {}),
    ...(isNonEmptyString(value.reusedFromCheckId)
      ? { reusedFromCheckId: value.reusedFromCheckId }
      : {}),
    ...(value.workerJob === null ? { workerJob: null } : workerJob ? { workerJob } : {}),
    ...(isNonEmptyString(value.createdAt) ? { createdAt: value.createdAt } : {}),
    ...(isNonEmptyString(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
    ...(isNonEmptyString(value.finishedAt) ? { finishedAt: value.finishedAt } : {}),
  };
}

export function decodeClosureCheckIssue(value: unknown): ClosureCheckIssueV1 | null {
  if (!isRecord(value)) return null;
  const issueId = value.issueId;
  const severity = value.severity;
  const code = value.code;
  const title = value.title;
  const occurrenceCount = numberValue(value.occurrenceCount);
  const affectedRootCount = numberValue(value.affectedRootCount);
  if (
    !isNonEmptyString(issueId) ||
    !['blocking', 'warning', 'info'].includes(String(severity)) ||
    typeof value.blocking !== 'boolean' ||
    !isNonEmptyString(code) ||
    !isNonEmptyString(title) ||
    occurrenceCount === undefined ||
    occurrenceCount < 0 ||
    affectedRootCount === undefined ||
    affectedRootCount < 0
  ) {
    return null;
  }
  return {
    issueId,
    severity: severity as ClosureCheckIssueV1['severity'],
    blocking: value.blocking,
    code,
    title,
    occurrenceCount,
    affectedRootCount,
    ...(isNonEmptyString(value.summary) ? { summary: value.summary } : {}),
    ...(isNonEmptyString(value.suggestedAction) ? { suggestedAction: value.suggestedAction } : {}),
  };
}

export function decodeClosureCheckIssuePage(value: unknown): ClosureCheckIssuePageV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 'lcia.scope-closure-issues-page.v1') return null;
  const totalCount = numberValue(value.totalCount);
  if (
    !isNonEmptyString(value.closureCheckId) ||
    !Array.isArray(value.issues) ||
    totalCount === undefined ||
    !Number.isInteger(totalCount) ||
    totalCount < 0
  ) {
    return null;
  }
  const issues = value.issues.map(decodeClosureCheckIssue);
  if (issues.some((issue) => !issue)) return null;
  return {
    schemaVersion: 'lcia.scope-closure-issues-page.v1',
    closureCheckId: value.closureCheckId,
    issues: issues as ClosureCheckIssueV1[],
    totalCount,
    ...(isNonEmptyString(value.nextCursor) ? { nextCursor: value.nextCursor } : {}),
  };
}

/** Decode and whitelist the public report-download descriptor at the boundary. */
export function decodeClosureReportDownloadDescriptor(
  value: unknown,
): ClosureReportDownloadDescriptorV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const signedDownloadUrl = row.signedDownloadUrl;
  const artifactId = row.artifactId;
  const artifactRole = row.artifactRole;
  const artifactState = row.artifactState;
  const format = row.format;
  const filename = row.filename;
  const mediaType = row.mediaType;
  const size = numberValue(row.size);
  const checksumSha256 = row.checksumSha256;
  const artifactExpiresAt = row.artifactExpiresAt;
  const signedUrlExpiresAt = row.signedUrlExpiresAt;
  const expiresInSeconds = numberValue(row.expiresInSeconds);

  if (
    !isNonEmptyString(signedDownloadUrl) ||
    !isHttpUrl(signedDownloadUrl) ||
    !isNonEmptyString(artifactId) ||
    !closureArtifactIdPattern.test(artifactId) ||
    !isClosureArtifactRole(artifactRole) ||
    artifactState !== 'ready' ||
    !isNonEmptyString(format) ||
    !hasSemanticFilename(filename) ||
    !isNonEmptyString(mediaType) ||
    size === undefined ||
    !Number.isSafeInteger(size) ||
    size < 0 ||
    !isNonEmptyString(checksumSha256) ||
    !closureArtifactChecksumPattern.test(checksumSha256) ||
    !isTimestamp(artifactExpiresAt) ||
    !isTimestamp(signedUrlExpiresAt) ||
    expiresInSeconds === undefined ||
    !Number.isSafeInteger(expiresInSeconds) ||
    expiresInSeconds <= 0 ||
    expiresInSeconds > 900 ||
    Date.parse(signedUrlExpiresAt) > Date.parse(artifactExpiresAt) ||
    !matchesClosureArtifactRepresentation(artifactRole, format, mediaType)
  ) {
    return null;
  }

  return {
    signedDownloadUrl,
    artifactId,
    artifactRole,
    artifactState: 'ready',
    format: format as ClosureArtifactFormat,
    filename,
    mediaType: mediaType as ClosureArtifactMediaType,
    size,
    checksumSha256,
    artifactExpiresAt,
    signedUrlExpiresAt,
    expiresInSeconds,
  };
}

async function invokeDecodedClosureCommand<T>(
  payload: Record<string, unknown>,
  decode: (value: unknown) => T | null,
  invalidCode: string,
): Promise<DataProductApiResult<T>> {
  const response = await invokeDataProductCommand<unknown>(payload);
  if (response.error || !response.data) return response as DataProductApiResult<T>;
  const decoded = decode(response.data);
  if (decoded) return { ...response, data: decoded };
  return {
    ...response,
    data: null,
    error: {
      message: 'Invalid closure command response',
      code: invalidCode,
      details: '',
      hint: '',
    },
  };
}

export function createClosureCheck(
  request: ClosureCheckRequestV1,
): Promise<DataProductApiResult<ClosureCheckCreateResultV1>> {
  return invokeDecodedClosureCommand<ClosureCheckCreateResultV1>(
    {
      action: 'create_closure_check',
      ...request,
    },
    decodeClosureCheckCreateResult,
    'INVALID_CLOSURE_CHECK_CREATE_RESULT',
  );
}

export function getClosureCheck(
  closureCheckId: string,
): Promise<DataProductApiResult<ClosureCheckSummaryV1>> {
  return invokeDecodedClosureCommand<ClosureCheckSummaryV1>(
    { action: 'get_closure_check', closureCheckId },
    decodeClosureCheckSummary,
    'INVALID_CLOSURE_CHECK_SUMMARY',
  );
}

export async function createClosureReportDownload(
  closureCheckId: string,
  artifactRole: ClosureArtifactRole = 'closure_report_xlsx',
): Promise<DataProductApiResult<ClosureReportDownloadDescriptorV1>> {
  const response = await invokeDataProductCommand<unknown>({
    action: 'create_closure_report_download',
    closureCheckId,
    artifactRole,
  });
  if (response.error || !response.data) {
    return response as DataProductApiResult<ClosureReportDownloadDescriptorV1>;
  }

  const descriptor = decodeClosureReportDownloadDescriptor(response.data);
  if (descriptor && descriptor.artifactRole !== artifactRole) {
    return {
      ...response,
      data: null,
      error: {
        message: 'Invalid closure report download descriptor',
        code: 'INVALID_CLOSURE_REPORT_DESCRIPTOR',
        details: '',
        hint: '',
      },
    };
  }
  if (descriptor) return { ...response, data: descriptor };

  return {
    ...response,
    data: null,
    error: {
      message: 'Invalid closure report download descriptor',
      code: 'INVALID_CLOSURE_REPORT_DESCRIPTOR',
      details: '',
      hint: '',
    },
  };
}

export function listClosureCheckIssues(
  closureCheckId: string,
  options: { afterIssueId?: string; limit?: number } = {},
): Promise<DataProductApiResult<ClosureCheckIssuePageV1>> {
  return invokeDecodedClosureCommand<ClosureCheckIssuePageV1>(
    {
      action: 'list_closure_issues',
      closureCheckId,
      ...(options.afterIssueId ? { afterIssueId: options.afterIssueId } : {}),
      ...(options.limit ? { limit: options.limit } : {}),
    },
    decodeClosureCheckIssuePage,
    'INVALID_CLOSURE_CHECK_ISSUE_PAGE',
  );
}
