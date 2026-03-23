import { waitFor } from '@testing-library/react';

const STORAGE_KEY = 'tg_tidas_package_task_center_v1';

const mockQueueExportTidasPackageApi = jest.fn();
const mockGetTidasPackageJobApi = jest.fn();
const mockDownloadReadyTidasPackageExportApi = jest.fn();

jest.mock('@/services/general/api', () => ({
  queueExportTidasPackageApi: (...args: any[]) => mockQueueExportTidasPackageApi(...args),
  getTidasPackageJobApi: (...args: any[]) => mockGetTidasPackageJobApi(...args),
  downloadReadyTidasPackageExportApi: (...args: any[]) =>
    mockDownloadReadyTidasPackageExportApi(...args),
}));

function loadTaskCenterModule() {
  let loaded: any;
  jest.isolateModules(() => {
    loaded = require('@/services/tidasPackage/taskCenter');
  });
  return loaded as typeof import('@/services/tidasPackage/taskCenter');
}

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('tidasPackage/taskCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueueExportTidasPackageApi.mockReset();
    mockGetTidasPackageJobApi.mockReset();
    mockDownloadReadyTidasPackageExportApi.mockReset();
    jest.useRealTimers();
    localStorage.clear();
  });

  it('hydrates normalized tasks from storage and resumes running jobs', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        tasks: [
          123,
          {
            id: 'same-id',
            state: 'running',
            phase: 'submitting',
            message: 123,
            createdAt: 'invalid-date',
            updatedAt: 'invalid-date',
            sequence: -9,
            request: {
              scope: 'current_user',
              roots: [{ table: 'flows', id: 'flow-1', version: '01.00.000' }, { table: 1 }],
            },
            jobId: 'job-1',
            rootCount: -5,
          },
          {
            id: 'same-id',
            state: 'running',
            phase: 'queued',
            message: 'second',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            jobId: 'job-2',
            sequence: 8,
            rootCount: 2,
          },
          {
            id: 'ok-completed',
            state: 'completed',
            phase: 'completed',
            message: 'done',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sequence: 2,
            filename: 'from-storage.zip',
          },
          {
            id: '',
            state: 'running',
            phase: 'submitting',
          },
          {
            id: 'invalid-state',
            state: 'unknown',
            phase: 'submitting',
          },
          {
            id: 'invalid-phase',
            state: 'running',
            phase: 'unknown',
          },
        ],
      }),
    );

    mockGetTidasPackageJobApi.mockResolvedValue({
      data: {
        ok: true,
        status: 'ready',
        job_id: 'job-1',
        scope: 'current_user',
        root_count: 1,
        diagnostics: {},
        artifacts_by_kind: {
          export_zip: { metadata: { filename: 'artifact.zip' } },
        },
      },
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    await waitFor(() => {
      expect(taskCenter.listTidasPackageTasks().find((item) => item.id === 'same-id')?.state).toBe(
        'completed',
      );
    });

    const hydratedTasks = taskCenter.listTidasPackageTasks();
    expect(hydratedTasks.some((item) => item.id === '')).toBe(false);
    expect(hydratedTasks.find((item) => item.id === 'same-id')?.filename).toBe('artifact.zip');
    expect(mockGetTidasPackageJobApi).toHaveBeenCalledTimes(1);
  });

  it('clears incompatible and expired storage snapshots', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 999, savedAt: new Date().toISOString() }),
    );
    loadTaskCenterModule();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    jest.resetModules();
    mockGetTidasPackageJobApi.mockReset();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString(),
        tasks: [],
      }),
    );

    loadTaskCenterModule();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('handles malformed storage payloads, parse errors, and non-browser storage guards', () => {
    localStorage.setItem(STORAGE_KEY, '{bad-json');
    const parseErrorModule = loadTaskCenterModule();
    expect(parseErrorModule.listTidasPackageTasks()).toEqual([]);

    jest.resetModules();
    const originalWindow = (global as any).window;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: undefined,
    });
    try {
      const noWindowModule = loadTaskCenterModule();
      noWindowModule.submitTidasPackageExportTask({ scope: 'current_user' });
      expect(noWindowModule.listTidasPackageTasks()).toHaveLength(1);
    } finally {
      Object.defineProperty(global, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('normalizes storage fallbacks for non-array tasks, invalid savedAt, missing sequence, and non-string scope', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: 'not-a-date',
        tasks: {
          ignored: true,
        },
      }),
    );

    const emptyModule = loadTaskCenterModule();
    expect(emptyModule.listTidasPackageTasks()).toEqual([]);

    jest.resetModules();
    jest.useFakeTimers().setSystemTime(new Date('2026-03-21T10:00:00.000Z'));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: 'not-a-date',
        tasks: [
          {
            id: 'normalized-task',
            state: 'completed',
            phase: 'completed',
            message: 'done',
            createdAt: 123,
            updatedAt: '2026-03-21T11:00:00.000Z',
            scope: 123,
            rootCount: 3,
          },
        ],
      }),
    );

    const normalizedModule = loadTaskCenterModule();
    expect(normalizedModule.listTidasPackageTasks()).toEqual([
      expect.objectContaining({
        id: 'normalized-task',
        sequence: 1,
        scope: null,
        createdAt: '2026-03-21T10:00:00.000Z',
        updatedAt: '2026-03-21T11:00:00.000Z',
      }),
    ]);
  });

  it('restores string scopes when savedAt is missing from storage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        tasks: [
          {
            id: 'scoped-task',
            state: 'completed',
            phase: 'completed',
            message: 'done',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sequence: 3,
            scope: 'open_data',
          },
        ],
      }),
    );

    const taskCenter = loadTaskCenterModule();
    expect(taskCenter.listTidasPackageTasks()).toEqual([
      expect.objectContaining({
        id: 'scoped-task',
        scope: 'open_data',
      }),
    ]);
  });

  it('submits queued export tasks and handles collect_refs progress before completion', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-progress',
        scope: 'open_data',
        root_count: 1,
      },
      error: null,
    });
    mockGetTidasPackageJobApi
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'running',
          job_id: 'job-progress',
          scope: 'open_data',
          root_count: 1,
          diagnostics: {
            stage: 'collect_refs',
            message: 'Collecting refs',
            processed_items: 1,
            total_items: 3,
          },
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'running',
          job_id: 'job-branches',
          diagnostics: { stage: 'finalize_zip' },
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'completed',
          job_id: 'job-progress',
          scope: 'open_data',
          root_count: 1,
          diagnostics: {},
          artifacts_by_kind: {},
        },
        error: null,
      });

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({
      scope: 'open_data',
      roots: [{ table: 'flows', id: 'flow-1', version: '01.00.000' }],
    });

    await flushPromises();
    expect(taskCenter.listTidasPackageTasks()[0].message).toContain('Collecting refs (1/3)');

    await jest.advanceTimersByTimeAsync(3200);
    await waitFor(() => {
      const updated = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id);
      expect(updated?.state).toBe('completed');
      expect(updated?.filename).toBe('flows-package.zip');
    });
  });

  it('handles cache-hit flow, transient poll failures, and eventual completion', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'cache_hit',
        job_id: 'job-cache-hit',
        scope: 'current_user',
        root_count: 0,
      },
      error: null,
    });
    mockGetTidasPackageJobApi
      .mockResolvedValueOnce({ data: null, error: { message: 'network' } })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'ready',
          job_id: 'job-cache-hit',
          scope: 'current_user',
          root_count: 0,
          diagnostics: { stage: 'finalize_zip' },
          artifacts_by_kind: {
            export_zip: { metadata: { filename: 'ready.zip' } },
          },
        },
        error: null,
      });

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    await flushPromises();

    let current = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id)!;
    expect(current.message).toContain('retrying (1/5)');

    await jest.advanceTimersByTimeAsync(1600);
    await waitFor(() => {
      current = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id)!;
      expect(current.state).toBe('completed');
      expect(current.filename).toBe('ready.zip');
      expect(current.message).toContain('Export package ready');
    });
  });

  it('fails the task after repeated poll errors and preserves failed metadata precedence', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-fail',
        scope: 'current_user',
        root_count: 1,
      },
      error: null,
    });
    for (let index = 0; index < 5; index += 1) {
      mockGetTidasPackageJobApi.mockResolvedValueOnce({
        data: null,
        error: { message: `failure-${index}` },
      });
    }

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });

    for (let index = 0; index < 5; index += 1) {
      await flushPromises();
      await jest.advanceTimersByTimeAsync(1600);
    }

    await waitFor(() => {
      const failed = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id)!;
      expect(failed.state).toBe('failed');
      expect(failed.error).toBe('failure-4');
    });
  });

  it('handles queue failures and timeout branch', async () => {
    mockQueueExportTidasPackageApi.mockResolvedValueOnce({
      data: null,
      error: new Error('queue failed'),
    });

    const taskCenter = loadTaskCenterModule();
    const queueFailedTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    await waitFor(() => {
      const failed = taskCenter
        .listTidasPackageTasks()
        .find((item) => item.id === queueFailedTask.id)!;
      expect(failed.state).toBe('failed');
      expect(failed.error).toBe('queue failed');
    });

    jest.resetModules();
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-timeout',
        scope: 'current_user',
        root_count: 'bad',
      },
      error: null,
    });
    mockGetTidasPackageJobApi.mockResolvedValue({
      data: {
        ok: true,
        status: 'running',
        job_id: 'job-timeout',
        diagnostics: {},
        artifacts_by_kind: {},
      },
      error: null,
    });

    const nowSpy = jest.spyOn(Date, 'now');
    const sequence = [100, 100, 100, 8_000_000_000];
    nowSpy.mockImplementation(() => sequence.shift() ?? 8_000_000_000);

    const timeoutModule = loadTaskCenterModule();
    const timeoutTask = timeoutModule.submitTidasPackageExportTask({ scope: 'current_user' });
    await flushPromises();

    await waitFor(() => {
      const failed = timeoutModule
        .listTidasPackageTasks()
        .find((item) => item.id === timeoutTask.id)!;
      expect(failed.state).toBe('failed');
      expect(failed.error).toBe('tidas_package_export_timeout');
    });
    nowSpy.mockRestore();
  });

  it('uses fallback messages for invalid queue responses and terminal poll failures without error payloads', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi
      .mockResolvedValueOnce({
        data: { ok: false },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          mode: 'queued',
          job_id: 'job-no-error',
          scope: 'current_user',
        },
        error: null,
      });
    for (let index = 0; index < 5; index += 1) {
      mockGetTidasPackageJobApi.mockResolvedValueOnce({
        data: { ok: false },
        error: null,
      });
    }

    const taskCenter = loadTaskCenterModule();
    const invalidQueueTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    const retryFallbackTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });

    await waitFor(() => {
      const failed = taskCenter
        .listTidasPackageTasks()
        .find((item) => item.id === invalidQueueTask.id)!;
      expect(failed.error).toBe('Export failed');
    });

    for (let index = 0; index < 5; index += 1) {
      await flushPromises();
      await jest.advanceTimersByTimeAsync(1600);
    }

    await waitFor(() => {
      const failed = taskCenter
        .listTidasPackageTasks()
        .find((item) => item.id === retryFallbackTask.id)!;
      expect(failed.error).toBe('Failed to load TIDAS package job status');
      expect(failed.rootCount).toBe(0);
    });
  });

  it('normalizes oversized upload failures reported by the export job', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-too-large',
        scope: 'open_data',
        root_count: 0,
      },
      error: null,
    });
    mockGetTidasPackageJobApi.mockResolvedValueOnce({
      data: {
        ok: true,
        status: 'failed',
        job_id: 'job-too-large',
        diagnostics: {
          error:
            'object upload failed status=413 Payload Too Large body=<?xml version="1.0"?><Error><Code>EntityTooLarge</Code><Message>The object exceeded the maximum allowed size</Message></Error>',
        },
        artifacts_by_kind: {},
      },
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({ scope: 'open_data' });

    await waitFor(() => {
      const failed = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id)!;
      expect(failed.state).toBe('failed');
      expect(failed.error).toBe(
        'Export package is too large for the current storage upload limit. Try exporting a smaller scope, or ask an administrator to enable large-file upload support.',
      );
    });
  });

  it('covers additional polling branches for stale/finalize/submitting message paths', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-branches',
        scope: 'current_user',
        root_count: 0,
      },
      error: null,
    });
    mockGetTidasPackageJobApi
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'running',
          job_id: 'job-branches',
          diagnostics: { stage: 'collect_refs' },
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'running',
          job_id: 'job-branches',
          diagnostics: {},
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'stale',
          job_id: 'job-branches',
          diagnostics: { error: 'diag-error' },
          artifacts_by_kind: {},
        },
        error: null,
      });

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    await flushPromises();
    expect(taskCenter.listTidasPackageTasks()[0].message).toMatch(
      /Materializing ZIP package|Collecting related datasets/,
    );

    await jest.advanceTimersByTimeAsync(1600);
    expect(taskCenter.listTidasPackageTasks()[0].message).toMatch(
      /Collecting related datasets|Export task running/,
    );

    await jest.advanceTimersByTimeAsync(1600);
    expect(taskCenter.listTidasPackageTasks()[0].message).toContain('Export task running');

    await jest.advanceTimersByTimeAsync(1600);
    await waitFor(() => {
      const failed = taskCenter.listTidasPackageTasks().find((item) => item.id === task.id)!;
      expect(failed.state).toBe('failed');
      expect(failed.error).toBe('diag-error');
    });
  });

  it('keeps diagnostic messages when finalize_zip includes explicit text', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi.mockResolvedValue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-finalize-message',
        scope: 'current_user',
        root_count: 0,
      },
      error: null,
    });
    mockGetTidasPackageJobApi
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'running',
          job_id: 'job-finalize-message',
          diagnostics: { stage: 'finalize_zip', message: 'custom status' },
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'ready',
          job_id: 'job-finalize-message',
          diagnostics: {},
          artifacts_by_kind: {},
        },
        error: null,
      });

    const taskCenter = loadTaskCenterModule();
    taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    await flushPromises();
    expect(taskCenter.listTidasPackageTasks()[0].message).toBe('custom status');
  });

  it('prefers request-cache errors and generic failed messages when applying failed job results', async () => {
    jest.useFakeTimers();
    mockQueueExportTidasPackageApi
      .mockResolvedValueOnce({
        data: {
          ok: true,
          mode: 'queued',
          job_id: 'job-request-cache',
          scope: 'current_user',
          root_count: 0,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          mode: 'queued',
          job_id: 'job-generic-failed',
          scope: 'current_user',
          root_count: 0,
        },
        error: null,
      });
    mockGetTidasPackageJobApi
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'failed',
          job_id: 'job-request-cache',
          diagnostics: {},
          request_cache: {
            error_message: 'request-cache-error',
          },
          artifacts_by_kind: {},
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          status: 'failed',
          job_id: 'job-generic-failed',
          diagnostics: {},
          artifacts_by_kind: {},
        },
        error: null,
      });

    const taskCenter = loadTaskCenterModule();
    const requestCacheTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    const genericFailedTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });

    await waitFor(() => {
      expect(
        taskCenter.listTidasPackageTasks().find((item) => item.id === requestCacheTask.id)?.error,
      ).toBe('request-cache-error');
      expect(
        taskCenter.listTidasPackageTasks().find((item) => item.id === genericFailedTask.id)?.error,
      ).toBe('TIDAS package export failed');
    });
  });

  it('handles removed tasks during async queue and string-thrown queue failures', async () => {
    let resolveQueue: (value: any) => void = () => {};
    mockQueueExportTidasPackageApi.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveQueue = resolve;
        }),
    );
    mockGetTidasPackageJobApi.mockResolvedValue({
      data: {
        ok: true,
        status: 'ready',
        job_id: 'job-late',
        diagnostics: {},
        artifacts_by_kind: {},
      },
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    const task = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    taskCenter.removeTidasPackageTask(task.id);
    resolveQueue({
      data: {
        ok: true,
        mode: 'queued',
        job_id: 'job-late',
        scope: 'current_user',
        root_count: 0,
      },
      error: null,
    });
    await flushPromises();
    expect(taskCenter.listTidasPackageTasks()).toEqual([]);

    mockQueueExportTidasPackageApi.mockImplementationOnce(() => {
      throw 'queue-string-error';
    });
    const stringErrorTask = taskCenter.submitTidasPackageExportTask({ scope: 'current_user' });
    await waitFor(() => {
      const failed = taskCenter
        .listTidasPackageTasks()
        .find((item) => item.id === stringErrorTask.id)!;
      expect(failed.error).toBe('queue-string-error');
    });
  });

  it('downloads ready exports and supports list/remove/clear/subscribe helpers', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        tasks: [
          {
            id: 'downloadable',
            state: 'completed',
            phase: 'completed',
            message: 'done',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sequence: 1,
            jobId: 'job-download',
            filename: 'old.zip',
          },
          {
            id: 'running-task',
            state: 'running',
            phase: 'queued',
            message: 'run',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sequence: 2,
            jobId: 'job-running',
          },
        ],
      }),
    );

    mockGetTidasPackageJobApi.mockResolvedValue({
      data: {
        ok: true,
        status: 'queued',
        job_id: 'job-running',
        diagnostics: {},
        artifacts_by_kind: {},
      },
      error: null,
    });

    const taskCenter = loadTaskCenterModule();
    const listener = jest.fn();
    const unsubscribe = taskCenter.subscribeTidasPackageTasks(listener);

    mockDownloadReadyTidasPackageExportApi.mockResolvedValueOnce({
      data: { ok: true, filename: 'new.zip', job_id: 'job-download' },
      error: null,
    });
    const payload = await taskCenter.downloadTidasPackageExportTask('downloadable');
    expect(payload.filename).toBe('new.zip');
    expect(
      taskCenter.listTidasPackageTasks().find((item) => item.id === 'downloadable')?.message,
    ).toContain('new.zip');

    mockDownloadReadyTidasPackageExportApi.mockResolvedValueOnce({
      data: { ok: false },
      error: new Error('download failed'),
    });
    await expect(taskCenter.downloadTidasPackageExportTask('downloadable')).rejects.toThrow(
      'download failed',
    );
    mockDownloadReadyTidasPackageExportApi.mockResolvedValueOnce({
      data: { ok: false },
      error: null,
    });
    await expect(taskCenter.downloadTidasPackageExportTask('running-task')).rejects.toThrow(
      'Failed to download TIDAS package',
    );
    await expect(taskCenter.downloadTidasPackageExportTask('missing')).rejects.toThrow(
      'Package export task is missing job information',
    );

    taskCenter.removeTidasPackageTask('downloadable');
    expect(taskCenter.listTidasPackageTasks().some((item) => item.id === 'downloadable')).toBe(
      false,
    );
    taskCenter.clearFinishedTidasPackageTasks();
    expect(taskCenter.listTidasPackageTasks().every((item) => item.state === 'running')).toBe(true);

    expect(listener).toHaveBeenCalled();
    unsubscribe();
    listener.mockClear();
    taskCenter.removeTidasPackageTask('running-task');
    expect(listener).not.toHaveBeenCalled();
  });

  it('uses the default filename when downloading tasks that never recorded one locally', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        tasks: [
          {
            id: 'download-no-name',
            state: 'completed',
            phase: 'completed',
            message: 'done',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sequence: 1,
            jobId: 'job-download-no-name',
          },
        ],
      }),
    );

    const taskCenter = loadTaskCenterModule();
    mockDownloadReadyTidasPackageExportApi.mockResolvedValueOnce({
      data: { ok: true, filename: 'downloaded.zip', job_id: 'job-download-no-name' },
      error: null,
    });

    await expect(taskCenter.downloadTidasPackageExportTask('download-no-name')).resolves.toEqual({
      ok: true,
      filename: 'downloaded.zip',
      job_id: 'job-download-no-name',
    });
    expect(mockDownloadReadyTidasPackageExportApi).toHaveBeenCalledWith(
      'job-download-no-name',
      'tidas-package.zip',
    );
  });
});
