/**
 * Focused tests for the lifecycle model service bundle persistence flow.
 */

jest.mock('@/pages/LifeCycleModels/lifecyclemodels.json', () => ({}), { virtual: true });

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createLifeCycleModel: jest.fn().mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  }),
  createProcess: jest.fn().mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  }),
}));

const {
  createLifeCycleModel: mockCreateTidasLifeCycleModel,
  createProcess: mockCreateTidasProcess,
} = jest.requireMock('@tiangong-lca/tidas-sdk');

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession(...args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke(...args),
    },
    rpc: (...args: any[]) => mockRpc(...args),
  },
}));

const mockGetTeamIdByUserId = jest.fn();
const mockContributeSource = jest.fn();
const mockGetRefData = jest.fn();
const mockNormalizeLangPayloadForSave = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  contributeSource: (...args: any[]) => mockContributeSource(...args),
  getRefData: (...args: any[]) => mockGetRefData(...args),
  getTeamIdByUserId: (...args: any[]) => mockGetTeamIdByUserId(...args),
  normalizeLangPayloadForSave: (...args: any[]) => mockNormalizeLangPayloadForSave(...args),
}));

const mockClassificationToString = jest.fn();
const mockGenClassificationZH = jest.fn();
const mockGetLangText = jest.fn();
const mockJsonToList = jest.fn();

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  classificationToString: (...args: any[]) => mockClassificationToString(...args),
  genClassificationZH: (...args: any[]) => mockGenClassificationZH(...args),
  getLangText: (...args: any[]) => mockGetLangText(...args),
  jsonToList: (...args: any[]) => mockJsonToList(...args),
}));

const mockGetILCDClassification = jest.fn();

jest.mock('@/services/ilcd/api', () => ({
  __esModule: true,
  getILCDClassification: (...args: any[]) => mockGetILCDClassification(...args),
}));

const mockGetProcessDetailByIdsAndVersion = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  getProcessDetailByIdsAndVersion: (...args: any[]) => mockGetProcessDetailByIdsAndVersion(...args),
}));

const mockGenProcessName = jest.fn();
const mockGenProcessJsonOrdered = jest.fn();

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessJsonOrdered: (...args: any[]) => mockGenProcessJsonOrdered(...args),
  genProcessName: (...args: any[]) => mockGenProcessName(...args),
}));

const mockGetCurrentUser = jest.fn();

jest.mock('@/services/auth', () => ({
  __esModule: true,
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
}));

const mockGenLifeCycleModelJsonOrdered = jest.fn();
const mockGenReferenceToResultingProcess = jest.fn();

jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelJsonOrdered: (...args: any[]) => mockGenLifeCycleModelJsonOrdered(...args),
  genReferenceToResultingProcess: (...args: any[]) => mockGenReferenceToResultingProcess(...args),
}));

const mockGenLifeCycleModelProcesses = jest.fn();

jest.mock('@/services/lifeCycleModels/util_calculate', () => ({
  __esModule: true,
  genLifeCycleModelProcesses: (...args: any[]) => mockGenLifeCycleModelProcesses(...args),
}));

const mockGetAllRefObj = jest.fn();
const mockGetRefTableName = jest.fn();
const mockValidateDatasetRuleVerification = jest.fn();

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    waitForAll: jest.fn().mockResolvedValue(undefined),
  })),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRefTableName: (...args: any[]) => mockGetRefTableName(...args),
  validateDatasetRuleVerification: (...args: any[]) => mockValidateDatasetRuleVerification(...args),
}));

import * as lifeCycleModelsApi from '@/services/lifeCycleModels/api';

import {
  createMockEdgeFunctionResponse,
  createMockNoSession,
  createMockSession,
  createQueryBuilder,
} from '../../../helpers/mockBuilders';

const sampleModelId = '11111111-1111-1111-1111-111111111111';
const sampleProcessId = '22222222-2222-2222-2222-222222222222';
const sampleVersion = '01.00.000';
const sampleUserId = 'user-0001';
const sampleAccessToken = 'access-token-0001';

const buildProcessDataSet = () => ({
  processInformation: {
    dataSetInformation: {},
    technology: {},
  },
  modellingAndValidation: {
    complianceDeclarations: {},
    validation: {},
  },
  administrativeInformation: {
    dataEntryBy: {},
    publicationAndOwnership: {},
  },
});

const buildLifecycleModelJsonOrdered = (includedProcessIds: string[] = []) => ({
  lifeCycleModelDataSet: {
    administrativeInformation: {
      publicationAndOwnership: {
        'common:dataSetVersion': sampleVersion,
      },
    },
    lifeCycleModelInformation: {
      dataSetInformation: {
        name: {},
      },
      technology: {
        processes: {
          processInstance: includedProcessIds.map((id) => ({
            referenceToProcess: { '@refObjectId': id },
          })),
        },
      },
    },
    modellingAndValidation: {
      complianceDeclarations: {},
      validation: {},
    },
  },
});

const buildSaveResult = (overrides: Record<string, unknown> = {}) => ({
  ok: true as const,
  modelId: sampleModelId,
  version: sampleVersion,
  lifecycleModel: {
    id: sampleModelId,
    version: sampleVersion,
    json: {},
    json_tg: { submodels: [] },
    ruleVerification: true,
  },
  ...overrides,
});

const createInvokeError = ({
  status = 500,
  jsonPayload,
  text = '',
  jsonError,
  textError,
  message = 'Function error',
}: {
  status?: number;
  jsonPayload?: unknown;
  text?: string;
  jsonError?: Error;
  textError?: Error;
  message?: string;
} = {}) => ({
  message,
  context: {
    status,
    clone: jest.fn(() => ({
      json: jsonError
        ? jest.fn().mockRejectedValue(jsonError)
        : jest.fn().mockResolvedValue(jsonPayload),
      text: textError ? jest.fn().mockRejectedValue(textError) : jest.fn().mockResolvedValue(text),
    })),
  },
});

