import {
  downloadReadyTidasPackageExportApi,
  getTidasPackageJobApi,
  queueExportTidasPackageApi,
  type ExportTidasPackageRequest,
  type ExportTidasPackageResponse,
  type TidasPackageJobResponse,
  type TidasPackageManifestScope,
} from '@/services/general/api';

export type TidasPackageTaskState = 'running' | 'completed' | 'failed';
export type TidasPackageTaskPhase =
  | 'submitting'
  | 'queued'
  | 'collect_refs'
  | 'finalize_zip'
  | 'completed'
  | 'failed';

export type TidasPackageBackgroundTask = {
  id: string;
  sequence: number;
  kind: 'tidas_package_export';
  request?: ExportTidasPackageRequest;
  state: TidasPackageTaskState;
  phase: TidasPackageTaskPhase;
  message: string;
  createdAt: string;
  updatedAt: string;
  jobId?: string;
  scope?: TidasPackageManifestScope | null;
  rootCount: number;
  filename?: string;
  error?: string;
};

type PersistedTaskStore = {
  version: number;
  savedAt: string;
  tasks: TidasPackageBackgroundTask[];
};

const MAX_TASK_ITEMS = 30;
const STORAGE_KEY = 'tg_tidas_package_task_center_v1';
const STORAGE_SCHEMA_VERSION = 1;
const STORAGE_TTL_MS = 72 * 60 * 60 * 1000;
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const POLL_TRANSIENT_ERROR_RETRY_LIMIT = 5;

let taskSequence = 0;
let tasks: TidasPackageBackgroundTask[] = [];
const listeners = new Set<() => void>();
const activePollers = new Set<string>();
let hydratedFromStorage = false;

function nowIso(): string {
  return new Date().toISOString();
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nextTaskSequence(): number {
  taskSequence += 1;
  return taskSequence;
}

function makeTaskId(sequence: number): string {
  return `tidas-package-task-${Date.now()}-${sequence}`;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function persistTasksToStorage(): void {
  if (!canUseStorage()) {
    return;
  }

  const payload: PersistedTaskStore = {
    version: STORAGE_SCHEMA_VERSION,
    savedAt: nowIso(),
    tasks,
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures.
  }
}

function setTasks(next: TidasPackageBackgroundTask[]): void {
  tasks = next
    .slice()
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, MAX_TASK_ITEMS);
  persistTasksToStorage();
  emitChange();
}

function normalizeState(value: unknown): TidasPackageTaskState | null {
  if (value === 'running' || value === 'completed' || value === 'failed') {
    return value;
  }
  return null;
}

function normalizePhase(value: unknown): TidasPackageTaskPhase | null {
  if (
    value === 'submitting' ||
    value === 'queued' ||
    value === 'collect_refs' ||
    value === 'finalize_zip' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value;
  }
  return null;
}

function normalizeIso(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value : fallback;
  return Number.isFinite(Date.parse(text)) ? text : fallback;
}

function normalizeRequest(value: unknown): ExportTidasPackageRequest | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const request = value as {
    scope?: unknown;
    roots?: unknown;
  };

  const normalized: ExportTidasPackageRequest = {};
  if (typeof request.scope === 'string' && request.scope.trim()) {
    normalized.scope = request.scope as ExportTidasPackageRequest['scope'];
  }

  if (Array.isArray(request.roots)) {
    normalized.roots = request.roots
      .filter(
        (item): item is { table: string; id: string; version: string } =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as any).table === 'string' &&
          typeof (item as any).id === 'string' &&
          typeof (item as any).version === 'string',
      )
      .map((item) => ({
        table: item.table as NonNullable<ExportTidasPackageRequest['roots']>[number]['table'],
        id: item.id,
        version: item.version,
      }));
  }

  return normalized;
}

function normalizeTask(raw: unknown, fallbackSequence: number): TidasPackageBackgroundTask | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const item = raw as {
    id?: unknown;
    sequence?: unknown;
    kind?: unknown;
    request?: unknown;
    state?: unknown;
    phase?: unknown;
    message?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    jobId?: unknown;
    scope?: unknown;
    rootCount?: unknown;
    filename?: unknown;
    error?: unknown;
  };

  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null;
  const state = normalizeState(item.state);
  const phase = normalizePhase(item.phase);
  if (!id || !state || !phase) {
    return null;
  }

  const now = nowIso();
  const createdAt = normalizeIso(item.createdAt, now);
  const updatedAt = normalizeIso(item.updatedAt, createdAt);

  return {
    id,
    sequence: Number.isInteger(item.sequence)
      ? Math.max(1, Number(item.sequence))
      : fallbackSequence,
    kind: 'tidas_package_export',
    request: normalizeRequest(item.request),
    state,
    phase,
    message: typeof item.message === 'string' ? item.message : 'Recovered task',
    createdAt,
    updatedAt,
    jobId: typeof item.jobId === 'string' ? item.jobId : undefined,
    scope: typeof item.scope === 'string' ? (item.scope as TidasPackageManifestScope) : null,
    rootCount:
      typeof item.rootCount === 'number' && Number.isFinite(item.rootCount) && item.rootCount >= 0
        ? item.rootCount
        : 0,
    filename: typeof item.filename === 'string' ? item.filename : undefined,
    error: typeof item.error === 'string' ? item.error : undefined,
  };
}

