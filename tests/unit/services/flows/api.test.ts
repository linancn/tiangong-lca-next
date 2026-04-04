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

jest.mock('@/services/locations/api', () => ({
  getILCDLocationByValues: jest.fn(),
}));

const { getILCDLocationByValues: mockGetILCDLocationByValues } = jest.requireMock(
  '@/services/locations/api',
);

jest.mock('@/services/locations/cache', () => ({
  getCachedLocationData: jest.fn(),
}));

jest.mock('@/services/classifications/cache', () => ({
  getCachedFlowCategorizationAll: jest.fn(),
}));

const { getCachedLocationData: mockGetCachedLocationData } = jest.requireMock(
  '@/services/locations/cache',
);
const { getCachedFlowCategorizationAll: mockGetCachedFlowCategorizationAll } = jest.requireMock(
  '@/services/classifications/cache',
);

jest.mock('@/services/general/api', () => ({
  getDataDetail: jest.fn(),
  getTeamIdByUserId: jest.fn(),
  invokeDatasetCommand: jest.fn(),
  normalizeLangPayloadForSave: jest.fn(),
}));

const {
  getDataDetail: mockGetDataDetail,
  getTeamIdByUserId: mockGetTeamIdByUserId,
  invokeDatasetCommand: mockInvokeDatasetCommand,
  normalizeLangPayloadForSave: mockNormalizeLangPayloadForSave,
} = jest.requireMock('@/services/general/api');

class MockQuery<T = any> {
  public calls = {
    deleteCalled: false,
    insertArgs: undefined as any,
    selectArgs: undefined as any,
    orderArgs: [] as Array<{ field: string; options?: any }>,
    rangeArgs: undefined as any,
    eqArgs: [] as Array<{ field: string; value: any }>,
    inArgs: [] as Array<{ field: string; values: any }>,
    filterArgs: [] as Array<{ field: string; operator: string; value: any }>,
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

  filter(field: string, operator: string, value: any) {
    this.calls.filterArgs.push({ field, operator, value });
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

  mockGetDataDetail.mockResolvedValue({ data: null });
  mockGetTeamIdByUserId.mockResolvedValue(null);
  mockInvokeDatasetCommand.mockResolvedValue({
    data: [],
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  });
  mockNormalizeLangPayloadForSave.mockImplementation(async (payload: any) => ({
    payload,
    validationError: undefined,
  }));

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

  it('returns a language validation error when normalization fails', async () => {
    mockNormalizeLangPayloadForSave.mockResolvedValue({
      payload: undefined,
      validationError: 'English translation required',
    });

    const result = await createFlows('flow-id', { name: 'Flow payload' });

    expect(mockFrom).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        data: null,
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        error: expect.objectContaining({
          code: 'LANG_VALIDATION_ERROR',
          message: 'English translation required',
        }),
      }),
    );
  });
});

