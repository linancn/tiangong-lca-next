import {
  progressFractionFromWorkerValue,
  taskRunStateFromRawStatus,
  type TaskCenterDeepLink,
  type TaskDomainValidity,
  type TaskRawStatus,
  type TaskSummaryV2,
} from '@/services/taskCenter/types';
import {
  refreshWorkerJobStore,
  registerWorkerJobPresenter,
  type WorkerJobFeed,
} from '@/services/taskCenter/workerJobStore';
import type { WorkerJobResult } from '@/services/workerJobs/api';

const DATA_PRODUCT_FEEDS: WorkerJobFeed[] = [
  { subjectType: 'lcia_scope_closure_check', visibility: 'operator', limit: 50 },
  { subjectType: 'lcia_result_build', visibility: 'operator', limit: 50 },
];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function string(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function rawStatus(job: WorkerJobResult): TaskRawStatus {
  const status = job.status;
  return [
    'queued',
    'running',
    'waiting',
    'completed',
    'blocked',
    'stale',
    'failed',
    'cancelled',
  ].includes(status)
    ? status
    : 'unknown';
}

function domainValidity(job: WorkerJobResult): TaskDomainValidity {
  const result = record(job.result);
  const closure = record(result?.closureCheck) ?? record(result?.closure_check) ?? result;
  const validity = string(closure?.certificateValidity, closure?.certificate_validity);
  if (validity === 'valid' || validity === 'stale' || validity === 'revoked') return validity;
  if (string(closure?.scanCompleteness, closure?.scan_completeness) === 'incomplete')
    return 'incomplete';
  return 'none';
}

function isDataProductJob(job: WorkerJobResult): boolean {
  return job.jobKind === 'lcia.scope_closure_check' || job.jobKind === 'lcia_result.package_build';
}

export function presentDataProductWorkerJob(job: WorkerJobResult): TaskSummaryV2 | null {
  const id = string(job.id);
  if (!id) return null;
  const result = record(job.result);
  const closureCheckId = string(
    job.closureCheckId,
    job.closure_check_id,
    result?.closureCheckId,
    result?.closure_check_id,
    job.subjectType === 'lcia_scope_closure_check' ? job.subjectId : undefined,
  );
  const resultBuildId = string(
    job.resultBuildId,
    job.result_build_id,
    result?.resultBuildId,
    result?.result_build_id,
    job.subjectType === 'lcia_result_build' ? job.subjectId : undefined,
  );
  const isClosure = job.jobKind === 'lcia.scope_closure_check';
  const deepLink: TaskCenterDeepLink = {
    route: 'data-processing',
    tab: 'builds',
    ...(closureCheckId ? { closureCheckId } : {}),
    ...(resultBuildId ? { resultBuildId } : {}),
  };
  const canCancel = job.canCancel === true || job.can_cancel === true;
  const canDownloadReport = job.canDownloadReport === true || job.can_download_report === true;
  const canPreview = job.canPreviewResult === true || job.can_preview_result === true;
  return {
    schemaVersion: 'task-summary.v2',
    jobId: id,
    kind: job.jobKind ?? (isClosure ? 'lcia.scope_closure_check' : 'lcia_result.package_build'),
    requestedBy: string(job.requestedBy, job.requested_by),
    workerStatus: rawStatus(job),
    domainStatus: string(result?.runStatus, result?.run_status),
    projectionUpdatedAt:
      string(job.projectionUpdatedAt, job.projection_updated_at, job.updatedAt, job.updated_at) ??
      new Date(0).toISOString(),
    progressCounters: record(job.progressCounters ?? job.progress_counters) as
      { completed?: number; total?: number; unit?: string } | undefined,
    capabilities: {
      canCancel,
      canDownloadReport,
      canOpenWorkbench: job.canOpenWorkbench !== false && job.can_open_workbench !== false,
      canPreviewResult: canPreview,
    },
    id,
    category: 'data_product',
    presenterKey: isClosure ? 'data-product-closure.v1' : 'data-product-build.v1',
    title: isClosure ? 'Data completeness check' : 'Result set generation',
    subtitle: closureCheckId ? `Closure check ${closureCheckId}` : undefined,
    rawStatus: rawStatus(job),
    runState: taskRunStateFromRawStatus(rawStatus(job)),
    domainValidity: domainValidity(job),
    phase: string(job.phase),
    progressFraction: progressFractionFromWorkerValue(
      job.progressFraction ?? job.progress_fraction ?? job.progress,
    ),
    progressLabel: string(job.progressLabel, job.progress_label),
    createdAt: string(job.createdAt, job.created_at) ?? new Date(0).toISOString(),
    updatedAt:
      string(job.updatedAt, job.updated_at, job.createdAt, job.created_at) ??
      new Date(0).toISOString(),
    capabilityActions: [
      ...(canCancel ? (['cancel'] as const) : []),
      ...(canDownloadReport ? (['download_report'] as const) : []),
      'open_workbench' as const,
      ...(canPreview ? (['preview_result'] as const) : []),
    ],
    deepLink,
    references: {
      ...(closureCheckId ? { closureCheckId } : {}),
      ...(resultBuildId ? { resultBuildId } : {}),
      ...(string(result?.packageId, result?.package_id)
        ? { packageId: string(result?.packageId, result?.package_id) }
        : {}),
      ...(string(result?.requestedScopeHash, result?.requested_scope_hash)
        ? { requestedScopeHash: string(result?.requestedScopeHash, result?.requested_scope_hash) }
        : {}),
      ...(string(result?.policyFingerprint, result?.policy_fingerprint)
        ? { policyFingerprint: string(result?.policyFingerprint, result?.policy_fingerprint) }
        : {}),
    },
    diagnostic: {
      ...(string(job.errorCode, job.error_code)
        ? { code: string(job.errorCode, job.error_code) }
        : {}),
      ...(string(job.errorMessage, job.error_message)
        ? { message: string(job.errorMessage, job.error_message) }
        : {}),
    },
  };
}

registerWorkerJobPresenter({
  key: 'data-product.v1',
  matches: isDataProductJob,
  present: presentDataProductWorkerJob,
});

export async function refreshDataProductTasks(): Promise<TaskSummaryV2[]> {
  return await refreshWorkerJobStore(DATA_PRODUCT_FEEDS);
}
