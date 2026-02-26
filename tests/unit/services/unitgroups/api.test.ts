/**
 * Tests for unit group service API functions
 * Path: src/services/unitgroups/api.ts
 */

import {
  createUnitGroup,
  deleteUnitGroup,
  getReferenceUnit,
  getReferenceUnits,
  getUnitGroupDetail,
  getUnitGroupTableAll,
  getUnitGroupTablePgroongaSearch,
  unitgroup_hybrid_search,
  updateUnitGroup,
} from '@/services/unitgroups/api';
import { FunctionRegion } from '@supabase/supabase-js';

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createUnitGroup: jest.fn().mockReturnValue({
    validateEnhanced: jest.fn().mockReturnValue({ success: true }),
  }),
}));

jest.mock('@/services/unitgroups/util', () => ({
  genUnitGroupJsonOrdered: jest.fn(),
}));

const { genUnitGroupJsonOrdered: mockGenUnitGroupJsonOrdered } = jest.requireMock(
  '@/services/unitgroups/util',
);

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

jest.mock('@/services/ilcd/cache', () => ({
  getCachedClassificationData: jest.fn(),
  ilcdCache: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

const { getCachedClassificationData: mockGetCachedClassificationData } =
  jest.requireMock('@/services/ilcd/cache');

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

const createQuery = <T>(result: T) => new MockQuery(result);

beforeEach(() => {
  jest.clearAllMocks();

  mockGenUnitGroupJsonOrdered.mockImplementation((id: string, data: any) => ({
    id,
    ...data,
  }));
  mockClassificationToString.mockImplementation((items: any[]) =>
    (items || [])
      .map((item: any) => item?.label ?? item?.['#text'] ?? item)
      .filter(Boolean)
      .join(' / '),
  );
  mockGenClassificationZH.mockImplementation((classifications: any[], dictionary: any[]) => {
    if (!classifications) return [];
    return classifications.map((item: any) => {
      const match = dictionary?.find((entry: any) => entry?.['@value'] === item?.['@value']);
      return {
        ...item,
        '#text': match?.['#text'] ?? item?.['#text'],
      };
    });
  });
  mockGetLangText.mockImplementation((value: any, lang: string) => {
    if (!value) return '-';
    const list = Array.isArray(value) ? value : [value];
    const preferred =
      list.find((item: any) => item?.['@xml:lang'] === lang) ??
      (typeof value === 'object' ? list[0] : value);
    if (typeof preferred === 'string') {
      return preferred;
    }
    return preferred?.['#text'] ?? '-';
  });
  mockJsonToList.mockImplementation((value: any) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
  mockGetCachedClassificationData.mockResolvedValue([]);
  mockGetTeamIdByUserId.mockResolvedValue(null);
  mockGetDataDetail.mockResolvedValue({ data: null });

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

describe('createUnitGroup', () => {
  it('stores ordered payload with rule verification result', async () => {
    const insertResult = { data: [{ id: 'ug-1' }], error: null };
    const query = createQuery(insertResult);
    mockFrom.mockReturnValueOnce(query as any);
    mockGenUnitGroupJsonOrdered.mockReturnValueOnce({ data: 'ordered' });

    const result = await createUnitGroup('ug-1', { name: 'Unit Group' });

    expect(mockGenUnitGroupJsonOrdered).toHaveBeenCalledWith('ug-1', { name: 'Unit Group' });
    expect(mockFrom).toHaveBeenCalledWith('unitgroups');
    expect(query.calls.insertArgs).toEqual([
      {
        id: 'ug-1',
        json_ordered: { data: 'ordered' },
        rule_verification: true,
      },
    ]);
    expect(query.calls.selectArgs).toEqual([]);
    expect(result).toBe(insertResult);
  });
});

describe('updateUnitGroup', () => {
  it('invokes edge function with ordered payload', async () => {
    const updateResult = { data: { success: true } };
    mockFunctionsInvoke.mockResolvedValueOnce(updateResult as any);
    mockGenUnitGroupJsonOrdered.mockReturnValueOnce({ updated: true });

    const result = await updateUnitGroup('ug-1', '01.00.000', { name: 'Updated' });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer token' },
      body: {
        id: 'ug-1',
        version: '01.00.000',
        table: 'unitgroups',
        data: {
          json_ordered: { updated: true },
          rule_verification: true,
        },
      },
      region: FunctionRegion.UsEast1,
    });
    expect(result).toEqual(updateResult.data);
  });

  it('returns undefined when no active session exists', async () => {
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await updateUnitGroup('ug-1', '01.00.000', { name: 'Updated' });

    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('uses empty bearer token fallback and logs invocation error', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: undefined,
        },
      },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: undefined,
      error: { message: 'invoke failed' },
    });

    const result = await updateUnitGroup('ug-1', '01.00.000', { name: 'Updated' });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith('update_data', {
      headers: { Authorization: 'Bearer ' },
      body: {
        id: 'ug-1',
        version: '01.00.000',
        table: 'unitgroups',
        data: {
          json_ordered: expect.any(Object),
          rule_verification: true,
        },
      },
      region: FunctionRegion.UsEast1,
    });
    expect(logSpy).toHaveBeenCalledWith('error', { message: 'invoke failed' });
    expect(result).toBeUndefined();
    logSpy.mockRestore();
  });
});

describe('deleteUnitGroup', () => {
  it('removes unit group by id and version', async () => {
    const deleteResult = { data: null, error: null };
    const query = createQuery(deleteResult);
    mockFrom.mockReturnValueOnce(query as any);

    const result = await deleteUnitGroup('ug-1', '01.00.000');

    expect(mockFrom).toHaveBeenCalledWith('unitgroups');
    expect(query.calls.deleteCalled).toBe(true);
    expect(query.calls.eqArgs).toEqual([
      { field: 'id', value: 'ug-1' },
      { field: 'version', value: '01.00.000' },
    ]);
    expect(result).toBe(deleteResult);
  });
});

describe('getUnitGroupTableAll', () => {
  it('returns formatted english table data with filters applied', async () => {
    const tableResult = {
      data: [
        {
          id: 'ug-1',
          version: '01.00.001',
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
          'common:name': [
            { '@xml:lang': 'en', '#text': 'Unit Group One' },
            { '@xml:lang': 'zh', '#text': '单位组一' },
          ],
          'common:class': [{ '#text': 'Class One' }],
          referenceToReferenceUnit: 'unit-1',
          unit: [
            {
              '@dataSetInternalID': 'unit-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Reference unit' }],
            },
            {
              '@dataSetInternalID': 'unit-2',
              name: 'Gram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'Secondary unit' }],
            },
          ],
        },
      ],
      count: 1,
      error: null,
    };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getUnitGroupTableAll(
      { current: 2, pageSize: 5 },
      { modified_at: 'ascend' },
      'en',
      'tg',
      'team-9',
    );

    expect(mockFrom).toHaveBeenCalledWith('unitgroups');
    expect(query.calls.orderArgs).toEqual([{ field: 'modified_at', options: { ascending: true } }]);
    expect(query.calls.rangeArgs).toEqual({ from: 5, to: 9 });
    expect(query.calls.eqArgs).toEqual([
      { field: 'state_code', value: 100 },
      { field: 'team_id', value: 'team-9' },
    ]);
    expect(result).toEqual({
      data: [
        {
          key: 'ug-1',
          id: 'ug-1',
          name: 'Unit Group One',
          classification: 'Class One',
          refUnitId: 'unit-1',
          refUnitName: 'Kilogram',
          refUnitGeneralComment: 'Reference unit',
          version: '01.00.001',
          modifiedAt: new Date('2024-01-01T00:00:00Z'),
          teamId: 'team-1',
        },
      ],
      page: 2,
      success: true,
      total: 1,
    });
  });

  it('translates classification for Chinese locale', async () => {
    const tableResult = {
      data: [
        {
          id: 'ug-2',
          version: '01.00.002',
          modified_at: '2024-02-01T00:00:00Z',
          team_id: 'team-2',
          'common:name': [
            { '@xml:lang': 'en', '#text': 'Unit Group Two' },
            { '@xml:lang': 'zh', '#text': '单位组二' },
          ],
          'common:class': [{ '@value': 'c-1', '#text': 'Class Original' }],
          referenceToReferenceUnit: 'unit-9',
          unit: [
            {
              '@dataSetInternalID': 'unit-9',
              name: 'Piece',
              generalComment: [{ '@xml:lang': 'zh', '#text': '参考单位' }],
            },
          ],
        },
      ],
      count: 1,
      error: null,
    };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValueOnce(query as any);
    mockGetCachedClassificationData.mockResolvedValueOnce([
      { '@value': 'c-1', '#text': '中文分类' },
    ]);

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', '');

    expect(mockGetCachedClassificationData).toHaveBeenCalledWith('UnitGroup', 'zh', ['all']);
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'ug-2',
        name: '单位组二',
        classification: '中文分类',
        refUnitGeneralComment: '参考单位',
      }),
    );
  });

  it('returns failure for personal dataset when no session is available', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(query as any);
    mockAuthGetSession.mockResolvedValueOnce({ data: { session: null } });

    const result = await getUnitGroupTableAll(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'my',
      '',
      201,
    );

    expect(result).toEqual({ data: [], success: false });
  });

  it('returns empty success when team scope has no team id', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(query as any);
    mockGetTeamIdByUserId.mockResolvedValueOnce(null);

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', '');

    expect(result).toEqual({ data: [], success: true });
  });

  it('applies co source and team filters', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getUnitGroupTableAll(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'co',
      'team-co',
    );

    expect(query.calls.eqArgs).toEqual([
      { field: 'state_code', value: 200 },
      { field: 'team_id', value: 'team-co' },
    ]);
    expect(result).toEqual({ data: [], success: true });
  });

  it('applies my source state and user filters when session exists', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(query as any);
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'my-user' },
        },
      },
    });

    const result = await getUnitGroupTableAll(
      { current: 1, pageSize: 10 },
      {},
      'en',
      'my',
      [],
      300,
    );

    expect(query.calls.eqArgs).toEqual([
      { field: 'state_code', value: 300 },
      { field: 'user_id', value: 'my-user' },
    ]);
    expect(result).toEqual({ data: [], success: true });
  });

  it('applies team scope filter when team id exists', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValueOnce(query as any);
    mockGetTeamIdByUserId.mockResolvedValueOnce('team-te');

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', []);

    expect(query.calls.eqArgs).toEqual([{ field: 'team_id', value: 'team-te' }]);
    expect(result).toEqual({ data: [], success: true });
  });

  it('returns failure when query result does not include data payload', async () => {
    const query = createQuery({ error: null });
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', '');

    expect(result).toEqual({ data: [], success: false });
  });

  it('logs query errors and keeps transformed response', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const query = createQuery({
      data: [
        {
          id: 'ug-e1',
          version: '01.00.000',
          modified_at: '2024-01-01T00:00:00Z',
          'common:name': [{ '@xml:lang': 'en', '#text': 'UG Error' }],
          'common:class': [],
          referenceToReferenceUnit: 'missing',
          unit: [],
        },
      ],
      count: 1,
      error: { message: 'table warning' },
    });
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', '');

    expect(logSpy).toHaveBeenCalledWith('error', { message: 'table warning' });
    expect(result).toEqual({
      data: [
        {
          key: 'ug-e1',
          id: 'ug-e1',
          name: 'UG Error',
          classification: '',
          refUnitId: 'missing',
          refUnitName: '-',
          refUnitGeneralComment: '-',
          version: '01.00.000',
          modifiedAt: new Date('2024-01-01T00:00:00Z'),
          teamId: undefined,
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
    logSpy.mockRestore();
  });

  it('falls back to id-only row when mapping throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const query = createQuery({
      data: [
        {
          id: 'ug-throw',
          version: '01.00.000',
          modified_at: '2024-01-01T00:00:00Z',
          'common:name': [{ '@xml:lang': 'en', '#text': 'UG Throw' }],
          'common:class': [{ '#text': 'Class' }],
          referenceToReferenceUnit: 'u-1',
          unit: [{ '@dataSetInternalID': 'u-1', name: 'kg' }],
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValueOnce(query as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('broken units');
    });

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', '');

    expect(result).toEqual({
      data: [{ id: 'ug-throw' }],
      page: 1,
      success: true,
      total: 1,
    });
    errorSpy.mockRestore();
  });

  it('handles zh mapping exceptions by returning id-only rows', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const query = createQuery({
      data: [
        {
          id: 'ug-zh-throw',
          version: '01.00.001',
          modified_at: '2024-01-02T00:00:00Z',
          'common:name': [{ '@xml:lang': 'zh', '#text': '中文异常行' }],
          'common:class': [{ '#text': '分类' }],
          referenceToReferenceUnit: 'u-z',
          unit: [],
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValueOnce(query as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('zh map failed');
    });

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', '');

    expect(result).toEqual({
      data: [{ id: 'ug-zh-throw' }],
      page: 1,
      success: true,
      total: 1,
    });
    errorSpy.mockRestore();
  });
});

describe('getUnitGroupTablePgroongaSearch', () => {
  it('maps rpc search results to table rows', async () => {
    const rpcResult = {
      data: [
        {
          id: 'ug-3',
          version: '01.00.001',
          modified_at: '2024-03-01T00:00:00Z',
          team_id: 'team-3',
          total_count: 2,
          json: {
            unitGroupDataSet: {
              unitGroupInformation: {
                dataSetInformation: {
                  'common:name': [
                    { '@xml:lang': 'en', '#text': 'Unit Group Three' },
                    { '@xml:lang': 'zh', '#text': '单位组三' },
                  ],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ '#text': 'Class Three' }],
                    },
                  },
                },
                quantitativeReference: {
                  referenceToReferenceUnit: 'unit-30',
                },
              },
              units: {
                unit: [
                  {
                    '@dataSetInternalID': 'unit-30',
                    name: 'Kilowatt hour',
                    generalComment: [{ '@xml:lang': 'en', '#text': 'Energy unit' }],
                  },
                ],
              },
            },
          },
        },
      ],
      error: null,
    };
    mockRpc.mockResolvedValueOnce(rpcResult as any);

    const result = await getUnitGroupTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'energy',
      {},
      200,
    );

    expect(mockRpc).toHaveBeenCalledWith(
      'pgroonga_search_unitgroups',
      expect.objectContaining({
        query_text: 'energy',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-id',
        state_code: 200,
      }),
    );
    expect(result).toEqual({
      data: [
        {
          key: 'ug-3:01.00.001',
          id: 'ug-3',
          name: 'Unit Group Three',
          classification: 'Class Three',
          refUnitId: 'unit-30',
          refUnitName: 'Kilowatt hour',
          refUnitGeneralComment: 'Energy unit',
          version: '01.00.001',
          modifiedAt: new Date('2024-03-01T00:00:00Z'),
          teamId: 'team-3',
        },
      ],
      page: 1,
      success: true,
      total: 2,
    });
  });

  it('omits state code when parameter is not numeric', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null } as any);

    await getUnitGroupTablePgroongaSearch({} as any, 'en', 'tg', 'energy', { k: 1 }, undefined);

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_unitgroups', {
      query_text: 'energy',
      filter_condition: { k: 1 },
      page_size: 10,
      page_current: 1,
      data_source: 'tg',
      this_user_id: 'user-id',
    });
  });

  it('returns empty success when rpc payload contains no rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null } as any);

    const result = await getUnitGroupTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'none',
      {},
      100,
    );

    expect(result).toEqual({ data: [], success: true });
  });

  it('logs rpc error and returns raw payload when data is absent', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } } as any);

    const result = await getUnitGroupTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'none',
      {},
      100,
    );

    expect(logSpy).toHaveBeenCalledWith('error', { message: 'rpc failed' });
    expect(result).toEqual({ data: null, error: { message: 'rpc failed' } });
    logSpy.mockRestore();
  });

  it('maps zh rpc rows and fills default fields', async () => {
    mockGetCachedClassificationData.mockResolvedValueOnce([
      { '@value': 'z1', '#text': '中文分类' },
    ]);
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ug-zh',
          version: '01.00.100',
          modified_at: '2024-06-01T00:00:00Z',
          team_id: 'team-zh',
          total_count: 4,
          json: {
            unitGroupDataSet: {
              unitGroupInformation: {
                dataSetInformation: {
                  'common:name': [{ '@xml:lang': 'zh', '#text': '中文单位组' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ '@value': 'z1', '#text': '原分类' }],
                    },
                  },
                },
                quantitativeReference: {},
              },
              units: {
                unit: [],
              },
            },
          },
        },
      ],
      error: null,
    } as any);

    const result = await getUnitGroupTablePgroongaSearch(
      {} as any,
      'zh',
      'tg',
      'zh',
      {},
      undefined,
    );

    expect(mockGetCachedClassificationData).toHaveBeenCalledWith('UnitGroup', 'zh', ['all']);
    expect(result).toEqual({
      data: [
        {
          key: 'ug-zh:01.00.100',
          id: 'ug-zh',
          name: '中文单位组',
          classification: '中文分类',
          refUnitId: '-',
          refUnitName: '-',
          refUnitGeneralComment: '-',
          version: '01.00.100',
          modifiedAt: new Date('2024-06-01T00:00:00Z'),
          teamId: 'team-zh',
        },
      ],
      page: 1,
      success: true,
      total: 4,
    });
  });

  it('returns id-only row when zh rpc mapping throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetCachedClassificationData.mockResolvedValueOnce([]);
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ug-zh-err',
          version: '01.00.101',
          modified_at: '2024-06-02T00:00:00Z',
          total_count: 1,
          json: { unitGroupDataSet: {} },
        },
      ],
      error: null,
    } as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('pg zh fail');
    });

    const result = await getUnitGroupTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      'zh',
      {},
      undefined,
    );

    expect(result).toEqual({
      data: [{ id: 'ug-zh-err' }],
      page: 1,
      success: true,
      total: 1,
    });
    errorSpy.mockRestore();
  });

  it('returns id-only row when english rpc mapping throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'ug-en-err',
          version: '01.00.102',
          modified_at: '2024-06-03T00:00:00Z',
          total_count: 1,
          json: { unitGroupDataSet: {} },
        },
      ],
      error: null,
    } as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('pg en fail');
    });

    const result = await getUnitGroupTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'en',
      {},
      undefined,
    );

    expect(result).toEqual({
      data: [{ id: 'ug-en-err' }],
      page: 1,
      success: true,
      total: 1,
    });
    errorSpy.mockRestore();
  });
});

