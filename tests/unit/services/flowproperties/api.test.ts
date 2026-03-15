/**
 * Tests for flowproperties service API functions
 * Path: src/services/flowproperties/api.ts
 *
 * Coverage focuses on:
 * - createFlowproperties: Create new flow property with validation
 * - updateFlowproperties: Update existing flow property via edge function
 * - deleteFlowproperties: Delete flow property by ID and version
 * - getFlowpropertyTableAll: Fetch flow properties with pagination and filtering
 * - getFlowpropertyTablePgroongaSearch: Full-text search for flow properties
 */

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createFlowProperty: jest.fn(),
}));

import {
  createFlowproperties,
  deleteFlowproperties,
  flowproperty_hybrid_search,
  getFlowpropertyDetail,
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
  getReferenceUnitGroup,
  getReferenceUnitGroups,
  updateFlowproperties,
} from '@/services/flowproperties/api';
import { FunctionRegion } from '@supabase/supabase-js';
import { createMockSession, createQueryBuilder } from '../../../helpers/mockBuilders';
import { mockILCDClassificationResponse, mockMultilingualText } from '../../../helpers/testData';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

jest.mock('@/services/flowproperties/util', () => ({
  genFlowpropertyJsonOrdered: jest.fn(),
}));

jest.mock('@/services/general/util', () => ({
  classificationToString: jest.fn(),
  genClassificationZH: jest.fn(),
  getLangText: jest.fn(),
  jsonToList: jest.fn(),
}));

