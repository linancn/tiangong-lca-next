/**
 * Tests for sources service API functions
 * Path: src/services/sources/api.ts
 *
 * Coverage focuses on:
 * - createSource: Create new source with validation (used in Sources/Components/create.tsx)
 * - updateSource: Update existing source via edge function (used in Sources/Components/edit.tsx)
 * - deleteSource: Delete source by ID and version (used in Sources/Components/delete.tsx)
 * - getSourceTableAll: Fetch sources with pagination and filtering (used in Sources/index.tsx)
 * - getSourceTablePgroongaSearch: Full-text search for sources (used in Sources/Components/select/drawer.tsx)
 * - getSourceDetail: Get detailed source information (used in multiple components)
 * - getSourcesByIdsAndVersions: Fetch multiple sources by ID-version pairs (used in Utils/review.tsx)
 */

jest.mock('@tiangong-lca/tidas-sdk', () => ({
  __esModule: true,
  createSource: jest.fn(),
}));

import {
  createSource,
  deleteSource,
  getSourceDetail,
  getSourcesByIdsAndVersions,
  getSourceTableAll,
  getSourceTablePgroongaSearch,
  updateSource,
} from '@/services/sources/api';
import { FunctionRegion } from '@supabase/supabase-js';
import {
  createMockEdgeFunctionResponse,
  createMockErrorResponse,
  createMockRpcResponse,
  createMockSession,
  createMockSuccessResponse,
  createQueryBuilder,
} from '../../../helpers/mockBuilders';
import {
  mockFilterCondition,
  mockILCDClassificationResponse,
  mockPaginationParams,
  mockSortOrder,
  mockSource,
} from '../../../helpers/testData';

// Mock dependencies
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

