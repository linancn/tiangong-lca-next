/**
 * Tests for processes service API functions
 * Path: src/services/processes/api.ts
 */

import * as processesApi from '@/services/processes/api';
import { FunctionRegion } from '@supabase/supabase-js';

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
const mockGetRefData = jest.fn();
const mockContributeSource = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getTeamIdByUserId: (...args: any[]) => mockGetTeamIdByUserId.apply(null, args),
  getRefData: (...args: any[]) => mockGetRefData.apply(null, args),
  contributeSource: (...args: any[]) => mockContributeSource.apply(null, args),
}));

const mockGetILCDLocationByValues = jest.fn();
const mockGetILCDClassification = jest.fn();

jest.mock('@/services/ilcd/api', () => ({
  __esModule: true,
  getILCDLocationByValues: (...args: any[]) => mockGetILCDLocationByValues.apply(null, args),
  getILCDClassification: (...args: any[]) => mockGetILCDClassification.apply(null, args),
}));

const mockGetLifeCyclesByIds = jest.fn();
const mockGetSubmodelsByProcessIds = jest.fn();

jest.mock('@/services/lifeCycleModels/api', () => ({
  __esModule: true,
  getLifeCyclesByIds: (...args: any[]) => mockGetLifeCyclesByIds.apply(null, args),
  getSubmodelsByProcessIds: (...args: any[]) => mockGetSubmodelsByProcessIds.apply(null, args),
}));

const mockGenProcessJsonOrdered = jest.fn();
const mockGenProcessName = jest.fn();

jest.mock('@/services/processes/util', () => ({
  __esModule: true,
  genProcessJsonOrdered: (...args: any[]) => mockGenProcessJsonOrdered.apply(null, args),
  genProcessName: (...args: any[]) => mockGenProcessName.apply(null, args),
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

const mockGetCurrentUser = jest.fn();

jest.mock('@/services/auth', () => ({
  __esModule: true,
  getCurrentUser: (...args: any[]) => mockGetCurrentUser.apply(null, args),
}));

const mockGetAllRefObj = jest.fn();
const mockGetRefTableName = jest.fn();

jest.mock('@/pages/Utils/review', () => ({
  __esModule: true,
  getAllRefObj: (...args: any[]) => mockGetAllRefObj.apply(null, args),
  getRefTableName: (...args: any[]) => mockGetRefTableName.apply(null, args),
}));

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return builder;
};

const sampleId = '12345678-1234-1234-1234-123456789012';
const sampleVersion = '01.00.000';

beforeEach(() => {
  mockFrom.mockReset();
  mockAuthGetSession.mockReset();
  mockFunctionsInvoke.mockReset();
  mockRpc.mockReset();
  mockGetTeamIdByUserId.mockReset();
  mockGetILCDLocationByValues.mockReset();
  mockGetILCDClassification.mockReset();
  mockGetLifeCyclesByIds.mockReset();
  mockGetSubmodelsByProcessIds.mockReset();
  mockGenProcessJsonOrdered.mockReset();
  mockGenProcessName.mockReset();
  mockClassificationToString.mockReset();
  mockGenClassificationZH.mockReset();
  mockGetLangText.mockReset();
  mockGetRuleVerification.mockReset();
  mockJsonToList.mockReset();

  mockGenProcessJsonOrdered.mockReturnValue({ ordered: true });
  mockGenProcessName.mockReturnValue('Process Name');
  mockClassificationToString.mockReturnValue('classification-string');
  mockGenClassificationZH.mockReturnValue(['classification-zh']);
  mockGetLangText.mockReturnValue('General comment');
  mockGetRuleVerification.mockReturnValue({ valid: true });
  mockJsonToList.mockImplementation((value: any) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
  mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
  mockGetILCDClassification.mockResolvedValue({ data: {} });
  mockGetSubmodelsByProcessIds.mockResolvedValue({ data: {} });
  mockGetLifeCyclesByIds.mockResolvedValue({ data: [] });
});

describe('createProcess', () => {
  it('inserts ordered payload with rule verification flag', async () => {
    const insertResult = { data: [{ id: sampleId, version: sampleVersion }], error: null };
    const selectMock = jest.fn().mockResolvedValue(insertResult);
    const insertMock = jest.fn().mockReturnValue({ select: selectMock });
    mockFrom.mockReturnValueOnce({ insert: insertMock });

    const result = await processesApi.createProcess(sampleId, { raw: true });

    expect(mockGenProcessJsonOrdered).toHaveBeenCalledWith(sampleId, { raw: true });
    expect(mockGetRuleVerification).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalledWith([
      {
        id: sampleId,
        json_ordered: { ordered: true },
        rule_verification: true,
      },
    ]);
    expect(selectMock).toHaveBeenCalled();
    expect(result).toBe(insertResult);
  });
});

describe('updateProcess', () => {
  it('invokes update function with ordered payload when session exists', async () => {
    mockGetRuleVerification.mockReturnValueOnce({ valid: false });
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
        },
      },
    });
    const invokeResult = { data: { data: [{ id: sampleId }] }, error: null };
    mockFunctionsInvoke.mockResolvedValueOnce(invokeResult);

    const result = await processesApi.updateProcess(sampleId, sampleVersion, { some: 'data' });

    expect(mockGenProcessJsonOrdered).toHaveBeenCalledWith(sampleId, { some: 'data' });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer access-token' },
      body: {
        id: sampleId,
        version: sampleVersion,
        table: 'processes',
        data: {
          json_ordered: { ordered: true },
          rule_verification: false,
        },
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual(invokeResult.data);
  });

  it('returns undefined when no active session is available', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await processesApi.updateProcess(sampleId, sampleVersion, { some: 'data' });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('returns structured error when invocation fails', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'access-token',
        },
      },
    });
    const failure = { error: { message: 'update failed' }, data: null };
    mockFunctionsInvoke.mockResolvedValueOnce(failure);

    const result = await processesApi.updateProcess(sampleId, sampleVersion, { some: 'data' });

    expect(result).toEqual({ error: failure.error });
  });
});

