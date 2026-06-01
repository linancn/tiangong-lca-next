import { FunctionRegion } from '@supabase/supabase-js';

const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession(...args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
  },
}));

import { requestWorkerJobsApi } from '@/services/workerJobs/api';

describe('workerJobs api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'access-token',
        },
      },
    });
  });

  it('lists worker jobs through app_worker_jobs', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        ok: true,
        command: 'worker_jobs_list',
        data: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            jobKind: 'review_submit.gate',
            status: 'running',
          },
        ],
      },
      error: null,
    });

    const result = await requestWorkerJobsApi({
      action: 'list',
      subjectType: 'processes',
      statuses: ['queued', 'running'],
      limit: 25,
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_worker_jobs', {
      headers: { Authorization: 'Bearer access-token' },
      body: {
        action: 'list',
        subjectType: 'processes',
        statuses: ['queued', 'running'],
        limit: 25,
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result.error).toBeNull();
    expect(result.data).toEqual([
      {
        id: '66666666-6666-4666-8666-666666666666',
        jobKind: 'review_submit.gate',
        status: 'running',
      },
    ]);
  });

  it('reads and cancels worker jobs with ownership-safe endpoint commands', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'worker_jobs_read',
          data: {
            id: '66666666-6666-4666-8666-666666666666',
            status: 'completed',
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'worker_jobs_cancel',
          data: {
            id: '66666666-6666-4666-8666-666666666666',
            status: 'cancelled',
          },
        },
        error: null,
      });

    await expect(
      requestWorkerJobsApi({
        action: 'read',
        jobId: '66666666-6666-4666-8666-666666666666',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            status: 'completed',
          },
        ],
        error: null,
      }),
    );

    await requestWorkerJobsApi({
      action: 'cancel',
      jobId: '66666666-6666-4666-8666-666666666666',
      reason: 'user_cancelled',
    });

    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      2,
      'app_worker_jobs',
      expect.objectContaining({
        body: {
          action: 'cancel',
          jobId: '66666666-6666-4666-8666-666666666666',
          reason: 'user_cancelled',
        },
      }),
    );
  });

  it('normalizes worker job errors and returns auth errors before invocation', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          status: 404,
          json: async () => ({
            code: 'WORKER_JOB_NOT_FOUND',
            message: 'Worker job not found',
          }),
        },
      },
    });

    await expect(
      requestWorkerJobsApi({
        action: 'read',
        jobId: '66666666-6666-4666-8666-666666666666',
      }),
    ).resolves.toEqual({
      data: null,
      error: {
        message: 'Worker job not found',
        code: 'WORKER_JOB_NOT_FOUND',
        details: '',
        hint: '',
      },
      count: null,
      status: 404,
      statusText: 'WORKER_JOB_NOT_FOUND',
    });

    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual({
      data: null,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        details: '',
        hint: '',
      },
      count: null,
      status: 401,
      statusText: 'AUTH_REQUIRED',
    });
    expect(mockFunctionsInvoke).toHaveBeenCalledTimes(1);
  });

  it('treats worker job HTTP envelopes as renderable results', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          status: 409,
          json: async () => ({
            ok: false,
            command: 'worker_jobs_read',
            data: {
              id: '66666666-6666-4666-8666-666666666666',
              status: 'blocked',
            },
          }),
        },
      },
    });

    await expect(
      requestWorkerJobsApi({
        action: 'read',
        jobId: '66666666-6666-4666-8666-666666666666',
      }),
    ).resolves.toEqual({
      data: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          status: 'blocked',
        },
      ],
      error: null,
      count: null,
      status: 409,
      statusText: 'OK',
    });
  });

  it('normalizes array, null, and scalar success payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            status: 'queued',
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          id: '77777777-7777-4777-8777-777777777777',
          status: 'running',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          command: 'worker_jobs_list',
          data: null,
        },
        error: null,
      });

    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            status: 'queued',
          },
        ],
      }),
    );
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual(
      expect.objectContaining({
        data: [],
      }),
    );
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            status: 'running',
          },
        ],
      }),
    );
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual(
      expect.objectContaining({
        data: [],
      }),
    );
  });

  it('normalizes worker job errors without parseable command payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'network failed',
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: '',
          context: {
            json: async () => {
              throw new Error('parse failed');
            },
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 400,
            json: async () => [],
          },
        },
      });

    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual({
      data: null,
      error: {
        message: 'network failed',
        code: 'FUNCTION_ERROR',
        details: '',
        hint: '',
      },
      count: null,
      status: 500,
      statusText: 'FUNCTION_ERROR',
    });
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual({
      data: null,
      error: {
        message: 'Request failed',
        code: 'FUNCTION_ERROR',
        details: '',
        hint: '',
      },
      count: null,
      status: 500,
      statusText: 'FUNCTION_ERROR',
    });
    await expect(requestWorkerJobsApi({ action: 'list' })).resolves.toEqual({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        code: 'FUNCTION_ERROR',
        details: '',
        hint: '',
      },
      count: null,
      status: 400,
      statusText: 'FUNCTION_ERROR',
    });
  });

  it('covers optional body and auth fallback branches', async () => {
    mockAuthGetSession.mockResolvedValue({
      data: {
        session: {},
      },
    });
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    await requestWorkerJobsApi({
      action: 'list',
      subjectType: 'processes',
      subjectId: '33333333-3333-4333-8333-333333333333',
    });
    await requestWorkerJobsApi({
      action: 'cancel',
      jobId: '66666666-6666-4666-8666-666666666666',
    });
    await requestWorkerJobsApi({
      action: 'list',
      statuses: [],
    });

    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      1,
      'app_worker_jobs',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: {
          action: 'list',
          subjectType: 'processes',
          subjectId: '33333333-3333-4333-8333-333333333333',
        },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      2,
      'app_worker_jobs',
      expect.objectContaining({
        body: {
          action: 'cancel',
          jobId: '66666666-6666-4666-8666-666666666666',
        },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      3,
      'app_worker_jobs',
      expect.objectContaining({
        body: {
          action: 'list',
        },
      }),
    );
  });

  it('uses a successful fallback status for worker job command error envelopes', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          json: async () => ({
            ok: false,
            command: 'worker_jobs_cancel',
            data: null,
          }),
        },
      },
    });

    await expect(
      requestWorkerJobsApi({
        action: 'cancel',
        jobId: '66666666-6666-4666-8666-666666666666',
      }),
    ).resolves.toEqual({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });
});
