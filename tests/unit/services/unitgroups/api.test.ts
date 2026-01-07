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
  getRuleVerification: jest.fn(),
}));

const {
  classificationToString: mockClassificationToString,
  genClassificationZH: mockGenClassificationZH,
  getLangText: mockGetLangText,
  jsonToList: mockJsonToList,
  getRuleVerification: mockGetRuleVerification,
} = jest.requireMock('@/services/general/util');

jest.mock('@/services/ilcd/api', () => ({
  getILCDClassification: jest.fn(),
}));

const { getILCDClassification: mockGetILCDClassification } =
  jest.requireMock('@/services/ilcd/api');

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
  mockGetRuleVerification.mockReturnValue({ valid: true });
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
  mockGetILCDClassification.mockResolvedValue({ data: [] });
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
    mockGetILCDClassification.mockResolvedValueOnce({
      data: [{ '@value': 'c-1', '#text': '中文分类' }],
    });

    const result = await getUnitGroupTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', '');

    expect(mockGetILCDClassification).toHaveBeenCalledWith('UnitGroup', 'zh', ['all']);
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
          version: '01.00.001',
          'common:name': 'Mass units (previous)',
          referenceToReferenceUnit: 'u-1',
          unit: [
            {
              '@dataSetInternalID': 'u-1',
              name: 'Kilogram',
              generalComment: [{ '@xml:lang': 'en', '#text': 'kg' }],
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
      ],
      success: true,
    });
  });

  it('returns failure when no valid ids are provided', async () => {
    const result = await getReferenceUnits([{ id: 'short-id', version: '01.00.000' }]);

    expect(mockFrom).not.toHaveBeenCalled();
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
});