describe('updateProcessApi', () => {
  it('invokes update function with provided data payload', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'token-abc',
        },
      },
    });
    const invokeResult = { data: { updated: true } };
    mockFunctionsInvoke.mockResolvedValueOnce(invokeResult);

    const payload = { json_ordered: { foo: 'bar' } };
    const result = await processesApi.updateProcessApi(sampleId, sampleVersion, payload);

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer token-abc' },
      body: {
        id: sampleId,
        version: sampleVersion,
        table: 'processes',
        data: payload,
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual({ updated: true });
  });
});

describe('deleteProcess', () => {
  it('deletes process by id and version', async () => {
    const deleteResult = { data: [{ id: sampleId }], error: null };
    const deleteBuilder: any = createQueryBuilder(deleteResult);
    mockFrom.mockReturnValueOnce({ delete: jest.fn().mockReturnValue(deleteBuilder) });

    const result = await processesApi.deleteProcess(sampleId, sampleVersion);

    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(1, 'id', sampleId);
    expect(deleteBuilder.eq).toHaveBeenNthCalledWith(2, 'version', sampleVersion);
    expect(result).toEqual(deleteResult);
  });
});

describe('getProcessDetail', () => {
  it('returns process detail for explicit version', async () => {
    const selectResult = {
      data: [
        {
          json: { foo: 'bar' },
          version: sampleVersion,
          modified_at: '2024-01-01T00:00:00Z',
          state_code: 100,
          rule_verification: 'ok',
          team_id: 'team-1',
          reviews: [{ id: 'review-1' }],
        },
      ],
    };
    const builder = createQueryBuilder(selectResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await processesApi.getProcessDetail(sampleId, sampleVersion);

    expect(builder.select).toHaveBeenCalledWith(
      'json,version, modified_at,state_code,rule_verification,team_id,reviews',
    );
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'id', sampleId);
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'version', sampleVersion);
    expect(result).toEqual({
      data: {
        id: sampleId,
        version: sampleVersion,
        json: { foo: 'bar' },
        modifiedAt: '2024-01-01T00:00:00Z',
        stateCode: 100,
        ruleVerification: 'ok',
        teamId: 'team-1',
        reviews: [{ id: 'review-1' }],
      },
      success: true,
    });
  });

  it('falls back to latest version when version format is invalid', async () => {
    const selectResult = {
      data: [
        {
          json: { foo: 'baz' },
          version: '02.00.000',
          modified_at: '2024-02-01T00:00:00Z',
          state_code: 200,
          rule_verification: 'pending',
          team_id: 'team-2',
          reviews: [],
        },
      ],
    };
    const builder = createQueryBuilder(selectResult);
    mockFrom.mockReturnValueOnce(builder);

    const result = await processesApi.getProcessDetail(sampleId, 'latest');

    expect(builder.eq).toHaveBeenCalledWith('id', sampleId);
    expect(builder.order).toHaveBeenCalledWith('version', { ascending: false });
    expect(builder.range).toHaveBeenCalledWith(0, 0);
    expect(result).toEqual({
      data: {
        id: sampleId,
        version: '02.00.000',
        json: { foo: 'baz' },
        modifiedAt: '2024-02-01T00:00:00Z',
        stateCode: 200,
        ruleVerification: 'pending',
        teamId: 'team-2',
        reviews: [],
      },
      success: true,
    });
  });
});

