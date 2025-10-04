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

import {
  createFlowproperties,
  deleteFlowproperties,
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
  updateFlowproperties,
} from '@/services/flowproperties/api';
import { FunctionRegion } from '@supabase/supabase-js';

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
  getRuleVerification: jest.fn(),
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
const { getRuleVerification, getLangText, classificationToString, jsonToList } =
  jest.requireMock('@/services/general/util');
const { getILCDClassification } = jest.requireMock('@/services/ilcd/api');
const { getTeamIdByUserId } = jest.requireMock('@/services/general/api');

// Helper to create query builder mock
const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return builder;
};

describe('FlowProperties API Service (src/services/flowproperties/api.ts)', () => {
  const mockSession = {
    data: {
      session: {
        user: { id: 'user-123' },
        access_token: 'test-token',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
  });

  describe('createFlowproperties', () => {
    it('should create flow property with validation', async () => {
      const mockId = 'flowprop-123';
      const mockData = { flowPropertiesInformation: {} };
      const mockOrderedData = { ordered: true };
      const mockResult = { data: [{ id: mockId }], error: null };

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      getRuleVerification.mockReturnValue({ valid: true });

      const mockInsert = jest.fn().mockReturnThis();
      const mockSelect = jest.fn().mockResolvedValue(mockResult);

      supabase.from.mockReturnValue({
        insert: mockInsert.mockReturnValue({
          select: mockSelect,
        }),
      });

      const result = await createFlowproperties(mockId, mockData);

      expect(genFlowpropertyJsonOrdered).toHaveBeenCalledWith(mockId, mockData);
      expect(getRuleVerification).toHaveBeenCalled();
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
      genFlowpropertyJsonOrdered.mockReturnValue({});
      getRuleVerification.mockReturnValue({ valid: false });

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

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      getRuleVerification.mockReturnValue({ valid: true });
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
      getRuleVerification.mockReturnValue({ valid: true });

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
  });
});
