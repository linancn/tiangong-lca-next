import {
  requestReviewSubmitJobApi,
  type ReviewSubmitGateBlockingReason,
  type ReviewSubmitJobResult,
  type ReviewSubmitJobStatus,
} from '@/services/reviews/api';
import {
  requestWorkerJobsApi,
  type WorkerJobResult,
  type WorkerJobStatus,
} from '@/services/workerJobs/api';

export type ReviewSubmitTaskState = 'running' | 'completed' | 'failed';
export type ReviewSubmitTaskPhase =
  | 'queued'
  | 'running'
  | 'waiting_gate'
  | 'submitting'
  | 'submitted'
  | 'passed'
  | 'blocked'
  | 'stale'
  | 'error'
  | 'cancelled';

export type ReviewSubmitBackgroundTask = {
  id: string;
  gateWorkerJobId?: string;
  reviewSubmitJobId?: string;
  state: ReviewSubmitTaskState;
  phase: ReviewSubmitTaskPhase;
  message: string;
  createdAt: string;
  updatedAt: string;
  datasetRevision?: {
    table?: string;
    id?: string;
    version?: string;
    revisionChecksum?: string;
  };
  gateRunId?: string | null;
  workerJob?: WorkerJobResult | null;
  coordinator?: ReviewSubmitJobResult | null;
  blockingReasons?: ReviewSubmitGateBlockingReason[];
  blockerCodes?: string[];
  error?: string;
  progress?: number | string | null;
};

const MAX_TASK_ITEMS = 50;
const STORAGE_KEY = 'tg_review_submit_task_center_v1';
const STORAGE_SCHEMA_VERSION = 1;
const STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REVIEW_SUBMIT_WORKER_KIND = 'review_submit.gate';

let tasks: ReviewSubmitBackgroundTask[] = [];
let dismissedTaskIds = new Set<string>();
let refreshPromise: Promise<ReviewSubmitBackgroundTask[]> | null = null;
const listeners = new Set<() => void>();

type PersistedReviewSubmitTaskStore = {
  version: number;
  savedAt: string;
  tasks: ReviewSubmitBackgroundTask[];
  dismissedTaskIds?: string[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function persistTasksToStorage(): void {
  if (!canUseStorage()) {
    return;
  }
  const payload: PersistedReviewSubmitTaskStore = {
    version: STORAGE_SCHEMA_VERSION,
    savedAt: nowIso(),
    tasks,
    dismissedTaskIds: [...dismissedTaskIds],
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures (quota/privacy mode).
  }
}

function setTasks(next: ReviewSubmitBackgroundTask[]): void {
  tasks = next
    .slice()
    .filter((task) => !dismissedTaskIds.has(task.id))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_TASK_ITEMS);
  persistTasksToStorage();
  emitChange();
}

function normalizeIso(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value : fallback;
  return Number.isFinite(Date.parse(text)) ? text : fallback;
}

function normalizeWorkerStatus(value: unknown): WorkerJobStatus | null {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'waiting' ||
    value === 'completed' ||
    value === 'blocked' ||
    value === 'stale' ||
    value === 'failed' ||
    value === 'cancelled'
  ) {
    return value;
  }
  return null;
}

function isRunningPhase(phase: ReviewSubmitTaskPhase): boolean {
  return (
    phase === 'queued' || phase === 'running' || phase === 'waiting_gate' || phase === 'submitting'
  );
}

function phaseToState(phase: ReviewSubmitTaskPhase): ReviewSubmitTaskState {
  if (phase === 'submitted' || phase === 'passed') {
    return 'completed';
  }
  if (isRunningPhase(phase)) {
    return 'running';
  }
  return 'failed';
}

function workerStatusToPhase(status: WorkerJobStatus): ReviewSubmitTaskPhase {
  if (status === 'queued') {
    return 'queued';
  }
  if (status === 'running') {
    return 'running';
  }
  if (status === 'waiting') {
    return 'waiting_gate';
  }
  if (status === 'completed') {
    return 'passed';
  }
  if (status === 'blocked') {
    return 'blocked';
  }
  if (status === 'stale') {
    return 'stale';
  }
  if (status === 'cancelled') {
    return 'cancelled';
  }
  return 'error';
}

