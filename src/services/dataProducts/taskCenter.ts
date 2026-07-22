import {
  progressFractionFromWorkerValue,
  taskRunStateFromRawStatus,
  type TaskCenterDeepLink,
  type TaskDomainValidity,
  type TaskRawStatus,
  type TaskSummaryV2,
} from '@/services/taskCenter/types';
import {
  listTaskSummaries,
  registerTaskSummaryPresenter,
  subscribeTaskSummaries,
  upsertTaskSummaries,
} from '@/services/taskCenter/workerJobStore';
import { invokeDataProductCommand, type DataProductApiResult } from './api';

export type DataProductTaskFeedCursor = { updatedAt: string; jobId: string };

export type DataProductTaskFeedRequest = {
  category?: 'data_product';
  jobKinds?: string[];
  statuses?: TaskRawStatus[];
  updatedSince?: string;
  cursor?: DataProductTaskFeedCursor;
  limit?: number;
  rootOnly?: boolean;
};

export type DataProductTaskFeedPage = {
  items: TaskSummaryV2[];
  nextCursor?: DataProductTaskFeedCursor;
};

const DATA_PRODUCT_JOB_KINDS = ['lcia.scope_closure_check', 'lcia_result.package_build'];
let taskSummarySource: TaskSummaryV2[] | undefined;
let dataProductSummaries: TaskSummaryV2[] = [];

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function rawStatus(value: unknown): TaskRawStatus {
  return [
    'queued',
    'running',
    'waiting',
    'completed',
    'blocked',
    'stale',
    'failed',
    'cancelled',
  ].includes(String(value))
    ? (value as TaskRawStatus)
    : 'unknown';
}

function domainValidity(value: unknown): TaskDomainValidity {
  return ['none', 'valid', 'stale', 'revoked', 'incomplete', 'unknown'].includes(String(value))
    ? (value as TaskDomainValidity)
    : 'none';
}

function deepLink(value: unknown): TaskCenterDeepLink | undefined {
  const row = record(value);
  const routeKey = text(row?.routeKey);
  const params = record(row?.params);
  if (routeKey !== 'data_product.closure_check' && routeKey !== 'data_product.package')
    return undefined;
  return {
    routeKey,
    params: {
      ...(text(params?.closureCheckId) ? { closureCheckId: text(params?.closureCheckId) } : {}),
      ...(text(params?.packageId) ? { packageId: text(params?.packageId) } : {}),
    },
  };
}

/**
 * This is intentionally a whitelist decoder.  It consumes only the safe
 * TaskSummaryV2 projection returned by `list_task_feed`, never a worker row,
 * its payload, diagnostics, result, or artifact locator.
 */