jest.mock('@/services/sources/util', () => ({
  genSourceJsonOrdered: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { classificationToString, genClassificationZH, getLangText, jsonToList } =
  jest.requireMock('@/services/general/util');
const { getILCDClassification } = jest.requireMock('@/services/ilcd/api');
const { getDataDetail, getTeamIdByUserId } = jest.requireMock('@/services/general/api');
const { genSourceJsonOrdered } = jest.requireMock('@/services/sources/util');
const { createSource: mockCreateSource } = jest.requireMock('@tiangong-lca/tidas-sdk');

describe('Sources API Service (src/services/sources/api.ts)', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
    // Setup default SDK mock behavior
    mockCreateSource.mockReturnValue({
      validateEnhanced: jest.fn().mockReturnValue({ success: true }),
    });
  });

  describe('createSource', () => {
    it('should create a source with validation', async () => {
      const mockId = 'source-123';
      const mockData = { sourceDataSet: {} };
      const mockOrderedData = { ordered: true };
      const mockInsertResult = createMockSuccessResponse([{ id: mockId }]);
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });

      const builder = createQueryBuilder(mockInsertResult);
      supabase.from.mockReturnValue(builder);

      const result = await createSource(mockId, mockData);

      expect(genSourceJsonOrdered).toHaveBeenCalledWith(mockId, mockData);
      expect(mockCreateSource).toHaveBeenCalledWith(mockOrderedData);
      expect(mockValidateEnhanced).toHaveBeenCalled();
      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(builder.insert).toHaveBeenCalledWith([
        { id: mockId, json_ordered: mockOrderedData, rule_verification: true },
      ]);
      expect(builder.select).toHaveBeenCalled();
      expect(result).toEqual(mockInsertResult);
    });

    it('should handle validation failure', async () => {
      const mockId = 'source-123';
      const mockData = { sourceDataSet: {} };
      const mockOrderedData = { ordered: true };
      const mockInsertResult = createMockSuccessResponse([{ id: mockId }]);
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: false });

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });

      const builder = createQueryBuilder(mockInsertResult);
      supabase.from.mockReturnValue(builder);

      const result = await createSource(mockId, mockData);

      expect(builder.insert).toHaveBeenCalledWith([
        { id: mockId, json_ordered: mockOrderedData, rule_verification: false },
      ]);
      expect(result).toEqual(mockInsertResult);
    });

    it('should handle database errors', async () => {
      const mockId = 'source-123';
      const mockData = { sourceDataSet: {} };
      const mockError = createMockErrorResponse('Insert failed');

      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      const builder = createQueryBuilder(mockError);
      supabase.from.mockReturnValue(builder);

      const result = await createSource(mockId, mockData);

      expect(result).toEqual(mockError);
    });
  });

  describe('updateSource', () => {
    it('should update source via edge function', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };
      const mockOrderedData = { ordered: true };
      const mockFunctionResult = createMockEdgeFunctionResponse({ success: true });
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      supabase.functions.invoke.mockResolvedValue(mockFunctionResult);

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_data', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: {
          id: mockId,
          version: mockVersion,
          table: 'sources',
          data: { json_ordered: mockOrderedData, rule_verification: true },
        },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toEqual({ success: true });
    });

    it('should return empty object when no session', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };

      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle edge function errors', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };
      const mockError = { message: 'Update failed' };

      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });
      supabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      expect(result).toBeNull();

      consoleLogSpy.mockRestore();
    });
  });

  describe('deleteSource', () => {
    it('should delete source by id and version', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockDeleteResult = createMockSuccessResponse(null);

      const builder = createQueryBuilder(mockDeleteResult);
      supabase.from.mockReturnValue(builder);

      const result = await deleteSource(mockId, mockVersion);

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', mockId);
      expect(builder.eq).toHaveBeenCalledWith('version', mockVersion);
      expect(result).toEqual(mockDeleteResult);
    });

    it('should handle delete errors', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockError = createMockErrorResponse('Delete failed');

      const builder = createQueryBuilder(mockError);
      supabase.from.mockReturnValue(builder);

      const result = await deleteSource(mockId, mockVersion);

      expect(result).toEqual(mockError);
    });
  });

  describe('getSourceTableAll', () => {
    it('should fetch sources with pagination and sorting (English)', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockImplementation((value: any) => {
        if (!value) return '-';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
          return value[0]?.['#text'] ?? '-';
        }
        return '-';
      });
      jsonToList.mockReturnValue(
        mockSource.json.sourceDataSet.sourceInformation.dataSetInformation
          .classificationInformation['common:classification']['common:class'],
      );
      classificationToString.mockReturnValue('Publication');

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(supabase.from).toHaveBeenCalledWith('sources');
      expect(builder.select).toHaveBeenCalled();
      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(result.success).toBe(true);
      expect(result.data[0].id).toBe('source-123');
      expect(result.data[0].classification).toBe('Publication');
      expect('total' in result && result.total).toBe(1);
    });

    it('should fetch sources with Chinese classification', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockImplementation((value: any) => value?.[1]?.['#text'] ?? '-');
      jsonToList.mockReturnValue(
        mockSource.json.sourceDataSet.sourceInformation.dataSetInformation
          .classificationInformation['common:classification']['common:class'],
      );
      getILCDClassification.mockResolvedValue(mockILCDClassificationResponse);
      genClassificationZH.mockReturnValue(['出版物']);
      classificationToString.mockReturnValue('出版物');

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'zh', 'tg', []);

      expect(getILCDClassification).toHaveBeenCalledWith('Source', 'zh', ['all']);
      expect(genClassificationZH).toHaveBeenCalled();
      expect(result.data[0].classification).toBe('出版物');
    });

    it('should filter by team when dataSource is "tg" with team id', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', 'team-123');

      expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-123');
    });

    it('should filter by user when dataSource is "my"', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'my', [], 100);

      expect(builder.eq).toHaveBeenCalledWith('state_code', 100);
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });

    it('should return empty array when no session for "my" dataSource', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'my', []);

      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should filter by team when dataSource is "te"', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getTeamIdByUserId.mockResolvedValue('team-123');
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'te', [], 100);

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-123');
    });

    it('should return empty array when no team for "te" dataSource', async () => {
      const mockData: any[] = [];
      const mockResult = createMockSuccessResponse(mockData, 0);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getTeamIdByUserId.mockResolvedValue(null);

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'te', []);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle empty results', async () => {
      const mockData: any[] = [];
      const mockResult = createMockSuccessResponse(mockData, 0);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle query errors', async () => {
      const mockError = createMockErrorResponse('Query failed');

      const builder = createQueryBuilder(mockError);
      supabase.from.mockReturnValue(builder);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError.error);
      expect(result).toEqual({
        data: [],
        success: false,
      });

      consoleLogSpy.mockRestore();
    });

    it('should handle data transformation errors gracefully', async () => {
      const invalidSource = { ...mockSource, json: null };
      const mockResult = createMockSuccessResponse([invalidSource], 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockImplementation(() => {
        throw new Error('Transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getSourceTablePgroongaSearch', () => {
    it('should perform full-text search', async () => {
      const mockRpcResult = createMockRpcResponse([{ ...mockSource, total_count: 1 }]);

      supabase.rpc.mockResolvedValue(mockRpcResult);
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('Publication');

      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'test query',
        mockFilterCondition,
      );

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources', {
        query_text: 'test query',
        filter_condition: mockFilterCondition,
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
      });
      expect(result).toEqual({
        data: expect.any(Array),
        page: 1,
        success: true,
        total: 1,
      });
    });

    it('should include state_code when provided', async () => {
      const mockRpcResult = createMockRpcResponse([{ ...mockSource, total_count: 1 }]);

      supabase.rpc.mockResolvedValue(mockRpcResult);
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('Publication');

      await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'my',
        'test query',
        mockFilterCondition,
        100,
      );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'pgroonga_search_sources',
        expect.objectContaining({
          state_code: 100,
        }),
      );
    });

    it('should handle empty search results', async () => {
      const mockRpcResult = createMockRpcResponse([]);

      supabase.rpc.mockResolvedValue(mockRpcResult);

      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'nonexistent',
        mockFilterCondition,
      );

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle RPC errors', async () => {
      const mockError = { message: 'RPC failed' };
      supabase.rpc.mockResolvedValue({ data: null, error: mockError });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'test',
        mockFilterCondition,
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);

      consoleLogSpy.mockRestore();
    });
  });

  describe('getSourceDetail', () => {
    it('should get source detail', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockDetailResult = { data: mockSource };

      getDataDetail.mockResolvedValue(mockDetailResult);

      const result = await getSourceDetail(mockId, mockVersion);

      expect(getDataDetail).toHaveBeenCalledWith(mockId, mockVersion, 'sources');
      expect(result).toEqual(mockDetailResult);
    });
  });

  describe('getSourcesByIdsAndVersions', () => {
    it('should fetch multiple sources by id-version pairs', async () => {
      const mockPairs = [
        { id: 'source-1', version: '01.00.000' },
        { id: 'source-2', version: '01.00.000' },
      ];

      const mockResult1 = createMockSuccessResponse([
        { id: 'source-1', version: '01.00.000', state_code: 100 },
      ]);
      const mockResult2 = createMockSuccessResponse([
        { id: 'source-2', version: '01.00.000', state_code: 100 },
      ]);

      const builder1 = createQueryBuilder(mockResult1);
      const builder2 = createQueryBuilder(mockResult2);

      supabase.from.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2);

      const result = await getSourcesByIdsAndVersions(mockPairs);

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(builder1.select).toHaveBeenCalledWith('id, version,state_code');
      expect(builder1.eq).toHaveBeenCalledWith('id', 'source-1');
      expect(builder1.eq).toHaveBeenCalledWith('version', '01.00.000');
      expect(result.data).toHaveLength(2);
      expect(result.error).toBeNull();
    });

    it('should return empty array for empty input', async () => {
      const result = await getSourcesByIdsAndVersions([]);

      expect(result).toEqual({
        data: [],
        error: null,
        foundCount: 0,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('should handle partial errors', async () => {
      const mockPairs = [
        { id: 'source-1', version: '01.00.000' },
        { id: 'source-2', version: '01.00.000' },
      ];

      const mockResult1 = createMockSuccessResponse([
        { id: 'source-1', version: '01.00.000', state_code: 100 },
      ]);
      const mockError = createMockErrorResponse('Query failed');

      const builder1 = createQueryBuilder(mockResult1);
      const builder2 = createQueryBuilder(mockError);

      supabase.from.mockReturnValueOnce(builder1).mockReturnValueOnce(builder2);

      const result = await getSourcesByIdsAndVersions(mockPairs);

      expect(result.data).toHaveLength(1);
      expect(result.error).toEqual(mockError.error);
    });

    it('should handle sources not found', async () => {
      const mockPairs = [{ id: 'nonexistent', version: '01.00.000' }];

      const mockResult = createMockSuccessResponse([]);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);

      const result = await getSourcesByIdsAndVersions(mockPairs);

      expect(result.data).toHaveLength(0);
      expect(result.error).toBeNull();
    });
  });
});
