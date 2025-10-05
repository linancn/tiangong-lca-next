/**
 * Tests for life cycle model service API functions
 * Path: src/services/lifeCycleModels/api.ts
 */

jest.mock('@/pages/LifeCycleModels/lifecyclemodels.json', () => ({}), { virtual: true });

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/services/supabase', () => ({
  __esModule: true,
  supabase: {
    from: (...args: any[]) => mockFrom.apply(null, args),
    auth: {
      getSession: (...args: any[]) => mockAuthGetSession.apply(null, args),
    },
    functions: {
      invoke: (...args: any[]) => mockFunctionsInvoke.apply(null, args),
    },
    rpc: (...args: any[]) => mockRpc.apply(null, args),
  },
}));

const mockGetTeamIdByUserId = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getTeamIdByUserId: (...args: any[]) => mockGetTeamIdByUserId.apply(null, args),
}));

const mockClassificationToString = jest.fn();
const mockGenClassificationZH = jest.fn();
const mockGetLangText = jest.fn();
const mockGetRuleVerification = jest.fn();
const mockJsonToList = jest.fn();

jest.mock('@/services/general/util', () => ({
  __esModule: true,
  classificationToString: (...args: any[]) => mockClassificationToString.apply(null, args),
  genClassificationZH: (...args: any[]) => mockGenClassificationZH.apply(null, args),
  getLangText: (...args: any[]) => mockGetLangText.apply(null, args),
  getRuleVerification: (...args: any[]) => mockGetRuleVerification.apply(null, args),
  jsonToList: (...args: any[]) => mockJsonToList.apply(null, args),
}));

const mockGetILCDClassification = jest.fn();

jest.mock('@/services/ilcd/api', () => ({
  __esModule: true,
  getILCDClassification: (...args: any[]) => mockGetILCDClassification.apply(null, args),
}));

const mockCreateProcess = jest.fn();
const mockDeleteProcess = jest.fn();
const mockGetProcessDetailByIdsAndVersion = jest.fn();
const mockGetProcessesByIdsAndVersions = jest.fn();
const mockUpdateProcess = jest.fn();
const mockValidateProcessesByIdAndVersion = jest.fn();

jest.mock('@/services/processes/api', () => ({
  __esModule: true,
  createProcess: (...args: any[]) => mockCreateProcess.apply(null, args),
  deleteProcess: (...args: any[]) => mockDeleteProcess.apply(null, args),
  getProcessDetailByIdsAndVersion: (...args: any[]) =>
    mockGetProcessDetailByIdsAndVersion.apply(null, args),
  getProcessesByIdsAndVersions: (...args: any[]) =>
    mockGetProcessesByIdsAndVersions.apply(null, args),
  updateProcess: (...args: any[]) => mockUpdateProcess.apply(null, args),
  validateProcessesByIdAndVersion: (...args: any[]) =>
    mockValidateProcessesByIdAndVersion.apply(null, args),
}));

const mockGenProcessName = jest.fn();

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessName: (...args: any[]) => mockGenProcessName.apply(null, args),
}));

const mockGetUserId = jest.fn();

jest.mock('@/services/users/api', () => ({
  __esModule: true,
  getUserId: (...args: any[]) => mockGetUserId.apply(null, args),
}));

const mockGenLifeCycleModelJsonOrdered = jest.fn();

jest.mock('@/services/lifeCycleModels/util', () => ({
  __esModule: true,
  genLifeCycleModelJsonOrdered: (...args: any[]) =>
    mockGenLifeCycleModelJsonOrdered.apply(null, args),
}));

const mockGenLifeCycleModelProcesses = jest.fn();

jest.mock('@/services/lifeCycleModels/util_calculate', () => ({
  __esModule: true,
  genLifeCycleModelProcesses: (...args: any[]) => mockGenLifeCycleModelProcesses.apply(null, args),
}));

const mockControllerAdd = jest.fn();
const mockControllerWaitForAll = jest.fn();

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  ConcurrencyController: jest.fn().mockImplementation(() => ({
    add: (...args: any[]) => mockControllerAdd.apply(null, args),
    waitForAll: (...args: any[]) => mockControllerWaitForAll.apply(null, args),
  })),
}));

