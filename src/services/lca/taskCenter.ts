import type { TaskSessionGuard } from '@/services/taskCenter/sessionGuard';
import {
  requestWorkerJobsApi,
  type WorkerJobResult,
  type WorkerJobStatus,
} from '@/services/workerJobs/api';
import { submitLcaSolve, type LcaSolveRequest, type LcaSolveSubmitResponse } from './api';
import { DEFAULT_LCA_SCOPE, type LcaScope } from './scope';

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
  scope: LcaScope;
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
const DEFAULT_POLL_INTERVALS_MS = [1000, 2000, 3000, 5000];
const LEGACY_STORAGE_KEY = 'tg_lca_task_center_v1';
const STORAGE_KEY_PREFIX = 'tg_lca_task_center_v2';
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

let taskOwnerId: string | null = null;
let taskGeneration = 0;
let activeRefresh: { generation: number; promise: Promise<LcaBackgroundTask[]> } | null = null;
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

export function getLcaTaskStorageKey(ownerId: string): string {
  const normalized = ownerId.trim();
  if (!normalized) throw new Error('LCA task storage requires an authenticated user id');
  return `${STORAGE_KEY_PREFIX}:${encodeURIComponent(normalized)}`;
}

function isActiveGeneration(generation: number): boolean {
  return taskOwnerId !== null && generation === taskGeneration;
}

function taskSessionGuard(generation: number): TaskSessionGuard {
  return { ownerId: taskOwnerId!, isCurrent: () => isActiveGeneration(generation) };
}

function persistTasksToStorage(): void {
  if (!canUseStorage() || !taskOwnerId) {
    return;
  }
  const payload: PersistedTaskStore = {
    version: STORAGE_SCHEMA_VERSION,
    savedAt: nowIso(),
    tasks,
  };
  try {
    window.localStorage.setItem(getLcaTaskStorageKey(taskOwnerId!), JSON.stringify(payload));
  } catch (_error) {
    // Ignore storage failures (quota/privacy mode).
  }
}