beforeEach(() => {
  jest.clearAllMocks();

  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockFunctionsInvoke.mockReset();
  mockRpc.mockReset();
  mockGetTeamIdByUserId.mockReset();
  mockContributeSource.mockReset();
  mockGetRefData.mockReset();
  mockNormalizeLangPayloadForSave.mockReset();
  mockClassificationToString.mockReset();
  mockGenClassificationZH.mockReset();
  mockGetLangText.mockReset();
  mockJsonToList.mockReset();
  mockGetILCDClassification.mockReset();
  mockGetProcessDetailByIdsAndVersion.mockReset();
  mockGenProcessName.mockReset();
  mockGenProcessJsonOrdered.mockReset();
  mockGetCurrentUser.mockReset();
  mockGenLifeCycleModelJsonOrdered.mockReset();
  mockGenReferenceToResultingProcess.mockReset();
  mockGenLifeCycleModelProcesses.mockReset();
  mockGetAllRefObj.mockReset();
  mockGetRefTableName.mockReset();
  mockValidateDatasetRuleVerification.mockReset();
  mockCreateTidasLifeCycleModel.mockReset();
  mockCreateTidasProcess.mockReset();

  mockAuthGetSession.mockResolvedValue(createMockSession(sampleUserId, sampleAccessToken));
  mockGetTeamIdByUserId.mockResolvedValue('team-default');
  mockContributeSource.mockResolvedValue({ success: true });
  mockGetRefData.mockResolvedValue({ success: true, data: null });
  mockNormalizeLangPayloadForSave.mockImplementation(async (payload: any) => ({
    payload,
    validationError: undefined,
  }));
  mockClassificationToString.mockReturnValue('classification-string');
  mockGenClassificationZH.mockReturnValue(['classification-zh']);
  mockGetLangText.mockReturnValue('localized-text');
  mockJsonToList.mockImplementation((value: any) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
  mockGetILCDClassification.mockResolvedValue({ data: { dictionary: true } });
  mockGetProcessDetailByIdsAndVersion.mockResolvedValue({ data: [] });
  mockGenProcessName.mockReturnValue('Life Cycle Model Name');
  mockGenProcessJsonOrdered.mockImplementation((_id: string, data: any) => ({
    processDataSet: data,
  }));
  mockGetCurrentUser.mockResolvedValue({ userid: sampleUserId });
  mockGenLifeCycleModelJsonOrdered.mockReturnValue(buildLifecycleModelJsonOrdered());
  mockGenReferenceToResultingProcess.mockImplementation(
    (processes: any[], version: string, data: any) => ({
      ...data,
      lifeCycleModelDataSet: {
        ...(data?.lifeCycleModelDataSet ?? {}),
        lifeCycleModelInformation: {
          ...(data?.lifeCycleModelDataSet?.lifeCycleModelInformation ?? {}),
          dataSetInformation: {
            ...(data?.lifeCycleModelDataSet?.lifeCycleModelInformation?.dataSetInformation ?? {}),
            referenceToResultingProcess: (processes ?? []).map((process: any) => ({
              '@refObjectId': process?.modelInfo?.id,
              '@type': 'process data set',
              '@uri': `../processes/${process?.modelInfo?.id}.xml`,
              '@version': version,
              'common:shortDescription':
                process?.data?.processDataSet?.processInformation?.dataSetInformation?.name ?? {},
            })),
          },
        },
      },
    }),
  );
  mockGenLifeCycleModelProcesses.mockResolvedValue({
    lifeCycleModelProcesses: [],
    up2DownEdges: [],
  });
  mockGetAllRefObj.mockReturnValue([]);
  mockGetRefTableName.mockImplementation((type: string) => {
    if (type === 'process data set') return 'processes';
    if (type === 'lifeCycleModel data set') return 'lifecyclemodels';
    if (type === 'source data set') return 'sources';
    return '';
  });
  mockValidateDatasetRuleVerification.mockResolvedValue({
    ruleVerification: true,
  });
  mockCreateTidasLifeCycleModel.mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  });
  mockCreateTidasProcess.mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  });
});

describe('getLifeCycleModelTableAll', () => {
  it('maps lifecycle model rows for the english table view', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            id: sampleModelId,
            name: {},
            'common:class': [{ id: 'class-1' }],
            'common:generalComment': {},
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      }),
    );

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' } as any,
      'en',
      'tg',
      '',
    );

    expect(result).toMatchObject({
      success: true,
      total: 1,
      data: [
        {
          id: sampleModelId,
          name: 'Life Cycle Model Name',
          classification: 'classification-string',
          generalComment: 'localized-text',
          version: sampleVersion,
          teamId: 'team-1',
        },
      ],
    });
  });
});

describe('getLifeCycleModelDetail', () => {
  it('returns the lifecycle model detail payload', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            json: { foo: 'bar' },
            json_tg: { submodels: [] },
            state_code: 0,
            rule_verification: true,
            team_id: 'team-1',
          },
        ],
        error: null,
      }),
    );

    const result = await lifeCycleModelsApi.getLifeCycleModelDetail(sampleModelId, sampleVersion);

    expect(result).toEqual({
      data: {
        id: sampleModelId,
        version: sampleVersion,
        json: { foo: 'bar' },
        json_tg: { submodels: [] },
        stateCode: 0,
        ruleVerification: true,
        teamId: 'team-1',
      },
      success: true,
    });
  });
});

