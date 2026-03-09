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

export type LcaBackgroundTask = {
  id: string;
  mode: LcaTaskMode;
  scope: string;
  state: LcaTaskState;
  phase: LcaTaskPhase;
  message: string;
  createdAt: string;
  updatedAt: string;
  buildJobId?: string;
  solveJobId?: string;
  snapshotId?: string;
  resultId?: string;
  error?: string;
};

const MAX_TASK_ITEMS = 30;
const BUILD_TIMEOUT_MS = 20 * 60 * 1000;
const SOLVE_TIMEOUT_MS = 20 * 60 * 1000;

let taskSequence = 0;
let tasks: LcaBackgroundTask[] = [];
const listeners = new Set<() => void>();

function nowIso(): string {
  return new Date().toISOString();
}

function nextTaskId(): string {
  taskSequence += 1;
  return `lca-task-${Date.now()}-${taskSequence}`;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setTasks(next: LcaBackgroundTask[]): void {
  tasks = next
    .slice()
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, MAX_TASK_ITEMS);
  emitChange();
}

function upsertTask(taskId: string, patch: Partial<LcaBackgroundTask>): void {
  const index = tasks.findIndex((item) => item.id === taskId);
  if (index < 0) {
    return;
  }
  const current = tasks[index];
  const updated: LcaBackgroundTask = {
    ...current,
    ...patch,
    id: current.id,
    mode: current.mode,
    scope: current.scope,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
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
    if (attempt >= 3) {
      upsertTask(taskId, {
        phase: 'failed',
        state: 'failed',
        buildJobId: submit.build_job_id,
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

  await waitSolveResult(taskId, submit.job_id);
}

async function runTask(taskId: string, request: LcaSolveRequest): Promise<void> {
  try {
    const submit = await submitLcaSolve(request);
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

export function submitLcaTask(request: LcaSolveRequest): LcaBackgroundTask {
  const createdAt = nowIso();
  const task: LcaBackgroundTask = {
    id: nextTaskId(),
    mode: resolveMode(request),
    scope: request.scope ?? 'prod',
    state: 'running',
    phase: 'submitting',
    message: 'Submitting task',
    createdAt,
    updatedAt: createdAt,
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
