const REVIEW_SUBMIT_STORAGE_KEY = 'tg_review_submit_task_center_v1';

const mockRequestWorkerJobsApi = jest.fn();
const mockRequestReviewSubmitJobApi = jest.fn();

jest.mock('@/services/workerJobs/api', () => ({
  __esModule: true,
  requestWorkerJobsApi: (...args: any[]) => mockRequestWorkerJobsApi(...args),
}));

jest.mock('@/services/reviews/api', () => ({
  __esModule: true,
  requestReviewSubmitJobApi: (...args: any[]) => mockRequestReviewSubmitJobApi(...args),
}));

function loadTaskCenterModule() {
  let loaded: any;
  jest.isolateModules(() => {
    loaded = require('@/services/reviews/taskCenter');
  });
  return loaded as typeof import('@/services/reviews/taskCenter');
}

describe('reviews/taskCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-12T12:00:00.000Z'));
    window.localStorage.clear();
    mockRequestWorkerJobsApi.mockResolvedValue({ data: [], error: null });
    mockRequestReviewSubmitJobApi.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
    window.localStorage.clear();
  });

  it('tracks enqueued review-submit jobs locally and persists a UI cache', () => {
    const taskCenter = loadTaskCenterModule();

    const task = taskCenter.trackReviewSubmitTask({
      status: 'waiting_gate',
      reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
      gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
      datasetRevision: {
        table: 'processes',
        id: '33333333-3333-4333-8333-333333333333',
        version: '01.00.000',
        revisionChecksum: 'a'.repeat(64),
      },
    });

    expect(task).toEqual(
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
        gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
        state: 'running',
        phase: 'waiting_gate',
      }),
    );
    expect(taskCenter.listReviewSubmitTasks()).toHaveLength(1);
    expect(
      JSON.parse(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY) ?? '{}').tasks,
    ).toHaveLength(1);
  });

  it('refreshes review-submit tasks from worker_jobs and hydrates coordinator projection', async () => {
    mockRequestWorkerJobsApi.mockResolvedValue({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'blocked',
          blockerCodes: ['flow_lcia_semantic_mismatch'],
          result: {
            status: 'blocked',
            blockingReasons: [
              {
                code: 'flow_lcia_semantic_mismatch',
                message: 'same input/output flow',
              },
            ],
          },
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    mockRequestReviewSubmitJobApi.mockResolvedValue({
      data: [
        {
          status: 'blocked',
          reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
          gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
          gateWorkerJob: {
            id: '22222222-2222-4222-8222-222222222222',
            status: 'blocked',
          },
          datasetRevision: {
            table: 'processes',
            id: '33333333-3333-4333-8333-333333333333',
            version: '01.00.000',
            revisionChecksum: 'b'.repeat(64),
          },
          gate: {
            blockingReasons: [
              {
                code: 'flow_lcia_semantic_mismatch',
                message: 'same input/output flow',
              },
            ],
          },
        },
      ],
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    const tasks = await taskCenter.refreshReviewSubmitTasks();

    expect(mockRequestWorkerJobsApi).toHaveBeenCalledWith({
      action: 'list',
      subjectType: 'processes',
      limit: 50,
    });
    expect(mockRequestReviewSubmitJobApi).toHaveBeenCalledWith({
      action: 'read_latest',
      table: 'processes',
      id: '33333333-3333-4333-8333-333333333333',
      version: '01.00.000',
    });
    expect(tasks).toEqual([
      expect.objectContaining({
        id: '11111111-1111-4111-8111-111111111111',
        phase: 'blocked',
        state: 'failed',
        blockerCodes: ['flow_lcia_semantic_mismatch'],
      }),
    ]);
  });

  it('does not infer final submit completion from a completed gate worker alone', async () => {
    mockRequestWorkerJobsApi.mockResolvedValue({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'completed',
          result: {
            datasetRevision: {
              table: 'processes',
              id: '33333333-3333-4333-8333-333333333333',
              version: '01.00.000',
              revisionChecksum: 'b'.repeat(64),
            },
          },
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    mockRequestReviewSubmitJobApi.mockResolvedValue({ data: null, error: null });

    const taskCenter = loadTaskCenterModule();
    const tasks = await taskCenter.refreshReviewSubmitTasks();

    expect(tasks).toEqual([
      expect.objectContaining({
        id: '22222222-2222-4222-8222-222222222222',
        phase: 'passed',
        state: 'completed',
      }),
    ]);
  });

  it('maps worker-only statuses without requiring coordinator rows', async () => {
    mockRequestWorkerJobsApi.mockResolvedValue({
      data: [
        {
          id: 'queued-worker',
          jobKind: 'review_submit.gate',
          status: 'queued',
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:00:01.000Z',
        },
        {
          id: 'running-worker',
          jobKind: 'review_submit.gate',
          status: 'running',
          progress: '0.5',
          createdAt: '2026-03-12T11:01:00.000Z',
          updatedAt: '2026-03-12T11:01:01.000Z',
        },
        {
          id: 'waiting-worker',
          jobKind: 'review_submit.gate',
          status: 'waiting',
          createdAt: '2026-03-12T11:02:00.000Z',
          updatedAt: '2026-03-12T11:02:01.000Z',
        },
        {
          id: 'stale-worker',
          jobKind: 'review_submit.gate',
          status: 'stale',
          createdAt: '2026-03-12T11:03:00.000Z',
          updatedAt: '2026-03-12T11:03:01.000Z',
        },
        {
          id: 'failed-worker',
          jobKind: 'review_submit.gate',
          status: 'failed',
          errorCode: 'factorization_probe_failed',
          createdAt: '2026-03-12T11:04:00.000Z',
          updatedAt: '2026-03-12T11:04:01.000Z',
        },
        {
          id: 'cancelled-worker',
          jobKind: 'review_submit.gate',
          status: 'cancelled',
          createdAt: '2026-03-12T11:05:00.000Z',
          updatedAt: '2026-03-12T11:05:01.000Z',
        },
        {
          id: 'blocked-worker',
          jobKind: 'review_submit.gate',
          status: 'blocked',
          result: {
            blockingReasons: [
              {
                message: 'blocked without a machine code',
              },
            ],
          },
          createdAt: '2026-03-12T11:06:00.000Z',
          updatedAt: '2026-03-12T11:06:01.000Z',
        },
        {
          id: 'blocked-code-worker',
          jobKind: 'review_submit.gate',
          status: 'blocked',
          blockerCodes: ['duplicate_sparse_columns'],
          createdAt: '2026-03-12T11:07:00.000Z',
          updatedAt: '2026-03-12T11:07:01.000Z',
        },
        {
          id: 'ignored-worker',
          jobKind: 'review_submit.gate',
          status: 'unknown',
        },
      ],
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    const tasks = await taskCenter.refreshReviewSubmitTasks();

    expect(mockRequestReviewSubmitJobApi).not.toHaveBeenCalled();
    expect(tasks.map((task) => [task.id, task.phase, task.message])).toEqual([
      ['blocked-code-worker', 'blocked', 'Numerical stability gate blocked this revision'],
      ['blocked-worker', 'blocked', 'Numerical stability gate blocked this revision'],
      ['cancelled-worker', 'cancelled', 'Review submission job was cancelled'],
      ['failed-worker', 'error', 'factorization_probe_failed'],
      ['stale-worker', 'stale', 'Numerical stability gate result is stale'],
      ['waiting-worker', 'waiting_gate', 'Review submission is waiting for the gate'],
      ['running-worker', 'running', 'Numerical stability gate is running'],
      ['queued-worker', 'queued', 'Review submission is queued'],
    ]);
    expect(tasks[0].blockingReasons).toEqual([
      {
        code: 'duplicate_sparse_columns',
      },
    ]);
    expect(tasks[0].blockerCodes).toEqual(['duplicate_sparse_columns']);
    expect(tasks[1].blockingReasons).toEqual([
      {
        message: 'blocked without a machine code',
      },
    ]);
    expect(tasks[1].blockerCodes).toEqual([]);
  });

  it('tracks coordinator phases, listener changes, and local persistence failures', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new Error('quota exceeded');
    });
    const taskCenter = loadTaskCenterModule();
    const listener = jest.fn();
    const unsubscribe = taskCenter.subscribeReviewSubmitTasks(listener);

    const submitting = taskCenter.trackReviewSubmitTask({
      status: 'submitting',
      reviewSubmitJobId: 'submitting-job',
    });
    const submitted = taskCenter.trackReviewSubmitTask({
      status: 'submitted',
      reviewSubmitJobId: 'submitted-job',
    });
    const stale = taskCenter.trackReviewSubmitTask({
      status: 'stale',
      reviewSubmitJobId: 'stale-job',
    });
    const error = taskCenter.trackReviewSubmitTask({
      status: 'error',
      reviewSubmitJobId: 'error-job',
    });
    const errorWithMessage = taskCenter.trackReviewSubmitTask({
      status: 'error',
      reviewSubmitJobId: 'error-message-job',
      error: {
        message: 'Coordinator failed',
      },
    });
    const queuedFallback = taskCenter.trackReviewSubmitTask({} as any);
    const blockedWithReasonCode = taskCenter.trackReviewSubmitTask({
      status: 'blocked',
      reviewSubmitJobId: 'blocked-code-job',
      gate: {
        status: 'blocked',
        blockingReasons: [
          {
            code: 'singular_risk_medium_or_high',
          },
        ],
      },
    });

    expect(submitting.message).toBe('Gate passed, submitting review');
    expect(submitted.message).toBe('Review submission completed');
    expect(stale.message).toBe('Numerical stability gate result is stale');
    expect(error.message).toBe('Review submission failed');
    expect(errorWithMessage.message).toBe('Coordinator failed');
    expect(queuedFallback.phase).toBe('queued');
    expect(blockedWithReasonCode.blockerCodes).toEqual(['singular_risk_medium_or_high']);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    taskCenter.removeReviewSubmitTask('error-job');
    expect(listener).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('hydrates, filters, expires, and clears persisted UI cache entries', () => {
    window.localStorage.setItem(
      REVIEW_SUBMIT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-03-12T11:59:00.000Z',
        dismissedTaskIds: ['dismissed-task', 123],
        tasks: [
          null,
          {
            id: ' ',
            phase: 'queued',
          },
          {
            id: 'bad-phase',
            phase: 'unknown',
          },
          {
            id: 'dismissed-task',
            phase: 'blocked',
            createdAt: '2026-03-12T11:20:00.000Z',
            updatedAt: '2026-03-12T11:21:00.000Z',
          },
          {
            id: 'cached-task',
            phase: 'running',
            gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
            reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
            message: 'Cached task is still running',
            createdAt: 'not-a-date',
            updatedAt: 'also-not-a-date',
            datasetRevision: {
              table: 'processes',
              id: '33333333-3333-4333-8333-333333333333',
              version: '01.00.000',
            },
            gateRunId: null,
            workerJob: {
              id: '22222222-2222-4222-8222-222222222222',
              status: 'running',
            },
            coordinator: {
              status: 'waiting_gate',
            },
            blockingReasons: [{ code: 'flow_lcia_semantic_mismatch' }],
            blockerCodes: ['flow_lcia_semantic_mismatch'],
            error: 'cached error',
            progress: 0,
          },
        ],
      }),
    );

    let taskCenter = loadTaskCenterModule();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([
      expect.objectContaining({
        id: 'cached-task',
        phase: 'running',
        gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
        reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
        message: 'Cached task is still running',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:00.000Z',
        gateRunId: null,
        blockerCodes: ['flow_lcia_semantic_mismatch'],
        progress: 0,
      }),
    ]);

    window.localStorage.setItem(REVIEW_SUBMIT_STORAGE_KEY, '{');
    taskCenter = loadTaskCenterModule();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([]);
    expect(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(
      REVIEW_SUBMIT_STORAGE_KEY,
      JSON.stringify({
        version: 999,
        savedAt: '2026-03-12T11:59:00.000Z',
        tasks: [],
      }),
    );
    taskCenter = loadTaskCenterModule();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([]);
    expect(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(
      REVIEW_SUBMIT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: '2026-03-01T00:00:00.000Z',
        tasks: [],
      }),
    );
    taskCenter = loadTaskCenterModule();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([]);
    expect(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(
      REVIEW_SUBMIT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        dismissedTaskIds: 'not-an-array',
        tasks: {},
      }),
    );
    taskCenter = loadTaskCenterModule();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([]);
  });

  it('skips storage hydration when localStorage is unavailable', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: undefined,
    });

    try {
      const taskCenter = loadTaskCenterModule();
      taskCenter.trackReviewSubmitTask({
        status: 'queued',
        reviewSubmitJobId: 'no-storage-task',
      });
      expect(taskCenter.listReviewSubmitTasks()).toEqual([
        expect.objectContaining({
          id: 'no-storage-task',
        }),
      ]);
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'localStorage', descriptor);
      }
    }
  });

  it('handles server refresh failures, stale coordinator matches, and in-flight refresh reuse', async () => {
    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: null,
      error: {
        message: '',
      },
    });

    const taskCenter = loadTaskCenterModule();
    await expect(taskCenter.refreshReviewSubmitTasks()).rejects.toThrow(
      'Failed to load worker jobs',
    );

    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(taskCenter.refreshReviewSubmitTasks()).resolves.toEqual([]);

    let resolveList: (value: any) => void = () => undefined;
    mockRequestWorkerJobsApi.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    const firstRefresh = taskCenter.refreshReviewSubmitTasks();
    const secondRefresh = taskCenter.refreshReviewSubmitTasks();
    expect(mockRequestWorkerJobsApi).toHaveBeenCalledTimes(3);
    resolveList({
      data: [
        {
          id: 'server-worker',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'completed',
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    mockRequestReviewSubmitJobApi.mockResolvedValueOnce({
      data: [
        {
          status: 'submitted',
          reviewSubmitJobId: 'stale-coordinator',
          gateWorkerJobId: 'different-worker',
        },
      ],
      error: null,
    });

    await expect(firstRefresh).resolves.toEqual([
      expect.objectContaining({
        id: 'server-worker',
        phase: 'passed',
      }),
    ]);
    await expect(secondRefresh).resolves.toEqual([
      expect.objectContaining({
        id: 'server-worker',
        phase: 'passed',
      }),
    ]);
  });

  it('deduplicates cached review-submit tasks when server rows return the same id', async () => {
    const taskCenter = loadTaskCenterModule();
    taskCenter.trackReviewSubmitTask({
      status: 'queued',
      reviewSubmitJobId: 'same-job',
      gateWorkerJobId: 'same-worker',
    });
    await taskCenter.refreshReviewSubmitTasks();
    jest.clearAllMocks();

    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: [
        {
          id: 'same-worker',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'running',
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    mockRequestReviewSubmitJobApi.mockResolvedValueOnce({
      data: [
        {
          status: 'waiting_gate',
          reviewSubmitJobId: 'server-job',
          gateWorkerJobId: 'same-worker',
        },
      ],
      error: null,
    });

    await expect(taskCenter.refreshReviewSubmitTasks()).resolves.toEqual([
      expect.objectContaining({
        id: 'server-job',
        gateWorkerJobId: 'same-worker',
      }),
    ]);
  });

  it('retries review-submit tasks by enqueueing the current saved dataset revision', async () => {
    const taskCenter = loadTaskCenterModule();
    taskCenter.trackReviewSubmitTask({
      status: 'blocked',
      reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
      gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
      datasetRevision: {
        table: 'processes',
        id: '33333333-3333-4333-8333-333333333333',
        version: '01.00.000',
      },
    });
    mockRequestReviewSubmitJobApi.mockResolvedValueOnce({
      data: [
        {
          status: 'waiting_gate',
          reviewSubmitJobId: '44444444-4444-4444-8444-444444444444',
          gateWorkerJobId: '55555555-5555-4555-8555-555555555555',
          datasetRevision: {
            table: 'processes',
            id: '33333333-3333-4333-8333-333333333333',
            version: '01.00.000',
          },
        },
      ],
      error: null,
    });

    await expect(
      taskCenter.retryReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).resolves.toEqual(
      expect.objectContaining({
        id: '44444444-4444-4444-8444-444444444444',
        phase: 'waiting_gate',
      }),
    );
    expect(mockRequestReviewSubmitJobApi).toHaveBeenCalledWith({
      action: 'enqueue',
      table: 'processes',
      id: '33333333-3333-4333-8333-333333333333',
      version: '01.00.000',
    });
  });

  it('surfaces cancel and retry failures', async () => {
    const taskCenter = loadTaskCenterModule();
    await expect(taskCenter.cancelReviewSubmitTask('missing-task')).rejects.toThrow(
      'Review-submit gate worker job id is missing',
    );
    await expect(taskCenter.retryReviewSubmitTask('missing-task')).rejects.toThrow(
      'Review-submit dataset revision is missing',
    );

    taskCenter.trackReviewSubmitTask({
      status: 'waiting_gate',
      reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
      gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
      datasetRevision: {
        table: 'processes',
        id: '33333333-3333-4333-8333-333333333333',
        version: '01.00.000',
      },
    });

    mockRequestWorkerJobsApi
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'cancel failed',
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {},
      });
    await expect(
      taskCenter.cancelReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow('cancel failed');
    await expect(
      taskCenter.cancelReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow('Failed to cancel review-submit task');

    mockRequestReviewSubmitJobApi
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'retry failed',
        },
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: {},
      });
    await expect(
      taskCenter.retryReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow('retry failed');
    await expect(
      taskCenter.retryReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow('Review-submit retry returned no job');
    await expect(
      taskCenter.retryReviewSubmitTask('11111111-1111-4111-8111-111111111111'),
    ).rejects.toThrow('Failed to retry review-submit task');
  });

  it('preserves task metadata when cancelling a worker-only task with a sparse cancel response', async () => {
    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: [
        {
          id: 'worker-for-cancel',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'running',
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    const taskCenter = loadTaskCenterModule();
    await taskCenter.refreshReviewSubmitTasks();

    mockRequestWorkerJobsApi
      .mockResolvedValueOnce({
        data: [
          {
            status: 'cancelled',
          },
        ],
        error: null,
      })
      .mockRejectedValueOnce(new Error('refresh after cancel failed'));

    await taskCenter.cancelReviewSubmitTask('worker-for-cancel');
    expect(taskCenter.listReviewSubmitTasks()[0]).toEqual(
      expect.objectContaining({
        phase: 'cancelled',
        gateWorkerJobId: 'worker-for-cancel',
        datasetRevision: {
          table: 'processes',
          id: '33333333-3333-4333-8333-333333333333',
          version: '01.00.000',
        },
      }),
    );
  });

  it('swallows background refresh failures after track and retry actions', async () => {
    const taskCenter = loadTaskCenterModule();
    mockRequestWorkerJobsApi.mockRejectedValueOnce(new Error('refresh after track failed'));
    taskCenter.trackReviewSubmitTask({
      status: 'queued',
      reviewSubmitJobId: 'track-refresh-fails',
      datasetRevision: {
        table: 'processes',
        id: '33333333-3333-4333-8333-333333333333',
        version: '01.00.000',
      },
    });
    await taskCenter.refreshReviewSubmitTasks().catch(() => undefined);

    mockRequestReviewSubmitJobApi.mockResolvedValueOnce({
      data: [
        {
          status: 'waiting_gate',
          reviewSubmitJobId: 'retry-refresh-fails',
          gateWorkerJobId: 'retry-refresh-worker',
          datasetRevision: {
            table: 'processes',
            id: '33333333-3333-4333-8333-333333333333',
            version: '01.00.000',
          },
        },
      ],
      error: null,
    });
    mockRequestWorkerJobsApi.mockRejectedValueOnce(new Error('refresh after retry failed'));

    await expect(taskCenter.retryReviewSubmitTask('track-refresh-fails')).resolves.toEqual(
      expect.objectContaining({
        id: 'retry-refresh-fails',
      }),
    );
    await taskCenter.refreshReviewSubmitTasks().catch(() => undefined);
  });

  it('can cancel and dismiss review-submit tasks without treating localStorage as truth', async () => {
    mockRequestWorkerJobsApi.mockResolvedValue({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          jobKind: 'review_submit.gate',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
          subjectVersion: '01.00.000',
          status: 'running',
          createdAt: '2026-03-12T11:00:00.000Z',
          updatedAt: '2026-03-12T11:02:00.000Z',
        },
      ],
      error: null,
    });
    mockRequestReviewSubmitJobApi.mockResolvedValue({
      data: [
        {
          status: 'waiting_gate',
          reviewSubmitJobId: '11111111-1111-4111-8111-111111111111',
          gateWorkerJobId: '22222222-2222-4222-8222-222222222222',
        },
      ],
      error: null,
    });
    const taskCenter = loadTaskCenterModule();
    await taskCenter.refreshReviewSubmitTasks();

    mockRequestWorkerJobsApi.mockResolvedValueOnce({
      data: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          status: 'cancelled',
        },
      ],
      error: null,
    });
    await taskCenter.cancelReviewSubmitTask('11111111-1111-4111-8111-111111111111');
    expect(mockRequestWorkerJobsApi).toHaveBeenCalledWith({
      action: 'cancel',
      jobId: '22222222-2222-4222-8222-222222222222',
      reason: 'user_cancelled',
    });

    taskCenter.removeReviewSubmitTask('11111111-1111-4111-8111-111111111111');
    expect(taskCenter.listReviewSubmitTasks()).toEqual([]);
    expect(
      JSON.parse(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY) ?? '{}').dismissedTaskIds,
    ).toContain('11111111-1111-4111-8111-111111111111');
  });

  it('clears only finished review-submit tasks', () => {
    const taskCenter = loadTaskCenterModule();
    taskCenter.trackReviewSubmitTask({
      status: 'waiting_gate',
      reviewSubmitJobId: 'running-job',
    });
    taskCenter.trackReviewSubmitTask({
      status: 'submitted',
      reviewSubmitJobId: 'submitted-job',
    });
    taskCenter.trackReviewSubmitTask({
      status: 'blocked',
      reviewSubmitJobId: 'blocked-job',
    });

    taskCenter.clearFinishedReviewSubmitTasks();
    expect(taskCenter.listReviewSubmitTasks()).toEqual([
      expect.objectContaining({
        id: 'running-job',
        state: 'running',
      }),
    ]);
    expect(
      JSON.parse(window.localStorage.getItem(REVIEW_SUBMIT_STORAGE_KEY) ?? '{}').dismissedTaskIds,
    ).toEqual(expect.arrayContaining(['submitted-job', 'blocked-job']));
  });
});
