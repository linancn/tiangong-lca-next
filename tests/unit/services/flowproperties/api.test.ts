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

jest.mock('@/services/ilcd/api', () => ({
  getILCDClassification: jest.fn(),
}));

jest.mock('@/services/general/api', () => ({
  getDataDetail: jest.fn(),
  getTeamIdByUserId: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { genFlowpropertyJsonOrdered } = jest.requireMock('@/services/flowproperties/util');
const {
  getLangText,
  classificationToString,
  jsonToList,
  genClassificationZH,
} = jest.requireMock('@/services/general/util');
const { getILCDClassification } = jest.requireMock('@/services/ilcd/api');
const { getDataDetail, getTeamIdByUserId } = jest.requireMock('@/services/general/api');
const { createFlowProperty: mockCreateFlowProperty } = jest.requireMock('@tiangong-lca/tidas-sdk');

describe('FlowProperties API Service (src/services/flowproperties/api.ts)', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
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
      getILCDClassification.mockResolvedValue({ data: [] });

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
      getILCDClassification.mockResolvedValue(mockILCDClassificationResponse);

      const result = await getFlowpropertyTableAll(params, sort, 'zh', 'tg', [], undefined);

      expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(getILCDClassification).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
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
      getILCDClassification.mockResolvedValue(mockILCDClassificationResponse);

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'zh',
        'tg',
        '质量',
        {},
        undefined,
      );

      expect(getILCDClassification).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
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
      getILCDClassification.mockResolvedValue(mockILCDClassificationResponse);

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
      expect(getILCDClassification).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
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
  });

  describe('getFlowpropertyDetail', () => {
    it('should delegate to getDataDetail with flowproperties table', async () => {
      const mockDetail = { data: { id: 'fp-1' }, success: true };
      getDataDetail.mockResolvedValue(mockDetail);

      const result = await getFlowpropertyDetail('fp-1', '01.00.000');

      expect(getDataDetail).toHaveBeenCalledWith('fp-1', '01.00.000', 'flowproperties');
      expect(result).toEqual(mockDetail);
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
            version: '03.00.000',
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
        { id: 'short-id', version: '01.00.000' },
      ]);

      expect(supabase.from).toHaveBeenCalledWith('flowproperties');
      expect(builder.in).toHaveBeenCalledWith('id', [validId1, validId2]);
      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        {
          id: validId1,
          version: '01.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-1',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        {
          id: validId2,
          version: '03.00.000',
          name: mockMultilingualText,
          refUnitGroupId: 'ug-2',
          refUnitGroupShortDescription: mockMultilingualText,
        },
        {
          id: undefined,
          version: undefined,
          name: '-',
          refUnitGroupId: '-',
          refUnitGroupShortDescription: {},
        },
      ]);
    });

    it('should return empty result when no valid ids provided', async () => {
      const result = await getReferenceUnitGroups([{ id: 'short-id', version: '01.00.000' }]);

      expect(result).toEqual({
        data: [],
        success: false,
      });
      expect(supabase.from).not.toHaveBeenCalled();
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
  });
});
