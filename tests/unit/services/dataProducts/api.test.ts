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

import {
  createLciaResultBuildRequest,
  getPublishedLciaResultPackage,
  previewLciaResultPackage,
  publishLciaResultPackage,
  unpublishLciaResultPublication,
} from '@/services/dataProducts/api';

describe('dataProducts api', () => {
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

  it('creates LCIA result build requests through app_data_product_commands', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        command: 'lcia_result_build_request',
        data: {
          buildId: 'build-1',
          workerJobId: 'worker-job-1',
        },
      },
      error: null,
    });

    const result = await createLciaResultBuildRequest({
      name: 'June public LCIA package',
      coverageMode: 'global_eligible',
      lciaMethodSet: [],
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('app_data_product_commands', {
      headers: { Authorization: 'Bearer access-token' },
      body: {
        action: 'create_build',
        name: 'June public LCIA package',
        coverageMode: 'global_eligible',
        lciaMethodSet: [],
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual({
      data: {
        buildId: 'build-1',
        workerJobId: 'worker-job-1',
      },
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
  });

  it('routes preview, publish, and unpublish command payloads', async () => {
    mockFunctionsInvoke
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'lcia_result_package_preview',
          data: { summary: { packageId: 'package-1' } },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'lcia_result_package_publish',
          data: { publicationId: 'publication-1' },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          ok: true,
          command: 'lcia_result_publication_unpublish',
          data: { publicationId: 'publication-1', status: 'unpublished' },
        },
        error: null,
      });

    await previewLciaResultPackage('package-1');
    await publishLciaResultPackage({
      packageId: 'package-1',
      displayDefaultImpactCategory: 'climate-change',
      reason: 'publish current package',
    });
    await unpublishLciaResultPublication({
      publicationId: 'publication-1',
      reason: 'rollback',
    });

    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      1,
      'app_data_product_commands',
      expect.objectContaining({
        body: { action: 'preview_package', packageId: 'package-1' },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      2,
      'app_data_product_commands',
      expect.objectContaining({
        body: {
          action: 'publish_package',
          packageId: 'package-1',
          displayDefaultImpactCategory: 'climate-change',
          reason: 'publish current package',
        },
      }),
    );
    expect(mockFunctionsInvoke).toHaveBeenNthCalledWith(
      3,
      'app_data_product_commands',
      expect.objectContaining({
        body: {
          action: 'unpublish_publication',
          publicationId: 'publication-1',
          reason: 'rollback',
        },
      }),
    );
  });

  it('returns command auth errors before invoking protected commands', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await createLciaResultBuildRequest({
      name: 'No session package',
      coverageMode: 'global_eligible',
      lciaMethodSet: [],
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toEqual({
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
  });

  it('normalizes Edge command errors', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'FunctionsHttpError',
        context: {
          status: 403,
          json: async () => ({
            code: 'not_data_product_manager',
            message: 'Data product manager role is required',
          }),
        },
      },
    });

    await expect(previewLciaResultPackage('package-1')).resolves.toEqual({
      data: null,
      error: {
        message: 'Data product manager role is required',
        code: 'not_data_product_manager',
        details: '',
        hint: '',
      },
      count: null,
      status: 403,
      statusText: 'not_data_product_manager',
    });
  });

  it('reads public published LCIA package metadata without requiring a session', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        data: {
          publication: { publicationId: 'publication-1' },
          package: { packageId: 'package-1', packageVersion: '2026-06-public' },
          rowCount: 1,
          values: [
            {
              impact_id: 'climate-change',
              impact_index: 0,
              impact_name: 'Climate change',
              unit: 'kg CO2 eq',
              value: 42,
            },
          ],
        },
      },
      error: null,
    });

    const result = await getPublishedLciaResultPackage({
      processId: '11111111-1111-4111-8111-111111111111',
      processVersion: '01.00.000',
      impactCategoryId: 'climate-change',
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('data_product_results', {
      body: {
        processId: '11111111-1111-4111-8111-111111111111',
        processVersion: '01.00.000',
        impactCategoryId: 'climate-change',
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result.data?.values?.[0]).toMatchObject({
      impact_id: 'climate-change',
      value: 42,
    });
  });
});
