/**
 * Tests for flow service API functions
 * Path: src/services/flows/api.ts
 */

import {
  createFlows,
  deleteFlows,
  flow_hybrid_search,
  getFlowDetail,
  getFlowProperties,
  getFlowStateCodeByIdsAndVersions,
  getFlowTableAll,
  getFlowTablePgroongaSearch,
  getReferenceProperty,
  updateFlows,
} from '@/services/flows/api';
import { FunctionRegion } from '@supabase/supabase-js';

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createFlow: jest.fn().mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  }),
}));

jest.mock('@/services/flows/util', () => ({
  genFlowJsonOrdered: jest.fn(),
  genFlowName: jest.fn(),
}));

const { genFlowJsonOrdered: mockGenFlowJsonOrdered, genFlowName: mockGenFlowName } =
  jest.requireMock('@/services/flows/util');

jest.mock('@/services/general/util', () => ({
  classificationToString: jest.fn(),
  genClassificationZH: jest.fn(),
  getLangText: jest.fn(),
  jsonToList: jest.fn(),
}));

const {
  classificationToString: mockClassificationToString,
  genClassificationZH: mockGenClassificationZH,
  getLangText: mockGetLangText,
  jsonToList: mockJsonToList,
} = jest.requireMock('@/services/general/util');

jest.mock('@/services/ilcd/api', () => ({
  getILCDLocationByValues: jest.fn(),
  getILCDFlowCategorizationAll: jest.fn(),
}));

const {
  getILCDLocationByValues: mockGetILCDLocationByValues,
  getILCDFlowCategorizationAll: mockGetILCDFlowCategorizationAll,
} = jest.requireMock('@/services/ilcd/api');

jest.mock('@/services/ilcd/cache', () => ({
  getCachedLocationData: jest.fn(),
  getCachedFlowCategorizationAll: jest.fn(),
}));

const {
  getCachedLocationData: mockGetCachedLocationData,
  getCachedFlowCategorizationAll: mockGetCachedFlowCategorizationAll,
} = jest.requireMock('@/services/ilcd/cache');

jest.mock('@/services/general/api', () => ({
  getDataDetail: jest.fn(),
  getTeamIdByUserId: jest.fn(),
}));

const { getDataDetail: mockGetDataDetail, getTeamIdByUserId: mockGetTeamIdByUserId } =
  jest.requireMock('@/services/general/api');

class MockQuery<T = any> {
  public calls = {
    deleteCalled: false,
    insertArgs: undefined as any,
    selectArgs: undefined as any,
    orderArgs: [] as Array<{ field: string; options?: any }>,
    rangeArgs: undefined as any,
    eqArgs: [] as Array<{ field: string; value: any }>,
    inArgs: [] as Array<{ field: string; values: any }>,
    notArgs: [] as Array<any>,
    orArgs: [] as Array<string>,
  };

  constructor(private readonly result: T) {}

  insert(data: any) {
    this.calls.insertArgs = data;
    return this;
  }

  delete() {
    this.calls.deleteCalled = true;
    return this;
  }

  select(...args: any[]) {
    this.calls.selectArgs = args;
    return this;
  }

  order(field: string, options?: any) {
    this.calls.orderArgs.push({ field, options });
    return this;
  }

  range(from: number, to: number) {
    this.calls.rangeArgs = { from, to };
    return this;
  }

  eq(field: string, value: any) {
    this.calls.eqArgs.push({ field, value });
    return this;
  }

  in(field: string, values: any) {
    this.calls.inArgs.push({ field, values });
    return this;
  }

  not(...args: any[]) {
    this.calls.notArgs.push(args);
    return this;
  }

  or(filter: string) {
    this.calls.orArgs.push(filter);
    return this;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null) {
    return Promise.resolve(this.result).catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return Promise.resolve(this.result).finally(onfinally ?? undefined);
  }
}

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
    rpc: mockRpc,
  },
} = jest.requireMock('@/services/supabase');

const defaultLocationResponse = { data: [] };
const defaultClassificationResponse = { data: { categoryElementaryFlow: [], category: [] } };

const createQuery = <T>(result: T) => new MockQuery(result);