function setTasks(next: LcaBackgroundTask[], generation = taskGeneration): void {
  if (!isActiveGeneration(generation)) return;
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

function normalizeStoredScope(value: unknown): LcaScope {
  return value === 'data_product' ? 'data_product' : DEFAULT_LCA_SCOPE;
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
  const request = value as { scope?: unknown; demand_mode?: unknown; demand?: unknown };
  const normalizedRequest = {
    ...request,
    scope: normalizeStoredScope(request.scope),
  } as LcaSolveRequest;
  if (request.demand_mode === 'all_unit') {
    return normalizedRequest;
  }
  const demand = request.demand as
    { process_index?: unknown; process_id?: unknown; process_version?: unknown } | undefined;
  if (demand && Number.isInteger(demand.process_index) && Number(demand.process_index) >= 0) {
    return normalizedRequest;
  }
  if (demand && typeof demand.process_id === 'string' && demand.process_id.trim()) {
    return normalizedRequest;
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
  const scope = normalizeStoredScope(item.scope);
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
  if (!canUseStorage() || !taskOwnerId) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(getLcaTaskStorageKey(taskOwnerId!));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PersistedTaskStore;
    if (!parsed || parsed.version !== STORAGE_SCHEMA_VERSION) {
      window.localStorage.removeItem(getLcaTaskStorageKey(taskOwnerId!));
      return [];
    }
    const savedAtMs = Date.parse(String(parsed.savedAt ?? ''));
    if (Number.isFinite(savedAtMs) && Date.now() - savedAtMs > STORAGE_TTL_MS) {
      window.localStorage.removeItem(getLcaTaskStorageKey(taskOwnerId!));
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

function upsertTask(taskId: string, patch: Partial<LcaBackgroundTask>, generation: number): void {
  if (!isActiveGeneration(generation)) return;
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function terminalWorkerJobStatus(status: WorkerJobStatus): boolean {
  return (
    status === 'completed' ||
    status === 'failed' ||
    status === 'stale' ||
    status === 'blocked' ||
    status === 'cancelled'
  );
}

function failedWorkerJobStatus(status: WorkerJobStatus): boolean {
  return (
    status === 'failed' || status === 'stale' || status === 'blocked' || status === 'cancelled'
  );
}

function messageForRunningWorkerJob(job: WorkerJobResult, defaultText: string): string {
  const status = job.status;
  if (status === 'queued' || status === 'waiting') {
    return `${defaultText}: queued`;
  }
  if (status === 'running') {
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

function messageFromWorkerJob(
  job: WorkerJobResult,
  phase: LcaTaskPhase,
  displayJobId: string,
): string {
  if (job.status === 'completed') {
    const resultId = resultIdFromWorkerJob(job);
    return resultId ? `Completed (result ${resultId})` : 'Completed';
  }
  if (stateFromWorkerJob(job) === 'failed') {
    return 'Task failed';
  }
  if (phase === 'building_snapshot') {
    return `Building snapshot (${displayJobId})`;
  }
  if (phase === 'solving') {
    return `Solving (${displayJobId})`;
  }
  return 'Submitting task';
}

function patchFromWorkerJobTick(
  job: WorkerJobResult,
  fallbackDisplayJobId: string,
): Partial<LcaBackgroundTask> {
  const workerJobId = firstString(job.id);
  const legacyJobId = lcaJobIdFromWorkerJob(job);
  const displayJobId = legacyJobId ?? workerJobId ?? fallbackDisplayJobId;
  const isBuildJob =
    job.jobKind === 'lca.build_snapshot' || phaseFromWorkerJob(job) === 'building_snapshot';
  const snapshotId = snapshotIdFromWorkerJob(job);
  const patch: Partial<LcaBackgroundTask> = {
    workerJobId,
    jobKind: firstString(job.jobKind),
    message: messageForRunningWorkerJob(
      job,
      `${isBuildJob ? 'Building snapshot' : 'Solving'} (${displayJobId})`,
    ),
  };

  if (isBuildJob) {
    patch.buildJobId = legacyJobId ?? fallbackDisplayJobId;
  } else {
    patch.solveJobId = legacyJobId ?? fallbackDisplayJobId;
  }
  if (snapshotId) {
    patch.snapshotId = snapshotId;
  }
  return patch;
}

async function readWorkerJob(workerJobId: string): Promise<WorkerJobResult> {
  const result = await requestWorkerJobsApi({
    action: 'read',
    jobId: workerJobId,
  });
  if (result.error) {
    throw new Error(result.error.message || 'Failed to read LCA worker job');
  }

  const job = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!job) {
    throw new Error('worker_job_not_found');
  }
  return job;
}

async function pollWorkerJobUntilTerminal(
  workerJobId: string,
  options: {
    timeoutMs: number;
    generation: number;
    onTick?: (job: WorkerJobResult) => void;
  },
): Promise<WorkerJobResult> {
  const startedAt = Date.now();
  let attempt = 0;

  while (true) {
    if (!isActiveGeneration(options.generation)) throw new Error('task_owner_changed');
    const job = await readWorkerJob(workerJobId);
    if (!isActiveGeneration(options.generation)) throw new Error('task_owner_changed');
    options.onTick?.(job);

    if (terminalWorkerJobStatus(job.status)) {
      return job;
    }

    if (Date.now() - startedAt > options.timeoutMs) {
      throw new Error('poll_timeout');
    }

    const delay =
      DEFAULT_POLL_INTERVALS_MS[Math.min(attempt, DEFAULT_POLL_INTERVALS_MS.length - 1)];
    attempt += 1;
    await sleep(delay);
  }
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
  const displayJobId = legacyJobId ?? workerJobId;
  const isBuildJob = job.jobKind === 'lca.build_snapshot' || phase === 'building_snapshot';

  return {
    id: workerJobId,
    sequence: fallbackSequence,
    mode: modeFromWorkerJob(job),
    scope: DEFAULT_LCA_SCOPE,
    state,
    phase,
    message: messageFromWorkerJob(job, phase, displayJobId),
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

async function waitBuildSnapshot(
  taskId: string,
  buildJobId: string,
  buildWorkerJobId: string,
  generation: number,
): Promise<'ok' | 'failed'> {
  upsertTask(
    taskId,
    {
      phase: 'building_snapshot',
      state: 'running',
      workerJobId: buildWorkerJobId,
      buildJobId,
      message: `Building snapshot (${buildJobId})`,
    },
    generation,
  );

  const job = await pollWorkerJobUntilTerminal(buildWorkerJobId, {
    timeoutMs: BUILD_TIMEOUT_MS,
    generation,
    onTick: (tick) => {
      upsertTask(taskId, patchFromWorkerJobTick(tick, buildJobId), generation);
    },
  });

  const legacyJobId = lcaJobIdFromWorkerJob(job) ?? buildJobId;
  const snapshotId = snapshotIdFromWorkerJob(job);
  if (failedWorkerJobStatus(job.status)) {
    const failurePatch: Partial<LcaBackgroundTask> = {
      phase: 'failed',
      state: 'failed',
      workerJobId: firstString(job.id) ?? buildWorkerJobId,
      buildJobId: legacyJobId,
      message: `Snapshot build failed (${legacyJobId})`,
      error: `snapshot_build_${job.status}`,
    };
    if (snapshotId) {
      failurePatch.snapshotId = snapshotId;
    }
    upsertTask(taskId, failurePatch, generation);
    return 'failed';
  }

  const successPatch: Partial<LcaBackgroundTask> = {
    phase: 'submitting',
    state: 'running',
    workerJobId: firstString(job.id) ?? buildWorkerJobId,
    buildJobId: legacyJobId,
    message: 'Snapshot ready, submitting solve job',
  };
  if (snapshotId) {
    successPatch.snapshotId = snapshotId;
  }
  upsertTask(taskId, successPatch, generation);
  return 'ok';
}

async function waitSolveResult(
  taskId: string,
  solveJobId: string,
  solveWorkerJobId: string,
  generation: number,
): Promise<void> {
  upsertTask(
    taskId,
    {
      phase: 'solving',
      state: 'running',
      workerJobId: solveWorkerJobId,
      solveJobId,
      message: `Solving (${solveJobId})`,
    },
    generation,
  );

  const job = await pollWorkerJobUntilTerminal(solveWorkerJobId, {
    timeoutMs: SOLVE_TIMEOUT_MS,
    generation,
    onTick: (tick) => {
      upsertTask(taskId, patchFromWorkerJobTick(tick, solveJobId), generation);
    },
  });

  const legacyJobId = lcaJobIdFromWorkerJob(job) ?? solveJobId;
  const snapshotId = snapshotIdFromWorkerJob(job);
  if (failedWorkerJobStatus(job.status)) {
    const failurePatch: Partial<LcaBackgroundTask> = {
      phase: 'failed',
      state: 'failed',
      workerJobId: firstString(job.id) ?? solveWorkerJobId,
      solveJobId: legacyJobId,
      message: `Solve failed (${legacyJobId})`,
      error: `solve_${job.status}`,
    };
    if (snapshotId) {
      failurePatch.snapshotId = snapshotId;
    }
    upsertTask(taskId, failurePatch, generation);
    return;
  }

  const resultId = resultIdFromWorkerJob(job) ?? '';
  if (!resultId) {
    const missingResultPatch: Partial<LcaBackgroundTask> = {
      phase: 'failed',
      state: 'failed',
      workerJobId: firstString(job.id) ?? solveWorkerJobId,
      solveJobId: legacyJobId,
      message: `Solve finished but result is missing (${legacyJobId})`,
      error: 'result_id_missing',
    };
    if (snapshotId) {
      missingResultPatch.snapshotId = snapshotId;
    }
    upsertTask(taskId, missingResultPatch, generation);
    return;
  }

  const completedPatch: Partial<LcaBackgroundTask> = {
    phase: 'completed',
    state: 'completed',
    workerJobId: firstString(job.id) ?? solveWorkerJobId,
    solveJobId: legacyJobId,
    resultId,
    message: `Completed (result ${resultId})`,
  };
  if (snapshotId) {
    completedPatch.snapshotId = snapshotId;
  }
  upsertTask(taskId, completedPatch, generation);
}

async function refreshLcaTasksFromWorkerJobsInternal(
  generation: number,
): Promise<LcaBackgroundTask[]> {
  const result = await requestWorkerJobsApi({
    action: 'list',
    subjectType: 'lca_job',
    statuses: LCA_WORKER_JOB_STATUSES,
    limit: MAX_TASK_ITEMS,
  });
  if (!isActiveGeneration(generation)) return tasks;
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

  setTasks(merged, generation);
  const maxSequence = tasks.reduce((max, item) => Math.max(max, item.sequence), 0);
  if (maxSequence > taskSequence) {
    taskSequence = maxSequence;
  }
  return tasks;
}

export async function refreshLcaTasksFromWorkerJobs(): Promise<LcaBackgroundTask[]> {
  if (!taskOwnerId) return tasks;
  const generation = taskGeneration;
  if (activeRefresh?.generation === generation) return activeRefresh.promise;
  const promise = refreshLcaTasksFromWorkerJobsInternal(generation);
  activeRefresh = { generation, promise };
  try {
    return await promise;
  } finally {
    if (activeRefresh?.promise === promise) activeRefresh = null;
  }
}

async function resolveRunningTaskWorkerJobId(
  taskId: string,
  phase: 'building_snapshot' | 'solving',
  generation: number,
): Promise<string | undefined> {
  const current = tasks.find((item) => item.id === taskId);
  if (current?.workerJobId) {
    return current.workerJobId;
  }

  await refreshLcaTasksFromWorkerJobs().catch(() => undefined);
  if (!isActiveGeneration(generation)) return undefined;
  const refreshed = tasks.find((item) => item.id === taskId);
  if (refreshed?.workerJobId) {
    return refreshed.workerJobId;
  }

  const legacyId = phase === 'building_snapshot' ? current!.buildJobId : current!.solveJobId;

  const matched = tasks.find((item) =>
    phase === 'building_snapshot'
      ? item.buildJobId === legacyId && item.workerJobId
      : item.solveJobId === legacyId && item.workerJobId,
  );
  return matched?.workerJobId;
}

async function processSubmitResponse(
  taskId: string,
  request: LcaSolveRequest,
  submit: LcaSolveSubmitResponse,
  attempt: number,
  generation: number,
): Promise<void> {
  if (!isActiveGeneration(generation)) return;
  if (submit.mode === 'cache_hit') {
    upsertTask(
      taskId,
      {
        phase: 'completed',
        state: 'completed',
        snapshotId: submit.snapshot_id,
        resultId: submit.result_id,
        message: `Cache hit (result ${submit.result_id})`,
      },
      generation,
    );
    return;
  }

  if (submit.mode === 'snapshot_building') {
    const buildWorkerJobId = submit.build_worker_job_id ?? undefined;
    upsertTask(
      taskId,
      {
        workerJobId: buildWorkerJobId,
        buildJobId: submit.build_job_id,
        snapshotId: submit.build_snapshot_id,
      },
      generation,
    );
    if (!buildWorkerJobId) {
      upsertTask(
        taskId,
        {
          phase: 'failed',
          state: 'failed',
          buildJobId: submit.build_job_id,
          snapshotId: submit.build_snapshot_id,
          message: 'Snapshot build worker job is missing',
          error: 'worker_job_id_missing',
        },
        generation,
      );
      return;
    }
    if (attempt >= 3) {
      upsertTask(
        taskId,
        {
          phase: 'failed',
          state: 'failed',
          buildJobId: submit.build_job_id,
          workerJobId: buildWorkerJobId,
          snapshotId: submit.build_snapshot_id,
          message: 'Snapshot build retry limit reached',
          error: 'snapshot_build_retry_limit',
        },
        generation,
      );
      return;
    }
    const built = await waitBuildSnapshot(
      taskId,
      submit.build_job_id,
      buildWorkerJobId,
      generation,
    );
    if (!isActiveGeneration(generation) || built !== 'ok') {
      return;
    }
    const nextSubmit = await submitLcaSolve(request, { taskSession: taskSessionGuard(generation) });
    await processSubmitResponse(taskId, request, nextSubmit, attempt + 1, generation);
    return;
  }

  const solveWorkerJobId = submit.worker_job_id ?? undefined;
  upsertTask(
    taskId,
    {
      workerJobId: solveWorkerJobId,
      solveJobId: submit.job_id,
      snapshotId: submit.snapshot_id,
    },
    generation,
  );
  if (!solveWorkerJobId) {
    upsertTask(
      taskId,
      {
        phase: 'failed',
        state: 'failed',
        solveJobId: submit.job_id,
        snapshotId: submit.snapshot_id,
        message: 'Solve worker job is missing',
        error: 'worker_job_id_missing',
      },
      generation,
    );
    return;
  }
  await waitSolveResult(taskId, submit.job_id, solveWorkerJobId, generation);
}

async function runTask(
  taskId: string,
  request: LcaSolveRequest,
  generation: number,
): Promise<void> {
  if (!isActiveGeneration(generation)) return;
  try {
    const submit = await submitLcaSolve(request, { taskSession: taskSessionGuard(generation) });
    if (!isActiveGeneration(generation)) return;
    if (submit.mode === 'queued' || submit.mode === 'in_progress') {
      upsertTask(
        taskId,
        {
          workerJobId: submit.worker_job_id ?? undefined,
          solveJobId: submit.job_id,
          snapshotId: submit.snapshot_id,
        },
        generation,
      );
    } else if (submit.mode === 'snapshot_building') {
      upsertTask(
        taskId,
        {
          workerJobId: submit.build_worker_job_id ?? undefined,
          buildJobId: submit.build_job_id,
          snapshotId: submit.build_snapshot_id,
        },
        generation,
      );
    }
    await processSubmitResponse(taskId, request, submit, 0, generation);
  } catch (error) {
    upsertTask(
      taskId,
      {
        phase: 'failed',
        state: 'failed',
        message: 'Task failed',
        error: toErrorMessage(error),
      },
      generation,
    );
  }
}

async function resumeTaskAfterReload(taskId: string, generation: number): Promise<void> {
  const task = tasks.find((item) => item.id === taskId);
  if (!task || task.state !== 'running') {
    return;
  }

  try {
    if (task.phase === 'solving' && task.solveJobId) {
      const workerJobId = await resolveRunningTaskWorkerJobId(task.id, 'solving', generation);
      if (!workerJobId) {
        upsertTask(
          task.id,
          {
            phase: 'failed',
            state: 'failed',
            message: 'Task recovery failed',
            error: 'worker_job_id_missing',
          },
          generation,
        );
        return;
      }
      upsertTask(
        task.id,
        {
          workerJobId,
          message: `Resuming solve (${task.solveJobId})`,
        },
        generation,
      );
      await waitSolveResult(task.id, task.solveJobId, workerJobId, generation);
      return;
    }

    if (task.phase === 'building_snapshot' && task.buildJobId) {
      const workerJobId = await resolveRunningTaskWorkerJobId(
        task.id,
        'building_snapshot',
        generation,
      );
      if (!workerJobId) {
        upsertTask(
          task.id,
          {
            phase: 'failed',
            state: 'failed',
            message: 'Task recovery failed',
            error: 'worker_job_id_missing',
          },
          generation,
        );
        return;
      }
      upsertTask(
        task.id,
        {
          workerJobId,
          message: `Resuming snapshot build (${task.buildJobId})`,
        },
        generation,
      );
      const built = await waitBuildSnapshot(task.id, task.buildJobId, workerJobId, generation);
      if (!isActiveGeneration(generation) || built !== 'ok') {
        return;
      }
      const latest = tasks.find((item) => item.id === task.id);
      if (!latest?.request) {
        upsertTask(
          task.id,
          {
            phase: 'failed',
            state: 'failed',
            message: 'Reload recovery failed',
            error: 'request_missing_after_snapshot_build',
          },
          generation,
        );
        return;
      }
      const nextSubmit = await submitLcaSolve(latest.request, {
        taskSession: taskSessionGuard(generation),
      });
      await processSubmitResponse(task.id, latest.request, nextSubmit, 0, generation);
      return;
    }

    if (task.request) {
      upsertTask(
        task.id,
        {
          message: 'Resuming task after reload',
        },
        generation,
      );
      await runTask(task.id, task.request, generation);
      return;
    }

    upsertTask(
      task.id,
      {
        phase: 'failed',
        state: 'failed',
        message: 'Reload recovery failed',
        error: 'request_missing',
      },
      generation,
    );
  } catch (error) {
    upsertTask(
      task.id,
      {
        phase: 'failed',
        state: 'failed',
        message: 'Task recovery failed',
        error: toErrorMessage(error),
      },
      generation,
    );
  }
}

function hydrateTasksFromStorage(generation: number): void {
  const restored = readTasksFromStorage();
  if (restored.length > 0) {
    setTasks(restored, generation);
    const maxSequence = restored.reduce((max, item) => Math.max(max, item.sequence), 0);
    if (maxSequence > taskSequence) {
      taskSequence = maxSequence;
    }

    restored
      .filter((item) => item.state === 'running')
      .forEach((item) => {
        void resumeTaskAfterReload(item.id, generation);
      });
  }

  void refreshLcaTasksFromWorkerJobs().catch(() => undefined);
}

export function submitLcaTask(request: LcaSolveRequest): LcaBackgroundTask {
  if (!taskOwnerId) throw new Error('LCA task center requires an authenticated user');
  const generation = taskGeneration;
  const createdAt = nowIso();
  const sequence = nextTaskSequence();
  const task: LcaBackgroundTask = {
    id: makeTaskId(sequence),
    sequence,
    request,
    mode: resolveMode(request),
    scope: request.scope ?? DEFAULT_LCA_SCOPE,
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
  void runTask(task.id, request, generation);
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

export function bindLcaTaskCenterOwner(ownerId: string | null | undefined): void {
  const normalized = typeof ownerId === 'string' ? ownerId.trim() || null : null;
  if (normalized === taskOwnerId) return;
  taskGeneration += 1;
  taskOwnerId = normalized;
  tasks = [];
  taskSequence = 0;
  emitChange();
  if (!normalized) return;
  if (canUseStorage()) {
    try {
      // Global historical snapshots have no attributable owner.
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* Ignore storage failures. */
    }
  }
  hydrateTasksFromStorage(taskGeneration);
}
