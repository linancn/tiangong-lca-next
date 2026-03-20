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

const createDeferred = () => {
  let resolve: (value: any) => void;
  let reject: (reason?: any) => void;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve: resolve!, reject: reject! };
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

  it('normalizes stored tasks, skips invalid entries, and applies request/timeline fallbacks', () => {
    storePersistedTasks(
      [
        'invalid-raw-task',
        {
          id: '   ',
          sequence: 0,
          mode: 'single',
          scope: 'prod',
          state: 'completed',
          phase: 'completed',
          message: 'Blank id',
          createdAt: '2026-03-12T09:00:00.000Z',
          updatedAt: '2026-03-12T09:00:05.000Z',
          phaseTimeline: [],
        },
        {
          id: 'invalid-mode',
          sequence: 1,
          mode: 'bad',
          scope: 'prod',
          state: 'completed',
          phase: 'completed',
          message: 'Invalid mode',
          createdAt: '2026-03-12T09:00:00.000Z',
          updatedAt: '2026-03-12T09:00:05.000Z',
          phaseTimeline: [],
        },
        {
          id: 'invalid-state',
          sequence: 2,
          mode: 'single',
          scope: 'prod',
          state: 'bad',
          phase: 'completed',
          message: 'Invalid state',
          createdAt: '2026-03-12T09:00:00.000Z',
          updatedAt: '2026-03-12T09:00:05.000Z',
          phaseTimeline: [],
        },
        {
          id: 'invalid-phase',
          sequence: 3,
          mode: 'single',
          scope: 'prod',
          state: 'completed',
          phase: 'bad',
          message: 'Invalid phase',
          createdAt: '2026-03-12T09:00:00.000Z',
          updatedAt: '2026-03-12T09:00:05.000Z',
          phaseTimeline: [],
        },
        {
          id: 'all-unit-task',
          sequence: 0,
          request: {
            demand_mode: 'all_unit',
            solve: { return_h: true },
          },
          mode: 'all_unit',
          scope: '',
          state: 'completed',
          phase: 'completed',
          message: 123,
          createdAt: 'invalid-date',
          updatedAt: 'invalid-date',
          phaseTimeline: [null, { phase: 'completed', startedAt: 'invalid-date' }],
        },
        {
          id: 'index-task',
          sequence: 2,
          request: {
            demand: { process_index: 0 },
          },
          mode: 'single',
          scope: 'team',
          state: 'completed',
          phase: 'completed',
          message: 'Index request',
          createdAt: '2026-03-12T08:00:00.000Z',
          updatedAt: '2026-03-12T08:00:10.000Z',
          phaseTimeline: [
            { phase: 'failed', startedAt: '2026-03-12T08:00:00.000Z' },
            {
              phase: 'solving',
              startedAt: '2026-03-12T08:00:05.000Z',
              endedAt: 'bad',
              durationMs: -1,
            },
          ],
        },
        {
          id: 'invalid-request-task',
          sequence: 3,
          request: {
            demand: {},
          },
          mode: 'single',
          scope: 'prod',
          state: 'completed',
          phase: 'solving',
          message: 'Invalid request',
          createdAt: '2026-03-12T07:00:00.000Z',
          updatedAt: '2026-03-12T07:00:10.000Z',
          phaseTimeline: [],
        },
        {
          id: 'metadata-task',
          sequence: 'not-an-integer',
          request: {
            demand: { process_id: 'process-meta', process_version: '4.0.0' },
          },
          mode: 'single',
          scope: 'prod',
          state: 'completed',
          phase: 'completed',
          message: 'Metadata task',
          createdAt: 123,
          updatedAt: 456,
          snapshotId: 'snapshot-meta',
          resultId: 'result-meta',
          error: 'meta-error',
          phaseTimeline: {},
        },
      ],
      {
        savedAt: 'invalid-date',
      },
    );

    const { module } = loadTaskCenterModule();
    const tasks = module.listLcaTasks();

    expect(tasks).toHaveLength(4);

    const allUnitTask = tasks.find((item: any) => item.id === 'all-unit-task');
    const indexTask = tasks.find((item: any) => item.id === 'index-task');
    const invalidRequestTask = tasks.find((item: any) => item.id === 'invalid-request-task');
    const metadataTask = tasks.find((item: any) => item.id === 'metadata-task');

    expect(allUnitTask).toMatchObject({
      id: 'all-unit-task',
      sequence: 1,
      scope: 'prod',
      request: { demand_mode: 'all_unit', solve: { return_h: true } },
      message: 'Recovered task',
      phaseTimeline: [{ phase: 'submitting' }],
    });
    expect(indexTask).toMatchObject({
      id: 'index-task',
      request: { demand: { process_index: 0 } },
      phaseTimeline: [{ phase: 'solving', startedAt: '2026-03-12T08:00:05.000Z' }],
    });
    expect(invalidRequestTask).toMatchObject({
      id: 'invalid-request-task',
      request: undefined,
      phaseTimeline: [{ phase: 'solving', startedAt: '2026-03-12T07:00:00.000Z' }],
    });
    expect(metadataTask).toMatchObject({
      id: 'metadata-task',
      sequence: 9,
      snapshotId: 'snapshot-meta',
      resultId: 'result-meta',
      error: 'meta-error',
      phaseTimeline: [{ phase: 'submitting' }],
    });
  });

  it('ignores storage when localStorage is unavailable during hydration and persistence', async () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    try {
      const { module } = loadTaskCenterModule((next) => {
        next.submitLcaSolve.mockResolvedValue({
          mode: 'cache_hit',
          snapshot_id: 'snapshot-no-storage',
          cache_key: 'cache-no-storage',
          result_id: 'result-no-storage',
        });
      });

      expect(module.listLcaTasks()).toEqual([]);

      module.submitLcaTask({
        demand: { process_id: 'process-no-storage', process_version: '1.0.0' },
      });

      await flushAsync();
      expect(module.listLcaTasks()[0]).toMatchObject({
        state: 'completed',
        resultId: 'result-no-storage',
      });
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(window, 'localStorage', originalDescriptor);
      }
    }
  });

  it('drops invalid persisted payloads when the schema version mismatches or JSON is corrupted', () => {
    storePersistedTasks([], { version: 999 });
    let loaded = loadTaskCenterModule();

    expect(loaded.module.listLcaTasks()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();

    jest.resetModules();
    jest.dontMock('@/services/lca/api');
    window.localStorage.setItem(STORAGE_KEY, '{bad-json');

    loaded = loadTaskCenterModule();
    expect(loaded.module.listLcaTasks()).toEqual([]);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('{bad-json');
  });

  it('treats non-array persisted task payloads as empty', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-03-12T12:00:00.000Z',
        tasks: { id: 'not-an-array' },
      }),
    );

    const { module } = loadTaskCenterModule();

    expect(module.listLcaTasks()).toEqual([]);
  });

  it('hydrates persisted tasks even when savedAt is missing', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: 'missing-saved-at',
            sequence: 1,
            mode: 'single',
            scope: 'prod',
            state: 'completed',
            phase: 'completed',
            message: 'Missing savedAt',
            createdAt: '2026-03-12T09:00:00.000Z',
            updatedAt: '2026-03-12T09:00:05.000Z',
            phaseTimeline: [],
          },
        ],
      }),
    );

    const { module } = loadTaskCenterModule();

    expect(module.listLcaTasks()).toEqual([
      expect.objectContaining({
        id: 'missing-saved-at',
        state: 'completed',
      }),
    ]);
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

  it('stringifies non-Error submit failures', async () => {
    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve.mockRejectedValue('submit_as_text');
    });

    module.submitLcaTask({
      demand: { process_id: 'process-string-error', process_version: '1.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      phase: 'failed',
      state: 'failed',
      error: 'submit_as_text',
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

  it('stops build-stage recovery when the restored snapshot build becomes stale', async () => {
    storePersistedTasks([
      {
        id: 'restored-build-stale',
        sequence: 4,
        request: {
          demand: { process_id: 'process-build-stale', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'building_snapshot',
        message: 'Stored build stale',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        buildJobId: 'build-restored-stale',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T10:00:05.000Z',
          },
        ],
      },
    ]);

    const { module, mocks } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('build-restored-stale', 'stale', { snapshot_id: 'snapshot-restored-stale' }),
      );
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-build-stale',
      phase: 'failed',
      state: 'failed',
      error: 'snapshot_build_stale',
      message: 'Snapshot build failed (build-restored-stale)',
    });
    expect(mocks.submitLcaSolve).not.toHaveBeenCalled();
  });

  it('resumes snapshot-build recovery with the stored request when the build succeeds', async () => {
    storePersistedTasks([
      {
        id: 'restored-build-submit',
        sequence: 9,
        request: {
          scope: 'team',
          demand: { process_id: 'process-build-submit', process_version: '3.0.0' },
        },
        mode: 'single',
        scope: 'team',
        state: 'running',
        phase: 'building_snapshot',
        message: 'Stored build submit',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        buildJobId: 'build-restored-submit',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T10:00:05.000Z',
          },
        ],
      },
    ]);

    const { module, mocks } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('build-restored-submit', 'ready', { snapshot_id: 'snapshot-restored-submit' }),
      );
      next.submitLcaSolve.mockResolvedValue({
        mode: 'cache_hit',
        snapshot_id: 'snapshot-restored-submit',
        cache_key: 'cache-restored-submit',
        result_id: 'result-restored-submit',
      });
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: 'restored-build-submit',
      phase: 'completed',
      state: 'completed',
      resultId: 'result-restored-submit',
      snapshotId: 'snapshot-restored-submit',
    });
    expect(mocks.submitLcaSolve).toHaveBeenCalledWith({
      scope: 'team',
      demand: { process_id: 'process-build-submit', process_version: '3.0.0' },
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

  it('keeps already-ended timeline entries unchanged when a restored solve completes', async () => {
    storePersistedTasks([
      {
        id: 'restored-ended-timeline',
        sequence: 10,
        request: {
          demand: { process_id: 'process-ended-timeline', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'solving',
        message: 'Stored ended timeline',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        solveJobId: 'solve-ended-timeline',
        phaseTimeline: [
          {
            phase: 'solving',
            startedAt: '2026-03-12T10:00:05.000Z',
            endedAt: '2026-03-12T10:00:06.000Z',
            durationMs: 1000,
          },
        ],
      },
    ]);

    const { module } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('solve-ended-timeline', 'completed', {
          snapshot_id: 'snapshot-ended-timeline',
          result: {
            result_id: 'result-ended-timeline',
          },
        }),
      );
    });

    await flushAsync();

    expect(module.listLcaTasks()[0].phaseTimeline).toEqual([
      {
        phase: 'solving',
        startedAt: '2026-03-12T10:00:05.000Z',
        endedAt: '2026-03-12T10:00:06.000Z',
        durationMs: 1000,
      },
    ]);
  });

  it('preserves already-ended build timeline entries when recovery advances to the next phase', async () => {
    storePersistedTasks([
      {
        id: 'restored-ended-build',
        sequence: 11,
        request: {
          demand: { process_id: 'process-ended-build', process_version: '1.0.0' },
        },
        mode: 'single',
        scope: 'prod',
        state: 'running',
        phase: 'building_snapshot',
        message: 'Stored ended build',
        createdAt: '2026-03-12T10:00:00.000Z',
        updatedAt: '2026-03-12T10:00:05.000Z',
        buildJobId: 'build-ended-build',
        phaseTimeline: [
          {
            phase: 'building_snapshot',
            startedAt: '2026-03-12T10:00:05.000Z',
            endedAt: '2026-03-12T10:00:06.000Z',
            durationMs: 1000,
          },
        ],
      },
    ]);

    const { module } = loadTaskCenterModule((next) => {
      next.pollLcaJobUntilTerminal.mockResolvedValue(
        buildJob('build-ended-build', 'ready', { snapshot_id: 'snapshot-ended-build' }),
      );
      next.submitLcaSolve.mockResolvedValue({
        mode: 'cache_hit',
        snapshot_id: 'snapshot-ended-build',
        cache_key: 'cache-ended-build',
        result_id: 'result-ended-build',
      });
    });

    await flushAsync();

    expect(module.listLcaTasks()[0].phaseTimeline[0]).toEqual({
      phase: 'building_snapshot',
      startedAt: '2026-03-12T10:00:05.000Z',
      endedAt: '2026-03-12T10:00:06.000Z',
      durationMs: 1000,
    });
  });

  it('drops running tasks beyond the persisted limit before reload recovery starts', async () => {
    const persistedTasks = Array.from({ length: 31 }, (_, index) => ({
      id: `persisted-${index + 1}`,
      sequence: index + 1,
      request:
        index === 30
          ? {
              demand: { process_id: 'process-dropped', process_version: '1.0.0' },
            }
          : undefined,
      mode: 'single',
      scope: 'prod',
      state: index === 30 ? 'running' : 'completed',
      phase: index === 30 ? 'solving' : 'completed',
      message: `Persisted ${index + 1}`,
      createdAt:
        index === 30
          ? '2026-03-11T09:00:00.000Z'
          : `2026-03-12T10:${String(index).padStart(2, '0')}:00.000Z`,
      updatedAt:
        index === 30
          ? '2026-03-11T09:00:30.000Z'
          : `2026-03-12T10:${String(index).padStart(2, '0')}:30.000Z`,
      solveJobId: index === 30 ? 'solve-dropped' : undefined,
      phaseTimeline:
        index === 30 ? [{ phase: 'solving', startedAt: '2026-03-12T10:30:00.000Z' }] : [],
    }));
    storePersistedTasks(persistedTasks);

    const { module, mocks } = loadTaskCenterModule();

    await flushAsync();

    expect(module.listLcaTasks()).toHaveLength(30);
    expect(module.listLcaTasks().some((item: any) => item.id === 'persisted-31')).toBe(false);
    expect(mocks.pollLcaJobUntilTerminal).not.toHaveBeenCalled();
    expect(mocks.submitLcaSolve).not.toHaveBeenCalled();
  });

  it('updates listeners with fallback tick messages and ignores updates after task removal', async () => {
    const submitDeferred = createDeferred();
    const listenerMessages: string[] = [];

    const { module } = loadTaskCenterModule((next) => {
      next.submitLcaSolve
        .mockImplementationOnce(() => submitDeferred.promise)
        .mockResolvedValueOnce({
          mode: 'queued',
          snapshot_id: 'snapshot-status',
          cache_key: 'cache-status',
          job_id: 'solve-status',
        });
      next.pollLcaJobUntilTerminal.mockImplementationOnce(async (jobId: string, options: any) => {
        options.onTick?.(buildJob(jobId, 'completed', { snapshot_id: 'snapshot-status' }));
        return buildJob(jobId, 'completed', {
          snapshot_id: 'snapshot-status',
          result: {
            result_id: 'result-status',
          },
        });
      });
    });

    module.subscribeLcaTasks(() => {
      const [latest] = module.listLcaTasks();
      if (latest) {
        listenerMessages.push(latest.message);
      }
    });

    const removedTask = module.submitLcaTask({
      demand: { process_id: 'process-removed', process_version: '1.0.0' },
    });
    module.removeLcaTask(removedTask.id);
    submitDeferred.resolve({
      mode: 'cache_hit',
      snapshot_id: 'snapshot-removed',
      cache_key: 'cache-removed',
      result_id: 'result-removed',
    });

    const activeTask = module.submitLcaTask({
      demand: { process_id: 'process-status', process_version: '1.0.0' },
    });

    await flushAsync();

    expect(module.listLcaTasks()[0]).toMatchObject({
      id: activeTask.id,
      state: 'completed',
      resultId: 'result-status',
    });
    expect(module.listLcaTasks().some((item: any) => item.id === removedTask.id)).toBe(false);
    expect(listenerMessages).toContain('Solving (solve-status): completed');
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