describe('getProcessTableAll', () => {
  it('transforms records with location and classification mapping', async () => {
    const queryResult = {
      data: [
        {
          id: sampleId,
          version: sampleVersion,
          modified_at: '2024-03-01T12:00:00Z',
          team_id: 'team-123',
          name: { en: 'Raw name' },
          'common:class': { '#text': 'class-1' },
          'common:generalComment': { en: 'comment' },
          typeOfDataSet: 'type-1',
          'common:referenceYear': '2023',
          '@location': 'CN',
        },
      ],
      count: 1,
    };
    const builder = createQueryBuilder(queryResult);
    mockFrom.mockReturnValueOnce(builder);

    mockGetILCDLocationByValues.mockResolvedValueOnce({
      data: [{ '@value': 'CN', '#text': 'China' }],
    });
    mockGetSubmodelsByProcessIds.mockResolvedValueOnce({
      data: { [sampleId]: 'model-9_01.00.000' },
    });

    const result = await processesApi.getProcessTableAll(
      { current: 2, pageSize: 5 },
      { modified_at: 'ascend' },
      'en',
      'tg',
      'team-filter',
      'all',
      'all',
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(builder.select).toHaveBeenCalled();
    expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: true });
    expect(builder.range).toHaveBeenCalledWith(5, 9);
    expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
    expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-filter');
    expect(mockGetILCDLocationByValues).toHaveBeenCalledWith('en', ['CN']);
    expect(mockJsonToList).toHaveBeenCalledWith({ '#text': 'class-1' });
    expect(mockClassificationToString).toHaveBeenCalled();
    expect(mockGenProcessName).toHaveBeenCalledWith({ en: 'Raw name' }, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith({ en: 'comment' }, 'en');
    expect(result).toEqual({
      data: [
        {
          key: `${sampleId}:${sampleVersion}`,
          id: sampleId,
          version: sampleVersion,
          lang: 'en',
          name: 'Process Name',
          generalComment: 'General comment',
          classification: 'classification-string',
          typeOfDataSet: 'type-1',
          referenceYear: '2023',
          location: 'China',
          modifiedAt: new Date('2024-03-01T12:00:00Z'),
          teamId: 'team-123',
          modelData: {
            id: 'model-9',
            version: '01.00.000',
          },
        },
      ],
      page: 2,
      success: true,
      total: 1,
    });
  });

  it('returns failure when personal data has no active session', async () => {
    const builder = createQueryBuilder({ data: [], count: 0 });
    mockFrom.mockReturnValueOnce(builder);
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await processesApi.getProcessTableAll(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'my',
      [],
      100,
      'all',
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(result).toEqual({ data: [], success: false });
  });
});

describe('getProcessExchange', () => {
  it('filters exchanges by direction and paginates result', async () => {
    const exchanges = [
      { id: 1, exchangeDirection: 'INPUT' },
      { id: 2, exchangeDirection: 'OUTPUT' },
      { id: 3, exchangeDirection: 'input' },
    ];

    const result = await processesApi.getProcessExchange(exchanges, 'input', {
      current: 1,
      pageSize: 1,
    });

    expect(result).toEqual({
      data: [{ id: 1, exchangeDirection: 'INPUT' }],
      page: 1,
      success: true,
      total: 2,
    });
  });
});

describe('process_hybrid_search', () => {
  it('maps hybrid search responses to table rows', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: 'token-xyz',
        },
      },
    });
    const hybridData: any = [
      {
        id: sampleId,
        version: sampleVersion,
        modified_at: '2024-04-01T00:00:00Z',
        team_id: 'team-456',
        json: {
          processDataSet: {
            processInformation: {
              dataSetInformation: {
                name: { en: 'Hybrid name' },
                'common:generalComment': { en: 'hybrid comment' },
                classificationInformation: {
                  'common:classification': {
                    'common:class': { '#text': 'class-h' },
                  },
                },
              },
              time: {
                'common:referenceYear': '2022',
              },
              geography: {
                locationOfOperationSupplyOrProduction: {
                  '@location': 'US',
                },
              },
            },
            modellingAndValidation: {
              LCIMethodAndAllocation: {
                typeOfDataSet: 'type-h',
              },
            },
          },
        },
      },
    ];
    (hybridData as any).total_count = 42;
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { data: hybridData }, error: null });
    mockGetILCDLocationByValues.mockResolvedValueOnce({
      data: [{ '@value': 'US', '#text': 'United States' }],
    });

    const result = await processesApi.process_hybrid_search(
      { current: 3, pageSize: 5 },
      'en',
      'tg',
      'steel',
      {},
      undefined,
      'all',
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('process_hybrid_search', {
      headers: { Authorization: 'Bearer token-xyz' },
      body: { query: 'steel', filter: {} },
      region: FunctionRegion.UsEast1,
    });
    expect(mockJsonToList).toHaveBeenCalledWith({ '#text': 'class-h' });
    expect(mockGenProcessName).toHaveBeenCalledWith({ en: 'Hybrid name' }, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith({ en: 'hybrid comment' }, 'en');
    expect(result).toEqual({
      data: [
        {
          key: `${sampleId}:${sampleVersion}`,
          id: sampleId,
          name: 'Process Name',
          generalComment: 'General comment',
          classification: 'classification-string',
          referenceYear: '2022',
          location: 'United States',
          version: sampleVersion,
          typeOfDataSet: 'type-h',
          modifiedAt: new Date('2024-04-01T00:00:00Z'),
          teamId: 'team-456',
        },
      ],
      page: 3,
      success: true,
      total: 42,
    });
  });
});

