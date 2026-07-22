import {
  invokeDataProductCommand,
  type DataProductApiResult,
  type DataProductCoverageMode,
} from './api';

/**
 * Edge contract assumptions until the paired command implementation lands:
 * - `create_closure_check` returns the safe ClosureCheckSummaryV1 and workerJobId.
 * - `get_closure_check` returns the same summary without raw issues/artifact locators.
 * - report download is capability-authorized and returns a short-lived URL only on demand.
 * These DTOs intentionally do not model effective scope, snapshots, raw issues, or locators.
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
  requestSchemaVersion: 'lcia.scope_closure_check.request.v1';
  requestedScopeHash: string;
  policyFingerprint: string;
  requestIdempotencyToken: string;
  audit?: { source: 'data-processing'; selectionVersion: 'data-product-scope-selection.v1' };
};

/** The server owns normalized scope/hash construction; Next never constructs a Snapshot. */
export type ClosureScopeContextRequestV1 = {
  scopeSchemaVersion: 'data-product-scope-selection.v1';
  coverageMode: DataProductCoverageMode;
  processes?: Array<{ id: string; version: string }>;
  lciaMethodSet: unknown[];
};

export type ClosureScopeContextV1 = {
  requestedScopeHash: string;
  policyFingerprint: string;
};

export function createClosureCheck(
  request: ClosureCheckRequestV1,
): Promise<DataProductApiResult<ClosureCheckSummaryV1>> {
  return invokeDataProductCommand<ClosureCheckSummaryV1>({
    action: 'create_closure_check',
    ...request,
  });
}

export function prepareClosureScope(
  request: ClosureScopeContextRequestV1,
): Promise<DataProductApiResult<ClosureScopeContextV1>> {
  return invokeDataProductCommand<ClosureScopeContextV1>({
    action: 'prepare_closure_scope',
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

export function getClosureReportDownload(
  closureCheckId: string,
): Promise<DataProductApiResult<{ url: string; filename?: string }>> {
  return invokeDataProductCommand<{ url: string; filename?: string }>({
    action: 'get_closure_report_download',
    closureCheckId,
  });
}
