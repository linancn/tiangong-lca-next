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

import { requestNationalCarbonGraphCacheJobsApi } from '@/services/nationalCarbonGraphCacheJobs/api';

const testJobId = '66666666-6666-4666-8666-666666666666';

describe('nationalCarbonGraphCacheJobs api', () => {
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

  it('enqueues graph cache jobs through the dedicated function', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        ok: true,
        command: 'national_carbon_graph_cache_jobs_enqueue',
        data: {
          id: testJobId,
          jobKind: 'national_carbon.process_flow_graph_cache_build',
          status: 'queued',
        },
      },
      error: null,
    });

    const result = await requestNationalCarbonGraphCacheJobsApi({
      action: 'enqueue',
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_national_carbon_graph_cache_jobs', {
      headers: { Authorization: 'Bearer access-token' },
      body: {
        action: 'enqueue',
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual({
      data: [
        {
          id: testJobId,
          jobKind: 'national_carbon.process_flow_graph_cache_build',
          status: 'queued',
        },
      ],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('reads and lists graph cache jobs with optional filters', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'national_carbon_graph_cache_jobs_read',
          data: {
            id: testJobId,
            status: 'completed',
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'national_carbon_graph_cache_jobs_read_latest',
          data: [
            {
              id: testJobId,
              status: 'running',
            },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    await expect(
      requestNationalCarbonGraphCacheJobsApi({
        action: 'read',
        jobId: testJobId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: testJobId,
            status: 'completed',
          },
        ],
        error: null,
      }),
    );

    await expect(
      requestNationalCarbonGraphCacheJobsApi({
        action: 'read_latest',
        statuses: ['queued', 'running'],
        limit: 2,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: testJobId,
            status: 'running',
          },
        ],
        error: null,
      }),
    );

    await requestNationalCarbonGraphCacheJobsApi({
      action: 'read_latest',
      statuses: [],
    });

    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      1,
      'app_national_carbon_graph_cache_jobs',
      expect.objectContaining({
        body: {
          action: 'read',
          jobId: testJobId,
        },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      2,
      'app_national_carbon_graph_cache_jobs',
      expect.objectContaining({
        body: {
          action: 'read_latest',
          statuses: ['queued', 'running'],
          limit: 2,
        },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      3,
      'app_national_carbon_graph_cache_jobs',
      expect.objectContaining({
        body: {
          action: 'read_latest',
        },
      }),
    );
  });

  it('returns authentication errors before invoking the function', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(
      requestNationalCarbonGraphCacheJobsApi({
        action: 'enqueue',
      }),
    ).resolves.toEqual({
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
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it('uses an empty bearer token when the session omits access_token', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {},
      },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await requestNationalCarbonGraphCacheJobsApi({
      action: 'enqueue',
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'app_national_carbon_graph_cache_jobs',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
      }),
    );
  });

  it('treats graph cache job HTTP envelopes as renderable results', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 409,
            json: async () => ({
              ok: false,
              command: 'national_carbon_graph_cache_jobs_enqueue',
              data: {
                id: testJobId,
                status: 'running',
              },
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            json: async () => ({
              ok: false,
              command: 'national_carbon_graph_cache_jobs_read_latest',
              data: null,
            }),
          },
        },
      });

    await expect(
      requestNationalCarbonGraphCacheJobsApi({
        action: 'enqueue',
      }),
    ).resolves.toEqual({
      data: [
        {
          id: testJobId,
          status: 'running',
        },
      ],
      error: null,
      count: null,
      status: 409,
      statusText: 'OK',
    });

    await expect(
      requestNationalCarbonGraphCacheJobsApi({
        action: 'read_latest',
      }),
    ).resolves.toEqual({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('normalizes array, null, scalar, and envelope success payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: [
          {
            id: testJobId,
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
          command: 'national_carbon_graph_cache_jobs_read',
          data: null,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          command: 'national_carbon_graph_cache_jobs_read',
          data: undefined,
        },
        error: null,
      });

    await expect(
      requestNationalCarbonGraphCacheJobsApi({ action: 'read_latest' }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: testJobId,
            status: 'queued',
          },
        ],
      }),
    );
    await expect(
      requestNationalCarbonGraphCacheJobsApi({ action: 'read_latest' }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [],
      }),
    );
    await expect(
      requestNationalCarbonGraphCacheJobsApi({ action: 'read_latest' }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [
          {
            id: '77777777-7777-4777-8777-777777777777',
            status: 'running',
          },
        ],
      }),
    );
    await expect(
      requestNationalCarbonGraphCacheJobsApi({ action: 'read_latest' }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [],
      }),
    );
    await expect(
      requestNationalCarbonGraphCacheJobsApi({ action: 'read_latest' }),
    ).resolves.toEqual(
      expect.objectContaining({
        data: [],
      }),
    );
  });

  it('normalizes command errors from message, detail, error, and fallback sources', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 403,
            json: async () => ({
              code: 'SYSTEM_MANAGER_REQUIRED',
              message: 'System-manager permissions are required',
              details: { role: 'member' },
              hint: 'ask owner',
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 500,
            json: async () => ({
              detail: 'detail text',
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 500,
            json: async () => ({
              error: 'payload error text',
            }),
          },
        },
      })
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
      });

    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual({
      data: null,
      error: {
        message: 'System-manager permissions are required',
        code: 'SYSTEM_MANAGER_REQUIRED',
        details: { role: 'member' },
        hint: 'ask owner',
      },
      count: null,
      status: 403,
      statusText: 'SYSTEM_MANAGER_REQUIRED',
    });
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'detail text',
          code: 'FUNCTION_ERROR',
        }),
      }),
    );
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'payload error text',
          code: 'FUNCTION_ERROR',
        }),
      }),
    );
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'network failed',
          code: 'FUNCTION_ERROR',
        }),
        status: 500,
      }),
    );
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Request failed',
          code: 'FUNCTION_ERROR',
        }),
        status: 500,
      }),
    );
  });

  it('normalizes non-envelope error payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 400,
            json: async () => [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 400,
            json: async () => ({
              command: 'national_carbon_graph_cache_jobs_read',
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 400,
            json: async () => ({
              command: 'worker_jobs_read',
              data: {
                id: testJobId,
              },
            }),
          },
        },
      });

    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual({
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
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual({
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
    await expect(requestNationalCarbonGraphCacheJobsApi({ action: 'enqueue' })).resolves.toEqual({
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
});
