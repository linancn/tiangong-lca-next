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

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    waitForAll: jest.fn().mockResolvedValue(undefined),
  })),
  getAllRefObj: (...args: any[]) => mockGetAllRefObj(...args),
  getRefTableName: (...args: any[]) => mockGetRefTableName(...args),
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
});

describe('updateLifeCycleModel', () => {
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
});

describe('updateLifeCycleModelJsonApi', () => {
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
});

describe('getLifeCyclesByIdAndVersion', () => {
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
