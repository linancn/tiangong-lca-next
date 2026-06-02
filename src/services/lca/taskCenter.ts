import {
  requestWorkerJobsApi,
  type WorkerJobResult,
  type WorkerJobStatus,
} from '@/services/workerJobs/api';
import {
  pollLcaJobUntilTerminal,
  submitLcaSolve,
  type LcaJobResponse,
  type LcaSolveRequest,
  type LcaSolveSubmitResponse,
} from './api';

export type LcaTaskState = 'running' | 'completed' | 'failed';
export type LcaTaskPhase = 'submitting' | 'building_snapshot' | 'solving' | 'completed' | 'failed';
export type LcaTaskMode = 'single' | 'all_unit';
export type LcaTrackedTaskPhase = 'submitting' | 'building_snapshot' | 'solving';
export type LcaTaskPhaseTimelineItem = {
  phase: LcaTrackedTaskPhase;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
};

export type LcaBackgroundTask = {
  id: string;
  sequence: number;
  request?: LcaSolveRequest;
  mode: LcaTaskMode;
  scope: string;
  state: LcaTaskState;
  phase: LcaTaskPhase;
  message: string;
  createdAt: string;
  updatedAt: string;
  workerJobId?: string;
  rootJobId?: string;
  jobKind?: string;
  buildJobId?: string;
  solveJobId?: string;
  snapshotId?: string;
  resultId?: string;
  error?: string;
  phaseTimeline: LcaTaskPhaseTimelineItem[];
};

const MAX_TASK_ITEMS = 30;
const BUILD_TIMEOUT_MS = 20 * 60 * 1000;
const SOLVE_TIMEOUT_MS = 20 * 60 * 1000;
const STORAGE_KEY = 'tg_lca_task_center_v1';
const STORAGE_SCHEMA_VERSION = 1;
const STORAGE_TTL_MS = 72 * 60 * 60 * 1000;
const LCA_WORKER_JOB_STATUSES: WorkerJobStatus[] = [
  'queued',
  'running',
  'waiting',
  'completed',
  'blocked',
  'stale',
  'failed',
  'cancelled',
];

let taskSequence = 0;
let tasks: LcaBackgroundTask[] = [];
const listeners = new Set<() => void>();
const openRequestListeners = new Set<() => void>();

type PersistedTaskStore = {
  version: number;
  savedAt: string;
  tasks: LcaBackgroundTask[];
};

function nowIso(): string {
  return new Date().toISOString();
}

function nextTaskSequence(): number {
  taskSequence += 1;
  return taskSequence;
}

function makeTaskId(sequence: number): string {
  return `lca-task-${Date.now()}-${sequence}`;
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
    // Ignore storage failures (quota/privacy mode).
  }
}

function setTasks(next: LcaBackgroundTask[]): void {
  tasks = next
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_TASK_ITEMS);
  persistTasksToStorage();
  emitChange();
}

function normalizeMode(value: unknown): LcaTaskMode | null {
  if (value === 'single' || value === 'all_unit') {
    return value;
  }
  return null;
}

function normalizeState(value: unknown): LcaTaskState | null {
  if (value === 'running' || value === 'completed' || value === 'failed') {
    return value;
  }
  return null;
}

function normalizePhase(value: unknown): LcaTaskPhase | null {
  if (
    value === 'submitting' ||
    value === 'building_snapshot' ||
    value === 'solving' ||
    value === 'completed' ||
    value === 'failed'
  ) {
    return value;
  }
  return null;
}

function isTrackedTaskPhase(phase: LcaTaskPhase): phase is LcaTrackedTaskPhase {
  return phase === 'submitting' || phase === 'building_snapshot' || phase === 'solving';
}

function normalizeIso(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value : fallback;
  return Number.isFinite(Date.parse(text)) ? text : fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const text = value.trim();
    if (text) {
      return text;
    }
  }
  return undefined;
}

function normalizeRequest(value: unknown): LcaSolveRequest | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const request = value as { demand_mode?: unknown; demand?: unknown };
  if (request.demand_mode === 'all_unit') {
    return value as LcaSolveRequest;
  }
  const demand = request.demand as
    | { process_index?: unknown; process_id?: unknown; process_version?: unknown }
    | undefined;
  if (demand && Number.isInteger(demand.process_index) && Number(demand.process_index) >= 0) {
    return value as LcaSolveRequest;
  }
  if (demand && typeof demand.process_id === 'string' && demand.process_id.trim()) {
    return value as LcaSolveRequest;
  }
  return undefined;
}