describe('deleteLifeCycleModel', () => {
  it('returns auth error when deleting without a session', async () => {
    mockAuthGetSession.mockResolvedValueOnce(createMockNoSession());

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
    });
  });

  it('normalizes session lookup failures into a mutation error', async () => {
    mockAuthGetSession.mockRejectedValueOnce(new Error('session lookup failed'));

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'session lookup failed',
    });
  });

  it('invokes the delete bundle endpoint', async () => {
    const edgePayload = {
      ok: true,
      modelId: sampleModelId,
      version: sampleVersion,
    };
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('delete_lifecycle_model_bundle', {
      headers: { Authorization: `Bearer ${sampleAccessToken}` },
      body: {
        modelId: sampleModelId,
        version: sampleVersion,
      },
      region: expect.any(String),
    });
    expect(result).toEqual(edgePayload);
  });

  it('normalizes bundle invocation rejects into a mutation error', async () => {
    mockFunctionsInvoke.mockRejectedValueOnce(new Error('network down'));

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toMatchObject({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'network down',
    });
  });

  it('returns a mutation result payload from the edge-function JSON error body', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 409,
        jsonPayload: {
          ok: false,
          code: 'VERSION_CONFLICT',
          message: 'Version conflict',
          details: { latest: '02.00.000' },
        },
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'VERSION_CONFLICT',
      message: 'Version conflict',
      details: { latest: '02.00.000' },
    });
  });

  it('normalizes coded JSON error bodies from the bundle endpoint', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 400,
        jsonPayload: {
          code: 'INVALID_PLAN',
          message: 'Plan payload is invalid',
          details: { field: 'processMutations' },
        },
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_PLAN',
      message: 'Plan payload is invalid',
      details: { field: 'processMutations' },
    });
  });

  it('falls back to text-based status handling when JSON parsing fails', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 403,
        jsonError: new Error('json parse failed'),
        text: 'Forbidden by policy',
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Forbidden by policy',
      details: undefined,
    });
  });

  it('maps 401 text responses to AUTH_REQUIRED', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 401,
        jsonError: new Error('json parse failed'),
        text: 'Login again',
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Login again',
      details: undefined,
    });
  });

  it('maps 404 text responses to MODEL_NOT_FOUND', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 404,
        jsonError: new Error('json parse failed'),
        text: 'Lifecycle model is gone',
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'MODEL_NOT_FOUND',
      message: 'Lifecycle model is gone',
      details: undefined,
    });
  });

  it.each([
    [401, 'AUTH_REQUIRED', 'Authentication required'],
    [403, 'FORBIDDEN', 'Forbidden'],
    [404, 'MODEL_NOT_FOUND', 'Lifecycle model not found'],
  ])(
    'uses the default status message for %s responses when the text body is empty',
    async (status, code, message) => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: createInvokeError({
          status,
          jsonError: new Error('json parse failed'),
          text: '',
        }),
      });

      const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

      expect(result).toEqual({
        ok: false,
        code,
        message,
        details: undefined,
      });
    },
  );

  it('falls back to a generic function error when only plain text is available', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 500,
        jsonError: new Error('json parse failed'),
        text: 'Plain text failure',
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Plain text failure',
      details: { status: 500 },
    });
  });

  it('falls back to the generic function error when the edge-function error has no context or message', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {},
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Lifecycle model bundle request failed',
      details: {},
    });
  });

  it('falls back to status defaults when response parsing fails entirely', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: createInvokeError({
        status: 404,
        jsonError: new Error('json parse failed'),
        textError: new Error('text parse failed'),
      }),
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'MODEL_NOT_FOUND',
      message: 'Lifecycle model not found',
      details: undefined,
    });
  });

  it('falls back to status defaults when there is no cloneable response payload', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'missing response body',
        context: { status: 401 },
      },
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'AUTH_REQUIRED',
      message: 'Authentication required',
      details: undefined,
    });
  });

  it('maps 403 status defaults when there is no cloneable response payload', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'forbidden',
        context: { status: 403 },
      },
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FORBIDDEN',
      message: 'Forbidden',
      details: undefined,
    });
  });

  it('falls back to the original error message when there is no status mapping', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'Unexpected lifecycle bundle failure',
        context: { status: 500 },
      },
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Unexpected lifecycle bundle failure',
      details: {
        message: 'Unexpected lifecycle bundle failure',
        context: { status: 500 },
      },
    });
  });

  it('returns a generic function error when the bundle endpoint response is missing', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(undefined);

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Lifecycle model bundle request failed',
      details: undefined,
    });
  });

  it('returns INVALID_RESPONSE when the bundle endpoint returns malformed data', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { unexpected: true },
      error: null,
    });

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_RESPONSE',
      message: 'Lifecycle model bundle endpoint returned an invalid response',
      details: { unexpected: true },
    });
  });

  it('falls back to the generic bundle error message when an invoke rejection has no message', async () => {
    mockFunctionsInvoke.mockRejectedValueOnce({});

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Lifecycle model bundle request failed',
      details: {},
    });
  });

  it('falls back to the generic bundle error message when session lookup rejects without a message', async () => {
    mockAuthGetSession.mockRejectedValueOnce({});

    const result = await lifeCycleModelsApi.deleteLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      ok: false,
      code: 'FUNCTION_ERROR',
      message: 'Lifecycle model bundle request failed',
      details: {},
    });
  });
});

describe('createLifeCycleModel', () => {
  it('returns a language validation error when normalization fails', async () => {
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce({
      payload: { ignored: true },
      validationError: 'Invalid multilingual payload',
    });

    const result = await lifeCycleModelsApi.createLifeCycleModel({
      id: sampleModelId,
      model: { nodes: [], edges: [] },
    });

    expect(mockGenLifeCycleModelProcesses).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'LANG_VALIDATION_ERROR',
      message: 'Invalid multilingual payload',
    });
  });

  it('builds a create bundle plan and invokes the save endpoint', async () => {
    const secondaryProcessId = '33333333-3333-3333-3333-333333333333';
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(
      buildLifecycleModelJsonOrdered(['included-primary']),
    );
    mockCreateTidasLifeCycleModel.mockReturnValueOnce({
      validateEnhanced: jest.fn().mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['lifeCycleModelDataSet', 'name'] }, { path: ['validation'] }],
        },
      }),
    });
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [
        {
          option: 'update',
          modelInfo: { id: sampleProcessId, type: 'primary', finalId: {} },
          data: { processDataSet: buildProcessDataSet() },
        },
        {
          modelInfo: { id: secondaryProcessId, type: 'secondary', finalId: {} },
          refProcesses: {
            id: '44444444-4444-4444-4444-444444444444',
            version: sampleVersion,
            'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Secondary Ref Process' }],
          },
          data: { processDataSet: buildProcessDataSet() },
        },
      ],
      up2DownEdges: [
        {
          upstreamNodeId: 'node-a',
          downstreamNodeId: 'node-b',
          flowUUID: 'flow-1',
          isBalanced: false,
          unbalancedAmount: 2,
          exchangeAmount: 5,
        },
      ],
    });
    const edgePayload = buildSaveResult({
      lifecycleModel: {
        id: sampleModelId,
        version: sampleVersion,
        json: {},
        json_tg: {
          submodels: [
            { id: sampleProcessId, version: sampleVersion },
            { id: secondaryProcessId, version: sampleVersion },
          ],
        },
        ruleVerification: false,
      },
    });
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));
    mockValidateDatasetRuleVerification
      .mockResolvedValueOnce({ ruleVerification: false })
      .mockResolvedValue({ ruleVerification: true });

    const result = await lifeCycleModelsApi.createLifeCycleModel({
      id: sampleModelId,
      model: {
        nodes: [],
        edges: [
          {
            source: { cell: 'node-a' },
            target: { cell: 'node-b' },
            data: { connection: { outputExchange: { '@flowUUID': 'flow-1' } } },
          },
        ],
      },
    });

    const [, request] = mockFunctionsInvoke.mock.calls[0];
    const body = request.body;
    const primaryMutation = body.processMutations.find((item: any) => item.id === sampleProcessId);
    const secondaryMutation = body.processMutations.find(
      (item: any) => item.id === secondaryProcessId,
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'save_lifecycle_model_bundle',
      expect.objectContaining({
        headers: { Authorization: `Bearer ${sampleAccessToken}` },
        region: expect.any(String),
      }),
    );
    expect(body.mode).toBe('create');
    expect(body.modelId).toBe(sampleModelId);
    expect(body.parent.ruleVerification).toBe(false);
    expect(body.parent.jsonTg.submodels).toEqual([
      { id: sampleProcessId, type: 'primary', finalId: {}, version: sampleVersion },
      { id: secondaryProcessId, type: 'secondary', finalId: {}, version: sampleVersion },
    ]);
    expect(body.parent.jsonTg.xflow.edges).toEqual([
      expect.objectContaining({
        labels: [],
        data: expect.objectContaining({
          connection: expect.objectContaining({
            isBalanced: false,
            unbalancedAmount: 2,
            exchangeAmount: 5,
          }),
        }),
      }),
    ]);
    expect(primaryMutation).toMatchObject({
      op: 'create',
      id: sampleProcessId,
      modelId: sampleModelId,
    });
    expect(
      primaryMutation.jsonOrdered.processDataSet.processInformation.technology
        .referenceToIncludedProcesses,
    ).toEqual([{ '@refObjectId': 'included-primary' }]);
    expect(secondaryMutation).toMatchObject({
      op: 'create',
      id: secondaryProcessId,
      modelId: sampleModelId,
    });
    expect(
      secondaryMutation.jsonOrdered.processDataSet.processInformation.technology
        .referenceToIncludedProcesses,
    ).toEqual([
      expect.objectContaining({
        '@refObjectId': '44444444-4444-4444-4444-444444444444',
        '@version': sampleVersion,
      }),
    ]);
    expect(result).toEqual(edgePayload);
  });

  it('surfaces plan-building errors when a generated process payload is invalid', async () => {
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(buildLifecycleModelJsonOrdered());
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [
        {
          modelInfo: { id: sampleProcessId, type: 'primary', finalId: {} },
          data: { processDataSet: buildProcessDataSet() },
        },
      ],
      up2DownEdges: [],
    });
    mockNormalizeLangPayloadForSave
      .mockResolvedValueOnce({
        payload: buildLifecycleModelJsonOrdered(),
        validationError: undefined,
      })
      .mockResolvedValueOnce({
        payload: { ignored: true },
        validationError: 'Generated process payload is invalid',
      });

    const result = await lifeCycleModelsApi.createLifeCycleModel({
      id: sampleModelId,
      model: { nodes: [], edges: [] },
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'LANG_VALIDATION_ERROR',
      message: 'Generated process payload is invalid',
    });
  });

  it('uses raw normalized fallbacks and default empty model arrays during create', async () => {
    const rawJson = buildLifecycleModelJsonOrdered();
    const edgePayload = buildSaveResult();
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(rawJson);
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce(undefined as any);
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [],
      up2DownEdges: [],
    });
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.createLifeCycleModel({
      id: sampleModelId,
    });

    expect(mockGenLifeCycleModelProcesses).toHaveBeenCalledWith(sampleModelId, [], rawJson, []);
    expect(mockGenReferenceToResultingProcess).toHaveBeenCalledWith([], sampleVersion, rawJson);
    expect(mockFunctionsInvoke.mock.calls[0][1].body).toMatchObject({
      mode: 'create',
      modelId: sampleModelId,
      parent: {
        jsonOrdered: rawJson,
      },
      processMutations: [],
    });
    expect(result).toEqual(edgePayload);
  });
});