beforeEach(() => {
  jest.clearAllMocks();

  mockGenFlowJsonOrdered.mockImplementation((id: string, data: any) => ({ id, ...data }));
  mockGenFlowName.mockImplementation((name: any, lang: string) => {
    const baseNames = Array.isArray(name?.baseName) ? name.baseName : [];
    const preferred = baseNames.find((item: any) => item?.['@xml:lang'] === lang) ?? baseNames[0];
    return preferred?.['#text'] ?? '-';
  });
  mockClassificationToString.mockImplementation((list: any[]) =>
    (list || [])
      .map((item: any) => item?.label ?? item?.['#text'] ?? item)
      .filter(Boolean)
      .join(' / '),
  );
  mockGenClassificationZH.mockImplementation((classifications: any[], options: any[]) => {
    if (!classifications || classifications.length === 0) {
      return [];
    }
    return classifications.map((item: any) => {
      const match = options?.find((opt: any) => opt?.['@value'] === item?.['@value']);
      return {
        ...item,
        '#text': match?.['#text'] ?? item?.['#text'] ?? '',
      };
    });
  });
  mockGetLangText.mockImplementation((data: any, lang: string) => {
    if (!data) return '-';
    const list = Array.isArray(data) ? data : [data];
    const preferred = list.find((item: any) => item?.['@xml:lang'] === lang) ?? list[0];
    return preferred?.['#text'] ?? '-';
  });
  mockJsonToList.mockImplementation((value: any) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );

  mockGetCachedLocationData.mockResolvedValue(defaultLocationResponse);
  mockGetCachedFlowCategorizationAll.mockResolvedValue(defaultClassificationResponse);
  mockGetILCDLocationByValues.mockResolvedValue(defaultLocationResponse);
  mockGetILCDFlowCategorizationAll.mockResolvedValue(defaultClassificationResponse);

  mockGetDataDetail.mockResolvedValue({ data: null });
  mockGetTeamIdByUserId.mockResolvedValue(null);

  mockAuthGetSession.mockResolvedValue({
    data: {
      session: {
        access_token: 'token',
        user: { id: 'user-id' },
      },
    },
  });

  mockFunctionsInvoke.mockResolvedValue({ data: [] });
  mockRpc.mockResolvedValue({ data: [] });
});

describe('createFlows', () => {
  it('stores ordered payload with rule verification result', async () => {
    const insertResult = { data: [{ id: 'flow-id', version: '01.00.000' }], error: null };
    const query = createQuery(insertResult);
    mockFrom.mockReturnValue(query as any);

    const result = await createFlows('flow-id', { name: 'Flow payload' });

    expect(mockGenFlowJsonOrdered).toHaveBeenCalledWith('flow-id', { name: 'Flow payload' });
    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(query.calls.insertArgs).toEqual([
      expect.objectContaining({
        id: 'flow-id',
        json_ordered: expect.objectContaining({ id: 'flow-id' }),
        rule_verification: true,
      }),
    ]);
    expect(result).toBe(insertResult);
  });
});

describe('updateFlows', () => {
  it('invokes supabase edge function with ordered data', async () => {
    const updateResult = { data: [{ id: 'flow-id', rule_verification: true }] };
    mockFunctionsInvoke.mockResolvedValue(updateResult);

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockGenFlowJsonOrdered).toHaveBeenCalledWith('flow-id', { name: 'Updated flow' });
    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: {
        Authorization: 'Bearer token',
      },
      body: {
        id: 'flow-id',
        version: '01.00.000',
        table: 'flows',
        data: expect.objectContaining({
          json_ordered: expect.objectContaining({ id: 'flow-id' }),
          rule_verification: true,
        }),
      },
      region: FunctionRegion.UsEast1,
    });
    expect(response).toBe(updateResult.data);
  });

  it('returns undefined when no active session is found', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: null } });

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it('logs edge-function errors and returns null data', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockError = { message: 'update failed' };
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: mockError });

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
    expect(response).toBeNull();
    consoleLogSpy.mockRestore();
  });
});

describe('deleteFlows', () => {
  it('removes flow by id and version', async () => {
    const deleteResult = { data: null, error: null };
    const query = createQuery(deleteResult);
    mockFrom.mockReturnValue(query as any);

    const result = await deleteFlows('flow-id', '01.00.000');

    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(query.calls.deleteCalled).toBe(true);
    expect(query.calls.eqArgs).toEqual([
      { field: 'id', value: 'flow-id' },
      { field: 'version', value: '01.00.000' },
    ]);
    expect(result).toBe(deleteResult);
  });
});