jest.mock('@/services/ilcd/cache', () => ({
  getCachedClassificationData: jest.fn(),
  ilcdCache: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@/services/general/api', () => ({
  getDataDetail: jest.fn(),
  getTeamIdByUserId: jest.fn(),
  normalizeLangPayloadForSave: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { genFlowpropertyJsonOrdered } = jest.requireMock('@/services/flowproperties/util');
const { getLangText, classificationToString, jsonToList, genClassificationZH } =
  jest.requireMock('@/services/general/util');
const { getCachedClassificationData } = jest.requireMock('@/services/ilcd/cache');
const { getDataDetail, getTeamIdByUserId } = jest.requireMock('@/services/general/api');
const { normalizeLangPayloadForSave } = jest.requireMock('@/services/general/api');
const { createFlowProperty: mockCreateFlowProperty } = jest.requireMock('@tiangong-lca/tidas-sdk');

describe('FlowProperties API Service (src/services/flowproperties/api.ts)', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
    normalizeLangPayloadForSave.mockImplementation(async (payload: any) => ({
      payload,
      validationError: undefined,
    }));
    // Setup default SDK mock behavior
    mockCreateFlowProperty.mockReturnValue({
      validateEnhanced: jest.fn().mockReturnValue({ success: true }),
    });
  });

  describe('createFlowproperties', () => {
    it('should create flow property with validation', async () => {
      const mockId = 'flowprop-123';
      const mockData = { flowPropertiesInformation: {} };
      const mockOrderedData = { ordered: true };
      const mockResult = { data: [{ id: mockId }], error: null };
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockResult);

      supabase.from.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      const result = await createFlowproperties(mockId, mockData);

      expect(genFlowpropertyJsonOrdered).toHaveBeenCalledWith(mockId, mockData);
      expect(mockCreateFlowProperty).toHaveBeenCalledWith(mockOrderedData);
      expect(mockValidateEnhanced).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      expect(mockInsert).toHaveBeenCalledWith([
        {
          id: mockId,
          json_ordered: mockOrderedData,
          rule_verification: true,
        },
      ]);
      expect(result).toEqual(mockResult);
    });

    it('should handle validation failure', async () => {
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: false });
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({ data: [], error: null });

      supabase.from.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      await createFlowproperties('test-id', {});

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rule_verification: false,
          }),
        ]),
      );
    });

    it('should return a language validation error when normalization fails', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true });
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: { ordered: true },
        validationError: 'invalid multilingual payload',
      });

      const result = await createFlowproperties('test-id', {});

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          message: 'invalid multilingual payload',
          code: 'LANG_VALIDATION_ERROR',
        }),
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        count: null,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fall back to the raw payload when normalization omits a payload', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true, fallback: 'raw' });
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: undefined,
      });

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      supabase.from.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      await createFlowproperties('test-id', {});

      expect(mockCreateFlowProperty).toHaveBeenCalledWith({ ordered: true, fallback: 'raw' });
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          json_ordered: { ordered: true, fallback: 'raw' },
        }),
      ]);
    });
  });

  describe('updateFlowproperties', () => {
    it('should update flow property via edge function', async () => {
      const mockId = 'flowprop-123';
      const mockVersion = '1.0.0';
      const mockData = { flowPropertiesInformation: {} };
      const mockOrderedData = { ordered: true };
      const mockFunctionResult = { data: { success: true }, error: null };
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      supabase.functions.invoke.mockResolvedValue(mockFunctionResult);

      const result = await updateFlowproperties(mockId, mockVersion, mockData);

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_data', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          id: mockId,
          version: mockVersion,
          table: 'flowproperties',
          data: {
            json_ordered: mockOrderedData,
            rule_verification: true,
          },
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should handle edge function error', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      const mockError = { message: 'Update failed' };
      supabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      const result = await updateFlowproperties('id', 'version', {});

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      expect(result).toBeNull(); // Function returns result?.data which is null on error
      consoleLogSpy.mockRestore();
    });

    it('should return undefined when no session is available', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      const result = await updateFlowproperties('id', 'version', {});

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should return a language validation error before invoking the edge function', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true });
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: { ordered: true },
        validationError: 'invalid update payload',
      });

      const result = await updateFlowproperties('id', 'version', {});

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({
          message: 'invalid update payload',
          code: 'LANG_VALIDATION_ERROR',
        }),
        status: 400,
        statusText: 'LANG_VALIDATION_ERROR',
        count: null,
      });
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should invoke update_data with an empty bearer token when the session token is missing', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: undefined,
            user: {
              id: 'user-123',
            },
          },
        },
      });
      genFlowpropertyJsonOrdered.mockReturnValue({});
      supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });

      await updateFlowproperties('id', '01.00.000', {});

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'update_data',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer ',
          },
        }),
      );
    });

    it('should fall back to the raw payload when normalized update data omits a payload', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true, fallback: 'raw-update' });
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: undefined,
      });
      supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });

      await updateFlowproperties('id', '01.00.000', {});

      expect(mockCreateFlowProperty).toHaveBeenCalledWith({
        ordered: true,
        fallback: 'raw-update',
      });
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'update_data',
        expect.objectContaining({
          body: expect.objectContaining({
            data: expect.objectContaining({
              json_ordered: { ordered: true, fallback: 'raw-update' },
            }),
          }),
        }),
      );
    });
  });

  describe('deleteFlowproperties', () => {
    it('should delete flow property by ID and version', async () => {
      const mockId = 'flowprop-123';
      const mockVersion = '1.0.0';
      const mockResult = { data: null, error: null };

      const mockDelete = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockReturnThis();

      supabase.from.mockReturnValue({
        delete: mockDelete.mockReturnValue({
          eq: mockEq.mockReturnValue({
            eq: jest.fn().mockResolvedValue(mockResult),
          }),
        }),
      });

      const result = await deleteFlowproperties(mockId, mockVersion);

      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      expect(mockDelete).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('getFlowpropertyTableAll', () => {
    it('should fetch flow properties with pagination', async () => {
      const params = { current: 1, pageSize: 10 };
      const sort = { modified_at: 'descend' as const };
      const mockData = [
        {
          id: 'fp-1',
          version: '1.0',
          'common:name': [{ '@xml:lang': 'en', '#text': 'Mass' }],
          'common:class': [],
          'common:generalComment': [],
          '@refObjectId': 'ug-1',
          'common:shortDescription': [],
          modified_at: '2024-01-01',
          team_id: 'team-1',
        },
      ];

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null, count: 1 });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          order: mockOrder.mockReturnValue({
            range: mockRange.mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      });

      getLangText.mockReturnValue('Mass');
      classificationToString.mockReturnValue('');
      jsonToList.mockReturnValue([]);
      getCachedClassificationData.mockResolvedValue([]);

      const result = await getFlowpropertyTableAll(params, sort, 'en', 'tg', [], undefined);

      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      expect(mockOrder).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle different data sources', async () => {
      const params = { current: 1, pageSize: 10 };
      const sort = {};

      // Test 'tg' data source with team ID
      const queryBuilder1 = createQueryBuilder({ data: [], error: null, count: 0 });
      supabase.from.mockReturnValueOnce(queryBuilder1);

      await getFlowpropertyTableAll(params, sort, 'en', 'tg', 'team-123', undefined);
      expect(queryBuilder1.eq).toHaveBeenCalledWith('state_code', 100);
      expect(queryBuilder1.eq).toHaveBeenCalledWith('team_id', 'team-123');

      jest.clearAllMocks();

      // Test 'co' data source with team ID
      const queryBuilder2 = createQueryBuilder({ data: [], error: null, count: 0 });
      supabase.from.mockReturnValueOnce(queryBuilder2);

      await getFlowpropertyTableAll(params, sort, 'en', 'co', 'team-456', undefined);
      expect(queryBuilder2.eq).toHaveBeenCalledWith('state_code', 200);
      expect(queryBuilder2.eq).toHaveBeenCalledWith('team_id', 'team-456');
    });

    it('should handle my data source with session', async () => {
      const params = { current: 1, pageSize: 10 };
      const sort = {};

      const queryBuilder = createQueryBuilder({ data: [], error: null, count: 0 });
      supabase.from.mockReturnValue(queryBuilder);

      const result = await getFlowpropertyTableAll(params, sort, 'en', 'my', [], 100);

      expect(queryBuilder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.success).toBe(true);
    });

    it('should return empty when session not available for my data', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'my',
        [],
        100,
      );

      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should handle team data source', async () => {
      getTeamIdByUserId.mockResolvedValue('team-789');

      const mockSelect = jest.fn().mockReturnThis();
      const mockOrder = jest.fn().mockReturnThis();
      const mockRange = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: [], error: null, count: 0 });

      supabase.from.mockReturnValue({
        select: mockSelect.mockReturnValue({
          order: mockOrder.mockReturnValue({
            range: mockRange.mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      });

      await getFlowpropertyTableAll({ current: 1, pageSize: 10 }, {}, 'en', 'te', [], undefined);

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('team_id', 'team-789');
    });

    it('should return empty success when team data source has no team', async () => {
      getTeamIdByUserId.mockResolvedValueOnce(null);

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'te',
        [],
        undefined,
      );

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle error in query', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const queryBuilder = createQueryBuilder({
        data: null,
        error: { message: 'Query error' },
        count: 0,
      });
      supabase.from.mockReturnValue(queryBuilder);

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'tg',
        [],
        undefined,
      );

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        success: false,
      });
      consoleLogSpy.mockRestore();
    });

    it('should localize flow properties for zh language', async () => {
      const params = { current: 1, pageSize: 10 };
      const sort = {};

      const builder = createQueryBuilder({
        data: [
          {
            id: 'fp-zh',
            version: '01.00.000',
            'common:name': mockMultilingualText,
            'common:class': mockMultilingualText,
            'common:generalComment': mockMultilingualText,
            '@refObjectId': 'ug-1',
            'common:shortDescription': mockMultilingualText,
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      });

      supabase.from.mockReturnValue(builder);

      jsonToList.mockReturnValue([{ id: 'class-id-1' }]);
      genClassificationZH.mockReturnValue(['第0级分类']);
      classificationToString.mockReturnValue('第0级分类');
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTableAll(params, sort, 'zh', 'tg', [], undefined);

      expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(getCachedClassificationData).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
      expect(genClassificationZH).toHaveBeenCalledWith(
        [{ id: 'class-id-1' }],
        mockILCDClassificationResponse.data,
      );
      expect(result.success).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: 'fp-zh',
        name: '中文文本',
        classification: '第0级分类',
        refUnitGroupId: 'ug-1',
      });
      expect(result.data[0].modifiedAt).toBeInstanceOf(Date);
    });

    it('should use a placeholder reference id for zh rows when the reference unit group is missing', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'fp-zh-no-ref',
            version: '01.00.001',
            'common:name': mockMultilingualText,
            'common:class': [],
            'common:generalComment': mockMultilingualText,
            '@refObjectId': undefined,
            'common:shortDescription': mockMultilingualText,
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: 1,
      });

      supabase.from.mockReturnValue(builder);
      jsonToList.mockReturnValue([]);
      genClassificationZH.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTableAll({}, {}, 'zh', 'tg', [], undefined);

      expect(result.data[0]).toMatchObject({
        id: 'fp-zh-no-ref',
        refUnitGroupId: '-',
      });
    });

    it('should fallback gracefully when mapping throws', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'fp-error',
            version: '01.00.000',
            'common:class': null,
            modified_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
        count: 1,
      });

      supabase.from.mockReturnValue(builder);
      jsonToList.mockImplementationOnce(() => {
        throw new Error('parse error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'tg',
        [],
        undefined,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          id: 'fp-error',
        },
      ]);

      consoleErrorSpy.mockRestore();
    });

    it('should use default pagination and placeholder reference fields when optional values are missing', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'fp-defaults',
            version: '01.00.000',
            'common:name': [],
            'common:class': [],
            'common:generalComment': [],
            '@refObjectId': undefined,
            'common:shortDescription': undefined,
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        error: null,
        count: null,
      });
      supabase.from.mockReturnValue(builder);
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result).toEqual({
        data: [
          expect.objectContaining({
            id: 'fp-defaults',
            refUnitGroupId: '-',
            refUnitGroup: '',
          }),
        ],
        page: 1,
        success: true,
        total: 0,
      });
    });

    it('should fallback to id-only rows when zh table mapping throws', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: 'fp-zh-bad',
            version: '01.00.000',
            'common:class': [],
            modified_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
        count: 1,
      });
      supabase.from.mockReturnValue(builder);
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementationOnce(() => {
        throw new Error('zh parse error');
      });
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getFlowpropertyTableAll({}, {}, 'zh', 'tg', [], undefined);

      expect(result).toEqual({
        data: [{ id: 'fp-zh-bad' }],
        page: 1,
        success: true,
        total: 1,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlowpropertyTablePgroongaSearch', () => {
    it('should perform full-text search', async () => {
      const params = { current: 1, pageSize: 10 };
      const mockSearchResult = [
        {
          id: 'fp-1',
          version: '1.0',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {
                  'common:name': [{ '@xml:lang': 'en', '#text': 'Mass' }],
                  classificationInformation: {},
                  'common:generalComment': [],
                },
                quantitativeReference: {
                  referenceToReferenceUnitGroup: {},
                },
              },
            },
          },
          modified_at: '2024-01-01',
          team_id: 'team-1',
          total_count: 1,
        },
      ];

      supabase.rpc.mockResolvedValue({ data: mockSearchResult, error: null });
      getLangText.mockReturnValue('Mass');
      classificationToString.mockReturnValue('');
      jsonToList.mockReturnValue([]);

      const result = await getFlowpropertyTablePgroongaSearch(
        params,
        'en',
        'tg',
        'mass',
        {},
        undefined,
      );

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_flowproperties', {
        query_text: 'mass',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
      });
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.data).toBeDefined();
    });

    it('should handle empty search results', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'nonexistent',
        {},
        undefined,
      );

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle search error', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockError = { message: 'Search error' };
      supabase.rpc.mockResolvedValue({ data: null, error: mockError });

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'test',
        {},
        undefined,
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      // When there's an error and no data, the function returns the result object itself
      expect(result.error).toEqual(mockError);
      consoleLogSpy.mockRestore();
    });

    it('should include state_code when provided', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'my',
        'test',
        {},
        100,
      );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'pgroonga_search_flowproperties',
        expect.objectContaining({
          state_code: 100,
        }),
      );
    });

    it('should use default pagination values in the state-code PGroonga search branch', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await getFlowpropertyTablePgroongaSearch({}, 'en', 'my', 'test', {}, 100);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'pgroonga_search_flowproperties',
        expect.objectContaining({
          page_size: 10,
          page_current: 1,
          state_code: 100,
        }),
      );
    });

    it('should localize PGroonga results for zh language', async () => {
      const searchResult: any = [
        {
          id: 'fp-zh',
          version: '01.00.000',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {
                  'common:name': mockMultilingualText,
                  classificationInformation: {
                    'common:classification': {
                      'common:class': mockMultilingualText,
                    },
                  },
                  'common:generalComment': mockMultilingualText,
                },
                quantitativeReference: {
                  referenceToReferenceUnitGroup: {
                    '@refObjectId': 'ug-1',
                    'common:shortDescription': mockMultilingualText,
                  },
                },
              },
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
          total_count: 1,
        },
      ];

      supabase.rpc.mockResolvedValue({ data: searchResult, error: null });
      jsonToList.mockReturnValue([{ id: 'class-id-1' }]);
      genClassificationZH.mockReturnValue(['第0级分类']);
      classificationToString.mockReturnValue('第0级分类');
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'zh',
        'tg',
        '质量',
        {},
        undefined,
      );

      expect(getCachedClassificationData).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
      expect(genClassificationZH).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: 'fp-zh',
        name: '中文文本',
        classification: '第0级分类',
        refUnitGroupId: 'ug-1',
      });
    });

    it('should return raw result when search runs without an active session', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'mass',
        {},
        undefined,
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should fallback to id-only rows when english search mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      supabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'fp-bad',
            version: '01.00.000',
            modified_at: '2024-01-01T00:00:00Z',
            total_count: 1,
            json: {
              flowPropertyDataSet: {
                flowPropertiesInformation: {
                  dataSetInformation: {},
                },
              },
            },
          },
        ],
        error: null,
      });
      jsonToList.mockImplementationOnce(() => {
        throw new Error('parse failed');
      });

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'bad',
        {},
        undefined,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: [{ id: 'fp-bad' }],
        page: 1,
        success: true,
        total: 1,
      });
      consoleErrorSpy.mockRestore();
    });

    it('should use english PGroonga fallback payloads when optional localized fields are missing', async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'fp-en-defaults',
            version: '01.00.012',
            json: {
              flowPropertyDataSet: {
                flowPropertiesInformation: {
                  dataSetInformation: {
                    classificationInformation: {
                      'common:classification': {
                        'common:class': [],
                      },
                    },
                  },
                  quantitativeReference: {},
                },
              },
            },
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
            total_count: 1,
          },
        ],
        error: null,
      });
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');

      const result = await getFlowpropertyTablePgroongaSearch(
        {},
        'en',
        'tg',
        'mass',
        {},
        undefined,
      );

      expect(result).toEqual({
        data: [
          {
            key: 'fp-en-defaults:01.00.012',
            id: 'fp-en-defaults',
            name: '',
            classification: '',
            generalComment: '',
            refUnitGroupId: '-',
            refUnitGroup: '',
            version: '01.00.012',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 1,
        success: true,
        total: 1,
      });
    });

    it('should use default pagination and placeholder fields for zh search rows with missing payloads', async () => {
      supabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'fp-zh-defaults',
            version: '01.00.010',
            json: {
              flowPropertyDataSet: {
                flowPropertiesInformation: {},
              },
            },
            modified_at: '2024-01-01T00:00:00Z',
            team_id: 'team-1',
          },
        ],
        error: null,
      });
      jsonToList.mockReturnValue([]);
      genClassificationZH.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTablePgroongaSearch(
        {},
        'zh',
        'tg',
        '质量',
        {},
        undefined,
      );

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_flowproperties', {
        query_text: '质量',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
      });
      expect(result).toEqual({
        data: [
          {
            key: 'fp-zh-defaults:01.00.010',
            id: 'fp-zh-defaults',
            name: '',
            classification: '',
            generalComment: '',
            refUnitGroupId: '-',
            refUnitGroup: '',
            version: '01.00.010',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 1,
        success: true,
        total: 0,
      });
    });

    it('should fallback to id-only rows when zh search mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'fp-zh-search-bad',
            version: '01.00.011',
            json: {
              flowPropertyDataSet: {
                flowPropertiesInformation: {},
              },
            },
            total_count: 1,
          },
        ],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementationOnce(() => {
        throw new Error('zh search parse failed');
      });

      const result = await getFlowpropertyTablePgroongaSearch({}, 'zh', 'tg', '坏', {}, undefined);

      expect(result).toEqual({
        data: [{ id: 'fp-zh-search-bad' }],
        page: 1,
        success: true,
        total: 1,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('flowproperty_hybrid_search', () => {
    it('should map hybrid search results for zh language', async () => {
      const params = { current: 1, pageSize: 10 };
      const hybridResult: any = [
        {
          id: 'fp-hybrid',
          version: '01.00.000',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {
                  'common:name': mockMultilingualText,
                  classificationInformation: {
                    'common:classification': {
                      'common:class': mockMultilingualText,
                    },
                  },
                  'common:generalComment': mockMultilingualText,
                },
                quantitativeReference: {
                  referenceToReferenceUnitGroup: {
                    '@refObjectId': 'ug-1',
                    'common:shortDescription': mockMultilingualText,
                  },
                },
              },
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ];
      hybridResult.total_count = 1;

      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      jsonToList.mockReturnValue([{ id: 'class-id-1' }]);
      genClassificationZH.mockReturnValue(['第0级分类']);
      classificationToString.mockReturnValue('第0级分类');
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await flowproperty_hybrid_search(params, 'zh', 'tg', '质量', {}, 100);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'flowproperty_hybrid_search',
        expect.objectContaining({
          body: {
            query: '质量',
            filter: {},
            state_code: 100,
          },
        }),
      );
      expect(getCachedClassificationData).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
      expect(result.success).toBe(true);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: 'fp-hybrid',
        name: '中文文本',
        classification: '第0级分类',
        refUnitGroupId: 'ug-1',
      });
    });

    it('should return empty success when hybrid search yields no data', async () => {
      supabase.functions.invoke.mockResolvedValue({ data: { data: [] }, error: null });

      const result = await flowproperty_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'test',
        {},
        undefined,
      );

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should return raw result when no active session', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await flowproperty_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'test',
        {},
        undefined,
      );

      expect(result).toEqual({});
      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it('should map hybrid search results for english language', async () => {
      const hybridResult: any = [
        {
          id: 'fp-hybrid-en',
          version: '01.00.001',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {
                  'common:name': [{ '@xml:lang': 'en', '#text': 'Density' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ '#text': 'Physical properties' }],
                    },
                  },
                  'common:generalComment': [{ '@xml:lang': 'en', '#text': 'Measured' }],
                },
                quantitativeReference: {
                  referenceToReferenceUnitGroup: {
                    '@refObjectId': 'ug-density',
                    'common:shortDescription': [{ '@xml:lang': 'en', '#text': 'Kilogram' }],
                  },
                },
              },
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ];
      hybridResult.total_count = 1;

      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      jsonToList.mockReturnValue([{ '#text': 'Physical properties' }]);
      classificationToString.mockReturnValue('Physical properties');
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });

      const result = await flowproperty_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'density',
        {},
        undefined,
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'flowproperty_hybrid_search',
        expect.objectContaining({
          body: {
            query: 'density',
            filter: {},
          },
        }),
      );
      expect(result).toEqual({
        data: [
          {
            key: 'fp-hybrid-en:01.00.001',
            id: 'fp-hybrid-en',
            name: 'Density',
            classification: 'Physical properties',
            generalComment: 'Measured',
            refUnitGroupId: 'ug-density',
            refUnitGroup: 'Kilogram',
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

    it('should invoke the hybrid search edge function with an empty bearer token when the session token is missing', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: undefined,
            user: {
              id: 'user-123',
            },
          },
        },
      });
      supabase.functions.invoke.mockResolvedValue({ data: { data: [] }, error: null });

      await flowproperty_hybrid_search({}, 'en', 'tg', 'mass', {}, undefined);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'flowproperty_hybrid_search',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer ',
          },
        }),
      );
    });

    it('should return raw error result when hybrid search fails', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockError = { message: 'Hybrid search failed' };
      supabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      const result = await flowproperty_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'mass',
        {},
        undefined,
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      expect(result).toEqual({ data: null, error: mockError });
      consoleLogSpy.mockRestore();
    });

    it('should fallback to id-only rows when english hybrid mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const hybridResult: any = [
        {
          id: 'fp-hybrid-bad',
          version: '01.00.002',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {},
              },
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
        },
      ];
      hybridResult.total_count = 1;

      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      jsonToList.mockImplementationOnce(() => {
        throw new Error('hybrid parse failed');
      });

      const result = await flowproperty_hybrid_search(
        { current: 1, pageSize: 10 },
        'en',
        'tg',
        'mass',
        {},
        undefined,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: [{ id: 'fp-hybrid-bad' }],
        page: 1,
        success: true,
        total: 1,
      });
      consoleErrorSpy.mockRestore();
    });

    it('should use english hybrid fallback payloads when optional localized fields are missing', async () => {
      const hybridResult: any = [
        {
          id: 'fp-hybrid-en-defaults',
          version: '01.00.022',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {
                dataSetInformation: {
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
                quantitativeReference: {},
              },
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ];
      hybridResult.total_count = 1;

      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');

      const result = await flowproperty_hybrid_search({}, 'en', 'tg', 'mass', {}, undefined);

      expect(result).toEqual({
        data: [
          {
            key: 'fp-hybrid-en-defaults:01.00.022',
            id: 'fp-hybrid-en-defaults',
            name: '',
            classification: '',
            generalComment: '',
            refUnitGroupId: '-',
            refUnitGroup: '',
            version: '01.00.022',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 1,
        success: true,
        total: 1,
      });
    });

    it('should use default pagination and placeholder fields for zh hybrid rows with missing payloads', async () => {
      const hybridResult: any = [
        {
          id: 'fp-hybrid-zh-defaults',
          version: '01.00.020',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {},
            },
          },
          modified_at: '2024-01-01T00:00:00Z',
          team_id: 'team-1',
        },
      ];
      hybridResult.total_count = undefined;

      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      jsonToList.mockReturnValue([]);
      genClassificationZH.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await flowproperty_hybrid_search({}, 'zh', 'tg', '测试', {}, undefined);

      expect(result).toEqual({
        data: [
          {
            key: 'fp-hybrid-zh-defaults:01.00.020',
            id: 'fp-hybrid-zh-defaults',
            name: '',
            classification: '',
            generalComment: '',
            refUnitGroupId: '-',
            refUnitGroup: '',
            version: '01.00.020',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 1,
        success: true,
        total: 0,
      });
    });

    it('should fallback to id-only rows when zh hybrid mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const hybridResult: any = [
        {
          id: 'fp-hybrid-zh-bad',
          version: '01.00.021',
          json: {
            flowPropertyDataSet: {
              flowPropertiesInformation: {},
            },
          },
        },
      ];
      hybridResult.total_count = 1;
      supabase.functions.invoke.mockResolvedValue({ data: { data: hybridResult }, error: null });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementationOnce(() => {
        throw new Error('zh hybrid parse failed');
      });

      const result = await flowproperty_hybrid_search({}, 'zh', 'tg', '坏', {}, undefined);

      expect(result).toEqual({
        data: [{ id: 'fp-hybrid-zh-bad' }],
        page: 1,
        success: true,
        total: 1,
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getFlowpropertyDetail', () => {
    const validId = '12345678-1234-1234-1234-1234567890ab';

    it('should delegate to getDataDetail with flowproperties table', async () => {
      const mockDetail = { data: { id: 'fp-1' }, success: true };
      getDataDetail.mockResolvedValue(mockDetail);

      const result = await getFlowpropertyDetail(validId, '01.00.000');

      expect(getDataDetail).toHaveBeenCalledWith(validId, '01.00.000', 'flowproperties');
      expect(result).toEqual(mockDetail);
    });

    it('should return failed result when id is invalid', async () => {
      const result = await getFlowpropertyDetail('fp-1', '01.00.000');

      expect(getDataDetail).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: null,
        success: false,
      });
    });
  });

  describe('getReferenceUnitGroups', () => {
    const validId1 = '12345678-1234-1234-1234-1234567890ab';
    const validId2 = 'abcdefab-cdef-cdef-cdef-abcdefabcdef';

    it('should fetch unit groups and match requested params', async () => {
      const supabaseResponse = {
        data: [
          {
            id: validId1,
            version: '01.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-1',
              'common:shortDescription': mockMultilingualText,
            },
          },
          {
            id: validId2,
            version: '02.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-2',
              'common:shortDescription': mockMultilingualText,
            },
          },
        ],
        error: null,
      };

      const builder = createQueryBuilder(supabaseResponse);
      supabase.from.mockReturnValue(builder);

      const result = await getReferenceUnitGroups([
        { id: validId1, version: '01.00.000' },
        { id: validId2, version: '02.00.000' },
      ]);

      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      // getReferenceUnitGroups uses .in() for ID filtering, not .or()
      expect(builder.in).toHaveBeenCalledWith('id', [validId1, validId2]);
      expect(builder.order).toHaveBeenCalledWith('version', { ascending: false });
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          id: validId1,
          version: '01.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-1',
          refUnitGroupVersion: '-',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        {
          id: validId2,
          version: '02.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-2',
          refUnitGroupVersion: '-',
          refUnitGroupShortDescription: mockMultilingualText,
        },
      ]);
    });

    it('should return empty failure result when no valid ids provided', async () => {
      // When IDs are filtered out (not 36 chars), function returns early without DB call
      const result = await getReferenceUnitGroups([{ id: 'short-id', version: '01.00.000' }]);

      expect(supabase.from).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should fallback to the latest available version for unmatched requests', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: validId1,
            version: '02.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-latest',
              '@version': '02.00.000',
              'common:shortDescription': mockMultilingualText,
            },
          },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(builder);

      const result = await getReferenceUnitGroups([{ id: validId1, version: '01.00.000' }]);

      expect(result).toEqual({
        data: [
          {
            id: validId1,
            version: '02.00.000',
            name: mockMultilingualText,
            refUnitGroupId: 'ug-latest',
            refUnitGroupVersion: '02.00.000',
            refUnitGroupShortDescription: mockMultilingualText,
          },
        ],
        success: true,
      });
    });

    it('should return failure when valid ids produce no data', async () => {
      const builder = createQueryBuilder({
        data: [],
        error: null,
      });
      supabase.from.mockReturnValue(builder);

      const result = await getReferenceUnitGroups([{ id: validId1, version: '01.00.000' }]);

      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should use placeholder fields when matched unit groups omit optional reference fields', async () => {
      const builder = createQueryBuilder({
        data: [
          {
            id: validId1,
            version: '01.00.000',
          },
        ],
        error: null,
      });
      supabase.from.mockReturnValue(builder);

      const result = await getReferenceUnitGroups([{ id: validId1, version: '01.00.000' }]);

      expect(result).toEqual({
        data: [
          {
            id: validId1,
            version: '01.00.000',
            name: '-',
            refUnitGroupId: '-',
            refUnitGroupVersion: '-',
            refUnitGroupShortDescription: {},
          },
        ],
        success: true,
      });
    });
  });

  describe('getReferenceUnitGroup', () => {
    const validId = 'abcdef12-3456-7890-abcd-ef1234567890';

    it('should return matching unit group for id and version', async () => {
      const mockEqVersion = jest.fn().mockResolvedValue({
        data: [
          {
            id: validId,
            version: '01.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-1',
              'common:shortDescription': mockMultilingualText,
            },
          },
        ],
      });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqVersion });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqId });

      supabase.from.mockReturnValueOnce({ select: mockSelect });

      const result = await getReferenceUnitGroup(validId, '01.00.000');

      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      expect(result).toEqual({
        data: {
          id: validId,
          version: '01.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-1',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        success: true,
      });
    });

    it('should fallback to latest version when specific version missing', async () => {
      const mockMissingVersion = jest.fn().mockResolvedValue({ data: [] });
      const mockEqIdFirst = jest.fn().mockReturnValue({ eq: mockMissingVersion });
      const mockSelectFirst = jest.fn().mockReturnValue({ eq: mockEqIdFirst });

      const mockRange = jest.fn().mockResolvedValue({
        data: [
          {
            id: validId,
            version: '02.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-2',
              'common:shortDescription': mockMultilingualText,
            },
          },
        ],
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEqIdSecond = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelectSecond = jest.fn().mockReturnValue({ eq: mockEqIdSecond });

      supabase.from
        .mockReturnValueOnce({ select: mockSelectFirst })
        .mockReturnValueOnce({ select: mockSelectSecond });

      const result = await getReferenceUnitGroup(validId, '01.00.000');

      expect(result).toEqual({
        data: {
          id: validId,
          version: '02.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-2',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        success: true,
      });
      expect(mockOrder).toHaveBeenCalledWith('version', { ascending: false });
      expect(mockRange).toHaveBeenCalledWith(0, 0);
    });

    it('should return undefined for invalid id', async () => {
      const result = await getReferenceUnitGroup('short-id', '01.00.000');

      expect(result).toBeUndefined();
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should fetch latest version when version format is invalid', async () => {
      const mockRange = jest.fn().mockResolvedValue({
        data: [
          {
            id: validId,
            version: '03.00.000',
            'common:name': mockMultilingualText,
            referenceToReferenceUnitGroup: {
              '@refObjectId': 'ug-3',
              'common:shortDescription': mockMultilingualText,
            },
          },
        ],
      });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEq = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });

      supabase.from.mockReturnValueOnce({ select: mockSelect });

      const result = await getReferenceUnitGroup(validId, 'invalid');

      expect(mockEq).toHaveBeenCalledWith('id', validId);
      expect(mockOrder).toHaveBeenCalledWith('version', { ascending: false });
      expect(result).toEqual({
        data: {
          id: validId,
          version: '03.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-3',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        success: true,
      });
    });

    it('should return failure when no version can be resolved', async () => {
      const mockMissingVersion = jest.fn().mockResolvedValue({ data: [] });
      const mockEqIdFirst = jest.fn().mockReturnValue({ eq: mockMissingVersion });
      const mockSelectFirst = jest.fn().mockReturnValue({ eq: mockEqIdFirst });

      const mockRange = jest.fn().mockResolvedValue({ data: [] });
      const mockOrder = jest.fn().mockReturnValue({ range: mockRange });
      const mockEqIdSecond = jest.fn().mockReturnValue({ order: mockOrder });
      const mockSelectSecond = jest.fn().mockReturnValue({ eq: mockEqIdSecond });

      supabase.from
        .mockReturnValueOnce({ select: mockSelectFirst })
        .mockReturnValueOnce({ select: mockSelectSecond });

      const result = await getReferenceUnitGroup(validId, '01.00.000');

      expect(result).toEqual({
        data: null,
        success: false,
      });
    });

    it('should use placeholder fields when the resolved unit group omits optional reference values', async () => {
      const mockEqVersion = jest.fn().mockResolvedValue({
        data: [
          {
            id: validId,
            version: '04.00.000',
          },
        ],
      });
      const mockEqId = jest.fn().mockReturnValue({ eq: mockEqVersion });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEqId });

      supabase.from.mockReturnValueOnce({ select: mockSelect });

      const result = await getReferenceUnitGroup(validId, '04.00.000');

      expect(result).toEqual({
        data: {
          id: validId,
          version: '04.00.000',
          name: '-',
          refUnitGroupId: '-',
          refUnitGroupShortDescription: {},
        },
        success: true,
      });
    });
  });
});