describe('updateLifeCycleModel', () => {
  it('returns MODEL_LOOKUP_FAILED when the current lifecycle model query errors', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: null,
        error: { message: 'lookup failed' },
      }),
    );

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
      model: { nodes: [], edges: [] },
    });

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_LOOKUP_FAILED',
      message: 'Failed to load lifecycle model before saving',
      details: { message: 'lookup failed' },
    });
  });

  it('returns a language validation error before invoking the save endpoint', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [{ submodels: [] }],
        error: null,
      }),
    );
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce({
      payload: { ignored: true },
      validationError: 'Update payload is invalid',
    });

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
      model: { nodes: [], edges: [] },
    });

    expect(mockGenLifeCycleModelProcesses).not.toHaveBeenCalled();
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'LANG_VALIDATION_ERROR',
      message: 'Update payload is invalid',
    });
  });

  it('returns model-not-found when the current lifecycle model snapshot is missing', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
      model: { nodes: [], edges: [] },
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_NOT_FOUND',
      message: 'Lifecycle model not found',
    });
  });

  it('builds delete, update, and create mutations for the bundle save endpoint', async () => {
    const oldSubmodels = [
      {
        id: 'old-secondary-keep',
        type: 'secondary',
        finalId: {
          nodeId: 'node-keep',
          processId: 'proc-keep',
          allocatedExchangeDirection: 'input',
          allocatedExchangeFlowId: 'flow-keep',
        },
      },
      {
        id: 'old-secondary-delete',
        type: 'secondary',
        finalId: {
          nodeId: 'node-delete',
          processId: 'proc-delete',
          allocatedExchangeDirection: 'output',
          allocatedExchangeFlowId: 'flow-delete',
        },
      },
    ];
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [{ submodels: oldSubmodels }],
        error: null,
      }),
    );
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(
      buildLifecycleModelJsonOrdered(['included-primary']),
    );
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [
        {
          option: 'update',
          modelInfo: {
            id: 'old-secondary-keep',
            type: 'primary',
            finalId: oldSubmodels[0].finalId,
          },
          data: { processDataSet: buildProcessDataSet() },
        },
        {
          option: 'create',
          modelInfo: {
            id: 'new-secondary-id',
            type: 'secondary',
            finalId: {
              nodeId: 'node-new',
              processId: 'proc-new',
              allocatedExchangeDirection: 'output',
              allocatedExchangeFlowId: 'flow-new',
            },
          },
          refProcesses: [
            {
              id: '55555555-5555-5555-5555-555555555555',
              version: sampleVersion,
              'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Secondary Ref 2' }],
            },
          ],
          data: { processDataSet: buildProcessDataSet() },
        },
      ],
      up2DownEdges: [],
    });
    mockGetProcessDetailByIdsAndVersion.mockResolvedValueOnce({
      data: [
        {
          id: 'old-secondary-keep',
          version: sampleVersion,
          json: {
            processDataSet: {
              ...buildProcessDataSet(),
              processInformation: {
                dataSetInformation: {
                  identifierOfSubDataSet: 'legacy-id',
                },
                technology: {},
              },
            },
          },
        },
      ],
    });
    const edgePayload = buildSaveResult();
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
      model: { nodes: [], edges: [] },
    });

    const [, request] = mockFunctionsInvoke.mock.calls[0];
    const body = request.body;
    const deleteMutation = body.processMutations.find(
      (item: any) => item.id === 'old-secondary-delete',
    );
    const updateMutation = body.processMutations.find(
      (item: any) => item.id === 'old-secondary-keep',
    );
    const createMutation = body.processMutations.find(
      (item: any) => item.id === 'new-secondary-id',
    );

    expect(mockGetProcessDetailByIdsAndVersion).toHaveBeenCalledWith(
      ['old-secondary-keep', 'new-secondary-id'],
      sampleVersion,
    );
    expect(body.mode).toBe('update');
    expect(body.version).toBe(sampleVersion);
    expect(deleteMutation).toEqual({
      op: 'delete',
      id: 'old-secondary-delete',
      version: sampleVersion,
    });
    expect(updateMutation).toMatchObject({
      op: 'update',
      id: 'old-secondary-keep',
      version: sampleVersion,
      modelId: sampleModelId,
    });
    expect(
      updateMutation.jsonOrdered.processDataSet.processInformation.dataSetInformation
        .identifierOfSubDataSet,
    ).toBe('legacy-id');
    expect(
      updateMutation.jsonOrdered.processDataSet.processInformation.technology
        .referenceToIncludedProcesses,
    ).toEqual([{ '@refObjectId': 'included-primary' }]);
    expect(createMutation).toMatchObject({
      op: 'create',
      id: 'new-secondary-id',
      modelId: sampleModelId,
    });
    expect(
      createMutation.jsonOrdered.processDataSet.processInformation.technology
        .referenceToIncludedProcesses,
    ).toEqual([
      expect.objectContaining({
        '@refObjectId': '55555555-5555-5555-5555-555555555555',
        '@version': sampleVersion,
      }),
    ]);
    expect(result).toEqual(edgePayload);
  });

  it('returns plan errors from save-plan generation during updates', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [{ submodels: [] }],
        error: null,
      }),
    );
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(buildLifecycleModelJsonOrdered());
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [
        {
          option: 'update',
          modelInfo: { id: sampleProcessId, type: 'primary', finalId: {} },
          data: { processDataSet: buildProcessDataSet() },
        },
      ],
      up2DownEdges: [],
    });
    mockGetProcessDetailByIdsAndVersion.mockResolvedValueOnce({
      data: [],
    });
    mockNormalizeLangPayloadForSave
      .mockResolvedValueOnce({
        payload: buildLifecycleModelJsonOrdered(),
        validationError: undefined,
      })
      .mockResolvedValueOnce({
        payload: { ignored: true },
        validationError: 'Updated process payload is invalid',
      });

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
      model: { nodes: [], edges: [] },
    });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'LANG_VALIDATION_ERROR',
      message: 'Updated process payload is invalid',
    });
  });

  it('uses raw normalized fallbacks and empty legacy collections during update', async () => {
    const rawJson = buildLifecycleModelJsonOrdered();
    const edgePayload = buildSaveResult();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [{ submodels: undefined }],
        error: null,
      }),
    );
    mockGenLifeCycleModelJsonOrdered.mockReturnValueOnce(rawJson);
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce(undefined as any);
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce({
      lifeCycleModelProcesses: [],
      up2DownEdges: [],
    });
    mockGetProcessDetailByIdsAndVersion.mockResolvedValueOnce(undefined as any);
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.updateLifeCycleModel({
      id: sampleModelId,
      version: sampleVersion,
    });

    expect(mockGenLifeCycleModelProcesses).toHaveBeenCalledWith(sampleModelId, [], rawJson, []);
    expect(mockGetProcessDetailByIdsAndVersion).toHaveBeenCalledWith([], sampleVersion);
    expect(mockFunctionsInvoke.mock.calls[0][1].body).toMatchObject({
      mode: 'update',
      modelId: sampleModelId,
      version: sampleVersion,
      parent: {
        jsonOrdered: rawJson,
      },
      processMutations: [],
    });
    expect(result).toEqual(edgePayload);
  });
});