describe('getProcessDetailByIdAndVersion', () => {
  it('should fetch process detail by id and version successfully', async () => {
    const mockData = [
      {
        id: sampleId,
        version: sampleVersion,
        json: {
          processInformation: { dataSetInformation: { name: { baseName: { '#text': 'Test' } } } },
        },
      },
    ];
    const builder = createQueryBuilder({ data: mockData, error: null });
    mockFrom.mockReturnValue(builder);
    mockGetLangText.mockReturnValue('Test Process');

    const result = await processesApi.getProcessDetailByIdAndVersion([
      { id: sampleId, version: sampleVersion },
    ]);

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(builder.select).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should return error when process not found', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'Not found' } });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessDetailByIdAndVersion([
      { id: sampleId, version: sampleVersion },
    ]);

    expect(result).toBeDefined();
  });

  it('should return error when data is empty array', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessDetailByIdAndVersion([
      { id: sampleId, version: sampleVersion },
    ]);

    expect(result).toBeDefined();
  });
});

describe('getProcessesByIdsAndVersions', () => {
  it('should fetch multiple processes by ids and versions', async () => {
    const mockData = [
      { id: sampleId, version: sampleVersion, json: { name: 'Process 1' } },
      { id: 'id2', version: 'v2', json: { name: 'Process 2' } },
    ];
    const builder = createQueryBuilder({ data: mockData, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessesByIdsAndVersions(
      [sampleId, 'id2'],
      [sampleVersion, 'v2'],
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(result).toEqual({ data: mockData, error: null });
  });

  it('should return empty array when no ids provided', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessesByIdsAndVersions([], []);

    expect(result).toEqual({ data: [], error: null });
  });
});

describe('getProcessDetailByIdsAndVersion', () => {
  it('should fetch processes by multiple ids and single version successfully', async () => {
    const mockData = [
      {
        id: sampleId,
        version: sampleVersion,
        json: { name: 'Process 1' },
        modified_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'id2',
        version: sampleVersion,
        json: { name: 'Process 2' },
        modified_at: '2024-01-02T00:00:00Z',
      },
    ];
    const builder = createQueryBuilder({ data: mockData, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessDetailByIdsAndVersion(
      [sampleId, 'id2'],
      sampleVersion,
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(builder.select).toHaveBeenCalledWith('id,json,version, modified_at');
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(builder.in).toHaveBeenCalledWith('id', [sampleId, 'id2']);
    expect(result).toEqual({
      data: mockData,
      success: true,
    });
  });

  it('should return empty array when no ids provided', async () => {
    const result = await processesApi.getProcessDetailByIdsAndVersion([], sampleVersion);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [],
      success: true,
    });
  });

  it('should handle database errors gracefully', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessDetailByIdsAndVersion([sampleId], sampleVersion);

    expect(result).toEqual({
      data: [],
      success: true,
    });
  });
});

describe('getProcessesByIdsAndVersion', () => {
  it('should fetch and format processes by ids and version with language', async () => {
    const mockRawData = [
      {
        id: sampleId,
        version: sampleVersion,
        name: [
          { '@xml:lang': 'en', '#text': 'Process 1 EN' },
          { '@xml:lang': 'zh', '#text': '过程 1' },
        ],
        'common:generalComment': [
          { '@xml:lang': 'en', '#text': 'Comment EN' },
          { '@xml:lang': 'zh', '#text': '注释' },
        ],
        typeOfDataSet: 'Unit process, black box',
        'common:referenceYear': '2024',
        '@location': 'CN',
        modified_at: '2024-01-01T00:00:00Z',
        team_id: 'team-123',
      },
    ];
    const builder = createQueryBuilder({ data: mockRawData, error: null });
    mockFrom.mockReturnValue(builder);
    mockGenProcessName.mockReturnValueOnce('Process 1 EN');
    mockGetLangText.mockReturnValueOnce('Comment EN');

    const result = await processesApi.getProcessesByIdsAndVersion([sampleId], sampleVersion, 'en');

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(builder.eq).toHaveBeenCalledWith('version', sampleVersion);
    expect(builder.in).toHaveBeenCalledWith('id', [sampleId]);
    expect(mockGenProcessName).toHaveBeenCalledWith(mockRawData[0].name, 'en');
    expect(mockGetLangText).toHaveBeenCalledWith(mockRawData[0]['common:generalComment'], 'en');
    expect(result.success).toBe(true);
    expect(result.page).toBe(1);
    expect(result.total).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe(sampleId);
    expect(result.data[0].version).toBe(sampleVersion);
    expect(result.data[0].name).toBe('Process 1 EN');
  });

  it('should handle missing optional fields with default values', async () => {
    const mockRawData = [
      {
        id: sampleId,
        version: sampleVersion,
        name: {},
        modified_at: '2024-01-01T00:00:00Z',
      },
    ];
    const builder = createQueryBuilder({ data: mockRawData, error: null });
    mockFrom.mockReturnValue(builder);
    mockGenProcessName.mockReturnValueOnce('');
    mockGetLangText.mockReturnValueOnce('');

    const result = await processesApi.getProcessesByIdsAndVersion([sampleId], sampleVersion, 'zh');

    expect(result.data[0].typeOfDataSet).toBe('-');
    expect(result.data[0].referenceYear).toBe('-');
  });

  it('should handle database errors and return empty result', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessesByIdsAndVersion([sampleId], sampleVersion, 'en');

    expect(result.success).toBe(true);
    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });

  it('should handle empty ids array', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.getProcessesByIdsAndVersion([], sampleVersion, 'en');

    expect(result.success).toBe(true);
    expect(result.page).toBe(1);
    expect(result.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});

describe('validateProcessesByIdAndVersion', () => {
  it('should return true when process exists', async () => {
    const mockData = [{ id: sampleId, version: sampleVersion }];
    const builder = createQueryBuilder({ data: mockData, error: null });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.validateProcessesByIdAndVersion(sampleId, sampleVersion);

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(result).toBe(true);
  });

  it('should return false when process is missing', async () => {
    const builder = createQueryBuilder({ data: [], error: null });
    const builder2 = createQueryBuilder({ data: [], error: null });
    mockFrom.mockReturnValueOnce(builder).mockReturnValueOnce(builder2);

    const result = await processesApi.validateProcessesByIdAndVersion(sampleId, sampleVersion);

    expect(result).toBeDefined();
  });

  it('should handle database error', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'DB error' } });
    mockFrom.mockReturnValue(builder);

    const result = await processesApi.validateProcessesByIdAndVersion(sampleId, sampleVersion);

    expect(result).toBeDefined();
  });
});