describe('getFlowTableAll', () => {
  it('returns formatted english table data', async () => {
    const tableResult = {
      data: [
        {
          id: 'flow-1',
          version: '01.00.001',
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
          },
          typeOfDataSet: 'Elementary flow',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '#text': 'Emissions to air' }],
            },
          },
          'common:synonyms': [{ '@xml:lang': 'en', '#text': 'H2O' }],
          CASNumber: '7732-18-5',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'prop-1',
          },
          locationOfSupply: 'GLO',
        },
      ],
      count: 1,
      error: null,
    };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValue(query as any);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'GLO', '#text': 'Global' }]);
    mockGetILCDLocationByValues.mockResolvedValue({
      data: [{ '@value': 'GLO', '#text': 'Global' }],
    });

    const result = await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'en',
      'tg',
      '',
    );

    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['GLO']);
    expect(mockGetILCDLocationByValues).not.toHaveBeenCalled();
    expect(result).toEqual({
      data: [
        {
          key: 'flow-1:01.00.001',
          id: 'flow-1',
          name: 'Water',
          flowType: 'Elementary flow',
          classification: 'Emissions to air',
          synonyms: 'H2O',
          CASNumber: '7732-18-5',
          refFlowPropertyId: 'prop-1',
          locationOfSupply: 'Global',
          version: '01.00.001',
          modifiedAt: new Date('2024-01-01T00:00:00Z'),
          teamId: 'team-1',
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('falls back to ILCD lookup when cached locations are empty', async () => {
    const tableResult = {
      data: [
        {
          id: 'flow-2',
          version: '01.00.000',
          modified_at: '2024-01-02T00:00:00Z',
          team_id: 'team-2',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steel' }],
          },
          typeOfDataSet: 'Product flow',
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '#text': 'Products' }],
            },
          },
          'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Steel' }],
          CASNumber: '1234-56-7',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'prop-2',
          },
          locationOfSupply: 'CN',
        },
      ],
      count: 1,
      error: null,
    };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValue(query as any);

    mockGetCachedLocationData.mockResolvedValue([]);
    mockGetILCDLocationByValues.mockResolvedValue({
      data: [{ '@value': 'CN', '#text': 'China' }],
    });

    const result = await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'en',
      'tg',
      '',
    );

    expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['CN']);
    expect(mockGetILCDLocationByValues).toHaveBeenCalledWith('en', ['CN']);
    expect(result.data[0].locationOfSupply).toBe('China');
  });

  it('returns failure when personal dataset has no session', async () => {
    mockAuthGetSession.mockResolvedValue({ data: { session: null } });
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'my', '');

    expect(result).toEqual({ data: [], success: false });
    expect(mockGetCachedLocationData).not.toHaveBeenCalled();
    expect(mockGetILCDLocationByValues).not.toHaveBeenCalled();
  });

  it('applies combined filters for personal datasets', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowTableAll(
      { current: 2, pageSize: 20 },
      { name: 'ascend' },
      'en',
      'my',
      '',
      { flowType: 'Product flow, Elementary flow', asInput: true },
      200,
    );

    expect(query.calls.orderArgs).toEqual([{ field: 'name', options: { ascending: true } }]);
    expect(query.calls.rangeArgs).toEqual({ from: 20, to: 39 });
    expect(query.calls.inArgs).toEqual([
      {
        field: 'json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet',
        values: ['Product flow', 'Elementary flow'],
      },
    ]);
    expect(query.calls.notArgs).toEqual([
      [
        'json',
        'cs',
        '{"flowDataSet":{"flowInformation":{"dataSetInformation":{"classificationInformation":{"common:elementaryFlowCategorization":{"common:category":[{"#text": "Emissions", "@level": "0"}]}}}}}}',
      ],
    ]);
    expect(query.calls.eqArgs).toEqual(
      expect.arrayContaining([
        { field: 'state_code', value: 200 },
        { field: 'user_id', value: 'user-id' },
      ]),
    );
    expect(result).toEqual({ data: [], success: true });
  });

  it('returns empty success when team dataset has no team id', async () => {
    mockGetTeamIdByUserId.mockResolvedValue(null);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', '');

    expect(result).toEqual({ data: [], success: true });
    expect(mockGetCachedLocationData).not.toHaveBeenCalled();
  });

  it('localizes chinese table rows for non-elementary flows', async () => {
    const query = createQuery({
      data: [
        {
          id: 'flow-zh',
          version: '01.00.003',
          modified_at: '2024-01-03T00:00:00Z',
          team_id: 'team-zh',
          name: {
            baseName: [{ '@xml:lang': 'zh', '#text': '钢卷' }],
          },
          typeOfDataSet: 'Product flow',
          classificationInformation: {
            'common:classification': {
              'common:class': [
                { '@value': 'Products', '#text': 'Products' },
                { '@value': 'General', '#text': 'General' },
              ],
            },
          },
          'common:synonyms': [{ '@xml:lang': 'zh', '#text': '钢材' }],
          CASNumber: '1234-56-7',
          referenceToFlowPropertyDataSet: {
            '@refObjectId': 'prop-zh',
          },
          locationOfSupply: 'CN',
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'CN', '#text': '中国' }]);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [
        { '@value': 'Products', '#text': '产品' },
        { '@value': 'General', '#text': '一般' },
      ],
    });

    const result = await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'zh',
      'tg',
      '',
    );

    expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalledWith('zh');
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-zh',
        name: '钢卷',
        flowType: 'Product flow',
        classification: '产品 / 一般',
        synonyms: '钢材',
        refFlowPropertyId: 'prop-zh',
        locationOfSupply: '中国',
      }),
    );
  });
});