function coordinatorStatusToPhase(status: ReviewSubmitJobStatus): ReviewSubmitTaskPhase {
  if (status === 'waiting_gate') {
    return 'waiting_gate';
  }
  if (status === 'error') {
    return 'error';
  }
  return status;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function blockingReasonsFromWorker(
  workerJob?: WorkerJobResult | null,
): ReviewSubmitGateBlockingReason[] {
  const result = workerJob?.result;
  if (isRecord(result) && Array.isArray(result.blockingReasons)) {
    return result.blockingReasons as ReviewSubmitGateBlockingReason[];
  }

  const blockerCodes = Array.isArray(workerJob?.blockerCodes) ? workerJob.blockerCodes : [];
  return blockerCodes.map((code) => ({ code }));
}

function datasetRevisionFromWorker(workerJob?: WorkerJobResult | null) {
  const result = workerJob?.result;
  if (isRecord(result) && isRecord(result.datasetRevision)) {
    return result.datasetRevision as ReviewSubmitBackgroundTask['datasetRevision'];
  }

  if (!workerJob?.subjectType && !workerJob?.subjectId && !workerJob?.subjectVersion) {
    return undefined;
  }

  return {
    table: workerJob?.subjectType,
    id: workerJob?.subjectId,
    version: workerJob?.subjectVersion,
  };
}

function messageForPhase(phase: ReviewSubmitTaskPhase, error?: string): string {
  if (error) {
    return error;
  }
  if (phase === 'queued') {
    return 'Review submission is queued';
  }
  if (phase === 'running') {
    return 'Numerical stability gate is running';
  }
  if (phase === 'waiting_gate') {
    return 'Review submission is waiting for the gate';
  }
  if (phase === 'submitting') {
    return 'Gate passed, submitting review';
  }
  if (phase === 'submitted') {
    return 'Review submission completed';
  }
  if (phase === 'passed') {
    return 'Numerical stability gate passed';
  }
  if (phase === 'blocked') {
    return 'Numerical stability gate blocked this revision';
  }
  if (phase === 'stale') {
    return 'Numerical stability gate result is stale';
  }
  if (phase === 'cancelled') {
    return 'Review submission job was cancelled';
  }
  return 'Review submission failed';
}

function taskIdFromParts(
  job?: ReviewSubmitJobResult | null,
  workerJob?: WorkerJobResult | null,
): string {
  return (
    job?.reviewSubmitJobId ||
    job?.gateWorkerJobId ||
    workerJob?.id ||
    `${workerJob?.subjectType ?? 'processes'}:${workerJob?.subjectId ?? 'unknown'}:${
      workerJob?.subjectVersion ?? 'unknown'
    }`
  );
}

function mapReviewSubmitTask(
  job?: ReviewSubmitJobResult | null,
  workerJob?: WorkerJobResult | null,
): ReviewSubmitBackgroundTask {
  const workerPhase = workerJob ? workerStatusToPhase(workerJob.status) : undefined;
  const phase = job?.status ? coordinatorStatusToPhase(job.status) : (workerPhase ?? 'queued');
  const error =
    job?.error?.message ||
    workerJob?.errorMessage ||
    (phase === 'error' ? (workerJob?.errorCode ?? undefined) : undefined);
  const createdAt = normalizeIso(
    (job as { createdAt?: unknown } | undefined)?.createdAt ?? workerJob?.createdAt,
    nowIso(),
  );
  const updatedAt = normalizeIso(
    (job as { modifiedAt?: unknown; updatedAt?: unknown } | undefined)?.modifiedAt ??
      (job as { updatedAt?: unknown } | undefined)?.updatedAt ??
      workerJob?.updatedAt,
    createdAt,
  );
  const blockingReasons =
    job?.gate?.blockingReasons ?? blockingReasonsFromWorker(job?.gateWorkerJob ?? workerJob);
  const blockerCodes =
    Array.isArray(workerJob?.blockerCodes) && workerJob.blockerCodes.length > 0
      ? workerJob.blockerCodes
      : blockingReasons.flatMap((reason) =>
          typeof reason.code === 'string' && reason.code ? [reason.code] : [],
        );

  return {
    id: taskIdFromParts(job, workerJob),
    gateWorkerJobId: job?.gateWorkerJobId ?? workerJob?.id,
    reviewSubmitJobId: job?.reviewSubmitJobId,
    state: phaseToState(phase),
    phase,
    message: messageForPhase(phase, error),
    createdAt,
    updatedAt,
    datasetRevision: job?.datasetRevision ?? datasetRevisionFromWorker(workerJob),
    gateRunId: job?.gateRunId ?? job?.gate?.gateRunId ?? null,
    workerJob: job?.gateWorkerJob ?? workerJob ?? null,
    coordinator: job ?? null,
    blockingReasons,
    blockerCodes,
    error,
    progress: workerJob?.progress ?? job?.gateWorkerJob?.progress ?? null,
  };
}

function normalizePersistedTask(raw: unknown): ReviewSubmitBackgroundTask | null {
  if (!isRecord(raw)) {
    return null;
  }

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  const phase =
    raw.phase === 'queued' ||
    raw.phase === 'running' ||
    raw.phase === 'waiting_gate' ||
    raw.phase === 'submitting' ||
    raw.phase === 'submitted' ||
    raw.phase === 'passed' ||
    raw.phase === 'blocked' ||
    raw.phase === 'stale' ||
    raw.phase === 'error' ||
    raw.phase === 'cancelled'
      ? raw.phase
      : null;
  if (!id || !phase) {
    return null;
  }
  const createdAt = normalizeIso(raw.createdAt, nowIso());
  return {
    id,
    gateWorkerJobId: typeof raw.gateWorkerJobId === 'string' ? raw.gateWorkerJobId : undefined,
    reviewSubmitJobId:
      typeof raw.reviewSubmitJobId === 'string' ? raw.reviewSubmitJobId : undefined,
    state: phaseToState(phase),
    phase,
    message: typeof raw.message === 'string' ? raw.message : messageForPhase(phase),
    createdAt,
    updatedAt: normalizeIso(raw.updatedAt, createdAt),
    datasetRevision: isRecord(raw.datasetRevision)
      ? (raw.datasetRevision as ReviewSubmitBackgroundTask['datasetRevision'])
      : undefined,
    gateRunId:
      typeof raw.gateRunId === 'string' || raw.gateRunId === null ? raw.gateRunId : undefined,
    workerJob: isRecord(raw.workerJob) ? (raw.workerJob as WorkerJobResult) : null,
    coordinator: isRecord(raw.coordinator) ? (raw.coordinator as ReviewSubmitJobResult) : null,
    blockingReasons: Array.isArray(raw.blockingReasons)
      ? (raw.blockingReasons as ReviewSubmitGateBlockingReason[])
      : [],
    blockerCodes: Array.isArray(raw.blockerCodes) ? (raw.blockerCodes as string[]) : [],
    error: typeof raw.error === 'string' ? raw.error : undefined,
    progress:
      typeof raw.progress === 'number' || typeof raw.progress === 'string' || raw.progress === null
        ? raw.progress
        : undefined,
  };
}

function hydrateTasksFromStorage(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as PersistedReviewSubmitTaskStore;
    if (!parsed || parsed.version !== STORAGE_SCHEMA_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const savedAtMs = Date.parse(String(parsed.savedAt ?? ''));
    if (Number.isFinite(savedAtMs) && Date.now() - savedAtMs > STORAGE_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    dismissedTaskIds = new Set(
      Array.isArray(parsed.dismissedTaskIds)
        ? parsed.dismissedTaskIds.filter((item): item is string => typeof item === 'string')
        : [],
    );
    const normalized = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
      .map(normalizePersistedTask)
      .filter((item): item is ReviewSubmitBackgroundTask => Boolean(item));
    setTasks(normalized);
  } catch (_error) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

async function readLatestCoordinatorForWorker(
  workerJob: WorkerJobResult,
): Promise<ReviewSubmitJobResult | null> {
  if (
    workerJob.jobKind !== REVIEW_SUBMIT_WORKER_KIND ||
    workerJob.subjectType !== 'processes' ||
    !workerJob.subjectId ||
    !workerJob.subjectVersion
  ) {
    return null;
  }

  const result = await requestReviewSubmitJobApi<ReviewSubmitJobResult>({
    action: 'read_latest',
    table: 'processes',
    id: workerJob.subjectId,
    version: workerJob.subjectVersion,
  });
  const job = result.data?.[0];
  if (!job || result.error) {
    return null;
  }
  if (job.gateWorkerJobId && workerJob.id && job.gateWorkerJobId !== workerJob.id) {
    return null;
  }
  return job;
}

async function loadReviewSubmitTasksFromServer(): Promise<ReviewSubmitBackgroundTask[]> {
  const workerJobs = await requestWorkerJobsApi<WorkerJobResult>({
    action: 'list',
    subjectType: 'processes',
    limit: MAX_TASK_ITEMS,
  });
  if (workerJobs.error) {
    throw new Error(workerJobs.error.message || 'Failed to load worker jobs');
  }

  const reviewSubmitWorkers = (workerJobs.data ?? []).filter(
    (job) => job.jobKind === REVIEW_SUBMIT_WORKER_KIND && normalizeWorkerStatus(job.status),
  );

  return Promise.all(
    reviewSubmitWorkers.map(async (workerJob) => {
      const coordinator = await readLatestCoordinatorForWorker(workerJob);
      return mapReviewSubmitTask(coordinator, workerJob);
    }),
  );
}

export async function refreshReviewSubmitTasks(): Promise<ReviewSubmitBackgroundTask[]> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = loadReviewSubmitTasksFromServer()
    .then((serverTasks) => {
      const merged = [
        ...serverTasks,
        ...tasks.filter(
          (cached) =>
            !serverTasks.some(
              (serverTask) =>
                serverTask.id === cached.id ||
                (serverTask.gateWorkerJobId &&
                  serverTask.gateWorkerJobId === cached.gateWorkerJobId),
            ),
        ),
      ];
      setTasks(merged);
      return tasks;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function trackReviewSubmitTask(job: ReviewSubmitJobResult): ReviewSubmitBackgroundTask {
  const task = mapReviewSubmitTask(job, job.gateWorkerJob ?? null);
  setTasks([task, ...tasks]);
  void refreshReviewSubmitTasks().catch(() => undefined);
  return task;
}

export async function cancelReviewSubmitTask(taskId: string): Promise<void> {
  const task = tasks.find((item) => item.id === taskId);
  const gateWorkerJobId = task?.gateWorkerJobId;
  if (!gateWorkerJobId) {
    throw new Error('Review-submit gate worker job id is missing');
  }

  const result = await requestWorkerJobsApi<WorkerJobResult>({
    action: 'cancel',
    jobId: gateWorkerJobId,
    reason: 'user_cancelled',
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to cancel review-submit task');
  }

  const workerJob = result.data?.[0];
  if (workerJob) {
    const cancelledTask = mapReviewSubmitTask(task?.coordinator ?? null, workerJob);
    setTasks([
      {
        ...cancelledTask,
        datasetRevision: cancelledTask.datasetRevision ?? task?.datasetRevision,
        gateWorkerJobId: cancelledTask.gateWorkerJobId ?? task?.gateWorkerJobId,
      },
      ...tasks,
    ]);
  }
  void refreshReviewSubmitTasks().catch(() => undefined);
}

export async function retryReviewSubmitTask(taskId: string): Promise<ReviewSubmitBackgroundTask> {
  const task = tasks.find((item) => item.id === taskId);
  const revision = task?.datasetRevision;
  if (revision?.table !== 'processes' || !revision.id || !revision.version) {
    throw new Error('Review-submit dataset revision is missing');
  }

  const result = await requestReviewSubmitJobApi<ReviewSubmitJobResult>({
    action: 'enqueue',
    table: 'processes',
    id: revision.id,
    version: revision.version,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to retry review-submit task');
  }

  const job = result.data?.[0];
  if (!job) {
    throw new Error('Review-submit retry returned no job');
  }

  const retriedTask = trackReviewSubmitTask(job);
  void refreshReviewSubmitTasks().catch(() => undefined);
  return retriedTask;
}

export function removeReviewSubmitTask(taskId: string): void {
  dismissedTaskIds.add(taskId);
  setTasks(tasks.filter((item) => item.id !== taskId));
}

export function clearFinishedReviewSubmitTasks(): void {
  for (const task of tasks) {
    if (task.state !== 'running') {
      dismissedTaskIds.add(task.id);
    }
  }
  setTasks(tasks.filter((item) => item.state === 'running'));
}

export function listReviewSubmitTasks(): ReviewSubmitBackgroundTask[] {
  return tasks;
}

export function subscribeReviewSubmitTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

hydrateTasksFromStorage();