describe('getConnectableProcessesTable', () => {
  it('should fetch connectable processes successfully', async () => {
    const mockData = [
      {
        id: sampleId,
        name: 'Process 1',
        version: sampleVersion,
        exchange: [
          {
            exchangeDirection: 'output',
            referenceToFlowDataSet: { '@refObjectId': 'flow123' },
          },
        ],
      },
    ];
    const builder = createQueryBuilder({ data: mockData, error: null, count: 10 });
    mockFrom.mockReturnValue(builder);
    mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
    mockGetILCDClassification.mockResolvedValue({ data: [] });
    mockJsonToList.mockReturnValue([]);

    const result = await processesApi.getConnectableProcessesTable(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'tg',
      [],
      'flow123',
      '1.0.0',
    );

    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(result).toBeDefined();
  });

  it('should handle my dataSource type', async () => {
    const mockData = [
      {
        id: sampleId,
        name: 'My Process',
        version: sampleVersion,
        team_id: 'team1',
        user_id: 'user1',
        exchange: [
          {
            exchangeDirection: 'input',
            referenceToFlowDataSet: { '@refObjectId': 'flow456' },
          },
        ],
      },
    ];
    const builder = createQueryBuilder({ data: mockData, error: null, count: 1 });
    mockFrom.mockReturnValue(builder);
    mockAuthGetSession.mockResolvedValue({ data: { session: { user: { id: 'user1' } } } });
    mockGetTeamIdByUserId.mockResolvedValue('team1');
    mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
    mockGetILCDClassification.mockResolvedValue({ data: [] });
    mockJsonToList.mockReturnValue([]);

    const result = await processesApi.getConnectableProcessesTable(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'my',
      [],
      'flow456',
      '2.0.0',
    );

    expect(mockAuthGetSession).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should return empty data on database error', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'DB error' }, count: null });
    mockFrom.mockReturnValue(builder);
    mockGetILCDLocationByValues.mockResolvedValue({ data: [] });

    const result = await processesApi.getConnectableProcessesTable(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'tg',
      [],
      'port789',
      '3.0.0',
    );

    expect(result.data).toEqual([]);
  });
});

