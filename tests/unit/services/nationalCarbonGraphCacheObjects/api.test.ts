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

import { requestNationalCarbonGraphCacheObjectsApi } from '@/services/nationalCarbonGraphCacheObjects/api';

function createBundle() {
  return {
    activeManifest: {
      activeBuildId: 'test-build',
      buildManifestPath: 'builds/test-build/manifest.json',
      schemaVersion: 'process_flow_graph_manifest_v1',
    },
    buildManifest: {
      buildId: 'test-build',
      files: {
        nodes: {
          path: 'graph/nodes.json.gz',
          signedUrl: 'https://signed.test/graph/nodes.json.gz',
        },
      },
      schemaVersion: 'process_flow_graph_v2',
      stats: {
        edgeCount: 1,
        flowCount: 1,
        maxDegree: 1,
        processCount: 1,
      },
    },
    bucket: 'lca_results',
    expiresIn: 3600,
    prefix: 'national-carbon/process-flow-graph/v1',
  };
}

describe('nationalCarbonGraphCacheObjects api', () => {
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

  it('reads graph cache object manifest bundles through the dedicated function', async () => {
    const bundle = createBundle();
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        ok: true,
        command: 'national_carbon_graph_cache_objects_read_manifest_bundle',
        data: bundle,
      },
      error: null,
    });

    const result = await requestNationalCarbonGraphCacheObjectsApi();

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_national_carbon_graph_cache_objects', {
      headers: { Authorization: 'Bearer access-token' },
      body: {
        action: 'read_manifest_bundle',
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual({
      data: bundle,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('accepts raw bundles and uses an empty bearer token when the session omits access_token', async () => {
    const bundle = createBundle();
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {},
      },
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: bundle,
      error: null,
    });

    await expect(
      requestNationalCarbonGraphCacheObjectsApi({ action: 'read_manifest_bundle' }),
    ).resolves.toEqual({
      data: bundle,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'app_national_carbon_graph_cache_objects',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
      }),
    );
  });

  it('returns authentication errors before invoking the function', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual({
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

  it('rejects missing, malformed, and incomplete manifest bundles', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          command: 'national_carbon_graph_cache_objects_read_manifest_bundle',
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          command: 'national_carbon_graph_cache_objects_read_manifest_bundle',
          data: {
            activeManifest: createBundle().activeManifest,
          },
        },
        error: null,
      });

    for (let index = 0; index < 4; index += 1) {
      await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual({
        data: null,
        error: {
          message: 'National carbon graph cache manifest bundle is missing',
          code: 'GRAPH_CACHE_OBJECTS_BUNDLE_MISSING',
          details: '',
          hint: '',
        },
        count: null,
        status: 502,
        statusText: 'GRAPH_CACHE_OBJECTS_BUNDLE_MISSING',
      });
    }
  });

  it('normalizes command errors from message, detail, error, and fallback sources', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 404,
            json: async () => ({
              code: 'NATIONAL_CARBON_GRAPH_CACHE_OBJECT_NOT_FOUND',
              message: 'Cache object not found',
              details: { path: 'manifest.json' },
              hint: 'build cache first',
            }),
          },
        },
      })
      .mockResolvedValueOnce({
        data: null,
        error: {
          message: 'FunctionsHttpError',
          context: {
            status: 502,
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

    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual({
      data: null,
      error: {
        message: 'Cache object not found',
        code: 'NATIONAL_CARBON_GRAPH_CACHE_OBJECT_NOT_FOUND',
        details: { path: 'manifest.json' },
        hint: 'build cache first',
      },
      count: null,
      status: 404,
      statusText: 'NATIONAL_CARBON_GRAPH_CACHE_OBJECT_NOT_FOUND',
    });
    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'detail text',
          code: 'FUNCTION_ERROR',
        }),
        status: 502,
      }),
    );
    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'payload error text',
          code: 'FUNCTION_ERROR',
        }),
        status: 500,
      }),
    );
    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'network failed',
          code: 'FUNCTION_ERROR',
        }),
        status: 500,
      }),
    );
    await expect(requestNationalCarbonGraphCacheObjectsApi()).resolves.toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Request failed',
          code: 'FUNCTION_ERROR',
        }),
        status: 500,
      }),
    );
  });
});