function readTasksFromStorage(): TidasPackageBackgroundTask[] {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as PersistedTaskStore;
    if (!parsed || parsed.version !== STORAGE_SCHEMA_VERSION) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    const savedAtMs = Date.parse(String(parsed.savedAt ?? ''));
    if (Number.isFinite(savedAtMs) && Date.now() - savedAtMs > STORAGE_TTL_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return [];
    }

    const rawTasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
    const normalized: TidasPackageBackgroundTask[] = [];
    rawTasks.forEach((item, index) => {
      const task = normalizeTask(item, index + 1);
      if (task) {
        normalized.push(task);
      }
    });
    return normalized;
  } catch (_error) {
    return [];
  }
}

function upsertTask(taskId: string, patch: Partial<TidasPackageBackgroundTask>): void {
  const index = tasks.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return;
  }

  const current = tasks[index];
  const updated: TidasPackageBackgroundTask = {
    ...current,
    ...patch,
    id: current.id,
    sequence: current.sequence,
    kind: 'tidas_package_export',
    request: patch.request ?? current.request,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  };

  const next = tasks.slice();
  next[index] = updated;
  setTasks(next);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function phaseFromJob(job: TidasPackageJobResponse): TidasPackageTaskPhase {
  if (job.status === 'failed' || job.status === 'stale') {
    return 'failed';
  }
  if (job.status === 'ready' || job.status === 'completed') {
    return 'completed';
  }

  const stage = typeof job.diagnostics?.stage === 'string' ? job.diagnostics.stage : '';
  if (stage === 'collect_refs') {
    return 'collect_refs';
  }
  if (stage === 'finalize_zip') {
    return 'finalize_zip';
  }
  if (job.status === 'queued') {
    return 'queued';
  }
  return 'submitting';
}

function filenameFromJob(job: TidasPackageJobResponse, request?: ExportTidasPackageRequest) {
  const artifactFilename = job.artifacts_by_kind.export_zip?.metadata?.filename;
  if (typeof artifactFilename === 'string' && artifactFilename.trim()) {
    return artifactFilename.trim();
  }

  if (request?.roots?.length === 1) {
    return `${request.roots[0].table}-package.zip`;
  }

  return 'tidas-package.zip';
}

function messageFromJob(job: TidasPackageJobResponse, request?: ExportTidasPackageRequest): string {
  const diagnosticsMessage =
    typeof job.diagnostics?.message === 'string' ? job.diagnostics.message.trim() : '';
  if (diagnosticsMessage) {
    const processed = Number(job.diagnostics?.processed_items);
    const total = Number(job.diagnostics?.total_items);
    if (
      phaseFromJob(job) === 'collect_refs' &&
      Number.isFinite(processed) &&
      Number.isFinite(total) &&
      total > 0
    ) {
      return `${diagnosticsMessage} (${processed}/${total})`;
    }
    return diagnosticsMessage;
  }

  if (job.status === 'ready' || job.status === 'completed') {
    return `Export package ready (${filenameFromJob(job, request)})`;
  }
  if (job.status === 'queued') {
    return `Export task queued (${job.job_id})`;
  }
  if (phaseFromJob(job) === 'finalize_zip') {
    return 'Materializing ZIP package';
  }
  if (phaseFromJob(job) === 'collect_refs') {
    return 'Collecting related datasets';
  }
  return `Export task running (${job.job_id})`;
}

function applyJobToTask(taskId: string, job: TidasPackageJobResponse): void {
  const current = tasks.find((item) => item.id === taskId);
  const phase = phaseFromJob(job);
  const isCompleted = phase === 'completed';
  const isFailed = phase === 'failed';

  upsertTask(taskId, {
    phase,
    state: isCompleted ? 'completed' : isFailed ? 'failed' : 'running',
    message: messageFromJob(job, current?.request),
    jobId: job.job_id,
    scope: job.scope,
    rootCount:
      typeof job.root_count === 'number' && Number.isFinite(job.root_count) ? job.root_count : 0,
    filename: filenameFromJob(job, current?.request),
    error: isFailed
      ? (current?.error ??
        (typeof job.request_cache?.error_message === 'string'
          ? job.request_cache.error_message
          : typeof job.diagnostics?.error === 'string'
            ? job.diagnostics.error
            : 'TIDAS package export failed'))
      : undefined,
  });
}