function normalizeTimeline(
  value: unknown,
  fallbackCreatedAt: string,
  fallbackPhase: LcaTaskPhase,
): LcaTaskPhaseTimelineItem[] {
  const rawItems = Array.isArray(value) ? value : [];
  const items: LcaTaskPhaseTimelineItem[] = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const item = raw as {
      phase?: unknown;
      startedAt?: unknown;
      endedAt?: unknown;
      durationMs?: unknown;
    };
    const normalizedPhase = normalizePhase(item.phase);
    if (!normalizedPhase || !isTrackedTaskPhase(normalizedPhase)) {
      continue;
    }
    const startedAt = normalizeIso(item.startedAt, fallbackCreatedAt);
    const endedAt =
      typeof item.endedAt === 'string' && Number.isFinite(Date.parse(item.endedAt))
        ? item.endedAt
        : undefined;
    const durationMs =
      typeof item.durationMs === 'number' &&
      Number.isFinite(item.durationMs) &&
      item.durationMs >= 0
        ? item.durationMs
        : undefined;
    items.push({ phase: normalizedPhase, startedAt, endedAt, durationMs });
  }

  if (items.length > 0) {
    items.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
    return items;
  }

  if (isTrackedTaskPhase(fallbackPhase)) {
    return [{ phase: fallbackPhase, startedAt: fallbackCreatedAt }];
  }
  return [{ phase: 'submitting', startedAt: fallbackCreatedAt }];
}

function normalizeTask(raw: unknown, fallbackSequence: number): LcaBackgroundTask | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as {
    id?: unknown;
    sequence?: unknown;
    request?: unknown;
    mode?: unknown;
    scope?: unknown;
    state?: unknown;
    phase?: unknown;
    message?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
    workerJobId?: unknown;
    rootJobId?: unknown;
    jobKind?: unknown;
    buildJobId?: unknown;
    solveJobId?: unknown;
    snapshotId?: unknown;
    resultId?: unknown;
    error?: unknown;
    phaseTimeline?: unknown;
  };

  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : null;
  const mode = normalizeMode(item.mode);
  const state = normalizeState(item.state);
  const phase = normalizePhase(item.phase);
  if (!id || !mode || !state || !phase) {
    return null;
  }
  const now = nowIso();
  const createdAt = normalizeIso(item.createdAt, now);
  const updatedAt = normalizeIso(item.updatedAt, createdAt);
  const scope = typeof item.scope === 'string' && item.scope.trim() ? item.scope.trim() : 'prod';
  const sequence = Number.isInteger(item.sequence)
    ? Math.max(1, Number(item.sequence))
    : fallbackSequence;
  const phaseTimeline = normalizeTimeline(item.phaseTimeline, createdAt, phase);

  return {
    id,
    sequence,
    request: normalizeRequest(item.request),
    mode,
    scope,
    state,
    phase,
    message: typeof item.message === 'string' ? item.message : 'Recovered task',
    createdAt,
    updatedAt,
    workerJobId: typeof item.workerJobId === 'string' ? item.workerJobId : undefined,
    rootJobId: typeof item.rootJobId === 'string' ? item.rootJobId : undefined,
    jobKind: typeof item.jobKind === 'string' ? item.jobKind : undefined,
    buildJobId: typeof item.buildJobId === 'string' ? item.buildJobId : undefined,
    solveJobId: typeof item.solveJobId === 'string' ? item.solveJobId : undefined,
    snapshotId: typeof item.snapshotId === 'string' ? item.snapshotId : undefined,
    resultId: typeof item.resultId === 'string' ? item.resultId : undefined,
    error: typeof item.error === 'string' ? item.error : undefined,
    phaseTimeline,
  };
}

function readTasksFromStorage(): LcaBackgroundTask[] {
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
    const normalized: LcaBackgroundTask[] = [];
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

function closeTimelineItem(
  item: LcaTaskPhaseTimelineItem,
  endedAt: string,
): LcaTaskPhaseTimelineItem {
  const durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(item.startedAt));
  return {
    ...item,
    endedAt,
    durationMs,
  };
}

