import type { TaskSummaryV2 } from './types';

/**
 * Canonical in-browser task projection store. Feature adapters may only upsert
 * sanitized TaskSummaryV2 rows; raw worker payloads and result blobs are
 * deliberately outside this store.
 */
export type TaskSummaryPresenter = {
  key: string;
  matches(summary: TaskSummaryV2): boolean;
  present(summary: TaskSummaryV2): TaskSummaryV2;
};

const presenters = new Map<string, TaskSummaryPresenter>();
const listeners = new Set<() => void>();
let summaries: TaskSummaryV2[] = [];

function emit(): void {
  listeners.forEach((listener) => listener());
}

function present(summary: TaskSummaryV2): TaskSummaryV2 {
  for (const presenter of presenters.values()) {
    if (presenter.matches(summary)) return presenter.present(summary);
  }
  return summary;
}

export function registerTaskSummaryPresenter(presenter: TaskSummaryPresenter): () => void {
  presenters.set(presenter.key, presenter);
  return () => presenters.delete(presenter.key);
}

export function subscribeTaskSummaries(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listTaskSummaries(): TaskSummaryV2[] {
  return summaries;
}

export function upsertTaskSummaries(rows: TaskSummaryV2[]): void {
  const next = new Map(summaries.map((summary) => [summary.jobId, summary]));
  rows.forEach((row) => next.set(row.jobId, present(row)));
  summaries = [...next.values()].sort(
    (left, right) => Date.parse(right.projectionUpdatedAt) - Date.parse(left.projectionUpdatedAt),
  );
  emit();
}

/** Test-only reset hook kept outside normal feature APIs. */
export function clearTaskSummaries(): void {
  summaries = [];
  emit();
}