import * as lifeCycleModelsApi from '@/services/lifeCycleModels/api';

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return builder;
};

const waitForMicrotasks = async () =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

const sampleModelId = '11111111-1111-1111-1111-111111111111';
const sampleProcessId = '22222222-2222-2222-2222-222222222222';
const sampleVersion = '01.00.000';
const sampleUserId = 'user-0001';

beforeEach(() => {
  jest.clearAllMocks();

  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockFunctionsInvoke.mockReset();
  mockRpc.mockReset();
  mockGetTeamIdByUserId.mockReset();
  mockClassificationToString.mockReset();
  mockGenClassificationZH.mockReset();
  mockGetLangText.mockReset();
  mockGetRuleVerification.mockReset();
  mockJsonToList.mockReset();
  mockGetILCDClassification.mockReset();
  mockCreateProcess.mockReset();
  mockDeleteProcess.mockReset();
  mockGetProcessesByIdsAndVersions.mockReset();
  mockUpdateProcess.mockReset();
  mockValidateProcessesByIdAndVersion.mockReset();
  mockGenProcessName.mockReset();
  mockGetUserId.mockReset();
  mockGenLifeCycleModelJsonOrdered.mockReset();
  mockGenLifeCycleModelProcesses.mockReset();
  mockControllerAdd.mockReset();
  mockControllerWaitForAll.mockReset();

  mockAuthGetSession.mockResolvedValue({
    data: {
      session: {
        user: { id: sampleUserId },
      },
    },
  });
  mockGetTeamIdByUserId.mockResolvedValue('team-default');
  mockClassificationToString.mockReturnValue('classification-string');
  mockGenClassificationZH.mockReturnValue(['classification-zh']);
  mockGetLangText.mockReturnValue('localized-text');
  mockGetRuleVerification.mockReturnValue({ valid: true });
  mockJsonToList.mockImplementation((value: any) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
  mockGetILCDClassification.mockResolvedValue({ data: { dictionary: true } });
  mockCreateProcess.mockResolvedValue(undefined);
  mockDeleteProcess.mockResolvedValue(undefined);
  mockGetProcessesByIdsAndVersions.mockResolvedValue({ data: [] });
  mockUpdateProcess.mockResolvedValue(undefined);
  mockValidateProcessesByIdAndVersion.mockResolvedValue(true);
  mockGenProcessName.mockReturnValue('Life Cycle Model Name');
  mockGetUserId.mockResolvedValue(sampleUserId);
  mockGenLifeCycleModelJsonOrdered.mockReturnValue({ lifeCycleModelDataSet: {} });
  mockGenLifeCycleModelProcesses.mockResolvedValue([]);
  mockControllerWaitForAll.mockResolvedValue(undefined);
});

describe('getLifeCycleModelTableAll', () => {
  it('returns paginated data for english locale with tg data source', async () => {
    const supabaseResult = {
      data: [
        {
          id: sampleModelId,
          name: { en: 'Sample model' },
          'common:class': [{ '#text': 'class-1' }],
          'common:generalComment': { en: 'Comment' },
          version: sampleVersion,
          modified_at: '2023-07-10T12:00:00.000Z',
          team_id: 'team-123',
        },
      ],
      count: 7,
      error: null,
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 2, pageSize: 5 },
      { modified_at: 'ascend' } as Record<string, any>,
      'en',
      'tg',
      'team-123',
    );

    expect(mockFrom).toHaveBeenCalledWith('lifecyclemodels');
    expect(builder.select).toHaveBeenCalled();
    expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(5, 9);
    expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
    expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-123');
    expect(mockJsonToList).toHaveBeenCalledWith(supabaseResult.data[0]['common:class']);
    expect(mockGenProcessName).toHaveBeenCalledWith({ en: 'Sample model' }, 'en');
    expect(mockClassificationToString).toHaveBeenCalledWith(expect.any(Array));

    expect(result).toEqual({
      data: [
        {
          key: sampleModelId,
          id: sampleModelId,
          name: 'Life Cycle Model Name',
          generalComment: 'localized-text',
          classification: 'classification-string',
          version: sampleVersion,
          modifiedAt: new Date('2023-07-10T12:00:00.000Z'),
          teamId: 'team-123',
        },
      ],
      page: 2,
      success: true,
      total: 7,
    });
  });

  it('generates zh locale rows using ILCD classification data', async () => {
    const supabaseResult = {
      data: [
        {
          id: sampleModelId,
          name: { zh: '中文模型' },
          'common:class': [{ '#text': '分类' }],
          'common:generalComment': { zh: '备注' },
          version: sampleVersion,
          modified_at: '2023-08-15T08:30:00.000Z',
          team_id: 'team-zh',
        },
      ],
      count: 1,
      error: null,
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);
    mockGenProcessName.mockReturnValueOnce('中文名称');
    mockGetLangText.mockReturnValueOnce('中文备注');
    mockClassificationToString.mockReturnValueOnce('中文分类');

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {},
      'zh',
      'co',
      '',
    );

    expect(mockGetILCDClassification).toHaveBeenCalledWith('LifeCycleModel', 'zh', ['all']);
    expect(mockGenClassificationZH).toHaveBeenCalledWith(supabaseResult.data[0]['common:class'], {
      dictionary: true,
    });
    expect(mockClassificationToString).toHaveBeenCalledWith(['classification-zh']);
    expect(result.data[0]).toMatchObject({
      id: sampleModelId,
      name: '中文名称',
      generalComment: '中文备注',
      classification: '中文分类',
    });
  });

  it('returns failure result when my data source lacks active session', async () => {
    const builder = createQueryBuilder({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(builder);
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 20 },
      {},
      'en',
      'my',
      '',
      100,
    );

    expect(mockAuthGetSession).toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: false });
  });

  it('returns empty success when team data source has no team id', async () => {
    const builder = createQueryBuilder({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(builder);
    mockGetTeamIdByUserId.mockResolvedValueOnce(null);

    const result = await lifeCycleModelsApi.getLifeCycleModelTableAll(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'te',
      '',
    );

    expect(mockGetTeamIdByUserId).toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: true });
  });
});