function applyTaskTimelineTransition(
  timeline: LcaTaskPhaseTimelineItem[],
  currentPhase: LcaTaskPhase,
  nextPhase: LcaTaskPhase,
  nextState: LcaTaskState,
  timestamp: string,
): LcaTaskPhaseTimelineItem[] {
  const nextTimeline = timeline.slice();
  const changedPhase = nextPhase !== currentPhase;
  const becameTerminal = nextState !== 'running';
  const lastIndex = nextTimeline.length - 1;

  if ((changedPhase || becameTerminal) && lastIndex >= 0) {
    const last = nextTimeline[lastIndex];
    if (!last.endedAt) {
      nextTimeline[lastIndex] = closeTimelineItem(last, timestamp);
    }
  }

  if (changedPhase && isTrackedTaskPhase(nextPhase)) {
    nextTimeline.push({
      phase: nextPhase,
      startedAt: timestamp,
    });
  }

  return nextTimeline;
}

function upsertTask(taskId: string, patch: Partial<LcaBackgroundTask>): void {
  const index = tasks.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return;
  }
  const current = tasks[index];
  const timestamp = nowIso();
  const nextPhase = patch.phase ?? current.phase;
  const nextState = patch.state ?? current.state;
  const nextTimeline = applyTaskTimelineTransition(
    current.phaseTimeline,
    current.phase,
    nextPhase,
    nextState,
    timestamp,
  );
  const updated: LcaBackgroundTask = {
    ...current,
    ...patch,
    id: current.id,
    sequence: current.sequence,
    request: current.request,
    mode: current.mode,
    scope: current.scope,
    createdAt: current.createdAt,
    updatedAt: timestamp,
    phaseTimeline: nextTimeline,
  };
  const next = tasks.slice();
  next[index] = updated;
  setTasks(next);
}