async function pollTask(taskId: string, jobId: string): Promise<void> {
  if (activePollers.has(taskId)) {
    return;
  }

  activePollers.add(taskId);
  const startedAt = Date.now();
  let consecutiveErrors = 0;
  try {
    while (Date.now() - startedAt <= POLL_TIMEOUT_MS) {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.state !== 'running') {
        return;
      }

      const { data, error } = await getTidasPackageJobApi(jobId);
      if (error || !data?.ok) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= POLL_TRANSIENT_ERROR_RETRY_LIMIT) {
          upsertTask(taskId, {
            phase: 'failed',
            state: 'failed',
            message: 'Export task failed',
            error: error?.message ?? 'Failed to load TIDAS package job status',
          });
          return;
        }

        upsertTask(taskId, {
          phase: task.phase === 'submitting' ? 'queued' : task.phase,
          state: 'running',
          message: `Connection interrupted while checking export status, retrying (${consecutiveErrors}/${POLL_TRANSIENT_ERROR_RETRY_LIMIT})`,
          error: undefined,
        });
        await delay(POLL_INTERVAL_MS);
        continue;
      }

      consecutiveErrors = 0;
      applyJobToTask(taskId, data);
      if (data.status === 'failed' || data.status === 'stale') {
        return;
      }
      if (data.status === 'ready' || data.status === 'completed') {
        return;
      }

      await delay(POLL_INTERVAL_MS);
    }

    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      message: 'Export task timed out',
      error: 'tidas_package_export_timeout',
    });
  } finally {
    activePollers.delete(taskId);
  }
}

async function runExportTask(taskId: string, request: ExportTidasPackageRequest): Promise<void> {
  try {
    const queued = await queueExportTidasPackageApi(request);
    if (queued.error || !queued.data?.ok) {
      throw queued.error ?? new Error((queued.data as any)?.message ?? 'Export failed');
    }

    upsertTask(taskId, {
      phase: queued.data.mode === 'queued' ? 'queued' : 'submitting',
      state: 'running',
      message:
        queued.data.mode === 'cache_hit'
          ? 'Checking cached export package'
          : `Export task queued (${queued.data.job_id})`,
      jobId: queued.data.job_id,
      scope: queued.data.scope,
      rootCount: queued.data.root_count ?? 0,
    });

    await pollTask(taskId, queued.data.job_id);
  } catch (error) {
    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      message: 'Export task failed',
      error: toErrorMessage(error),
    });
  }
}

function hydrateTasksFromStorage(): void {
  if (hydratedFromStorage) {
    return;
  }
  hydratedFromStorage = true;

  const restored = readTasksFromStorage();
  if (restored.length === 0) {
    return;
  }

  setTasks(restored);
  const maxSequence = restored.reduce((max, item) => Math.max(max, item.sequence), 0);
  if (maxSequence > taskSequence) {
    taskSequence = maxSequence;
  }

  restored
    .filter((item) => item.state === 'running' && item.jobId)
    .forEach((item) => {
      void pollTask(item.id, item.jobId!);
    });
}

export function submitTidasPackageExportTask(
  request: ExportTidasPackageRequest,
): TidasPackageBackgroundTask {
  const createdAt = nowIso();
  const sequence = nextTaskSequence();
  const task: TidasPackageBackgroundTask = {
    id: makeTaskId(sequence),
    sequence,
    kind: 'tidas_package_export',
    request,
    state: 'running',
    phase: 'submitting',
    message: 'Submitting export task',
    createdAt,
    updatedAt: createdAt,
    rootCount: request.roots?.length ?? 0,
  };

  setTasks([task, ...tasks]);
  void runExportTask(task.id, request);
  return task;
}

export async function downloadTidasPackageExportTask(
  taskId: string,
): Promise<ExportTidasPackageResponse> {
  const task = tasks.find((item) => item.id === taskId);
  if (!task?.jobId) {
    throw new Error('Package export task is missing job information');
  }

  const result = await downloadReadyTidasPackageExportApi(
    task.jobId,
    task.filename ?? 'tidas-package.zip',
  );
  if (result.error || !result.data?.ok) {
    throw result.error ?? new Error('Failed to download TIDAS package');
  }

  upsertTask(taskId, {
    filename: result.data.filename,
    message: `Export package ready (${result.data.filename})`,
  });

  return result.data;
}

export function removeTidasPackageTask(taskId: string): void {
  setTasks(tasks.filter((item) => item.id !== taskId));
}

export function clearFinishedTidasPackageTasks(): void {
  setTasks(tasks.filter((item) => item.state === 'running'));
}

export function listTidasPackageTasks(): TidasPackageBackgroundTask[] {
  return tasks;
}

export function subscribeTidasPackageTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

hydrateTasksFromStorage();