describe('updateLifeCycleModelJsonApi', () => {
  it('returns MODEL_LOOKUP_FAILED when the current lifecycle model query errors', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: null,
        error: { message: 'model lookup failed' },
      }),
    );

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      {},
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_LOOKUP_FAILED',
      message: 'Failed to load lifecycle model before review update',
      details: { message: 'model lookup failed' },
    });
  });

  it('returns a language validation error before loading current process snapshots', async () => {
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce({
      payload: { ignored: true },
      validationError: 'JSON payload is invalid',
    });

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      { raw: true },
    );

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'LANG_VALIDATION_ERROR',
      message: 'JSON payload is invalid',
    });
  });

  it('returns model-not-found when the current lifecycle model cannot be loaded', async () => {
    mockFrom.mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      {},
    );

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      code: 'MODEL_NOT_FOUND',
      message: 'Lifecycle model not found',
    });
  });

  it('returns PROCESS_LOOKUP_FAILED when the current submodel process query errors', async () => {
    mockFrom
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            {
              json_tg: {
                submodels: [{ id: sampleProcessId, version: sampleVersion }],
              },
              rule_verification: true,
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: null,
          error: { message: 'process lookup failed' },
        }),
      );

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      {
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            complianceDeclarations: { compliance: [] },
            validation: { review: [] },
          },
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'PROCESS_LOOKUP_FAILED',
      message: 'Failed to load current submodel processes before review update',
      details: { message: 'process lookup failed' },
    });
  });

  it('returns INVALID_PAYLOAD when a referenced submodel snapshot is missing', async () => {
    mockFrom
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            {
              json_tg: {
                submodels: [{ id: sampleProcessId, version: sampleVersion }],
              },
              rule_verification: true,
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [],
          error: null,
        }),
      );

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      {
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            complianceDeclarations: { compliance: [] },
            validation: { review: [] },
          },
        },
      },
    );

    expect(result).toMatchObject({
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: `Missing current process snapshot for submodel ${sampleProcessId}`,
    });
  });

  it('saves successfully when the current lifecycle model has no submodels', async () => {
    const edgePayload = buildSaveResult();
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            json_tg: {},
            rule_verification: true,
          },
        ],
        error: null,
      }),
    );
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      {
        lifeCycleModelDataSet: {
          modellingAndValidation: {
            complianceDeclarations: { compliance: [] },
            validation: { review: [] },
          },
        },
      },
    );

    const [, request] = mockFunctionsInvoke.mock.calls[0];
    expect(request.body.processMutations).toEqual([]);
    expect(result).toEqual(edgePayload);
  });

  it('builds a review update bundle plan and merges comment data into submodels', async () => {
    mockFrom
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            {
              json_tg: {
                submodels: [{ id: sampleProcessId, version: sampleVersion }],
              },
              rule_verification: false,
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            {
              id: sampleProcessId,
              version: sampleVersion,
              json_ordered: {
                processDataSet: {
                  ...buildProcessDataSet(),
                  modellingAndValidation: {
                    complianceDeclarations: { compliance: [{ id: 'legacy-compliance' }] },
                    validation: { review: [{ id: 'legacy-review' }] },
                  },
                },
              },
              rule_verification: true,
            },
          ],
          error: null,
        }),
      );
    const edgePayload = buildSaveResult({
      lifecycleModel: {
        id: sampleModelId,
        version: sampleVersion,
        json: {},
        json_tg: {
          submodels: [{ id: sampleProcessId, version: sampleVersion }],
        },
        ruleVerification: false,
      },
    });
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const payload = {
      lifeCycleModelDataSet: {
        modellingAndValidation: {
          complianceDeclarations: { compliance: [{ id: 'model-compliance' }] },
          validation: { review: [{ id: 'model-review' }] },
        },
      },
    };

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      payload,
      {
        commentReview: [{ id: 'assigned-review' }],
        commentCompliance: [{ id: 'assigned-compliance' }],
      },
    );

    const [, request] = mockFunctionsInvoke.mock.calls[0];
    const body = request.body;
    const processMutation = body.processMutations[0];

    expect(body.mode).toBe('update');
    expect(body.modelId).toBe(sampleModelId);
    expect(body.version).toBe(sampleVersion);
    expect(body.parent).toEqual({
      jsonOrdered: payload,
      jsonTg: {
        submodels: [{ id: sampleProcessId, version: sampleVersion }],
      },
      ruleVerification: false,
    });
    expect(processMutation).toMatchObject({
      op: 'update',
      id: sampleProcessId,
      version: sampleVersion,
      modelId: sampleModelId,
      ruleVerification: true,
    });
    expect(
      processMutation.jsonOrdered.processDataSet.modellingAndValidation.validation.review,
    ).toEqual([{ id: 'model-review' }, { id: 'assigned-review' }]);
    expect(
      processMutation.jsonOrdered.processDataSet.modellingAndValidation.complianceDeclarations
        .compliance,
    ).toEqual([{ id: 'model-compliance' }, { id: 'assigned-compliance' }]);
    expect(result).toEqual(edgePayload);
  });

  it('uses raw review payloads and defaults missing current json_tg/rule verification fields', async () => {
    const rawJson = buildLifecycleModelJsonOrdered();
    const edgePayload = buildSaveResult();
    mockNormalizeLangPayloadForSave.mockResolvedValueOnce(undefined as any);
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [{ json_tg: undefined, rule_verification: undefined }],
        error: null,
      }),
    );
    mockFunctionsInvoke.mockResolvedValueOnce(createMockEdgeFunctionResponse(edgePayload));

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      rawJson,
    );

    expect(mockFunctionsInvoke.mock.calls[0][1].body).toEqual({
      mode: 'update',
      modelId: sampleModelId,
      version: sampleVersion,
      parent: {
        jsonOrdered: rawJson,
        jsonTg: {},
        ruleVerification: false,
      },
      processMutations: [],
    });
    expect(result).toEqual(edgePayload);
  });

  it('treats missing current process query data as an empty array before building the review plan', async () => {
    mockFrom
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [
            {
              json_tg: { submodels: [{ id: 'missing-process' }] },
              rule_verification: true,
            },
          ],
          error: null,
        }),
      )
      .mockReturnValueOnce(
        createQueryBuilder({
          data: undefined,
          error: null,
        }),
      );

    const result = await lifeCycleModelsApi.updateLifeCycleModelJsonApi(
      sampleModelId,
      sampleVersion,
      buildLifecycleModelJsonOrdered(),
    );

    expect(result).toEqual({
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'Missing current process snapshot for submodel missing-process',
    });
  });
});