describe('getFlowTablePgroongaSearch', () => {
  it('maps rpc search results to table rows', async () => {
    const rpcResult = {
      data: [
        {
          id: 'flow-1',
          version: '01.00.001',
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
          total_count: 2,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  name: {
                    baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
                  },
                  classificationInformation: {
                    'common:elementaryFlowCategorization': {
                      'common:category': [{ '#text': 'Emissions to water' }],
                    },
                  },
                  'common:synonyms': [{ '@xml:lang': 'en', '#text': 'H2O' }],
                  CASNumber: '7732-18-5',
                },
                geography: {
                  locationOfSupply: 'GLO',
                },
              },
              modellingAndValidation: {
                LCIMethod: {
                  typeOfDataSet: 'Elementary flow',
                },
              },
            },
          },
        },
      ],
    };
    mockRpc.mockResolvedValue(rpcResult);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'GLO', '#text': 'Global' }]);
    mockGetILCDLocationByValues.mockResolvedValue({
      data: [{ '@value': 'GLO', '#text': 'Global' }],
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 5 },
      'en',
      'tg',
      'water',
      { flowType: '' },
    );

    expect(mockRpc).toHaveBeenCalledWith(
      'pgroonga_search_flows_v1',
      expect.objectContaining({
        query_text: 'water',
        data_source: 'tg',
        filter_condition: { flowType: '' },
        page_size: 5,
        page_current: 1,
        order_by: undefined,
      }),
    );
    expect(result).toEqual({
      data: [
        {
          key: 'flow-1:01.00.001',
          id: 'flow-1',
          name: 'Water',
          synonyms: 'H2O',
          flowType: 'Elementary flow',
          classification: 'Emissions to water',
          CASNumber: '7732-18-5',
          locationOfSupply: 'Global',
          version: '01.00.001',
          modifiedAt: new Date('2024-01-01T00:00:00Z'),
          teamId: 'team-1',
        },
      ],
      page: 1,
      success: true,
      total: 2,
    });
    expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['GLO']);
    expect(mockGetILCDLocationByValues).not.toHaveBeenCalled();
  });

  it('should include classification for non-elementary flows', async () => {
    const rpcResult = {
      data: [
        {
          id: 'flow-2',
          version: '01.00.002',
          modified_at: '2024-01-02T00:00:00Z',
          team_id: 'team-2',
          total_count: 1,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  name: {
                    baseName: [{ '@xml:lang': 'en', '#text': 'Steel coil' }],
                  },
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [
                        { '#text': 'Products', '@value': 'Products' },
                        { '#text': 'General', '@value': 'General' },
                      ],
                    },
                  },
                  'common:synonyms': [{ '@xml:lang': 'en', '#text': 'Steel' }],
                },
                geography: {
                  locationOfSupply: 'CN',
                },
              },
              modellingAndValidation: {
                LCIMethod: {
                  typeOfDataSet: 'Product flow',
                },
              },
            },
          },
        },
      ],
    };
    mockRpc.mockResolvedValue(rpcResult);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'CN', '#text': 'China' }]);
    mockGetILCDLocationByValues.mockResolvedValue({
      data: [{ '@value': 'CN', '#text': 'China' }],
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 5 },
      'en',
      'tg',
      'steel',
      { flowType: '' },
    );

    expect(result.data[0].classification).toBe('Products / General');
  });

  it('returns failure when PGroonga search runs without a session', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'water',
      {},
    );

    expect(mockRpc).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: false });
  });

  it('returns empty success when PGroonga search has no data', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'missing',
      {},
    );

    expect(result).toEqual({ data: [], success: true });
  });

  it('logs PGroonga errors and returns failure', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockError = { message: 'rpc failed' };
    mockRpc.mockResolvedValue({ data: null, error: mockError });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'water',
      {},
    );

    expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
    expect(result).toEqual({ data: [], success: false });
    consoleLogSpy.mockRestore();
  });

  it('passes state_code and order_by to PGroonga flow search', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await getFlowTablePgroongaSearch(
      { current: 3, pageSize: 15 },
      'zh',
      'my',
      'steel',
      { flowType: 'Product flow' },
      300,
      { key: 'baseName', lang: 'zh', order: 'asc' },
    );

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_flows_v1', {
      query_text: 'steel',
      filter_condition: { flowType: 'Product flow' },
      page_size: 15,
      page_current: 3,
      data_source: 'my',
      state_code: 300,
      order_by: { key: 'baseName', lang: 'zh', order: 'asc' },
    });
  });

  it('localizes chinese PGroonga results', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-zh-search',
          version: '01.00.004',
          modified_at: '2024-01-04T00:00:00Z',
          team_id: 'team-zh',
          total_count: 1,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  name: {
                    baseName: [{ '@xml:lang': 'zh', '#text': '蒸汽' }],
                  },
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [
                        { '@value': 'Products', '#text': 'Products' },
                        { '@value': 'General', '#text': 'General' },
                      ],
                    },
                  },
                  'common:synonyms': [{ '@xml:lang': 'zh', '#text': '水蒸气' }],
                },
                geography: {
                  locationOfSupply: 'CN',
                },
              },
              modellingAndValidation: {
                LCIMethod: {
                  typeOfDataSet: 'Product flow',
                },
              },
            },
          },
        },
      ],
      error: null,
    });
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'CN', '#text': '中国' }]);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [
        { '@value': 'Products', '#text': '产品' },
        { '@value': 'General', '#text': '一般' },
      ],
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      '蒸汽',
      {},
    );

    expect(result).toEqual({
      data: [
        {
          key: 'flow-zh-search:01.00.004',
          id: 'flow-zh-search',
          name: '蒸汽',
          synonyms: '水蒸气',
          classification: '产品 / 一般',
          flowType: 'Product flow',
          CASNumber: '-',
          locationOfSupply: '中国',
          version: '01.00.004',
          modifiedAt: new Date('2024-01-04T00:00:00Z'),
          teamId: 'team-zh',
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
  });

  it('falls back to id-only rows when PGroonga mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-pgroonga-bad',
          version: '01.00.005',
          modified_at: '2024-01-05T00:00:00Z',
          total_count: 1,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {},
              },
              modellingAndValidation: {
                LCIMethod: {
                  typeOfDataSet: 'Elementary flow',
                },
              },
            },
          },
        },
      ],
      error: null,
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('classification parse failed');
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'bad',
      {},
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-pgroonga-bad' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
  });
});