describe('unitgroup_hybrid_search', () => {
  it('delegates to edge function and maps response rows', async () => {
    const rows: any[] = [
      {
        id: 'ug-h1',
        version: '01.00.004',
        modified_at: '2024-04-01T00:00:00Z',
        team_id: 'team-h',
        json: {
          unitGroupDataSet: {
            unitGroupInformation: {
              dataSetInformation: {
                'common:name': [
                  { '@xml:lang': 'en', '#text': 'Hybrid Unit Group' },
                  { '@xml:lang': 'zh', '#text': '混合单位组' },
                ],
                classificationInformation: {
                  'common:classification': {
                    'common:class': [{ '#text': 'Hybrid Class' }],
                  },
                },
              },
              quantitativeReference: {
                referenceToReferenceUnit: 'unit-h',
              },
            },
            units: {
              unit: [
                {
                  '@dataSetInternalID': 'unit-h',
                  name: 'Cubic metre',
                  generalComment: [{ '@xml:lang': 'en', '#text': 'Volume unit' }],
                },
              ],
            },
          },
        },
      },
    ];
    mockFunctionsInvoke.mockResolvedValueOnce({ data: { data: rows, total_count: 3 } } as any);

    const result = await unitgroup_hybrid_search(
      { current: 1, pageSize: 20 },
      'en',
      'tg',
      'hybrid',
      {},
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'unitgroup_hybrid_search',
      expect.objectContaining({
        headers: { Authorization: 'Bearer token' },
        body: { query: 'hybrid', filter: {} },
        region: FunctionRegion.UsEast1,
      }),
    );
    expect(result).toEqual({
      data: [
        {
          key: 'ug-h1:01.00.004',
          id: 'ug-h1',
          name: 'Hybrid Unit Group',
          classification: 'Hybrid Class',
          refUnitId: 'unit-h',
          refUnitName: 'Cubic metre',
          refUnitGeneralComment: 'Volume unit',
          version: '01.00.004',
          modifiedAt: new Date('2024-04-01T00:00:00Z'),
          teamId: 'team-h',
        },
      ],
      page: 1,
      success: true,
      total: 3,
    });
  });

  it('should include total_count from function response', async () => {
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ug-h2',
            version: '01.00.005',
            modified_at: '2024-05-01T00:00:00Z',
            team_id: 'team-h',
            json: {
              unitGroupDataSet: {
                unitGroupInformation: {
                  dataSetInformation: {
                    'common:name': [{ '@xml:lang': 'en', '#text': 'Hybrid Missing Total' }],
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ '#text': 'Hybrid Class' }],
                      },
                    },
                  },
                  quantitativeReference: {
                    referenceToReferenceUnit: 'unit-h',
                  },
                },
                units: {
                  unit: [
                    {
                      '@dataSetInternalID': 'unit-h',
                      name: 'Cubic metre',
                      generalComment: [{ '@xml:lang': 'en', '#text': 'Volume unit' }],
                    },
                  ],
                },
              },
            },
          },
        ],
        total_count: 5,
      },
    } as any);

    const result = await unitgroup_hybrid_search(
      { current: 1, pageSize: 20 },
      'en',
      'tg',
      'hybrid',
      {},
    );

    expect((result as any).total).toBe(5);
  });

  it('includes state code in request body and supports empty bearer fallback', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: undefined,
        },
      },
    });
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { data: [], total_count: 6 },
      error: null,
    } as any);

    const result = await unitgroup_hybrid_search(
      { current: 2, pageSize: 5 },
      'en',
      'my',
      'hybrid',
      { foo: 'bar' },
      400,
    );

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'unitgroup_hybrid_search',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { query: 'hybrid', filter: { foo: 'bar' }, state_code: 400 },
      }),
    );
    expect(result).toEqual({ data: [], success: true, total: 6 });
  });

  it('maps zh hybrid rows and keeps default ref unit fields', async () => {
    mockGetCachedClassificationData.mockResolvedValueOnce([{ '@value': 'z2', '#text': '分类-2' }]);
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ug-hzh',
            version: '02.00.001',
            modified_at: '2024-07-01T00:00:00Z',
            team_id: 'team-hzh',
            json: {
              unitGroupDataSet: {
                unitGroupInformation: {
                  dataSetInformation: {
                    'common:name': [{ '@xml:lang': 'zh', '#text': '混合中文单位组' }],
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [{ '@value': 'z2', '#text': '原分类2' }],
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        total_count: 9,
      },
      error: null,
    } as any);

    const result = await unitgroup_hybrid_search({} as any, 'zh', 'tg', 'hybrid-zh', {}, undefined);

    expect(mockGetCachedClassificationData).toHaveBeenCalledWith('UnitGroup', 'zh', ['all']);
    expect(result).toEqual({
      data: [
        {
          key: 'ug-hzh:02.00.001',
          id: 'ug-hzh',
          name: '混合中文单位组',
          classification: '分类-2',
          refUnitId: '-',
          refUnitName: '-',
          refUnitGeneralComment: '-',
          version: '02.00.001',
          modifiedAt: new Date('2024-07-01T00:00:00Z'),
          teamId: 'team-hzh',
        },
      ],
      page: 1,
      success: true,
      total: 9,
    });
  });

  it('logs invoke errors and returns raw response when payload shape is invalid', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: { data: null },
      error: { message: 'hybrid failed' },
    } as any);

    const result = await unitgroup_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'broken',
      {},
      undefined,
    );

    expect(logSpy).toHaveBeenCalledWith('error', { message: 'hybrid failed' });
    expect(result).toEqual({ data: { data: null }, error: { message: 'hybrid failed' } });
    logSpy.mockRestore();
  });

  it('returns id-only row when zh hybrid mapping throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetCachedClassificationData.mockResolvedValueOnce([]);
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ug-hzh-err',
            version: '02.00.100',
            modified_at: '2024-07-02T00:00:00Z',
            json: { unitGroupDataSet: {} },
          },
        ],
        total_count: 2,
      },
      error: null,
    } as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('hybrid zh fail');
    });

    const result = await unitgroup_hybrid_search(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      'zh',
      {},
      undefined,
    );

    expect(result).toEqual({
      data: [{ id: 'ug-hzh-err' }],
      page: 1,
      success: true,
      total: 2,
    });
    errorSpy.mockRestore();
  });

  it('returns id-only row when english hybrid mapping throws', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockFunctionsInvoke.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'ug-hen-err',
            version: '02.00.101',
            modified_at: '2024-07-03T00:00:00Z',
            json: { unitGroupDataSet: {} },
          },
        ],
        total_count: 1,
      },
      error: null,
    } as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('hybrid en fail');
    });

    const result = await unitgroup_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'en',
      {},
      undefined,
    );

    expect(result).toEqual({
      data: [{ id: 'ug-hen-err' }],
      page: 1,
      success: true,
      total: 1,
    });
    errorSpy.mockRestore();
  });
});