describe('getLifeCyclesByIdAndVersion', () => {
  it('returns an empty data array when no id/version pairs are provided', async () => {
    const result = await lifeCycleModelsApi.getLifeCyclesByIdAndVersion([]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [] });
  });

  it('builds OR conditions for lifecycle model id/version pairs', async () => {
    const builder = createQueryBuilder({
      data: [{ id: sampleModelId, version: sampleVersion }],
      error: null,
    });
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getLifeCyclesByIdAndVersion([
      { id: sampleModelId, version: sampleVersion },
      { id: '33333333-3333-3333-3333-333333333333', version: '02.00.000' },
    ]);

    expect(mockFrom).toHaveBeenCalledWith('lifecyclemodels');
    expect(builder.or).toHaveBeenCalledWith(
      `and(id.eq.${sampleModelId},version.eq.${sampleVersion}),and(id.eq.33333333-3333-3333-3333-333333333333,version.eq.02.00.000)`,
    );
    expect(result).toEqual({
      data: [{ id: sampleModelId, version: sampleVersion }],
      error: null,
    });
  });
});

describe('table/search helpers', () => {
  it('applies co filters with a concrete team id', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' } as any,
      'en',
      'co',
      'team-234',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', 200);
    expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-234');
  });

  it('applies the current user filter for my-data table queries with an active session', async () => {
    const builder = createQueryBuilder({
      data: [],
      error: null,
      count: 0,
    });
    mockFrom.mockReturnValueOnce(builder);

    await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'my',
      '',
      30,
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', 30);
    expect(builder.eq).toHaveBeenCalledWith('user_id', sampleUserId);
  });

  it('applies tg filters with a concrete team id', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValueOnce(builder);

    await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'ascend' } as any,
      'en',
      'tg',
      'team-123',
    );

    expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
    expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-123');
  });

  it('returns a failed empty result for my-data queries without a session', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValueOnce(builder);
    mockAuthGetSession.mockResolvedValueOnce(createMockNoSession());

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'my',
      '',
      20,
    );

    expect(result).toEqual({
      data: [],
      success: false,
    });
  });

  it('returns an empty success result for team-data queries without a team id', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValueOnce(builder);
    mockGetTeamIdByUserId.mockResolvedValueOnce(undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'te',
      '',
    );

    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('applies the resolved team id for team-data queries', async () => {
    const builder = createQueryBuilder({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValueOnce(builder);
    mockGetTeamIdByUserId.mockResolvedValueOnce('team-te');

    await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'te',
      '',
    );

    expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-te');
  });

  it('returns a failed empty result when the lifecycle model table query returns no data', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: undefined,
        error: { message: 'query failed' },
        count: null,
      }),
    );
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'tg',
      '',
    );

    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'query failed' });
    expect(result).toEqual({
      data: [],
      success: false,
    });
    consoleSpy.mockRestore();
  });

  it('falls back to a bare id row when zh classification mapping throws', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            id: sampleModelId,
            name: {},
            'common:class': [{ id: 'class-1' }],
            'common:generalComment': {},
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      }),
    );
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('classification parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'zh',
      'tg',
      '',
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('maps zh lifecycle model table search rows when classification resolution succeeds', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            id: sampleModelId,
            name: {},
            'common:class': [{ id: 'class-1' }],
            'common:generalComment': {},
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      }),
    );
    mockGenClassificationZH.mockReturnValueOnce(['zh-classification']);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'zh',
      'tg',
      '',
    );

    expect(result.data).toEqual([
      expect.objectContaining({
        id: sampleModelId,
        classification: 'classification-string',
      }),
    ]);
  });

  it('uses zh table fallbacks for missing row fields and undefined classification output', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            id: sampleModelId,
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      }),
    );
    mockGenClassificationZH.mockReturnValueOnce(undefined as any);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'zh',
      'tg',
      '',
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'zh');
    expect(mockGetLangText).toHaveBeenCalledWith(undefined, 'zh');
    expect(mockClassificationToString).toHaveBeenCalledWith({});
    expect(result.data).toEqual([
      expect.objectContaining({
        id: sampleModelId,
        classification: 'classification-string',
      }),
    ]);
  });

  it('uses table fallbacks for missing english row fields and count metadata', async () => {
    const builder = createQueryBuilder({
      data: [
        {
          id: sampleModelId,
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
        },
      ],
      error: null,
      count: undefined,
    });
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      {},
      {} as any,
      'en',
      'tg',
      '',
    );

    expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith(undefined, 'en');
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('falls back to a bare id row when english classification parsing throws', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            id: sampleModelId,
            name: {},
            'common:class': [{ id: 'class-1' }],
            'common:generalComment': {},
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      }),
    );
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('english classification parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {} as any,
      'en',
      'tg',
      '',
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('calls the pgroonga lifecycle model search with state_code and handles empty results', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 2, pageSize: 5 },
      'en',
      'my',
      'keyword',
      { filter: true },
      20,
      { key: 'baseName', lang: 'en', order: 'desc' },
    );

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_lifecyclemodels_v1', {
      query_text: 'keyword',
      filter_condition: { filter: true },
      page_size: 5,
      page_current: 2,
      data_source: 'my',
      order_by: { key: 'baseName', lang: 'en', order: 'desc' },
      state_code: 20,
    });
    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('uses default pagination values in the numeric state-code pgroonga RPC branch', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      {},
      'en',
      'my',
      'keyword',
      {},
      20,
    );

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_lifecyclemodels_v1', {
      query_text: 'keyword',
      filter_condition: {},
      page_size: 10,
      page_current: 1,
      data_source: 'my',
      order_by: undefined,
      state_code: 20,
    });
  });

  it('logs pgroonga errors and returns the raw response when no data payload is present', async () => {
    mockRpc.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'rpc failed' },
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'rpc failed' });
    expect(result).toEqual({
      data: undefined,
      error: { message: 'rpc failed' },
    });
    consoleSpy.mockRestore();
  });

  it('maps zh pgroonga search rows when classification lookup succeeds', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {},
                  'common:generalComment': {},
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ id: 'class-1' }],
                    },
                  },
                },
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGenClassificationZH.mockReturnValueOnce(['zh-classification']);

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('uses zh pgroonga fallbacks for missing row fields and undefined classification output', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {},
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGenClassificationZH.mockReturnValueOnce(undefined as any);

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'zh');
    expect(mockGetLangText).toHaveBeenCalledWith({}, 'zh');
    expect(mockClassificationToString).toHaveBeenCalledWith(undefined);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: sampleModelId,
        classification: 'classification-string',
      }),
    ]);
  });

  it('falls back to a bare id row when zh pgroonga classification mapping throws', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {},
                  'common:generalComment': {},
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ id: 'class-1' }],
                    },
                  },
                },
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ],
      error: null,
    });
    mockGenClassificationZH.mockImplementationOnce(() => {
      throw new Error('pgroonga zh parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('maps english pgroonga search rows when classification parsing succeeds', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {},
                  'common:generalComment': {},
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ id: 'class-1' }],
                    },
                  },
                },
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ],
      error: null,
    });

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('uses pgroonga fallbacks for missing english row fields and total count metadata', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {},
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
        },
      ],
      error: null,
    });

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      {},
      'en',
      'my',
      'keyword',
      {},
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith({}, 'en');
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('falls back to a bare id row when english pgroonga search row parsing throws', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: sampleModelId,
          json: {
            lifeCycleModelDataSet: {
              lifeCycleModelInformation: {
                dataSetInformation: {
                  name: {},
                  'common:generalComment': {},
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ id: 'class-1' }],
                    },
                  },
                },
              },
            },
          },
          version: sampleVersion,
          modified_at: '2026-03-17T10:00:00.000Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ],
      error: null,
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('pgroonga english parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns the raw pgroonga result when there is no session', async () => {
    mockAuthGetSession.mockResolvedValueOnce(createMockNoSession());

    const result = await lifeCycleModelsApi.getLifeCycleModelTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('returns the raw hybrid-search result when there is no session', async () => {
    mockAuthGetSession.mockResolvedValueOnce(createMockNoSession());

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('uses an empty bearer token when the hybrid-search session exists without an access token', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: { session: { user: { id: sampleUserId } } },
    });
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [],
      }),
    );

    await lifeCycleModelsApi.lifeCycleModel_hybrid_search({}, 'en', 'my', 'keyword', {});

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('lifecyclemodel_hybrid_search', {
      headers: {
        Authorization: 'Bearer ',
      },
      body: { query: 'keyword', filter: {} },
      region: expect.any(String),
    });
  });

  it('calls the lifecycle model hybrid-search function and handles empty data', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [],
      }),
    );

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'keyword',
      { filter: true },
      100,
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('lifecyclemodel_hybrid_search', {
      headers: {
        Authorization: `Bearer ${sampleAccessToken}`,
      },
      body: { query: 'keyword', filter: { filter: true }, state_code: 100 },
      region: expect.any(String),
    });
    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('logs hybrid-search errors and returns the raw response when no data payload is present', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'hybrid failed' },
    });
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(consoleSpy).toHaveBeenCalledWith('error', { message: 'hybrid failed' });
    expect(result).toEqual({
      data: undefined,
      error: { message: 'hybrid failed' },
    });
    consoleSpy.mockRestore();
  });

  it('maps zh hybrid-search rows when classification lookup succeeds', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {
                    name: {},
                    'common:generalComment': {},
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ id: 'class-1' }],
                      },
                    },
                  },
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
      }),
    );
    mockGenClassificationZH.mockReturnValueOnce(['zh-classification']);

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('uses zh hybrid-search fallbacks for missing row fields and undefined classification output', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {},
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
      }),
    );
    mockGenClassificationZH.mockReturnValueOnce(undefined as any);

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'zh');
    expect(mockGetLangText).toHaveBeenCalledWith({}, 'zh');
    expect(mockClassificationToString).toHaveBeenCalledWith(undefined);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: sampleModelId,
        classification: 'classification-string',
      }),
    ]);
  });

  it('falls back to a bare id row when zh hybrid-search classification mapping throws', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {
                    name: {},
                    'common:generalComment': {},
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ id: 'class-1' }],
                      },
                    },
                  },
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
      }),
    );
    mockGenClassificationZH.mockImplementationOnce(() => {
      throw new Error('hybrid zh parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'zh',
      'my',
      'keyword',
      {},
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('maps english hybrid-search rows when classification parsing succeeds', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {
                    name: {},
                    'common:generalComment': {},
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ id: 'class-1' }],
                      },
                    },
                  },
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
      }),
    );

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('uses hybrid-search fallbacks for missing english row fields and page metadata', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {},
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
          },
        ],
      }),
    );

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      {},
      'en',
      'my',
      'keyword',
      {},
    );

    expect(mockGenProcessName).toHaveBeenCalledWith({}, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith({}, 'en');
    expect(result).toEqual({
      data: [
        expect.objectContaining({
          id: sampleModelId,
          classification: 'classification-string',
        }),
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('falls back to a bare id row when english hybrid-search row parsing throws', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce(
      createMockEdgeFunctionResponse({
        data: [
          {
            id: sampleModelId,
            json: {
              lifeCycleModelDataSet: {
                lifeCycleModelInformation: {
                  dataSetInformation: {
                    name: {},
                    'common:generalComment': {},
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ id: 'class-1' }],
                      },
                    },
                  },
                },
              },
            },
            version: sampleVersion,
            modified_at: '2026-03-17T10:00:00.000Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
      }),
    );
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('hybrid english parsing failed');
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.lifeCycleModel_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'my',
      'keyword',
      {},
    );

    expect(result.data).toEqual([{ id: sampleModelId }]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('getLifeCycleModelDetail fallbacks', () => {
  it('returns a failed empty payload when no lifecycle model detail row exists', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [],
        error: null,
      }),
    );

    const result = await lifeCycleModelsApi.getLifeCycleModelDetail(sampleModelId, sampleVersion);

    expect(result).toEqual({
      data: {},
      success: false,
    });
  });
});