function resolveMode(request: LcaSolveRequest): LcaTaskMode {
  return request.demand_mode === 'all_unit' ? 'all_unit' : 'single';
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

function messageForRunningJob(job: LcaJobResponse, defaultText: string): string {
  const status = job.status;
  if (status === 'queued') {
    return `${defaultText}: queued`;
  }
  if (status === 'running' || status === 'ready') {
    return `${defaultText}: running`;
  }
  return `${defaultText}: ${status}`;
}

function isLcaWorkerJob(job: WorkerJobResult): boolean {
  return typeof job.jobKind === 'string' && job.jobKind.startsWith('lca.');
}

function modeFromWorkerJob(job: WorkerJobResult): LcaTaskMode {
  return job.jobKind === 'lca.solve_all_unit' ? 'all_unit' : 'single';
}

function phaseFromWorkerJob(job: WorkerJobResult): LcaTaskPhase {
  if (job.status === 'completed') {
    return 'completed';
  }
  if (
    job.status === 'failed' ||
    job.status === 'stale' ||
    job.status === 'blocked' ||
    job.status === 'cancelled'
  ) {
    return 'failed';
  }

  const phase = typeof job.phase === 'string' ? job.phase : '';
  if (phase === 'build_snapshot' || job.jobKind === 'lca.build_snapshot') {
    return 'building_snapshot';
  }
  if (
    phase === 'solve_one' ||
    phase === 'solve_batch' ||
    phase === 'solve_all_unit' ||
    job.jobKind === 'lca.solve_one' ||
    job.jobKind === 'lca.solve_batch' ||
    job.jobKind === 'lca.solve_all_unit'
  ) {
    return 'solving';
  }
  return 'submitting';
}

function stateFromWorkerJob(job: WorkerJobResult): LcaTaskState {
  if (job.status === 'completed') {
    return 'completed';
  }
  if (job.status === 'queued' || job.status === 'running' || job.status === 'waiting') {
    return 'running';
  }
  return 'failed';
}

function lcaJobIdFromWorkerJob(job: WorkerJobResult): string | undefined {
  const result = asRecord(job.result);
  return firstString(result?.lcaJobId, job.subjectId);
}

function snapshotIdFromWorkerJob(job: WorkerJobResult): string | undefined {
  const result = asRecord(job.result);
  return firstString(result?.snapshotId, job.subjectVersion);
}

function resultIdFromWorkerJob(job: WorkerJobResult): string | undefined {
  const result = asRecord(job.result);
  return firstString(result?.resultId);
}

function messageFromWorkerJob(job: WorkerJobResult, phase: LcaTaskPhase): string {
  const legacyJobId = lcaJobIdFromWorkerJob(job) ?? job.id ?? '-';
  if (job.status === 'completed') {
    const resultId = resultIdFromWorkerJob(job);
    return resultId ? `Completed (result ${resultId})` : 'Completed';
  }
  if (stateFromWorkerJob(job) === 'failed') {
    return 'Task failed';
  }
  if (phase === 'building_snapshot') {
    return `Building snapshot (${legacyJobId})`;
  }
  if (phase === 'solving') {
    return `Solving (${legacyJobId})`;
  }
  return 'Submitting task';
}

function taskFromWorkerJob(
  job: WorkerJobResult,
  fallbackSequence: number,
): LcaBackgroundTask | null {
  const workerJobId = firstString(job.id);
  if (!workerJobId || !isLcaWorkerJob(job)) {
    return null;
  }

  const now = nowIso();
  const createdAt = normalizeIso(job.createdAt, now);
  const updatedAt = normalizeIso(job.updatedAt, createdAt);
  const phase = phaseFromWorkerJob(job);
  const state = stateFromWorkerJob(job);
  const legacyJobId = lcaJobIdFromWorkerJob(job);
  const isBuildJob = job.jobKind === 'lca.build_snapshot' || phase === 'building_snapshot';

  return {
    id: workerJobId,
    sequence: fallbackSequence,
    mode: modeFromWorkerJob(job),
    scope: 'prod',
    state,
    phase,
    message: messageFromWorkerJob(job, phase),
    createdAt,
    updatedAt,
    workerJobId,
    rootJobId: firstString(job.rootJobId),
    jobKind: firstString(job.jobKind),
    buildJobId: isBuildJob ? legacyJobId : undefined,
    solveJobId: !isBuildJob ? legacyJobId : undefined,
    snapshotId: snapshotIdFromWorkerJob(job),
    resultId: resultIdFromWorkerJob(job),
    error:
      state === 'failed' ? firstString(job.errorMessage, job.errorCode, job.status) : undefined,
    phaseTimeline: normalizeTimeline([], createdAt, phase),
  };
}

function mergeWorkerJobTask(serverTask: LcaBackgroundTask): LcaBackgroundTask {
  const current = tasks.find((item) =>
    Boolean(
      (serverTask.workerJobId && item.workerJobId === serverTask.workerJobId) ||
      item.id === serverTask.id ||
      (serverTask.buildJobId && item.buildJobId === serverTask.buildJobId) ||
      (serverTask.solveJobId && item.solveJobId === serverTask.solveJobId),
    ),
  );

  if (!current) {
    return serverTask;
  }

  return {
    ...current,
    ...serverTask,
    id: current.id,
    sequence: current.sequence,
    request: current.request,
    mode: current.mode,
    scope: current.scope,
    createdAt: current.createdAt,
    phaseTimeline:
      current.phase === serverTask.phase && current.state === serverTask.state
        ? current.phaseTimeline
        : applyTaskTimelineTransition(
            current.phaseTimeline,
            current.phase,
            serverTask.phase,
            serverTask.state,
            serverTask.updatedAt,
          ),
  };
}

async function waitBuildSnapshot(taskId: string, buildJobId: string): Promise<'ok' | 'failed'> {
  upsertTask(taskId, {
    phase: 'building_snapshot',
    state: 'running',
    buildJobId,
    message: `Building snapshot (${buildJobId})`,
  });

  const job = await pollLcaJobUntilTerminal(buildJobId, {
    timeoutMs: BUILD_TIMEOUT_MS,
    onTick: (tick) => {
      upsertTask(taskId, {
        buildJobId: tick.job_id,
        snapshotId: tick.snapshot_id,
        message: messageForRunningJob(tick, `Building snapshot (${tick.job_id})`),
      });
    },
  });

  if (job.status === 'failed' || job.status === 'stale') {
    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      buildJobId: job.job_id,
      snapshotId: job.snapshot_id,
      message: `Snapshot build failed (${job.job_id})`,
      error: `snapshot_build_${job.status}`,
    });
    return 'failed';
  }

  upsertTask(taskId, {
    phase: 'submitting',
    state: 'running',
    buildJobId: job.job_id,
    snapshotId: job.snapshot_id,
    message: 'Snapshot ready, submitting solve job',
  });
  return 'ok';
}