describe('getUnitGroupDetail', () => {
  it('delegates to shared data detail loader', async () => {
    mockGetDataDetail.mockResolvedValueOnce({ data: { id: 'ug-1' } });

    const result = await getUnitGroupDetail('ug-1', '01.00.000');

    expect(mockGetDataDetail).toHaveBeenCalledWith('ug-1', '01.00.000', 'unitgroups');
    expect(result).toEqual({ data: { id: 'ug-1' } });
  });
});

describe('getReferenceUnits', () => {
  const validId = '11111111-1111-1111-1111-111111111111';

  it('returns reference units matching requested ids and versions', async () => {
    const supabaseResult = {
      data: [
        {
          id: validId,
          version: '01.00.002',
          'common:name': 'Mass units',
          referenceToReferenceUnit: 'u-1',
          unit: [
            {
              '@dataSetInternalID': 'u-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
            },
            {
              '@dataSetInternalID': 'u-2',
              name: 'Gram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'g' }],
            },
          ],
        },
        {
          id: validId,
          version: '01.00.010',
          'common:name': 'Mass units latest',
          referenceToReferenceUnit: 'u-2',
          unit: [
            {
              '@dataSetInternalID': 'u-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
            },
            {
              '@dataSetInternalID': 'u-2',
              name: 'Gram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'g' }],
            },
          ],
        },
      ],
    };
    const query = createQuery(supabaseResult);
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getReferenceUnits([
      { id: validId, version: '01.00.002' },
      { id: validId, version: '01.00.010' },
    ]);

    expect(mockFrom).toHaveBeenCalledWith('unitgroups');
    expect(query.calls.selectArgs).toEqual([expect.stringContaining('json->unitGroupDataSet')]);
    // getReferenceUnits uses .in() for ID filtering, not .or()
    // Note: The same ID appears twice in params (for different versions), so values array contains duplicates
    expect(query.calls.inArgs).toEqual([{ field: 'id', values: [validId, validId] }]);
    expect(query.calls.orderArgs).toEqual([{ field: 'version', options: { ascending: false } }]);
    expect(result).toEqual({
      data: [
        {
          id: validId,
          version: '01.00.002',
          name: 'Mass units',
          refUnitId: 'u-1',
          refUnitName: 'Kilogram',
          refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
          unit: [
            {
              '@dataSetInternalID': 'u-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
            },
            {
              '@dataSetInternalID': 'u-2',
              name: 'Gram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'g' }],
            },
          ],
        },
        {
          id: validId,
          version: '01.00.010',
          name: 'Mass units latest',
          refUnitId: 'u-2',
          refUnitName: 'Gram',
          refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'g' }],
          unit: [
            {
              '@dataSetInternalID': 'u-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
            },
            {
              '@dataSetInternalID': 'u-2',
              name: 'Gram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'g' }],
            },
          ],
        },
      ],
      success: true,
    });
  });

  it('returns failure when no valid ids are provided', async () => {
    // When IDs are filtered out (not 36 chars), function returns early without DB call
    const result = await getReferenceUnits([{ id: 'short-id', version: '01.00.000' }]);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual({ data: [], success: false });
  });

  it('falls back to latest version when requested version is missing', async () => {
    const supabaseResult = {
      data: [
        {
          id: validId,
          version: '01.00.011',
          'common:name': 'Latest Unit Group',
          referenceToReferenceUnit: 'u-latest',
          unit: [{ '@dataSetInternalID': 'u-latest', name: 'Newest unit' }],
        },
      ],
    };
    const query = createQuery(supabaseResult);
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getReferenceUnits([{ id: validId, version: '01.00.001' }]);

    expect(result).toEqual({
      data: [
        {
          id: validId,
          version: '01.00.011',
          name: 'Latest Unit Group',
          refUnitId: 'u-latest',
          refUnitName: 'Newest unit',
          refUnitGeneralComment: undefined,
          unit: [{ '@dataSetInternalID': 'u-latest', name: 'Newest unit' }],
        },
      ],
      success: true,
    });
  });

  it('returns failure when query succeeds but no records are found', async () => {
    const query = createQuery({ data: [] });
    mockFrom.mockReturnValueOnce(query as any);

    const result = await getReferenceUnits([{ id: validId, version: '01.00.000' }]);

    expect(result).toEqual({ data: [], success: false });
  });
});