describe('updateFlows', () => {
  it('invokes supabase edge function with ordered data', async () => {
    const updateResult = {
      data: [{ id: 'flow-id', rule_verification: true }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    };
    mockInvokeDatasetCommand.mockResolvedValue(updateResult);

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockGenFlowJsonOrdered).toHaveBeenCalledWith('flow-id', { name: 'Updated flow' });
    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith(
      'app_dataset_save_draft',
      {
        id: 'flow-id',
        version: '01.00.000',
        table: 'flows',
        jsonOrdered: expect.objectContaining({ id: 'flow-id' }),
      },
      {
        ruleVerification: true,
      },
    );
    expect(response).toBe(updateResult);
  });

  it('returns undefined when no active session is found', async () => {
    mockInvokeDatasetCommand.mockResolvedValue(undefined);

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockInvokeDatasetCommand).toHaveBeenCalled();
    expect(response).toBeUndefined();
  });

  it('logs edge-function errors and returns the resolved error payload', async () => {
    const mockError = { message: 'update failed', code: 'FUNCTION_ERROR', details: '', hint: '' };
    mockInvokeDatasetCommand.mockResolvedValue({
      data: null,
      error: mockError,
      count: null,
      status: 500,
      statusText: 'FUNCTION_ERROR',
    });

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(response).toEqual({
      data: null,
      error: mockError,
      count: null,
      status: 500,
      statusText: 'FUNCTION_ERROR',
    });
  });

  it('returns a language validation error before invoking the update edge function', async () => {
    mockNormalizeLangPayloadForSave.mockResolvedValue({
      payload: undefined,
      validationError: 'Missing english base name',
    });

    const response = await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockInvokeDatasetCommand).not.toHaveBeenCalled();
    expect(response).toEqual(
      expect.objectContaining({
        data: null,
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        error: expect.objectContaining({
          code: 'LANG_VALIDATION_ERROR',
          message: 'Missing english base name',
        }),
      }),
    );
  });

  it('uses an empty bearer token when the session lacks an access token', async () => {
    mockInvokeDatasetCommand.mockResolvedValue({
      data: [{ id: 'flow-id', rule_verification: true }],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });

    await updateFlows('flow-id', '01.00.000', { name: 'Updated flow' });

    expect(mockInvokeDatasetCommand).toHaveBeenCalledWith(
      'app_dataset_save_draft',
      expect.objectContaining({
        id: 'flow-id',
        version: '01.00.000',
        table: 'flows',
      }),
      expect.objectContaining({
        ruleVerification: true,
      }),
    );
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

  it('falls back to the raw location code when location lookups return no normalized rows', async () => {
    const tableResult = {
      data: [
        {
          id: 'flow-raw-location',
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
          locationOfSupply: 'US',
        },
      ],
      count: 1,
      error: null,
    };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValue(query as any);
    mockGetCachedLocationData.mockResolvedValue(null);
    mockGetILCDLocationByValues.mockResolvedValue(null);

    const result = await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'en',
      'tg',
      '',
    );

    expect(result.data[0].locationOfSupply).toBe('US');
  });

  it('applies single classification filter', async () => {
    const tableResult = { data: [], count: 0, error: null };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValue(query as any);

    await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'en',
      'tg',
      '',
      {
        classification: [{ scope: 'elementary', code: '0' }],
      },
    );

    expect(query.calls.filterArgs).toContainEqual({
      field:
        'json->flowDataSet->flowInformation->dataSetInformation->classificationInformation->"common:elementaryFlowCategorization"->"common:category"',
      operator: 'cs',
      value: JSON.stringify([{ '@catId': '0' }]),
    });
  });

  it('applies multiple classification filters with or', async () => {
    const tableResult = { data: [], count: 0, error: null };
    const query = createQuery(tableResult);
    mockFrom.mockReturnValue(query as any);

    await getFlowTableAll(
      { current: 1, pageSize: 10 },
      { modified_at: 'descend' },
      'en',
      'tg',
      '',
      {
        classification: [
          { scope: 'elementary', code: '0' },
          { scope: 'classification', code: '01' },
        ],
      },
    );

    expect(query.calls.orArgs).toContain(
      'json->flowDataSet->flowInformation->dataSetInformation->classificationInformation->"common:elementaryFlowCategorization"->"common:category".cs.[{"@catId":"0"}],json->flowDataSet->flowInformation->dataSetInformation->classificationInformation->"common:classification"->"common:class".cs.[{"@classId":"01"}]',
    );
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

  it('applies single flow type filters and company team filters', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'co', 'team-co', {
      flowType: 'Product flow',
    });

    expect(query.calls.eqArgs).toEqual(
      expect.arrayContaining([
        {
          field: 'json->flowDataSet->modellingAndValidation->LCIMethod->>typeOfDataSet',
          value: 'Product flow',
        },
        { field: 'state_code', value: 200 },
        { field: 'team_id', value: 'team-co' },
      ]),
    );
    expect(result).toEqual({ data: [], success: true });
  });

  it('applies TianGong team filters and logs query errors before returning empty success', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    const query = createQuery({ data: [], count: 0, error: { message: 'query failed' } });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', 'team-tg');

    expect(query.calls.eqArgs).toEqual(
      expect.arrayContaining([
        { field: 'state_code', value: 100 },
        { field: 'team_id', value: 'team-tg' },
      ]),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'query failed' });
    expect(result).toEqual({ data: [], success: true });
    consoleLogSpy.mockRestore();
  });

  it('returns empty success when team dataset has no team id', async () => {
    mockGetTeamIdByUserId.mockResolvedValue(null);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', '');

    expect(result).toEqual({ data: [], success: true });
    expect(mockGetCachedLocationData).not.toHaveBeenCalled();
  });

  it('filters team datasets by the resolved team id', async () => {
    const query = createQuery({ data: [], count: 0, error: null });
    mockFrom.mockReturnValue(query as any);
    mockGetTeamIdByUserId.mockResolvedValue('team-42');

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', '');

    expect(query.calls.eqArgs).toEqual(
      expect.arrayContaining([{ field: 'team_id', value: 'team-42' }]),
    );
    expect(result).toEqual({ data: [], success: true });
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

  it('uses sparse chinese table fallbacks when localized flow rows omit optional fields', async () => {
    const query = createQuery({
      data: [
        {
          id: 'flow-zh-defaults',
          version: '01.00.018',
          modified_at: '2024-01-18T00:00:00Z',
          classificationInformation: {
            'common:classification': {
              'common:class': [],
            },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [],
    });

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', '');

    expect(result.data[0]).toEqual({
      key: 'flow-zh-defaults:01.00.018',
      id: 'flow-zh-defaults',
      name: '-',
      flowType: '-',
      classification: '',
      synonyms: '-',
      CASNumber: '-',
      refFlowPropertyId: '-',
      locationOfSupply: '-',
      version: '01.00.018',
      modifiedAt: new Date('2024-01-18T00:00:00Z'),
      teamId: undefined,
    });
  });

  it('returns id-only rows when english table mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const query = createQuery({
      data: [
        {
          id: 'flow-table-bad-en',
          version: '01.00.009',
          modified_at: '2024-01-09T00:00:00Z',
          team_id: 'team-en',
          name: {},
          typeOfDataSet: 'Product flow',
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '#text': 'Products' }],
            },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('english mapping failed');
    });

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', '');

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-table-bad-en' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
  });

  it('returns id-only rows when chinese table mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const query = createQuery({
      data: [
        {
          id: 'flow-table-bad-zh',
          version: '01.00.010',
          modified_at: '2024-01-10T00:00:00Z',
          team_id: 'team-zh',
          name: {},
          typeOfDataSet: 'Elementary flow',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '@value': 'Air', '#text': 'Air' }],
            },
          },
        },
      ],
      count: 1,
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
      category: [],
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('chinese mapping failed');
    });

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'zh', 'tg', '');

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-table-bad-zh' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
  });

  it('returns failure when the table query resolves without data', async () => {
    const query = createQuery({ data: null, count: 0, error: null });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'tg', '');

    expect(result).toEqual({ data: [], success: false });
  });

  it('uses default pagination and sparse-field fallbacks for english table rows', async () => {
    const query = createQuery({
      data: [
        {
          id: 'flow-defaults',
          version: '01.00.014',
          modified_at: '2024-01-14T00:00:00Z',
          classificationInformation: {},
        },
      ],
      count: undefined,
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockGetCachedLocationData.mockResolvedValue([]);
    mockGetILCDLocationByValues.mockResolvedValue([]);

    const result = await getFlowTableAll({}, {}, 'en', 'tg', '');

    expect(query.calls.rangeArgs).toEqual({ from: 0, to: 9 });
    expect(result).toEqual({
      data: [
        {
          key: 'flow-defaults:01.00.014',
          id: 'flow-defaults',
          name: '-',
          flowType: '-',
          classification: '',
          synonyms: '-',
          CASNumber: '-',
          refFlowPropertyId: '-',
          locationOfSupply: '-',
          version: '01.00.014',
          modifiedAt: new Date('2024-01-14T00:00:00Z'),
          teamId: undefined,
        },
      ],
      page: 1,
      success: true,
      total: 0,
    });
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

  it('maps chinese PGroonga elementary flows and falls back to dash when location is missing', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-zh-search-elementary',
          version: '01.00.008',
          modified_at: '2024-01-08T00:00:00Z',
          team_id: 'team-zh',
          total_count: 1,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  name: {
                    baseName: [{ '@xml:lang': 'zh', '#text': '排放' }],
                  },
                  classificationInformation: {
                    'common:elementaryFlowCategorization': {
                      'common:category': [{ '@value': 'Air', '#text': 'Air' }],
                    },
                  },
                  'common:synonyms': [{ '@xml:lang': 'zh', '#text': '气体' }],
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
      error: null,
    });
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
      category: [],
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      '排放',
      {},
    );

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-zh-search-elementary',
        classification: '空气',
        locationOfSupply: '-',
      }),
    );
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

  it('falls back to id-only rows when chinese PGroonga mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-pgroonga-bad-zh',
          version: '01.00.011',
          modified_at: '2024-01-11T00:00:00Z',
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
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
      category: [],
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('pgroonga zh parse failed');
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      'bad',
      {},
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-pgroonga-bad-zh' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
  });

  it('passes classification filters to rpc search', async () => {
    mockRpc.mockResolvedValue({ data: [] });

    await getFlowTablePgroongaSearch({ current: 1, pageSize: 5 }, 'en', 'tg', 'steel', {
      flowType: 'Product flow',
      classification: [{ scope: 'classification', code: '01' }],
    });

    expect(mockRpc).toHaveBeenCalledWith(
      'pgroonga_search_flows_v1',
      expect.objectContaining({
        filter_condition: {
          flowType: 'Product flow',
          classification: [{ scope: 'classification', code: '01' }],
        },
      }),
    );
  });

  it('uses default rpc pagination and sparse chinese fallbacks when state code is provided', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-pgroonga-defaults-zh',
          version: '01.00.015',
          modified_at: '2024-01-15T00:00:00Z',
          total_count: undefined,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
        },
      ],
      error: null,
    });
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [],
    });

    const result = await getFlowTablePgroongaSearch({}, 'zh', 'my', 'steel', {}, 300);

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_flows_v1', {
      query_text: 'steel',
      filter_condition: {},
      page_size: 10,
      page_current: 1,
      data_source: 'my',
      state_code: 300,
      order_by: undefined,
    });
    expect(result).toEqual({
      data: [
        {
          key: 'flow-pgroonga-defaults-zh:01.00.015',
          id: 'flow-pgroonga-defaults-zh',
          name: '-',
          synonyms: '-',
          flowType: '-',
          classification: '',
          CASNumber: '-',
          locationOfSupply: '-',
          version: '01.00.015',
          modifiedAt: new Date('2024-01-15T00:00:00Z'),
          teamId: undefined,
        },
      ],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('uses default rpc pagination for non-state-code PGroonga searches', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    await getFlowTablePgroongaSearch({}, 'en', 'tg', 'default-query', {});

    expect(mockRpc).toHaveBeenCalledWith('pgroonga_search_flows_v1', {
      query_text: 'default-query',
      filter_condition: {},
      page_size: 10,
      page_current: 1,
      data_source: 'tg',
      order_by: undefined,
    });
  });

  it('uses sparse english PGroonga field fallbacks', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'flow-pgroonga-defaults-en',
          version: '01.00.019',
          modified_at: '2024-01-19T00:00:00Z',
          total_count: 1,
          json: {
            flowDataSet: {
              flowInformation: {
                dataSetInformation: {
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
        },
      ],
      error: null,
    });

    const result = await getFlowTablePgroongaSearch(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'fallbacks',
      {},
    );

    expect(result.data[0]).toEqual({
      key: 'flow-pgroonga-defaults-en:01.00.019',
      id: 'flow-pgroonga-defaults-en',
      name: '-',
      synonyms: '-',
      classification: '',
      flowType: '-',
      CASNumber: '-',
      locationOfSupply: '-',
      version: '01.00.019',
      modifiedAt: new Date('2024-01-19T00:00:00Z'),
      teamId: undefined,
    });
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

  it('uses an empty bearer token and default pagination when hybrid search has sparse metadata', async () => {
    mockAuthGetSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: 'user-id' },
        },
      },
    });
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [],
      },
      error: null,
    });

    const result = await flow_hybrid_search({}, 'en', 'tg', 'steam', {});

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'flow_hybrid_search',
      expect.objectContaining({
        headers: { Authorization: 'Bearer ' },
        body: { query: 'steam', filter: {} },
      }),
    );
    expect(result).toEqual({
      data: [],
      page: 1,
      success: true,
      total: 0,
    });
  });

  it('passes classification filters to hybrid search function', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [],
        total_count: 0,
      },
    });

    await flow_hybrid_search({ current: 1, pageSize: 10 }, 'en', 'tg', 'steam', {
      flowType: 'Product flow',
      classification: [{ scope: 'classification', code: '01' }],
    });

    expect(mockFunctionsInvoke).toHaveBeenCalledWith(
      'flow_hybrid_search',
      expect.objectContaining({
        body: {
          query: 'steam',
          filter: {
            flowType: 'Product flow',
            classification: [{ scope: 'classification', code: '01' }],
          },
        },
      }),
    );
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

  it('maps chinese elementary hybrid results with localized categories', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-zh-elementary',
            version: '01.00.012',
            modified_at: '2024-01-12T00:00:00Z',
            team_id: 'team-zh',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    name: {
                      baseName: [{ '@xml:lang': 'zh', '#text': '排放到空气' }],
                    },
                    classificationInformation: {
                      'common:elementaryFlowCategorization': {
                        'common:category': [{ '@value': 'Air', '#text': 'Air' }],
                      },
                    },
                    'common:synonyms': [{ '@xml:lang': 'zh', '#text': '废气' }],
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
      error: null,
    });
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
      category: [],
    });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'zh', 'tg', '排放', {});

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-hybrid-zh-elementary',
        classification: '空气',
        locationOfSupply: '-',
      }),
    );
  });

  it('uses sparse chinese hybrid field fallbacks', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-zh-fallbacks',
            version: '01.00.016',
            modified_at: '2024-01-16T00:00:00Z',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [],
                      },
                    },
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
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [],
      category: [],
    });

    const result = await flow_hybrid_search(
      { current: 1, pageSize: 10 },
      'zh',
      'tg',
      'fallback',
      {},
    );

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-hybrid-zh-fallbacks',
        name: '-',
        synonyms: '-',
        flowType: '-',
      }),
    );
  });

  it('falls back to id-only rows when chinese hybrid mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-bad-zh',
            version: '01.00.013',
            modified_at: '2024-01-13T00:00:00Z',
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
    mockGetCachedFlowCategorizationAll.mockResolvedValue({
      categoryElementaryFlow: [{ '@value': 'Air', '#text': '空气' }],
      category: [],
    });
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('hybrid zh parse failed');
    });

    const result = await flow_hybrid_search({ current: 1, pageSize: 10 }, 'zh', 'tg', 'bad', {});

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      data: [{ id: 'flow-hybrid-bad-zh' }],
      page: 1,
      success: true,
      total: 1,
    });
    consoleErrorSpy.mockRestore();
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

  it('maps english hybrid classification fallbacks for non-elementary sparse rows', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-en-fallbacks',
            version: '01.00.017',
            modified_at: '2024-01-17T00:00:00Z',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [],
                      },
                    },
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
        total_count: 1,
      },
      error: null,
    });

    const result = await flow_hybrid_search(
      { current: 1, pageSize: 10 },
      'en',
      'tg',
      'fallback',
      {},
    );

    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 'flow-hybrid-en-fallbacks',
        name: '-',
        classification: '',
        flowType: 'Product flow',
      }),
    );
  });

  it('uses sparse english hybrid field fallbacks and default page numbers', async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: {
        data: [
          {
            id: 'flow-hybrid-en-defaults',
            version: '01.00.020',
            modified_at: '2024-01-20T00:00:00Z',
            json: {
              flowDataSet: {
                flowInformation: {
                  dataSetInformation: {
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [],
                      },
                    },
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

    const result = await flow_hybrid_search({}, 'en', 'tg', 'fallback-defaults', {});

    expect(result).toEqual({
      data: [
        {
          key: 'flow-hybrid-en-defaults:01.00.020',
          id: 'flow-hybrid-en-defaults',
          name: '-',
          synonyms: '-',
          classification: '',
          flowType: '-',
          CASNumber: '-',
          locationOfSupply: '-',
          version: '01.00.020',
          modifiedAt: new Date('2024-01-20T00:00:00Z'),
          teamId: undefined,
        },
      ],
      page: 1,
      success: true,
      total: 1,
    });
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

  it('uses sparse property fallbacks when a matched flow property entry is missing', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({
      data: [
        {
          id: flowId,
          version: '03.00.000',
          referenceToReferenceFlowProperty: 'missing',
          flowProperty: [],
        },
      ],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowProperties([{ id: flowId, version: '03.00.000' }]);

    expect(result).toEqual({
      data: [
        {
          id: flowId,
          version: '03.00.000',
          name: '-',
          typeOfDataSet: '-',
          refFlowPropertytId: '-',
          refFlowPropertyShortDescription: {},
        },
      ],
      success: true,
    });
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

  it('loads the latest version directly when no version is provided', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({
      data: [
        {
          id: flowId,
          version: '02.00.000',
          name: {
            baseName: [{ '@xml:lang': 'en', '#text': 'Steam' }],
          },
          referenceToReferenceFlowProperty: '1',
          flowProperty: [
            {
              '@dataSetInternalID': '1',
              referenceToFlowPropertyDataSet: {
                '@refObjectId': 'prop-latest',
                shortDescription: { '@xml:lang': 'en', '#text': 'Energy' },
              },
            },
          ],
        },
      ],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getReferenceProperty(flowId, '');

    expect(query.calls.orderArgs).toEqual([{ field: 'version', options: { ascending: false } }]);
    expect(query.calls.rangeArgs).toEqual({ from: 0, to: 0 });
    expect(result).toEqual({
      data: {
        id: flowId,
        version: '02.00.000',
        name: {
          baseName: [{ '@xml:lang': 'en', '#text': 'Steam' }],
        },
        refFlowPropertytId: 'prop-latest',
        refFlowPropertyShortDescription: { '@xml:lang': 'en', '#text': 'Energy' },
      },
      success: true,
    });
  });

  it('uses sparse reference-property fallbacks when the reference entry is missing', async () => {
    const flowId = '11111111-1111-1111-1111-111111111111';
    const query = createQuery({
      data: [
        {
          id: flowId,
          version: '04.00.000',
          flowProperty: [],
          referenceToReferenceFlowProperty: 'missing',
        },
      ],
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getReferenceProperty(flowId, '04.00.000');

    expect(result).toEqual({
      data: {
        id: flowId,
        version: '04.00.000',
        name: '-',
        refFlowPropertytId: '-',
        refFlowPropertyShortDescription: {},
      },
      success: true,
    });
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

  it('maps english elementary state-code lookups', async () => {
    const query = createQuery({
      data: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          version: '01.00.000',
          state_code: 200,
          typeOfDataSet: 'Elementary flow',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '#text': 'Air' }],
            },
          },
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(query as any);

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '44444444-4444-4444-4444-444444444444', version: '01.00.000' }],
      'en',
    );

    expect(result).toEqual({
      error: null,
      data: [
        {
          key: '44444444-4444-4444-4444-444444444444:01.00.000',
          id: '44444444-4444-4444-4444-444444444444',
          version: '01.00.000',
          stateCode: 200,
          classification: 'Air',
        },
      ],
    });
  });

  it('localizes chinese non-elementary state-code lookups', async () => {
    const query = createQuery({
      data: [
        {
          id: '55555555-5555-5555-5555-555555555555',
          version: '01.00.000',
          state_code: 100,
          typeOfDataSet: 'Product flow',
          locationOfSupply: 'CN',
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '@value': 'Products', '#text': 'Products' }],
            },
          },
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
      category: [{ '@value': 'Products', '#text': '产品' }],
      categoryElementaryFlow: [],
    });

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '55555555-5555-5555-5555-555555555555', version: '01.00.000' }],
      'zh',
    );

    expect(result).toEqual({
      error: null,
      data: [
        {
          key: '55555555-5555-5555-5555-555555555555:01.00.000',
          id: '55555555-5555-5555-5555-555555555555',
          version: '01.00.000',
          stateCode: 100,
          classification: '产品',
          locationOfSupply: '中国',
        },
      ],
    });
  });

  it('falls back to id-only rows when english state-code mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const query = createQuery({
      data: [
        {
          id: '66666666-6666-6666-6666-666666666666',
          version: '01.00.000',
          state_code: 100,
          typeOfDataSet: 'Product flow',
          classificationInformation: {
            'common:classification': {
              'common:class': [{ '#text': 'Products' }],
            },
          },
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(query as any);
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('state-code parse failed');
    });

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '66666666-6666-6666-6666-666666666666', version: '01.00.000' }],
      'en',
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      error: null,
      data: [{ id: '66666666-6666-6666-6666-666666666666' }],
    });
    consoleErrorSpy.mockRestore();
  });

  it('falls back to id-only rows when chinese state-code mapping throws', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const query = createQuery({
      data: [
        {
          id: '77777777-7777-7777-7777-777777777777',
          version: '01.00.000',
          state_code: 100,
          typeOfDataSet: 'Elementary flow',
          locationOfSupply: 'CN',
          classificationInformation: {
            'common:elementaryFlowCategorization': {
              'common:category': [{ '@value': 'Air', '#text': 'Air' }],
            },
          },
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
    mockJsonToList.mockImplementationOnce(() => {
      throw new Error('zh state-code parse failed');
    });

    const result = await getFlowStateCodeByIdsAndVersions(
      [{ id: '77777777-7777-7777-7777-777777777777', version: '01.00.000' }],
      'zh',
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result).toEqual({
      error: null,
      data: [{ id: '77777777-7777-7777-7777-777777777777' }],
    });
    consoleErrorSpy.mockRestore();
  });
});