async function waitSolveResult(taskId: string, solveJobId: string): Promise<void> {
  upsertTask(taskId, {
    phase: 'solving',
    state: 'running',
    solveJobId,
    message: `Solving (${solveJobId})`,
  });

  const job = await pollLcaJobUntilTerminal(solveJobId, {
    timeoutMs: SOLVE_TIMEOUT_MS,
    onTick: (tick) => {
      upsertTask(taskId, {
        solveJobId: tick.job_id,
        snapshotId: tick.snapshot_id,
        message: messageForRunningJob(tick, `Solving (${tick.job_id})`),
      });
    },
  });

  if (job.status === 'failed' || job.status === 'stale') {
    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      solveJobId: job.job_id,
      snapshotId: job.snapshot_id,
      message: `Solve failed (${job.job_id})`,
      error: `solve_${job.status}`,
    });
    return;
  }

  const resultId = job.result?.result_id ?? '';
  if (!resultId) {
    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      solveJobId: job.job_id,
      snapshotId: job.snapshot_id,
      message: `Solve finished but result is missing (${job.job_id})`,
      error: 'result_id_missing',
    });
    return;
  }

  upsertTask(taskId, {
    phase: 'completed',
    state: 'completed',
    solveJobId: job.job_id,
    snapshotId: job.snapshot_id,
    resultId,
    message: `Completed (result ${resultId})`,
  });
}

async function processSubmitResponse(
  taskId: string,
  request: LcaSolveRequest,
  submit: LcaSolveSubmitResponse,
  attempt: number,
): Promise<void> {
  if (submit.mode === 'cache_hit') {
    upsertTask(taskId, {
      phase: 'completed',
      state: 'completed',
      snapshotId: submit.snapshot_id,
      resultId: submit.result_id,
      message: `Cache hit (result ${submit.result_id})`,
    });
    return;
  }

  if (submit.mode === 'snapshot_building') {
    upsertTask(taskId, {
      workerJobId: submit.build_worker_job_id ?? undefined,
      buildJobId: submit.build_job_id,
      snapshotId: submit.build_snapshot_id,
    });
    if (attempt >= 3) {
      upsertTask(taskId, {
        phase: 'failed',
        state: 'failed',
        buildJobId: submit.build_job_id,
        workerJobId: submit.build_worker_job_id ?? undefined,
        snapshotId: submit.build_snapshot_id,
        message: 'Snapshot build retry limit reached',
        error: 'snapshot_build_retry_limit',
      });
      return;
    }
    const built = await waitBuildSnapshot(taskId, submit.build_job_id);
    if (built !== 'ok') {
      return;
    }
    const nextSubmit = await submitLcaSolve(request);
    await processSubmitResponse(taskId, request, nextSubmit, attempt + 1);
    return;
  }

  upsertTask(taskId, {
    workerJobId: submit.worker_job_id ?? undefined,
    solveJobId: submit.job_id,
    snapshotId: submit.snapshot_id,
  });
  await waitSolveResult(taskId, submit.job_id);
}

async function runTask(taskId: string, request: LcaSolveRequest): Promise<void> {
  try {
    const submit = await submitLcaSolve(request);
    if (submit.mode === 'queued' || submit.mode === 'in_progress') {
      upsertTask(taskId, {
        workerJobId: submit.worker_job_id ?? undefined,
        solveJobId: submit.job_id,
        snapshotId: submit.snapshot_id,
      });
    } else if (submit.mode === 'snapshot_building') {
      upsertTask(taskId, {
        workerJobId: submit.build_worker_job_id ?? undefined,
        buildJobId: submit.build_job_id,
        snapshotId: submit.build_snapshot_id,
      });
    }
    await processSubmitResponse(taskId, request, submit, 0);
  } catch (error) {
    upsertTask(taskId, {
      phase: 'failed',
      state: 'failed',
      message: 'Task failed',
      error: toErrorMessage(error),
    });
  }
}