describe('getSubmodelsByProcessIds', () => {
  it('returns process to lifecycle model mapping', async () => {
    const supabaseResult = {
      data: [
        {
          id: sampleModelId,
          version: sampleVersion,
          submodels: [{ id: sampleProcessId }, { id: '33333333-3333-3333-3333-333333333333' }],
        },
      ],
      error: null,
    };
    const builder = createQueryBuilder(supabaseResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getSubmodelsByProcessIds([
      sampleProcessId,
      '33333333-3333-3333-3333-333333333333',
    ]);

    expect(mockFrom).toHaveBeenCalledWith('lifecyclemodels');
    expect(builder.select).toHaveBeenCalledWith('id, version, json_tg->submodels');
    expect(builder.or).toHaveBeenCalledWith(
      `json_tg->submodels.cs.[{"id":"${sampleProcessId}"}],json_tg->submodels.cs.[{"id":"33333333-3333-3333-3333-333333333333"}]`,
    );
    expect(result).toEqual({
      error: null,
      data: {
        [sampleProcessId]: `${sampleModelId}_${sampleVersion}`,
        '33333333-3333-3333-3333-333333333333': `${sampleModelId}_${sampleVersion}`,
      },
    });
  });

  it('returns error payload when process id list is empty', async () => {
    const result = await lifeCycleModelsApi.getSubmodelsByProcessIds([]);

    expect(result).toEqual({ error: 'processIds is empty', data: null });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('surfaces supabase errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const builder = createQueryBuilder({ data: null, error: { message: 'select failed' } });
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getSubmodelsByProcessIds([sampleProcessId]);

    expect(result).toEqual({ error: { message: 'select failed' }, data: null });
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching lifecycle models:', {
      message: 'select failed',
    });
    consoleSpy.mockRestore();
  });
});