describe('getProcessTablePgroongaSearch', () => {
  it('should search processes using pgroonga successfully', async () => {
    const mockResponse = {
      data: [{ id: sampleId, name: 'Search Result', version: sampleVersion }],
      error: null,
      count: 1,
    };
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token-xyz' } } });
    mockRpc.mockResolvedValue(mockResponse);
    mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
    mockGetILCDClassification.mockResolvedValue({ data: [] });
    mockJsonToList.mockReturnValue([]);

    const result = await processesApi.getProcessTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'search term',
      [],
      100,
      'all',
    );

    expect(mockRpc).toHaveBeenCalledWith(
      'pgroonga_search_processes',
      expect.objectContaining({
        query_text: 'search term',
      }),
    );
    expect(result).toBeDefined();
  });

  it('should handle empty search results', async () => {
    const mockResponse = {
      data: [],
      error: null,
      count: 0,
    };
    mockAuthGetSession.mockResolvedValue({ data: { session: { access_token: 'token-xyz' } } });
    mockRpc.mockResolvedValue(mockResponse);
    mockGetILCDLocationByValues.mockResolvedValue({ data: [] });
    mockGetILCDClassification.mockResolvedValue({ data: [] });

    const result = await processesApi.getProcessTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'nonexistent',
      [],
      100,
      'all',
    );

    expect(result).toBeDefined();
  });
});