describe('flow_hybrid_search', () => {
  it('delegates to edge function and maps response', async () => {
    const hybridResult = {
      data: {
        data: [
          {
            id: 'flow-h1',
            version: '01.00.001',
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    name: {
                      baseName: [{ '@xml:lang': 'en', '#text': 'Nitrogen' }],
                    },
                    classificationInformation: {
                      'common:elementaryFlowCategorization': {
                        'common:category': [{ '#text': 'Emissions to air' }],
                      },
                    },
                    'common:synonyms': [{ '@xml:lang': 'en', '#text': 'N2' }],
                    CASNumber: '7727-37-9',
                  },
                  geography: {
                    locationOfSupply: 'GLO',
                  },
                },
                modellingAndValidation: {
                  LCIMethod: {
                    typeOfDataSet: 'Elementary flow',
                  },
                },
              },
            },
          },
        ],
        total_count: 1,
      },
    };
    mockFunctionsInvoke.mockResolvedValue(hybridResult as any);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'GLO', '#text': 'Global' }]);
    mockGetILCDLocationByValues.mockResolvedValue({
      data: [{ '@value': 'GLO', '#text': 'Global' }],
    });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'nitrogen', {
      flowType: '',
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'flow_hybrid_search',
      expect.objectContaining({
        body: { query: 'nitrogen', filter: { flowType: '' } },
        headers: { Authorization: 'Bearer token' },
        region: FunctionRegion.UsEast1,
      }),
    );
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-h1',
        name: 'Nitrogen',
        classification: 'Emissions to air',
        synonyms: 'N2',
      }),
    );
    expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['GLO']);
    expect(mockGetILCDLocationByValues).not.toHaveBeenCalled();
  });

  it('should include total_count from function response', async () => {
    const hybridResult = {
      data: {
        data: [
          {
            id: 'flow-h2',
            version: '01.00.002',
            modified_at: '2024-01-03T00:00:00Z',
            team_id: 'team-2',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    name: {
                      baseName: [{ '@xml:lang': 'en', '#text': 'Steam' }],
                    },
                    classificationInformation: {
                      'common:elementaryFlowCategorization': {
                        'common:category': [{ '#text': 'Resources' }],
                      },
                    },
                  },
                  geography: {
                    locationOfSupply: 'GLO',
                  },
                },
                modellingAndValidation: {
                  LCIMethod: {
                    typeOfDataSet: 'Elementary flow',
                  },
                },
              },
            },
          },
        ],
        total_count: 4,
      },
    };
    mockFunctionsInvoke.mockResolvedValue(hybridResult as any);

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'steam', {});

    expect((result as any).total).toBe(4);
  });

  it('returns failure when hybrid flow search runs without a session', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'steam', {});

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: false });
  });

  it('returns empty success payload when hybrid search has no rows', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [],
        total_count: 0,
      },
      error: null,
    });

    const result = await flow_hybrid_search({ current: 2, pageSize: 10 }, 'en', 'tg', 'steam', {});

    expect(result).toEqual({
      data: [],
      page: 2,
      success: true,
      total: 0,
    });
  });

  it('logs hybrid search errors and returns failure', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockError = { message: 'hybrid failed' };
    mockFunctionsInvoke.mockResolvedValue({ data: null, error: mockError });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'steam', {});

    expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
    expect(result).toEqual({ data: [], success: false });
    consoleLogSpy.mockRestore();
  });

  it('localizes chinese hybrid search results and passes state_code', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-zh',
            version: '01.00.006',
            modified_at: '2024-01-06T00:00:00Z',
            team_id: 'team-zh',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    name: {
                      baseName: [{ '@xml:lang': 'zh', '#text': '电力' }],
                    },
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [
                          { '@value': 'Products', '#text': 'Products' },
                          { '@value': 'General', '#text': 'General' },
                        ],
                      },
                    },
                    'common:synonyms': [{ '@xml:lang': 'zh', '#text': '电能' }],
                    CASNumber: 'N/A',
                  },
                  geography: {
                    locationOfSupply: 'CN',
                  },
                },
                modellingAndValidation: {
                  LCIMethod: {
                    typeOfDataSet: 'Product flow',
                  },
                },
              },
            },
          },
        ],
        total_count: 3,
      },
      error: null,
    });
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'CN', '#text': '中国' }]);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [
        { '@value': 'Products', '#text': '产品' },
        { '@value': 'General', '#text': '一般' },
      ],
    });

    const result = await flow_hybrid_search(
      { current: 2, pageSize: 10 },
      'zh',
      'my',
      '电力',
      {},
      200,
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'flow_hybrid_search',
      expect.objectContaining({
        body: { query: '电力', filter: {}, state_code: 200 },
      }),
    );
    expect(result).toEqual({
      data: [
        {
          key: 'flow-hybrid-zh:01.00.006',
          id: 'flow-hybrid-zh',
          name: '电力',
          synonyms: '电能',
          classification: '产品 / 一般',
          flowType: 'Product flow',
          CASNumber: 'N/A',
          locationOfSupply: '中国',
          version: '01.00.006',
          modifiedAt: new Date('2024-01-06T00:00:00Z'),
          teamId: 'team-zh',
        },
      ],
      page: 2,
      success: true,
      total: 3,
    });
  });

  it('falls back to id-only rows when hybrid mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-bad',
            version: '01.00.007',
            modified_at: '2024-01-07T00:00:00Z',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {},
                },
                modellingAndValidation: {
                  LCIMethod: {
                    typeOfDataSet: 'Elementary flow',
                  },
                },
              },
            },
          },
        ],
        total_count: 1,
      },
      error: null,
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('hybrid classification parse failed');
    });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'bad', {});

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-hybrid-bad' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
  });
});

