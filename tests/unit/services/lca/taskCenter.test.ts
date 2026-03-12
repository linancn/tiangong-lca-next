// @ts-nocheck

const STORAGE_KEY = 'tg_lca_task_center_v1';

const buildJob = (jobId: string, status: string, overrides: any = {}) => ({
  job_id: jobId,
  snapshot_id: overrides.snapshot_id ?? 'snapshot-1',
  job_type: overrides.job_type ?? 'solve',
  status,
  timestamps: {
    created_at: '2026-03-12T12:00:00.000Z',
    started_at: '2026-03-12T12:00:01.000Z',
    finished_at: status === 'completed' ? '2026-03-12T12:00:10.000Z' : null,
    updated_at: '2026-03-12T12:00:10.000Z',
  },
  payload: overrides.payload ?? {},
  diagnostics: overrides.diagnostics ?? null,
  result:
    overrides.result !== undefined
      ? overrides.result
      : status === 'completed'
        ? {
            result_id: 'result-1',
            created_at: '2026-03-12T12:00:10.000Z',
            artifact_url: null,
            artifact_format: null,
            artifact_byte_size: null,
            artifact_sha256: null,
            diagnostics: null,
          }
        : null,
});

const flushAsync = async () => {
  for (let index = 0; index < 24; index += 1) {
    await Promise.resolve();
  }
};

const storePersistedTasks = (tasks: any[], overrides: Record<string, any> = {}) => {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      version: 1,
      savedAt: '2026-03-12T12:00:00.000Z',
      tasks,
      ...overrides,
    }),
  );
};

function loadTaskCenterModule(setupMocks?: (mocks: any) => void) {
  jest.resetModules();

  const mocks = {
    submitLcaSolve: jest.fn(),
    pollLcaJobUntilTerminal: jest.fn(),
  };

  setupMocks?.(mocks);

  jest.doMock('@/services/lca/api', () => ({
    __esModule: true,
    submitLcaSolve: (...args: any[]) => mocks.submitLcaSolve(...args),
    pollLcaJobUntilTerminal: (...args: any[]) => mocks.pollLcaJobUntilTerminal(...args),
  }));

  const module = require('@/services/lca/taskCenter');
  return { module, mocks };
}

