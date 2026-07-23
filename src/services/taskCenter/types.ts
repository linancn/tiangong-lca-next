/**
 * The Task Center receives only this safe, versioned projection.  Raw worker
 * payloads, storage locators and report rows deliberately stay behind service
 * adapters so a new presenter cannot accidentally expose them in the shell.
 */
export type TaskCenterCategory = 'lca' | 'tidas' | 'review' | 'data_product';

export type TaskRawStatus =
  | 'queued'
  | 'running'
  | 'waiting'
  | 'completed'
  | 'blocked'
  | 'stale'
  | 'failed'
  | 'cancelled'
  | 'unknown';

export type TaskRunState = 'active' | 'succeeded' | 'blocked' | 'failed' | 'cancelled' | 'stale';
export type TaskDomainValidity =
  'none' | 'pending' | 'valid' | 'stale' | 'revoked' | 'incomplete' | 'unknown';

export type TaskCenterDeepLink = {
  routeKey: 'data_product.closure_check' | 'data_product.package';
  params: {
    closureCheckId?: string;
    packageId?: string;
  };
};

export type TaskCapability = 'cancel' | 'download_report' | 'open_workbench' | 'preview_result';

export type TaskSummaryV2 = {
  schemaVersion: 'task-summary.v2';
  /** Canonical safe-feed names; `id` is retained for existing shell adapters. */
  jobId: string;
  jobKind: string;
  requestedBy?: string;
  workerStatus: TaskRawStatus;
  domainStatus?: string;
  projectionUpdatedAt: string;
  progressCounters?: { scanned?: number; completed?: number; total?: number; unit?: string };
  capabilities: {
    canCancel: boolean;
    canDownloadReport: boolean;
    canOpenWorkbench: boolean;
    canPreviewResult: boolean;
  };
  id: string;
  category: TaskCenterCategory;
  title: string;
  runState: TaskRunState;
  /** Certificate/domain truth is intentionally distinct from worker status. */
  domainValidity: TaskDomainValidity;
  phase?: string;
  progressFraction?: number;
  progressLabel?: string;
  createdAt: string;
  updatedAt: string;
  deepLink?: TaskCenterDeepLink;
  closureCheckId?: string;
  resultPackageId?: string;
  blockerCodes?: string[];
  errorSummary?: string;
};

export function progressFractionFromWorkerValue(value: unknown): number | undefined {
  const numberValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(numberValue) || numberValue < 0) return undefined;
  // `progress_fraction` is canonical. The second branch keeps historic 0..100
  // worker rows displayable while their DTOs are migrated.
  return Math.min(1, numberValue <= 1 ? numberValue : numberValue / 100);
}

export function taskProgressPercent(summary: TaskSummaryV2): number {
  if (summary.progressFraction !== undefined) return Math.round(summary.progressFraction * 100);
  return summary.runState === 'succeeded' ? 100 : 0;
}

export function taskRunStateFromRawStatus(status: unknown): TaskRunState {
  switch (status) {
    case 'completed':
      return 'succeeded';
    case 'blocked':
      return 'blocked';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'stale':
      return 'stale';
    default:
      return 'active';
  }
}