export function decodeDataProductTaskSummary(value: unknown): TaskSummaryV2 | null {
  const row = record(value);
  const jobId = text(row?.jobId);
  const jobKind = text(row?.jobKind);
  const category = text(row?.category);
  const projectionUpdatedAt = text(row?.projectionUpdatedAt);
  if (!jobId || !jobKind || category !== 'data_product' || !projectionUpdatedAt) return null;
  const capabilities = record(row?.capabilities);
  const counters = record(row?.progressCounters);
  return {
    schemaVersion: 'task-summary.v2',
    jobId,
    jobKind,
    ...(text(row?.requestedBy) ? { requestedBy: text(row?.requestedBy) } : {}),
    workerStatus: rawStatus(row?.workerStatus),
    ...(text(row?.domainStatus) ? { domainStatus: text(row?.domainStatus) } : {}),
    domainValidity: domainValidity(row?.domainValidity),
    projectionUpdatedAt,
    ...(text(row?.phase) ? { phase: text(row?.phase) } : {}),
    progressFraction: progressFractionFromWorkerValue(row?.progressFraction),
    ...(counters
      ? {
          progressCounters: {
            ...(typeof counters.completed === 'number' ? { completed: counters.completed } : {}),
            ...(typeof counters.total === 'number' ? { total: counters.total } : {}),
            ...(text(counters.unit) ? { unit: text(counters.unit) } : {}),
          },
        }
      : {}),
    capabilities: {
      canCancel: capabilities?.canCancel === true,
      canDownloadReport: capabilities?.canDownloadReport === true,
      canOpenWorkbench: capabilities?.canOpenWorkbench === true,
      canPreviewResult: capabilities?.canPreviewResult === true,
    },
    id: jobId,
    category: 'data_product',
    title: text(row?.title) ?? '',
    runState: taskRunStateFromRawStatus(rawStatus(row?.workerStatus)),
    createdAt: projectionUpdatedAt,
    updatedAt: projectionUpdatedAt,
    ...(deepLink(row?.deepLink) ? { deepLink: deepLink(row?.deepLink) } : {}),
    ...(text(row?.closureCheckId) ? { closureCheckId: text(row?.closureCheckId) } : {}),
    ...(text(row?.resultPackageId) ? { resultPackageId: text(row?.resultPackageId) } : {}),
    ...(Array.isArray(row?.blockerCodes)
      ? {
          blockerCodes: row.blockerCodes.filter((code): code is string => typeof code === 'string'),
        }
      : {}),
    ...(text(row?.errorSummary) ? { errorSummary: text(row?.errorSummary) } : {}),
  };
}

const DATA_PRODUCT_PRESENTERS = [
  {
    key: 'data_product.lcia_scope_closure_check.v1',
    jobKind: 'lcia.scope_closure_check',
    fallbackTitle: 'Data completeness check',
  },
  {
    key: 'data_product.lcia_result_package_build.v1',
    jobKind: 'lcia_result.package_build',
    fallbackTitle: 'Result set generation',
  },
] as const;

DATA_PRODUCT_PRESENTERS.forEach((definition) => {
  registerTaskSummaryPresenter({
    key: definition.key,
    matches: (summary) =>
      summary.category === 'data_product' && summary.jobKind === definition.jobKind,
    present: (summary) => ({ ...summary, title: summary.title || definition.fallbackTitle }),
  });
});

export async function listDataProductTaskFeed(
  request: DataProductTaskFeedRequest = {},
): Promise<DataProductApiResult<DataProductTaskFeedPage>> {
  return await invokeDataProductCommand<DataProductTaskFeedPage>({
    action: 'list_task_feed',
    category: request.category ?? 'data_product',
    jobKinds: request.jobKinds ?? DATA_PRODUCT_JOB_KINDS,
    ...(request.statuses?.length ? { statuses: request.statuses } : {}),
    ...(request.updatedSince ? { updatedSince: request.updatedSince } : {}),
    ...(request.cursor ? { cursor: request.cursor } : {}),
    limit: request.limit ?? 50,
    rootOnly: request.rootOnly ?? false,
  });
}

export function subscribeDataProductTasks(listener: () => void): () => void {
  return subscribeTaskSummaries(listener);
}

export function listDataProductTasks(): TaskSummaryV2[] {
  const source = listTaskSummaries();
  if (source !== taskSummarySource) {
    taskSummarySource = source;
    dataProductSummaries = source.filter((summary) => summary.category === 'data_product');
  }
  return dataProductSummaries;
}

export function upsertDataProductTasks(rows: unknown[]): void {
  upsertTaskSummaries(
    rows
      .map(decodeDataProductTaskSummary)
      .filter((summary): summary is TaskSummaryV2 => Boolean(summary)),
  );
}

export async function refreshDataProductTasks(): Promise<TaskSummaryV2[]> {
  const result = await listDataProductTaskFeed();
  if (result.error) throw new Error(result.error.message);
  const page = record(result.data);
  upsertDataProductTasks(Array.isArray(page?.items) ? page.items : []);
  return listDataProductTasks();
}