describe('getFlowDetail', () => {
  it('delegates to general data detail loader', async () => {
    mockGetDataDetail.mockResolvedValue({ data: { id: 'flow-id' } });

    const result = await getFlowDetail('flow-id', '01.00.000');

    expect(mockGetDataDetail).toHaveBeenCalledWith('flow-id', '01.00.000', 'flows');
    expect(result).toEqual({ data: { id: 'flow-id' } });
  });
});

describe('getFlowProperties', () => {
  it('returns reference property meta data for each requested flow', async () => {
    const supabaseResult = {
      data: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          version: '01.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
          },
          typeOfDataSet: 'Elementary flow',
          referenceToReferenceFlowProperty: '1',
          flowProperty: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-1',
                shortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
              },
            },
          ],
        },
      ],
    };
    const query = createQuery(supabaseResult);
    mockFrom.mockReturnValue(query as any);

    const flowId = '11111111-1111-1111-1111-111111111111';
    const result = await getFlowProperties([{ id: flowId, version: '01.00.000' }]);

    expect(mockFrom).toHaveBeenCalledWith('flows');
    // getFlowProperties uses .in() for ID filtering, not .or()
    expect(query.calls.inArgs).toEqual([{ field: 'id', values: [flowId] }]);
    expect(query.calls.orderArgs).toEqual([{ field: 'version', options: { ascending: false } }]);
    expect(result).toEqual({
      data: [
        {
          id: flowId,
          version: '01.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
          },
          typeOfDataSet: 'Elementary flow',
          refFlowPropertytId: 'prop-1',
          refFlowPropertyShortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
        },
      ],
      success: true,
    });
  });

  it('returns failure when no valid ids are provided', async () => {
    // When IDs are filtered out (not 36 chars), function returns early without DB call
    const result = await getFlowProperties([{ id: 'short-id', version: '01.00.000' }]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: false });
  });

  it('falls back to the latest version when the requested flow version is missing', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({
      data: [
        {
          id: flowId,
          version: '02.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steam' }],
          },
          typeOfDataSet: 'Product flow',
          referenceToReferenceFlowProperty: '2',
          flowProperty: [
            {
              '@dataSetInternalID': '2',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-2',
                shortDescription: { '@xml:lang': 'en', '#text': 'Energy' },
              },
            },
          ],
        },
      ],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowProperties([{ id: flowId, version: '01.00.000' }]);

    expect(result).toEqual({
      data: [
        {
          id: flowId,
          version: '02.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steam' }],
          },
          typeOfDataSet: 'Product flow',
          refFlowPropertytId: 'prop-2',
          refFlowPropertyShortDescription: { '@xml:lang': 'en', '#text': 'Energy' },
        },
      ],
      success: true,
    });
  });

  it('returns failure when valid ids resolve to no flow rows', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({ data: [] });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowProperties([{ id: flowId, version: '01.00.000' }]);

    expect(result).toEqual({ data: [], success: false });
  });
});

