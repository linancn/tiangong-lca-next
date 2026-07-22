import { invokeDataProductCommand, type DataProductApiResult } from './api';

/**
 * Safe, versioned Data Product command contracts.  Scope construction and
 * evidence stay server-owned: this module never accepts a client Snapshot or
 * raw closure rows.
 */
export type ClosureCheckStatus =
  'queued' | 'running' | 'passed' | 'blocked' | 'failed' | 'cancelled';
export type CertificateValidity = 'none' | 'valid' | 'stale' | 'revoked';

export type ClosureCheckSummaryV1 = {
  schemaVersion: 'lcia.scope-closure-summary.v1';
  closureCheckId: string;
  workerJobId?: string;
  runStatus: ClosureCheckStatus;
  certificateValidity: CertificateValidity;
  scanCompleteness: 'complete' | 'incomplete' | 'unknown';
  requestedScopeHash?: string;
  policyFingerprint?: string;
  blockingCount?: number;
  warningCount?: number;
  reportAvailable?: boolean;
  canCancel?: boolean;
  canDownloadReport?: boolean;
  updatedAt?: string;
};

export type ClosureCheckRequestV1 = {
  requestedScope: {
    coverageMode: 'global_eligible' | 'subset';
    processes?: Array<{ id: string; version: string }>;
    lciaMethods: unknown[];
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
  code: string;
  title: string;
  summary?: string;
  suggestedAction?: string;
  affectedProcess?: {
    id?: string;
    version?: string;
  };
};

export type ClosureCheckIssuePageV1 = {
  closureCheckId: string;
  issues: ClosureCheckIssueV1[];
  nextCursor?: string;
  totalCount?: number;
};

/**
 * The report command deliberately returns a descriptor rather than an artifact
 * row.  The URL is a short-lived, server-authorized capability; callers must
 * not infer storage paths or retain any raw command payload.
 */
export type ClosureReportDownloadDescriptorV1 = {
  signedDownloadUrl: string;
  artifactId: string;
  mediaType: string;
  size: number;
  checksumSha256: string;
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

/** Decode and whitelist the public report-download descriptor at the boundary. */
export function decodeClosureReportDownloadDescriptor(
  value: unknown,
): ClosureReportDownloadDescriptorV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const row = value as Record<string, unknown>;
  const signedDownloadUrl = row.signedDownloadUrl;
  const artifactId = row.artifactId;
  const mediaType = row.mediaType;
  const size = row.size;
  const checksumSha256 = row.checksumSha256;
  const expiresInSeconds = row.expiresInSeconds;

  if (
    !isNonEmptyString(signedDownloadUrl) ||
    !isHttpUrl(signedDownloadUrl) ||
    !isNonEmptyString(artifactId) ||
    !isNonEmptyString(mediaType) ||
    !Number.isFinite(size) ||
    size < 0 ||
    !isNonEmptyString(checksumSha256) ||
    !Number.isFinite(expiresInSeconds) ||
    expiresInSeconds <= 0
  ) {
    return null;
  }

  return {
    signedDownloadUrl,
    artifactId,
    mediaType,
    size,
    checksumSha256,
    expiresInSeconds,
  };
}

export function createClosureCheck(
  request: ClosureCheckRequestV1,
): Promise<DataProductApiResult<ClosureCheckSummaryV1>> {
  return invokeDataProductCommand<ClosureCheckSummaryV1>({
    action: 'create_closure_check',
    ...request,
  });
}

export function getClosureCheck(
  closureCheckId: string,
): Promise<DataProductApiResult<ClosureCheckSummaryV1>> {
  return invokeDataProductCommand<ClosureCheckSummaryV1>({
    action: 'get_closure_check',
    closureCheckId,
  });
}

export async function createClosureReportDownload(
  closureCheckId: string,
): Promise<DataProductApiResult<ClosureReportDownloadDescriptorV1>> {
  const response = await invokeDataProductCommand<unknown>({
    action: 'create_closure_report_download',
    closureCheckId,
  });
  if (response.error || !response.data) {
    return response as DataProductApiResult<ClosureReportDownloadDescriptorV1>;
  }

  const descriptor = decodeClosureReportDownloadDescriptor(response.data);
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
  return invokeDataProductCommand<ClosureCheckIssuePageV1>({
    action: 'list_closure_issues',
    closureCheckId,
    ...(options.afterIssueId ? { afterIssueId: options.afterIssueId } : {}),
    ...(options.limit ? { limit: options.limit } : {}),
  });
}
