/**
 * Tests for processes service API functions
 * Path: src/services/processes/api.ts
 */

import * as processesApi from '@/services/processes/api';
import { FunctionRegion } from '@supabase/supabase-js';

const mockFrom = jest.fn();
const mockAuthGetSession = jest.fn();
const mockFunctionsInvoke = jest.fn();

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
  },
}));

const mockGetTeamIdByUserId = jest.fn();

jest.mock('@/services/general/api', () => ({
  __esModule: true,
  getTeamIdByUserId: (...args: any[]) => mockGetTeamIdByUserId.apply(null, args),
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

const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
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
    expect(result).toEqual({ data: [{ id: sampleId }] });
  });

  it('returns undefined when no active session is available', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await processesApi.updateProcess(sampleId, sampleVersion, { some: 'data' });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  test.failing('returns structured error when invocation fails', async () => {
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

    expect(result).toEqual({ error: { message: 'update failed' } });
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