describe('getLifeCycleModelDetail', () => {
  it('enriches nodes with ownership and related model data when requested', async () => {
    const supabaseResult = {
      data: [
        {
          json: { some: 'json' },
          json_tg: {
            xflow: {
              nodes: [
                {
                  data: { id: sampleProcessId, version: '02.00.000' },
                },
                {
                  data: { id: '44444444-4444-4444-4444-444444444444', version: '03.00.000' },
                },
              ],
            },
          },
          state_code: 100,
          rule_verification: { valid: true },
          team_id: 'team-xyz',
        },
      ],
      error: null,
    };
    const builder = createQueryBuilder(supabaseResult);
    const submodelsBuilder = createQueryBuilder({
      data: [
        {
          id: 'linked-1',
          version: '05.00.000',
          submodels: [{ id: sampleProcessId }],
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValueOnce(builder);
    mockFrom.mockReturnValueOnce(submodelsBuilder);

    mockGetProcessesByIdsAndVersions.mockResolvedValueOnce({
      data: [
        { id: sampleProcessId, version: '02.00.000', user_id: sampleUserId },
        { id: '44444444-4444-4444-4444-444444444444', version: '03.00.000', user_id: 'user-9999' },
      ],
    });

    const result = await lifeCycleModelsApi.getLifeCycleModelDetail(
      sampleModelId,
      sampleVersion,
      true,
    );

    expect(mockFrom).toHaveBeenCalledWith('lifecyclemodels');
    expect(builder.select).toHaveBeenCalledWith(
      'json, json_tg,state_code,rule_verification,team_id',
    );
    expect(builder.eq).toHaveBeenCalledWith('id', sampleModelId);
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(mockGetProcessesByIdsAndVersions).toHaveBeenCalledWith(
      [sampleProcessId, '44444444-4444-4444-4444-444444444444'],
      ['02.00.000', '03.00.000'],
    );
    expect(submodelsBuilder.select).toHaveBeenCalledWith('id, version, json_tg->submodels');
    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error('expected success response');
    }
    const nodes = result.data.json_tg.xflow.nodes;
    expect(nodes[0]).toMatchObject({
      isMyProcess: true,
      modelData: { id: 'linked-1', version: '05.00.000' },
    });
    expect(nodes[1]).toMatchObject({ isMyProcess: false });
  });

  it('returns unsuccessful result when record is not found', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValueOnce(builder);

    const result = await lifeCycleModelsApi.getLifeCycleModelDetail(sampleModelId, sampleVersion);

    expect(result).toEqual({ data: {}, success: false });
  });
});

describe('createLifeCycleModel', () => {
  it('stores lifecycle model payload with derived json and processes', async () => {
    mockGenLifeCycleModelProcesses.mockResolvedValueOnce([
      {
        modelInfo: { id: sampleProcessId },
        data: { processDataSet: { foo: 'bar' } },
      },
    ]);

    const insertResult = {
      data: [{ id: sampleModelId, version: sampleVersion }],
      error: null,
    };
    const selectMock = jest.fn().mockResolvedValue(insertResult);
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const payload = {
      id: sampleModelId,
      model: {
        nodes: [{ data: { id: sampleProcessId, quantitativeReference: '1', targetAmount: 10 } }],
        edges: [],
      },
    };

    const result = await lifeCycleModelsApi.createLifeCycleModel(payload);
    await waitForMicrotasks();

    expect(mockGenLifeCycleModelJsonOrdered).toHaveBeenCalledWith(sampleModelId, payload);
    expect(mockGenLifeCycleModelProcesses).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([
      {
        id: sampleModelId,
        json_ordered: { lifeCycleModelDataSet: {} },
        json_tg: {
          xflow: payload.model,
          submodels: [{ id: sampleProcessId }],
        },
        rule_verification: true,
      },
    ]);
    expect(selectMock).toHaveBeenCalled();
    expect(mockCreateProcess).toHaveBeenCalledWith(sampleProcessId, { foo: 'bar' });
    expect(result).toBe(insertResult);
  });

  test.failing('passes reference target amount when generating processes', async () => {
    const insertResult = { data: [], error: null };
    const selectMock = jest.fn().mockResolvedValue(insertResult);
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const payload = {
      id: sampleModelId,
      model: {
        nodes: [
          {
            data: {
              id: sampleProcessId,
              quantitativeReference: '1',
              targetAmount: 42,
            },
          },
        ],
        edges: [],
      },
    };

    await lifeCycleModelsApi.createLifeCycleModel(payload);

    expect(mockGenLifeCycleModelProcesses).toHaveBeenCalledWith(
      sampleModelId,
      42,
      expect.anything(),
      [],
    );
  });
});