describe('contributeLifeCycleModel', () => {
  it('returns an error when the current user cannot be resolved', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(undefined);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.contributeLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      error: true,
      message: 'Failed to get current user',
    });
    expect(consoleSpy).toHaveBeenCalledWith('Failed to get current user');
    consoleSpy.mockRestore();
  });

  it('contributes only the lifecycle model itself when there are no local refs to recurse', async () => {
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            json: { id: 'detail-json' },
            json_tg: { submodels: [] },
            state_code: 0,
            rule_verification: true,
            team_id: 'team-1',
          },
        ],
        error: null,
      }),
    );
    mockGetAllRefObj.mockReturnValueOnce([]);

    const result = await lifeCycleModelsApi.contributeLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toEqual({
      success: true,
      needContribute: [
        {
          id: sampleModelId,
          version: sampleVersion,
          type: 'lifeCycleModel data set',
        },
      ],
      contributeResults: [
        {
          success: true,
          data: { success: true },
          id: sampleModelId,
          version: sampleVersion,
          type: 'lifeCycleModel data set',
        },
      ],
    });
    expect(mockContributeSource).toHaveBeenCalledTimes(1);
    expect(mockContributeSource).toHaveBeenCalledWith(
      'lifecyclemodels',
      sampleModelId,
      sampleVersion,
    );
  });

  it('recursively collects local refs, skips duplicates, and preserves contribute failures', async () => {
    const nestedJson = { marker: 'nested-json' };
    mockGetRefTableName.mockImplementation((type: string) => {
      if (type === 'process data set') return 'processes';
      if (type === 'source data set') return 'sources';
      if (type === 'lifeCycleModel data set') return '';
      return '';
    });
    mockFrom.mockReturnValueOnce(
      createQueryBuilder({
        data: [
          {
            json: { id: 'detail-json' },
            json_tg: { submodels: [] },
            state_code: 0,
            rule_verification: true,
            team_id: 'team-1',
          },
        ],
        error: null,
      }),
    );
    mockGetAllRefObj.mockImplementation((value: any) => {
      if (value?.success) {
        return [
          {
            '@refObjectId': 'process-ref-a',
            '@version': sampleVersion,
            '@type': 'process data set',
          },
          {
            '@refObjectId': 'process-ref-a',
            '@version': sampleVersion,
            '@type': 'process data set',
          },
          {
            '@refObjectId': 'source-ref-b',
            '@version': sampleVersion,
            '@type': 'source data set',
          },
          {
            '@refObjectId': 'invalid-ref',
            '@version': sampleVersion,
            '@type': 'unknown data set',
          },
          {
            '@refObjectId': 'error-ref',
            '@version': sampleVersion,
            '@type': 'process data set',
          },
        ];
      }
      if (value === nestedJson) {
        return [
          {
            '@refObjectId': 'source-ref-c',
            '@version': sampleVersion,
            '@type': 'source data set',
          },
        ];
      }
      return [];
    });
    mockGetRefData.mockImplementation(async (id: string) => {
      if (id === 'process-ref-a') {
        return {
          success: true,
          data: {
            stateCode: 10,
            userId: sampleUserId,
            json: null,
          },
        };
      }
      if (id === 'source-ref-b') {
        return {
          success: true,
          data: {
            stateCode: 100,
            userId: sampleUserId,
            json: nestedJson,
          },
        };
      }
      if (id === 'source-ref-c') {
        return {
          success: true,
          data: {
            stateCode: 10,
            userId: sampleUserId,
            json: null,
          },
        };
      }
      if (id === 'error-ref') {
        throw new Error('ref fetch failed');
      }
      return {
        success: false,
        data: null,
      };
    });
    mockContributeSource.mockImplementation(async (tableName: string, id: string) => {
      if (tableName === 'sources' && id === 'source-ref-c') {
        throw new Error('contribute source failed');
      }
      return { success: true, tableName, id };
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await lifeCycleModelsApi.contributeLifeCycleModel(sampleModelId, sampleVersion);

    expect(result).toMatchObject({
      success: true,
      needContribute: [
        expect.objectContaining({ id: 'process-ref-a', type: 'process data set' }),
        expect.objectContaining({ id: 'source-ref-c', type: 'source data set' }),
        expect.objectContaining({ id: sampleModelId, type: 'lifeCycleModel data set' }),
      ],
      contributeResults: [
        expect.objectContaining({
          success: true,
          id: 'process-ref-a',
          type: 'process data set',
        }),
        expect.objectContaining({
          success: false,
          id: 'source-ref-c',
        }),
        expect.objectContaining({
          success: false,
          id: sampleModelId,
          error: 'Invalid table name',
        }),
      ],
    });
    expect(mockContributeSource).toHaveBeenCalledWith('processes', 'process-ref-a', sampleVersion);
    expect(mockContributeSource).toHaveBeenCalledWith('sources', 'source-ref-c', sampleVersion);
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching ref data:', expect.any(Error));
    expect(consoleSpy).toHaveBeenCalledWith('Error contributing data:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