async function resumeTaskAfterReload(taskId: string): Promise<void> {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.state !== 'running') {
    return;
  }

  try {
    if (task.phase === 'solving' && task.solveJobId) {
      upsertTask(task.id, {
        message: `Resuming solve (${task.solveJobId})`,
      });
      await waitSolveResult(task.id, task.solveJobId);
      return;
    }

    if (task.phase === 'building_snapshot' && task.buildJobId) {
      upsertTask(task.id, {
        message: `Resuming snapshot build (${task.buildJobId})`,
      });
      const built = await waitBuildSnapshot(task.id, task.buildJobId);
      if (built !== 'ok') {
        return;
      }
      const latest = tasks.find((item) => item.id === task.id);
      if (!latest?.request) {
        upsertTask(task.id, {
          phase: 'failed',
          state: 'failed',
          message: 'Reload recovery failed',
          error: 'request_missing_after_snapshot_build',
        });
        return;
      }
      const nextSubmit = await submitLcaSolve(latest.request);
      await processSubmitResponse(task.id, latest.request, nextSubmit, 0);
      return;
    }

    if (task.request) {
      upsertTask(task.id, {
        message: 'Resuming task after reload',
      });
      await runTask(task.id, task.request);
      return;
    }

    upsertTask(task.id, {
      phase: 'failed',
      state: 'failed',
      message: 'Reload recovery failed',
      error: 'request_missing',
    });
  } catch (error) {
    upsertTask(task.id, {
      phase: 'failed',
      state: 'failed',
      message: 'Task recovery failed',
      error: toErrorMessage(error),
    });
  }
}

export async function refreshLcaTasksFromWorkerJobs(): Promise<LcaBackgroundTask[]> {
  const result = await requestWorkerJobsApi({
    action: 'list',
    subjectType: 'lca_job',
    statuses: LCA_WORKER_JOB_STATUSES,
    limit: MAX_TASK_ITEMS,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to refresh LCA worker jobs');
  }

  const serverTasks = (result.data ?? [])
    .map((job, index) => taskFromWorkerJob(job, taskSequence + index + 1))
    .filter((item): item is LcaBackgroundTask => Boolean(item));
  if (serverTasks.length === 0) {
    return tasks;
  }

  const merged = tasks.slice();
  for (const serverTask of serverTasks) {
    const nextTask = mergeWorkerJobTask(serverTask);
    const existingIndex = merged.findIndex((item) => item.id === nextTask.id);
    if (existingIndex >= 0) {
      merged[existingIndex] = nextTask;
    } else {
      merged.push(nextTask);
    }
  }

  setTasks(merged);
  const maxSequence = tasks.reduce((max, item) => Math.max(max, item.sequence), 0);
  if (maxSequence > taskSequence) {
    taskSequence = maxSequence;
  }
  return tasks;
}

function hydrateTasksFromStorage(): void {
  const restored = readTasksFromStorage();
  if (restored.length > 0) {
    setTasks(restored);
    const maxSequence = restored.reduce((max, item) => Math.max(max, item.sequence), 0);
    if (maxSequence > taskSequence) {
      taskSequence = maxSequence;
    }

    restored
      .filter((item) => item.state === 'running')
      .forEach((item) => {
        void resumeTaskAfterReload(item.id);
      });
  }

  void refreshLcaTasksFromWorkerJobs().catch(() => undefined);
}

export function submitLcaTask(request: LcaSolveRequest): LcaBackgroundTask {
  const createdAt = nowIso();
  const sequence = nextTaskSequence();
  const task: LcaBackgroundTask = {
    id: makeTaskId(sequence),
    sequence,
    request,
    mode: resolveMode(request),
    scope: request.scope ?? 'prod',
    state: 'running',
    phase: 'submitting',
    message: 'Submitting task',
    createdAt,
    updatedAt: createdAt,
    phaseTimeline: [
      {
        phase: 'submitting',
        startedAt: createdAt,
      },
    ],
  };
  setTasks([task, ...tasks]);
  void runTask(task.id, request);
  return task;
}

export function removeLcaTask(taskId: string): void {
  setTasks(tasks.filter((item) => item.id !== taskId));
}

export function clearFinishedLcaTasks(): void {
  setTasks(tasks.filter((item) => item.state === 'running'));
}

export function listLcaTasks(): LcaBackgroundTask[] {
  return tasks;
}

export function subscribeLcaTasks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function requestOpenLcaTaskCenter(): void {
  for (const listener of openRequestListeners) {
    listener();
  }
}

export function subscribeLcaTaskCenterOpenRequests(listener: () => void): () => void {
  openRequestListeners.add(listener);
  return () => {
    openRequestListeners.delete(listener);
  };
}

hydrateTasksFromStorage();
