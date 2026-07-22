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
export type TaskDomainValidity = 'none' | 'valid' | 'stale' | 'revoked' | 'incomplete' | 'unknown';

export type TaskCenterDeepLink = {
  route: 'data-processing';
  tab: 'builds';
  closureCheckId?: string;
  resultBuildId?: string;
};

export type TaskCapability = 'cancel' | 'download_report' | 'open_workbench' | 'preview_result';

export type TaskSummaryV2 = {
  schemaVersion: 'task-summary.v2';
  /** Canonical safe-feed names; `id` is retained for existing shell adapters. */
  jobId: string;
  kind: string;
  requestedBy?: string;
  workerStatus: TaskRawStatus;
  domainStatus?: string;
  projectionUpdatedAt: string;
  progressCounters?: { completed?: number; total?: number; unit?: string };
  capabilities: {
    canCancel: boolean;
    canDownloadReport: boolean;
    canOpenWorkbench: boolean;
    canPreviewResult: boolean;
  };
  id: string;
  category: TaskCenterCategory;
  presenterKey: string;
  title: string;
  subtitle?: string;
  rawStatus: TaskRawStatus;
  runState: TaskRunState;
  /** Certificate/domain truth is intentionally distinct from worker status. */
  domainValidity: TaskDomainValidity;
  phase?: string;
  progressFraction?: number;
  progressLabel?: string;
  createdAt: string;
  updatedAt: string;
  capabilityActions: TaskCapability[];
  deepLink?: TaskCenterDeepLink;
  references?: {
    closureCheckId?: string;
    resultBuildId?: string;
    packageId?: string;
    requestedScopeHash?: string;
    policyFingerprint?: string;
  };
  /** A small, server-safe diagnostic subset; never raw result/payload. */
  diagnostic?: { code?: string; message?: string };
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
  if (summary.runState === 'succeeded') return 100;
  if (summary.runState === 'failed' || summary.runState === 'cancelled') return 0;
  return Math.round((summary.progressFraction ?? 0) * 100);
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