describe('getReferenceUnit', () => {
  const validId = '22222222-2222-2222-2222-222222222222';

  it('returns latest version when requested version is missing', async () => {
    const emptyQuery = createQuery({ data: [], error: null });
    const latestQuery = createQuery({
      data: [
        {
          id: validId,
          version: '01.00.003',
          'common:name': 'Energy units',
          referenceToReferenceUnit: 'u-10',
          unit: [
            {
              '@dataSetInternalID': 'u-10',
              name: 'Megajoule',
              generalComment: [{ '@xml:lang': 'en', '#text': 'MJ' }],
            },
          ],
        },
      ],
    });
    mockFrom.mockReturnValueOnce(emptyQuery as any).mockReturnValueOnce(latestQuery as any);

    const result = await getReferenceUnit(validId, '01.00.010');

    expect(mockFrom).toHaveBeenCalledWith('unitgroups');
    expect(emptyQuery.calls.eqArgs).toEqual([
      { field: 'id', value: validId },
      { field: 'version', value: '01.00.010' },
    ]);
    expect(latestQuery.calls.orderArgs).toEqual([
      { field: 'version', options: { ascending: false } },
    ]);
    expect(latestQuery.calls.rangeArgs).toEqual({ from: 0, to: 0 });
    expect(result).toEqual({
      data: {
        id: validId,
        version: '01.00.003',
        name: 'Energy units',
        refUnitId: 'u-10',
        refUnitName: 'Megajoule',
        refUnitGeneralComment: [{ '@xml:lang': 'en', '#text': 'MJ' }],
        unit: [
          {
            '@dataSetInternalID': 'u-10',
            name: 'Megajoule',
            generalComment: [{ '@xml:lang': 'en', '#text': 'MJ' }],
          },
        ],
      },
      success: true,
    });
  });

  it('returns undefined when id is invalid', async () => {
    const result = await getReferenceUnit('short-id', '01.00.000');

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('returns latest version directly when version is omitted', async () => {
    const latestQuery = createQuery({
      data: [
        {
          id: validId,
          version: '01.00.020',
          'common:name': 'No Version Input',
          referenceToReferenceUnit: undefined,
          unit: [],
        },
      ],
    });
    mockFrom.mockReturnValueOnce(latestQuery as any);

    const result = await getReferenceUnit(validId, '');

    expect(latestQuery.calls.eqArgs).toEqual([{ field: 'id', value: validId }]);
    expect(latestQuery.calls.orderArgs).toEqual([
      { field: 'version', options: { ascending: false } },
    ]);
    expect(latestQuery.calls.rangeArgs).toEqual({ from: 0, to: 0 });
    expect(result).toEqual({
      data: {
        id: validId,
        version: '01.00.020',
        name: 'No Version Input',
        refUnitId: '-',
        refUnitName: '-',
        refUnitGeneralComment: undefined,
        unit: [],
      },
      success: true,
    });
  });

  it('returns failure payload when valid id lookup has no data', async () => {
    const emptyQuery = createQuery({ data: [], error: null });
    const latestEmptyQuery = createQuery({ data: [], error: null });
    mockFrom.mockReturnValueOnce(emptyQuery as any).mockReturnValueOnce(latestEmptyQuery as any);

    const result = await getReferenceUnit(validId, '01.00.999');

    expect(result).toEqual({
      data: null,
      success: false,
    });
  });
});