describe('lca task center', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T12:00:00.000Z'));
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.dontMock('@/services/lca/api');
    window.localStorage.clear();
  });

  it('submits a task, handles cache hits, persists state, and notifies subscribers', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'cache_hit',
        snapshot_id: 'snapshot-cache',
        cache_key: 'cache-1',
        result_id: 'result-cache',
      });
    });

    const listener = jest.fn();
    const unsubscribe = module.subscribeLcaTasks(listener);

    const task = module.submitLcaTask({
      scope: 'team',
      demand: { process_id: 'process-1', process_version: '1.0.0' },
    });

    expect(task.mode).toBe('single');
    expect(task.scope).toBe('team');
    expect(task.state).toBe('running');

    await flushAsync();

    const [savedTask] = module.listLcaTasks();
    expect(savedTask).toMatchObject({
      id: task.id,
      state: 'completed',
      phase: 'completed',
      snapshotId: 'snapshot-cache',
      resultId: 'result-cache',
      message: 'Cache hit (result result-cache)',
    });
    expect(savedTask.phaseTimeline[0]).toEqual(
      expect.objectContaining({
        phase: 'submitting',
        endedAt: expect.any(String),
      }),
    );
    expect(listener).toHaveBeenCalled();

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.tasks[0]).toMatchObject({
      id: task.id,
      state: 'completed',
      resultId: 'result-cache',
    });

    module.clearFinishedLcaTasks();
    expect(module.listLcaTasks()).toEqual([]);

    unsubscribe();
  });

  it('transitions through snapshot building and solving phases before completing', async () => {
    const { module, mocks } = loadTaskCenterModule((next) => {
      next.submitLcaSolve
        .mockResolvedValueOnce({
          mode: 'snapshot_building',
          snapshot_id: 'snapshot-build',
          build_job_id: 'build-1',
          build_snapshot_id: 'snapshot-build',
        })
        .mockResolvedValueOnce({
          mode: 'queued',
          snapshot_id: 'snapshot-build',
          cache_key: 'cache-queued',
          job_id: 'solve-1',
        });

      next.pollLcaJobUntilTerminal
        .mockImplementationOnce(async (jobId: string, options: any) => {
          options.onTick?.(buildJob(jobId, 'queued', { snapshot_id: 'snapshot-build' }));
          return buildJob(jobId, 'ready', { snapshot_id: 'snapshot-build' });
        })
        .mockImplementationOnce(async (jobId: string, options: any) => {
          options.onTick?.(buildJob(jobId, 'running', { snapshot_id: 'snapshot-build' }));
          return buildJob(jobId, 'completed', {
            snapshot_id: 'snapshot-build',
            result: {
              result_id: 'result-solve',
              created_at: '2026-03-12T12:00:10.000Z',
              artifact_url: null,
              artifact_format: null,
              artifact_byte_size: null,
              artifact_sha256: null,
              diagnostics: null,
            },
          });
        });
    });

    const task = module.submitLcaTask({
      scope: 'prod',
      demand_mode: 'all_unit',
      solve: { return_h: true },
    });

    await flushAsync();

    const [savedTask] = module.listLcaTasks();
    expect(savedTask).toMatchObject({
      id: task.id,
      mode: 'all_unit',
      state: 'completed',
      phase: 'completed',
      buildJobId: 'build-1',
      solveJobId: 'solve-1',
      snapshotId: 'snapshot-build',
      resultId: 'result-solve',
    });
    expect(savedTask.phaseTimeline.map((item: any) => item.phase)).toEqual([
      'submitting',
      'building_snapshot',
      'submitting',
      'solving',
    ]);
    expect(mocks.submitLcaSolve).toHaveBeenCalledTimes(2);
    expect(mocks.pollLcaJobUntilTerminal).toHaveBeenCalledTimes(2);
  });

  it('marks the task failed when solving completes without a result id', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'queued',
        snapshot_id: 'snapshot-queued',
        cache_key: 'cache-queued',
        job_id: 'solve-missing',
      });
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('solve-missing', 'completed', { result: null }),
      );
    });

    module.submitLcaTask({
      demand: { process_id: 'process-2', process_version: '2.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      state: 'failed',
      phase: 'failed',
      error: 'result_id_missing',
      message: 'Solve finished but result is missing (solve-missing)',
    });
  });

  it('hydrates running tasks from storage, resumes solve polling, and keeps the next sequence', async () => {
    storePersistedTasks([
      {
        id: 'restored-task',
        sequence: 7,
        request: {
          scope: 'prod',
          demand: { process_id: 'process-restored', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'solving',
        message: 'Resuming',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:05:00.000Z',
        solveJobId: 'solve-restored',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T10:00:00.000Z',
            endedAt: '2026-03-12T10:00:10.000Z',
            durationMs: 10000,
          },
          {
            phase: 'solving',
            startedAt: '2026-03-12T10:00:10.000Z',
          },
        ],
      },
    ]);

    const { module, mocks } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'cache_hit',
        snapshot_id: 'snapshot-next',
        cache_key: 'cache-next',
        result_id: 'result-next',
      });
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('solve-restored', 'completed', {
          snapshot_id: 'snapshot-restored',
          result: {
            result_id: 'result-restored',
            created_at: '2026-03-12T12:00:10.000Z',
            artifact_url: null,
            artifact_format: null,
            artifact_byte_size: null,
            artifact_sha256: null,
            diagnostics: null,
          },
        }),
      );
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-task',
      state: 'completed',
      resultId: 'result-restored',
      solveJobId: 'solve-restored',
    });

    const nextTask = module.submitLcaTask({
      demand: { process_id: 'process-next', process_version: '2.0.0' },
    });
    await flushAsync();

    expect(nextTask.sequence).toBe(8);
    expect(mocks.submitLcaSolve).toHaveBeenCalled();
  });

  it('keeps running tasks when clearing finished items and allows explicit removal', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve
        .mockImplementationOnce(() => new Promise(() => {}))
        .mockResolvedValueOnce({
          mode: 'cache_hit',
          snapshot_id: 'snapshot-cache',
          cache_key: 'cache-hit',
          result_id: 'result-cache',
        });
    });

    const runningTask = module.submitLcaTask({
      demand: { process_id: 'process-running', process_version: '1.0.0' },
    });
    module.submitLcaTask({
      demand: { process_id: 'process-finished', process_version: '2.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()).toHaveLength(2);

    module.clearFinishedLcaTasks();
    expect(module.listLcaTasks()).toEqual([expect.objectContaining({ id: runningTask.id })]);

    module.removeLcaTask(runningTask.id);
    expect(module.listLcaTasks()).toEqual([]);
  });

  it('fails the task when snapshot building ends in a stale status', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'snapshot_building',
        snapshot_id: 'snapshot-build',
        build_job_id: 'build-stale',
        build_snapshot_id: 'snapshot-build',
      });
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('build-stale', 'stale', { snapshot_id: 'snapshot-build' }),
      );
    });

    module.submitLcaTask({
      demand: { process_id: 'process-stale', process_version: '1.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      phase: 'failed',
      state: 'failed',
      buildJobId: 'build-stale',
      snapshotId: 'snapshot-build',
      error: 'snapshot_build_stale',
      message: 'Snapshot build failed (build-stale)',
    });
  });

  it('fails the task when solve polling ends in a failed status', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'queued',
        snapshot_id: 'snapshot-solve',
        cache_key: 'cache-solve',
        job_id: 'solve-failed',
      });
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('solve-failed', 'failed', { snapshot_id: 'snapshot-solve' }),
      );
    });

    module.submitLcaTask({
      demand_mode: 'all_unit',
      solve: { return_h: true },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      phase: 'failed',
      state: 'failed',
      solveJobId: 'solve-failed',
      snapshotId: 'snapshot-solve',
      error: 'solve_failed',
      message: 'Solve failed (solve-failed)',
    });
  });

  it('stops retrying after the snapshot build retry limit is reached', async () => {
    const { module, mocks } = loadTaskCenterModule((next) => {
      next.submitLcaSolve
        .mockResolvedValueOnce({
          mode: 'snapshot_building',
          snapshot_id: 'snapshot-1',
          build_job_id: 'build-1',
          build_snapshot_id: 'snapshot-1',
        })
        .mockResolvedValueOnce({
          mode: 'snapshot_building',
          snapshot_id: 'snapshot-2',
          build_job_id: 'build-2',
          build_snapshot_id: 'snapshot-2',
        })
        .mockResolvedValueOnce({
          mode: 'snapshot_building',
          snapshot_id: 'snapshot-3',
          build_job_id: 'build-3',
          build_snapshot_id: 'snapshot-3',
        })
        .mockResolvedValueOnce({
          mode: 'snapshot_building',
          snapshot_id: 'snapshot-4',
          build_job_id: 'build-4',
          build_snapshot_id: 'snapshot-4',
        });
      next.pollLcaJobUntilTerminal.mockImplementation(async (jobId: string) =>
        buildJob(jobId, 'ready', { snapshot_id: `${jobId}-snapshot` }),
      );
    });

    module.submitLcaTask({
      demand: { process_id: 'process-retry', process_version: '1.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      phase: 'failed',
      state: 'failed',
      buildJobId: 'build-4',
      snapshotId: 'snapshot-4',
      error: 'snapshot_build_retry_limit',
      message: 'Snapshot build retry limit reached',
    });
    expect(mocks.submitLcaSolve).toHaveBeenCalledTimes(4);
    expect(mocks.pollLcaJobUntilTerminal).toHaveBeenCalledTimes(3);
  });

  it('marks the task failed when the initial submit throws', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockRejectedValue(new Error('submit_failed'));
    });

    module.submitLcaTask({
      demand: { process_id: 'process-error', process_version: '1.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      phase: 'failed',
      state: 'failed',
      message: 'Task failed',
      error: 'submit_failed',
    });
  });

  it('resumes a stored submitting task by rerunning the solve request', async () => {
    storePersistedTasks([
      {
        id: 'restored-submit',
        sequence: 3,
        request: {
          scope: 'team',
          demand: { process_id: 'process-submit', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'submitting',
        message: 'Stored task',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T10:00:00.000Z',
          },
        ],
      },
    ]);

    const { module, mocks } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockResolvedValue({
        mode: 'cache_hit',
        snapshot_id: 'snapshot-restored',
        cache_key: 'cache-restored',
        result_id: 'result-restored',
      });
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-submit',
      phase: 'completed',
      state: 'completed',
      resultId: 'result-restored',
      message: 'Cache hit (result result-restored)',
    });
    expect(mocks.submitLcaSolve).toHaveBeenCalledWith({
      scope: 'team',
      demand: { process_id: 'process-submit', process_version: '1.0.0' },
    });
  });

  it('fails reload recovery when a snapshot build finishes but the stored request is missing', async () => {
    storePersistedTasks([
      {
        id: 'restored-build',
        sequence: 4,
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'building_snapshot',
        message: 'Stored build',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        buildJobId: 'build-restored',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T10:00:05.000Z',
          },
        ],
      },
    ]);

    const { module } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('build-restored', 'ready', { snapshot_id: 'snapshot-restored' }),
      );
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-build',
      phase: 'failed',
      state: 'failed',
      buildJobId: 'build-restored',
      snapshotId: 'snapshot-restored',
      error: 'request_missing_after_snapshot_build',
      message: 'Reload recovery failed',
    });
  });

  it('fails reload recovery immediately when a stored running task has no request metadata', async () => {
    storePersistedTasks([
      {
        id: 'restored-missing-request',
        sequence: 5,
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'submitting',
        message: 'Stored submit',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        phaseTimeline: [
          {
            phase: 'submitting',
            startedAt: '2026-03-12T10:00:00.000Z',
          },
        ],
      },
    ]);

    const { module, mocks } = loadTaskCenterModule();

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-missing-request',
      phase: 'failed',
      state: 'failed',
      error: 'request_missing',
      message: 'Reload recovery failed',
    });
    expect(mocks.submitLcaSolve).not.toHaveBeenCalled();
  });

  it('marks a restored task as failed when recovery polling throws', async () => {
    storePersistedTasks([
      {
        id: 'restored-recovery-error',
        sequence: 6,
        request: {
          demand: { process_id: 'process-recovery', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'solving',
        message: 'Stored solve',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        solveJobId: 'solve-restored-error',
        phaseTimeline: [
          {
            phase: 'solving',
            startedAt: '2026-03-12T10:00:05.000Z',
          },
        ],
      },
    ]);

    const { module } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockRejectedValue(new Error('resume_boom'));
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-recovery-error',
      phase: 'failed',
      state: 'failed',
      message: 'Task recovery failed',
      error: 'resume_boom',
    });
  });

  it('drops expired persisted tasks during hydration', () => {
    storePersistedTasks(
      [
        {
          id: 'expired-task',
          sequence: 1,
          mode: 'single',
          scope: 'prod',
          state: 'completed',
          phase: 'completed',
          message: 'Expired task',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:05.000Z',
          phaseTimeline: [],
        },
      ],
      {
        savedAt: '2026-03-01T10:00:00.000Z',
      },
    );

    const { module } = loadTaskCenterModule();

    expect(module.listLcaTasks()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