describe('contributeProcess', () => {
  const testId = 'process-123';
  const testVersion = '01.00.000';
  const testUserId = 'user-456';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully contribute process with all reference data', async () => {
    // Arrange - Mock current user
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    // Mock process detail with references
    const mockProcessDetail = {
      processInformation: {
        dataSetInformation: {
          referenceToContact: [
            {
              '@refObjectId': 'contact-1',
              '@version': '01.00.000',
              '@type': 'contact data set',
            },
          ],
        },
      },
    };

    // Mock getProcessDetailByIdAndVersion response (returns {data: [...], success: true})
    const mockBuilder = createQueryBuilder({
      data: [{ json: mockProcessDetail }],
      error: null,
    });
    mockFrom.mockReturnValue(mockBuilder);

    // Mock getAllRefObj to return references
    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
      {
        '@refObjectId': 'source-1',
        '@version': '01.00.000',
        '@type': 'source data set',
      },
    ]);

    // Mock getRefTableName
    // Called during ref processing phase (2 times) and contribution phase (3 times)
    mockGetRefTableName
      .mockReturnValueOnce('contacts') // For contact ref processing
      .mockReturnValueOnce('sources') // For source ref processing
      .mockReturnValueOnce('contacts') // For contact contribution
      .mockReturnValueOnce('sources') // For source contribution
      .mockReturnValueOnce('processes'); // For process contribution

    // Mock getRefData for references
    mockGetRefData
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'contact-1',
          version: '01.00.000',
          stateCode: 10,
          userId: testUserId,
          json: {}, // Empty json means no nested refs
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'source-1',
          version: '01.00.000',
          stateCode: 20,
          userId: testUserId,
          json: {}, // Empty json means no nested refs
        },
      });

    // Mock getAllRefObj for nested calls (should return empty for no nested refs)
    mockGetAllRefObj
      .mockReturnValueOnce([
        {
          '@refObjectId': 'contact-1',
          '@version': '01.00.000',
          '@type': 'contact data set',
        },
        {
          '@refObjectId': 'source-1',
          '@version': '01.00.000',
          '@type': 'source data set',
        },
      ])
      .mockReturnValue([]); // No nested refs in subsequent calls

    // Mock contributeSource
    mockContributeSource
      .mockResolvedValueOnce({ success: true, message: 'Contact contributed' })
      .mockResolvedValueOnce({ success: true, message: 'Source contributed' })
      .mockResolvedValueOnce({ success: true, message: 'Process contributed' });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalledWith('processes');
    expect(mockGetRefData).toHaveBeenCalledTimes(2);
    expect(mockGetRefData).toHaveBeenCalledWith('contact-1', '01.00.000', 'contacts');
    expect(mockGetRefData).toHaveBeenCalledWith('source-1', '01.00.000', 'sources');
    expect(mockContributeSource).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
    expect(result.needContribute).toHaveLength(3);
    expect(result.contributeResults).toHaveLength(3);
  });

  it('should handle missing current user', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(null);

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.error).toBe(true);
    expect(result.message).toBe('Failed to get current user');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should handle user without userid', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: undefined });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.error).toBe(true);
    expect(result.message).toBe('Failed to get current user');
  });

  it('should skip references that are already public (stateCode 100)', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {
      processInformation: {
        dataSetInformation: {
          referenceToContact: [
            {
              '@refObjectId': 'contact-1',
              '@version': '01.00.000',
              '@type': 'contact data set',
            },
          ],
        },
      },
    };

    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    // Mock reference with stateCode 100 (public)
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-1',
        version: '01.00.000',
        stateCode: 100,
        userId: testUserId,
        json: {},
      },
    });

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.success).toBe(true);
    // Only the process itself should be contributed, not the already-public reference
    expect(result.needContribute).toBeDefined();
    expect(result.needContribute).toHaveLength(1);
    expect(result.needContribute![0].type).toBe('process data set');
  });

  it('should skip references that are team data (stateCode 200)', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    // Mock reference with stateCode 200 (team data)
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-1',
        version: '01.00.000',
        stateCode: 200,
        userId: testUserId,
        json: {},
      },
    });

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.needContribute).toBeDefined();
    expect(result.needContribute).toHaveLength(1);
    expect(result.needContribute![0].type).toBe('process data set');
  });

  it('should skip references owned by other users', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    // Mock reference owned by different user
    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-1',
        version: '01.00.000',
        stateCode: 10,
        userId: 'other-user',
        json: {},
      },
    });

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.needContribute).toBeDefined();
    expect(result.needContribute).toHaveLength(1);
    expect(result.needContribute![0].type).toBe('process data set');
  });

  it('should recursively process nested references', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    // First level reference
    mockGetAllRefObj
      .mockReturnValueOnce([
        {
          '@refObjectId': 'contact-1',
          '@version': '01.00.000',
          '@type': 'contact data set',
        },
      ])
      .mockReturnValueOnce([
        // Second level reference (nested in contact)
        {
          '@refObjectId': 'source-1',
          '@version': '01.00.000',
          '@type': 'source data set',
        },
      ])
      .mockReturnValueOnce([]); // No more nested refs

    mockGetRefTableName
      .mockReturnValueOnce('contacts')
      .mockReturnValueOnce('sources')
      .mockReturnValueOnce('processes');

    // Contact with nested source reference
    mockGetRefData
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'contact-1',
          version: '01.00.000',
          stateCode: 10,
          userId: testUserId,
          json: {
            referenceToSource: {
              '@refObjectId': 'source-1',
              '@version': '01.00.000',
              '@type': 'source data set',
            },
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 'source-1',
          version: '01.00.000',
          stateCode: 20,
          userId: testUserId,
          json: {},
        },
      });

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(mockGetRefData).toHaveBeenCalledTimes(2);
    expect(result.needContribute).toBeDefined();
    expect(result.needContribute).toHaveLength(3); // contact + source + process
    expect(result.needContribute!.some((item: any) => item.id === 'contact-1')).toBe(true);
    expect(result.needContribute!.some((item: any) => item.id === 'source-1')).toBe(true);
  });

  it('should handle duplicate references (deduplication)', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    // Return same reference twice
    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-1',
        version: '01.00.000',
        stateCode: 10,
        userId: testUserId,
        json: {},
      },
    });

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    // Should only fetch reference data once (deduplicated)
    expect(mockGetRefData).toHaveBeenCalledTimes(1);
    expect(result.needContribute).toHaveLength(2); // contact + process (no duplicates)
  });

  it('should handle invalid table name', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [{ json: mockProcessDetail }], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'unknown-1',
        '@version': '01.00.000',
        '@type': 'unknown type',
      },
    ]);

    // Return null for unknown type (skips getRefData)
    // Then return 'processes' for the process contribution
    mockGetRefTableName.mockReturnValueOnce(null);
    mockGetRefTableName.mockReturnValueOnce('processes');

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    // getRefData should not be called because tableName is null for unknown type
    expect(mockGetRefData).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.needContribute).toHaveLength(1); // Only process (unknown type was skipped)
  });

  it('should handle getRefData error gracefully', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    // Mock getRefData to throw error
    mockGetRefData.mockRejectedValue(new Error('Network error'));

    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.success).toBe(true);
    // Should continue and only contribute the process itself
    expect(result.needContribute).toHaveLength(1);
  });

  it('should handle contributeSource error', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([
      {
        '@refObjectId': 'contact-1',
        '@version': '01.00.000',
        '@type': 'contact data set',
      },
    ]);

    mockGetRefTableName.mockReturnValue('contacts').mockReturnValue('processes');

    mockGetRefData.mockResolvedValue({
      success: true,
      data: {
        id: 'contact-1',
        version: '01.00.000',
        stateCode: 10,
        userId: testUserId,
        json: {},
      },
    });

    // Mock contributeSource to fail for one item
    mockContributeSource
      .mockRejectedValueOnce(new Error('Contribution failed'))
      .mockResolvedValueOnce({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contributeResults).toBeDefined();
    expect(result.contributeResults).toHaveLength(2);
    expect(result.contributeResults![0].success).toBe(false);
    expect(result.contributeResults![0].error).toBeDefined();
    expect(result.contributeResults![1].success).toBe(true);
  });

  it('should handle invalid table name during contribution', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([]);

    // Return null for process type (edge case)
    mockGetRefTableName.mockReturnValue(null);

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(result.success).toBe(true);
    expect(result.contributeResults).toBeDefined();
    expect(result.contributeResults).toHaveLength(1);
    expect(result.contributeResults![0].success).toBe(false);
    expect(result.contributeResults![0].error).toBe('Invalid table name');
  });

  it('should handle empty reference list', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue({ userid: testUserId });

    const mockProcessDetail = {};
    const mockBuilder = createQueryBuilder({ data: [mockProcessDetail], error: null });
    mockFrom.mockReturnValue(mockBuilder);

    mockGetAllRefObj.mockReturnValue([]);
    mockGetRefTableName.mockReturnValue('processes');
    mockContributeSource.mockResolvedValue({ success: true });

    // Act
    const result = await processesApi.contributeProcess(testId, testVersion);

    // Assert
    expect(mockGetRefData).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.needContribute).toBeDefined();
    expect(result.needContribute).toHaveLength(1); // Only the process itself
    expect(result.needContribute![0].id).toBe(testId);
    expect(result.needContribute![0].version).toBe(testVersion);
    expect(result.needContribute![0].type).toBe('process data set');
  });
});
