import {
  requestWorkerJobsApi,
  type WorkerJobResult,
  type WorkerJobStatus,
} from '@/services/workerJobs/api';
import type { TaskSummaryV2 } from './types';

export type WorkerJobPresenter = {
  key: string;
  matches(job: WorkerJobResult): boolean;
  present(job: WorkerJobResult): TaskSummaryV2 | null;
};

export type WorkerJobFeed = {
  subjectType?: string;
  visibility?: 'user' | 'operator';
  limit?: number;
};

const presenters = new Map<string, WorkerJobPresenter>();
const listeners = new Set<() => void>();
let summaries: TaskSummaryV2[] = [];
let rowsById = new Map<string, WorkerJobResult>();
let workerJobs: WorkerJobResult[] = [];

function emit(): void {
  listeners.forEach((listener) => listener());
}

function workerJobId(job: WorkerJobResult): string | undefined {
  return typeof job.id === 'string' && job.id.trim() ? job.id : undefined;
}

export function registerWorkerJobPresenter(presenter: WorkerJobPresenter): () => void {
  presenters.set(presenter.key, presenter);
  return () => presenters.delete(presenter.key);
}

export function subscribeWorkerJobStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listTaskSummaries(): TaskSummaryV2[] {
  return summaries;
}

export function listWorkerJobs(): WorkerJobResult[] {
  return workerJobs;
}

export function upsertWorkerJobs(rows: WorkerJobResult[]): void {
  for (const row of rows) {
    const id = workerJobId(row);
    if (id) rowsById.set(id, row);
  }
  workerJobs = [...rowsById.values()];
  summaries = workerJobs
    .map((job) => {
      for (const presenter of presenters.values()) {
        if (presenter.matches(job)) return presenter.present(job);
      }
      return null;
    })
    .filter((summary): summary is TaskSummaryV2 => Boolean(summary))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  emit();
}

export async function refreshWorkerJobStore(feeds: WorkerJobFeed[]): Promise<TaskSummaryV2[]> {
  const requests = await Promise.all(
    feeds.map((feed) =>
      requestWorkerJobsApi({
        action: 'list',
        ...(feed.subjectType ? { subjectType: feed.subjectType } : {}),
        ...(feed.visibility ? { visibility: feed.visibility } : {}),
        limit: feed.limit ?? 50,
      }),
    ),
  );
  const firstError = requests.find((result) => result?.error)?.error;
  if (firstError) throw new Error(firstError.message);
  upsertWorkerJobs(requests.flatMap((result) => result?.data ?? []));
  return summaries;
}

export async function cancelWorkerJobFromStore(jobId: string): Promise<void> {
  const result = await requestWorkerJobsApi({ action: 'cancel', jobId });
  if (result.error) throw new Error(result.error.message);
  upsertWorkerJobs(result.data ?? []);
}

export const ALL_WORKER_JOB_STATUSES: WorkerJobStatus[] = [
  'queued',
  'running',
  'waiting',
  'completed',
  'blocked',
  'stale',
  'failed',
  'cancelled',
];