describe('getReferenceProperty', () => {
  it('returns the requested reference property when the exact version exists', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({
      data: [
        {
          id: flowId,
          version: '01.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
          },
          referenceToReferenceFlowProperty: '1',
          flowProperty: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-direct',
                shortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
              },
            },
          ],
        },
      ],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getReferenceProperty(flowId, '01.00.000');

    expect(result).toEqual({
      data: {
        id: flowId,
        version: '01.00.000',
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
        },
        refFlowPropertytId: 'prop-direct',
        refFlowPropertyShortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
      },
      success: true,
    });
  });

  it('falls back to latest version when requested version missing', async () => {
    const emptyQuery = createQuery({ data: [] });
    const flowId = '11111111-1111-1111-1111-111111111111';
    const fallbackQuery = createQuery({
      data: [
        {
          id: flowId,
          version: '01.00.001',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
          },
          referenceToReferenceFlowProperty: '1',
          flowProperty: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-1',
                shortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
              },
            },
          ],
        },
      ],
    });

    mockFrom
      .mockImplementationOnce(() => emptyQuery as any)
      .mockImplementationOnce(() => fallbackQuery as any);

    const result = await getReferenceProperty(flowId, '01.00.000');

    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(result).toEqual({
      data: {
        id: flowId,
        version: '01.00.001',
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Water' }],
        },
        refFlowPropertytId: 'prop-1',
        refFlowPropertyShortDescription: { '@xml:lang': 'en', '#text': 'Mass' },
      },
      success: true,
    });
  });

  it('returns failure when no reference property can be resolved', async () => {
    const emptyQuery = createQuery({ data: [] });
    const flowId = '11111111-1111-1111-1111-111111111111';
    const fallbackQuery = createQuery({ data: [] });

    mockFrom
      .mockImplementationOnce(() => emptyQuery as any)
      .mockImplementationOnce(() => fallbackQuery as any);

    const result = await getReferenceProperty(flowId, '01.00.000');

    expect(result).toEqual({
      data: null,
      success: false,
    });
  });

  it('returns undefined for invalid ids', async () => {
    const result = await getReferenceProperty('short-id', '01.00.000');

    expect(result).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe('getFlowStateCodeByIdsAndVersions', () => {
  it('returns empty data when params are empty', async () => {
    const result = await getFlowStateCodeByIdsAndVersions([], 'en');

    expect(result).toEqual({ error: null, data: [] });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('fetches state codes for the given id and version pairs', async () => {
    const ids = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'];
    const supabaseResponse = {
      data: [
        {
          id: ids[0],
          version: '01.00.000',
          state_code: 100,
          typeOfDataSet: 'Product flow',
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '#text': 'Air' }, { '#text': 'Water' }],
            },
          },
          locationOfSupply: 'CN',
          json: {
            flowDataSet: {
              flowInformation: {
                geography: {
                  locationOfSupply: 'CN',
                },
              },
            },
          },
        },
      ],
      error: null,
    };
    const query = createQuery(supabaseResponse);
    mockGetCachedLocationData.mockResolvedValueOnce([{ '@value': 'CN', '#text': 'China' }]);
    mockGetILCDLocationByValues.mockResolvedValueOnce({
      data: [{ '@value': 'CN', '#text': 'China' }],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowStateCodeByIdsAndVersions(
      [
        { id: ids[0], version: '01.00.000' },
        { id: ids[1], version: '01.00.001' },
      ],
      'en',
    );

    expect(mockFrom).toHaveBeenCalledWith('flows');
    expect(query.calls.selectArgs).toHaveLength(1);
    expect(query.calls.selectArgs?.[0]).toContain('state_code');
    expect(query.calls.selectArgs?.[0]).toContain('classificationInformation');
    expect(query.calls.orArgs).toEqual([
      `and(id.eq.${ids[0]},version.eq.01.00.000),and(id.eq.${ids[1]},version.eq.01.00.001)`,
    ]);
    expect(mockGetCachedLocationData).toHaveBeenCalledWith('en', ['CN']);
    expect(mockGetILCDLocationByValues).not.toHaveBeenCalled();
    expect(result).toEqual({
      error: null,
      data: [
        {
          key: `${ids[0]}:01.00.000`,
          id: ids[0],
          version: '01.00.000',
          stateCode: 100,
          classification: 'Air / Water',
        },
      ],
    });
  });

  it('returns the upstream error when no rows are found', async () => {
    const mockError = { message: 'no rows' };
    const query = createQuery({ data: [], error: mockError });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '11111111-1111-1111-1111-111111111111', version: '01.00.000' }],
      'en',
    );

    expect(result).toEqual({ error: mockError, data: [] });
  });

  it('localizes chinese state-code lookups', async () => {
    const query = createQuery({
      data: [
        {
          id: '33333333-3333-3333-3333-333333333333',
          version: '01.00.000',
          state_code: 100,
          typeOfDataSet: 'Elementary flow',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '@value': 'Air', '#text': 'Air' }],
            },
          },
          locationOfSupply: 'CN',
          json: {
            flowDataSet: {
              flowInformation: {
                geography: {
                  locationOfSupply: 'CN',
                },
              },
            },
          },
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockGetCachedLocationData.mockResolvedValue([{ '@value': 'CN', '#text': '中国' }]);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      category: [],
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
    });

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '33333333-3333-3333-3333-333333333333', version: '01.00.000' }],
      'zh',
    );

    expect(mockGetCachedFlowCategorizationAll).toHaveBeenCalledWith('zh');
    expect(result).toEqual({
      error: null,
      data: [
        {
          key: '33333333-3333-3333-3333-333333333333:01.00.000',
          id: '33333333-3333-3333-3333-333333333333',
          version: '01.00.000',
          stateCode: 100,
          classification: '空气',
          locationOfSupply: '中国',
        },
      ],
    });
  });
});
