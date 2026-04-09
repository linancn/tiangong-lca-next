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
  source_hybrid_search,
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

jest.mock('@/services/classifications/cache', () => ({
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
  invokeDatasetCommand: jest.fn(),
  normalizeLangPayloadForSave: jest.fn(),
}));

jest.mock('@/services/sources/util', () => ({
  genSourceJsonOrdered: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { classificationToString, genClassificationZH, getLangText, jsonToList } =
  jest.requireMock('@/services/general/util');
const { getCachedClassificationData } = jest.requireMock('@/services/classifications/cache');
const { getDataDetail, getTeamIdByUserId, invokeDatasetCommand, normalizeLangPayloadForSave } =
  jest.requireMock('@/services/general/api');
const { genSourceJsonOrdered } = jest.requireMock('@/services/sources/util');
const { createSource: mockCreateSource } = jest.requireMock('@tiangong-lca/tidas-sdk');

describe('Sources API Service (src/services/sources/api.ts)', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
    invokeDatasetCommand.mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    });
    normalizeLangPayloadForSave.mockImplementation(async (payload: any) => ({
      payload,
      validationError: undefined,
    }));
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
      const mockCommandResult = createMockSuccessResponse([{ id: mockId }]);
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      invokeDatasetCommand.mockResolvedValue(mockCommandResult);

      const result = await createSource(mockId, mockData);

      expect(genSourceJsonOrdered).toHaveBeenCalledWith(mockId, mockData);
      expect(normalizeLangPayloadForSave).toHaveBeenCalledWith(mockOrderedData);
      expect(mockCreateSource).toHaveBeenCalledWith(mockOrderedData);
      expect(mockValidateEnhanced).toHaveBeenCalled();
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        {
          id: mockId,
          table: 'sources',
          jsonOrdered: mockOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual(mockCommandResult);
    });

    it('should return a language validation error instead of inserting invalid source data', async () => {
      const mockId = 'source-lang-error';
      const mockOrderedData = { ordered: true };

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: mockOrderedData,
        validationError: 'Missing required multilingual value',
      });

      const result = await createSource(mockId, { sourceDataSet: {} });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: null,
        error: {
          code: 'LANG_VALIDATION_ERROR',
          message: 'Missing required multilingual value',
        },
        status: 400,
      });
    });

    it('should handle validation failure', async () => {
      const mockId = 'source-123';
      const mockData = { sourceDataSet: {} };
      const mockOrderedData = { ordered: true };
      const mockCommandResult = createMockSuccessResponse([{ id: mockId }]);
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: false });

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      invokeDatasetCommand.mockResolvedValue(mockCommandResult);

      const result = await createSource(mockId, mockData);

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        {
          id: mockId,
          table: 'sources',
          jsonOrdered: mockOrderedData,
          ruleVerification: false,
        },
        {
          ruleVerification: false,
        },
      );
      expect(result).toEqual(mockCommandResult);
    });

    it('should handle database errors', async () => {
      const mockId = 'source-123';
      const mockData = { sourceDataSet: {} };
      const mockError = createMockErrorResponse('Insert failed');

      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      invokeDatasetCommand.mockResolvedValue(mockError);

      const result = await createSource(mockId, mockData);

      expect(result).toEqual(mockError);
    });

    it('should fall back to raw ordered data when normalization omits the payload', async () => {
      const mockId = 'source-raw-fallback';
      const mockData = { sourceDataSet: {} };
      const rawOrderedData = { ordered: 'raw' };
      const mockCommandResult = createMockSuccessResponse([{ id: mockId }]);

      genSourceJsonOrdered.mockReturnValue(rawOrderedData);
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: undefined,
      });

      invokeDatasetCommand.mockResolvedValue(mockCommandResult);

      await createSource(mockId, mockData);

      expect(mockCreateSource).toHaveBeenCalledWith(rawOrderedData);
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        {
          id: mockId,
          table: 'sources',
          jsonOrdered: rawOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
    });
  });

  describe('updateSource', () => {
    it('should update source via edge function', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };
      const mockOrderedData = { ordered: true };
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });
      const mockFunctionResult = {
        data: [{ id: mockId, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateSource.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      invokeDatasetCommand.mockResolvedValue(mockFunctionResult);

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(normalizeLangPayloadForSave).toHaveBeenCalledWith(mockOrderedData);
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        {
          id: mockId,
          version: mockVersion,
          table: 'sources',
          jsonOrdered: mockOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual(mockFunctionResult);
    });

    it('should return a language validation error instead of invoking the update edge function', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockOrderedData = { ordered: true };

      genSourceJsonOrdered.mockReturnValue(mockOrderedData);
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: mockOrderedData,
        validationError: 'Source title language payload is invalid',
      });

      const result = await updateSource(mockId, mockVersion, { sourceDataSet: {} });

      expect(invokeDatasetCommand).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: null,
        error: {
          code: 'LANG_VALIDATION_ERROR',
          message: 'Source title language payload is invalid',
        },
        status: 400,
      });
    });

    it('should return empty object when no session', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };

      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });
      invokeDatasetCommand.mockResolvedValue(undefined);

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(invokeDatasetCommand).toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle edge function errors', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockData = { sourceDataSet: {} };
      const mockError = { message: 'Update failed', code: 'FUNCTION_ERROR', details: '', hint: '' };

      genSourceJsonOrdered.mockReturnValue({});
      mockCreateSource.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });
      invokeDatasetCommand.mockResolvedValue({
        data: null,
        error: mockError,
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });

      const result = await updateSource(mockId, mockVersion, mockData);

      expect(result).toEqual({
        data: null,
        error: mockError,
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });
    });

    it('should fall back to raw ordered data and an empty bearer token when normalization omits the payload', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const rawOrderedData = { ordered: 'raw-update' };

      genSourceJsonOrdered.mockReturnValue(rawOrderedData);
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: undefined,
      });
      invokeDatasetCommand.mockResolvedValue({
        data: [{ success: true, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      await updateSource(mockId, mockVersion, { sourceDataSet: {} });

      expect(mockCreateSource).toHaveBeenCalledWith(rawOrderedData);
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        {
          id: mockId,
          version: mockVersion,
          table: 'sources',
          jsonOrdered: rawOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
    });
  });

  describe('deleteSource', () => {
    it('should delete source by id and version', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockDeleteResult = createMockSuccessResponse(null);
      invokeDatasetCommand.mockResolvedValue(mockDeleteResult);

      const result = await deleteSource(mockId, mockVersion);

      expect(invokeDatasetCommand).toHaveBeenCalledWith('app_dataset_delete', {
        id: mockId,
        version: mockVersion,
        table: 'sources',
      });
      expect(result).toEqual({
        data: null,
        error: null,
        count: null,
        status: 204,
        statusText: 'No Content',
      });
    });

    it('should handle delete errors', async () => {
      const mockId = 'source-123';
      const mockVersion = '01.00.000';
      const mockError = createMockErrorResponse('Delete failed');
      invokeDatasetCommand.mockResolvedValue(mockError);

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
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      genClassificationZH.mockReturnValue(['出版物']);
      classificationToString.mockReturnValue('出版物');

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'zh', 'tg', []);

      expect(getCachedClassificationData).toHaveBeenCalledWith('Source', 'zh', ['all']);
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

    it('should use collaborative filters and default paging when dataSource is "co"', async () => {
      const mockData = [mockSource];
      const mockResult = createMockSuccessResponse(mockData, 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockReturnValue('Collaborative Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      const result = await getSourceTableAll({}, {}, 'en', 'co', 'team-co');

      expect(builder.order).toHaveBeenCalledWith('modified_at', { ascending: false });
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(builder.eq).toHaveBeenCalledWith('state_code', 200);
      expect(builder.eq).toHaveBeenCalledWith('team_id', 'team-co');
      expect(result).toMatchObject({ page: 1, success: true, total: 1 });
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

    it('should fall back to id-only rows when Chinese table mapping throws', async () => {
      const mockResult = createMockSuccessResponse([mockSource], 1);

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementation(() => {
        throw new Error('Chinese transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'zh', 'tg', []);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });

    it('should default total to zero when non-empty table results omit the count', async () => {
      const mockResult = {
        data: [mockSource],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };

      const builder = createQueryBuilder(mockResult);
      supabase.from.mockReturnValue(builder);
      getLangText.mockReturnValue('Countless Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(result).toMatchObject({ total: 0 });
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

    it('should map Chinese search rows and use default pagination values', async () => {
      const rpcRows: any = [{ ...mockSource, total_count: 3 }];

      supabase.rpc.mockResolvedValue(createMockRpcResponse(rpcRows));
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      genClassificationZH.mockReturnValue(['出版物']);
      classificationToString.mockReturnValue('出版物');
      jsonToList.mockReturnValue(
        mockSource.json.sourceDataSet.sourceInformation.dataSetInformation
          .classificationInformation['common:classification']['common:class'],
      );
      getLangText.mockReturnValue('测试来源');

      const result = await getSourceTablePgroongaSearch({}, 'zh', 'tg', '出版物', {});

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources', {
        query_text: '出版物',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
      });
      expect(getCachedClassificationData).toHaveBeenCalledWith('Source', 'zh', ['all']);
      expect(result).toMatchObject({ page: 1, success: true, total: 3 });
      expect(result.data[0]).toMatchObject({
        id: 'source-123',
        shortName: '测试来源',
        classification: '出版物',
      });
    });

    it('should return the raw result when no session exists for pgroonga search', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'query',
        mockFilterCondition,
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should fall back to id-only rows when pgroonga row mapping throws', async () => {
      const rpcRows: any = [{ ...mockSource, total_count: 1 }];
      supabase.rpc.mockResolvedValue(createMockRpcResponse(rpcRows));
      getLangText.mockImplementation(() => {
        throw new Error('Transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'broken',
        mockFilterCondition,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });

    it('should fall back to id-only rows when Chinese pgroonga row mapping throws', async () => {
      const rpcRows: any = [{ ...mockSource, total_count: 1 }];
      supabase.rpc.mockResolvedValue(createMockRpcResponse(rpcRows));
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementation(() => {
        throw new Error('Chinese pgroonga transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'zh',
        'tg',
        'broken-zh',
        mockFilterCondition,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });

    it('should default pagination, totals, and sparse fields in English pgroonga search', async () => {
      const rpcRows: any = [
        {
          id: 'source-sparse-en',
          version: '01.00.000',
          json: {
            sourceDataSet: {
              sourceInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'en', '#text': 'Sparse EN Source' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
          team_id: 'team-en',
        },
      ];

      supabase.rpc.mockResolvedValue(createMockRpcResponse(rpcRows));
      getLangText.mockReturnValue('Sparse EN Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('Sparse Classification');

      const result = await getSourceTablePgroongaSearch({}, 'en', 'my', 'sparse', {}, 100);

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources', {
        query_text: 'sparse',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'my',
        this_user_id: 'user-123',
        state_code: 100,
      });
      expect(result).toMatchObject({ page: 1, success: true, total: 0 });
      expect(result.data[0]).toMatchObject({
        id: 'source-sparse-en',
        sourceCitation: '-',
        publicationType: '-',
      });
    });

    it('should default sparse fields in Chinese pgroonga search rows', async () => {
      const rpcRows: any = [
        {
          id: 'source-sparse-zh',
          version: '01.00.001',
          json: {
            sourceDataSet: {
              sourceInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'zh', '#text': '稀疏来源' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
          team_id: 'team-zh',
        },
      ];

      supabase.rpc.mockResolvedValue(createMockRpcResponse(rpcRows));
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      genClassificationZH.mockReturnValue(['分类']);
      classificationToString.mockReturnValue('分类');
      jsonToList.mockReturnValue([]);
      getLangText.mockReturnValue('稀疏来源');

      const result = await getSourceTablePgroongaSearch({}, 'zh', 'tg', '稀疏', {});

      expect(result).toMatchObject({ page: 1, success: true, total: 0 });
      expect(result.data[0]).toMatchObject({
        id: 'source-sparse-zh',
        sourceCitation: '-',
        publicationType: '-',
      });
    });
  });

  describe('source_hybrid_search', () => {
    it('should invoke the edge function and map english hybrid results', async () => {
      const hybridRows: any = [
        {
          ...mockSource,
          json: {
            sourceDataSet: {
              sourceInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'en', '#text': 'Hybrid Source' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [{ '#text': 'Hybrid Publication' }],
                    },
                  },
                  sourceCitation: 'Hybrid citation',
                  publicationType: 'Book',
                },
              },
            },
          },
        },
      ];
      hybridRows.total_count = 5;

      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getLangText.mockReturnValue('Hybrid Source');
      jsonToList.mockReturnValue([{ '#text': 'Hybrid Publication' }]);
      classificationToString.mockReturnValue('Hybrid Publication');

      const result = await source_hybrid_search(
        mockPaginationParams,
        'en',
        'tg',
        'hybrid query',
        mockFilterCondition,
      );

      expect(supabase.functions.invoke).toHaveBeenCalledWith('source_hybrid_search', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: { query: 'hybrid query', filter: mockFilterCondition },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toMatchObject({ page: 1, success: true, total: 5 });
      expect(result.data[0]).toMatchObject({
        id: 'source-123',
        shortName: 'Hybrid Source',
        classification: 'Hybrid Publication',
      });
    });

    it('should include state_code and map chinese hybrid results', async () => {
      const hybridRows: any = [{ ...mockSource }];
      hybridRows.total_count = 2;

      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      genClassificationZH.mockReturnValue(['出版物']);
      classificationToString.mockReturnValue('出版物');
      jsonToList.mockReturnValue(
        mockSource.json.sourceDataSet.sourceInformation.dataSetInformation
          .classificationInformation['common:classification']['common:class'],
      );
      getLangText.mockReturnValue('测试来源');

      const result = await source_hybrid_search({}, 'zh', 'my', '来源', {}, 100);

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'source_hybrid_search',
        expect.objectContaining({
          body: { query: '来源', filter: {}, state_code: 100 },
        }),
      );
      expect(getCachedClassificationData).toHaveBeenCalledWith('Source', 'zh', ['all']);
      expect(result).toMatchObject({ page: 1, success: true, total: 2 });
      expect(result.data[0]).toMatchObject({
        id: 'source-123',
        shortName: '测试来源',
        classification: '出版物',
      });
    });

    it('should return empty success when hybrid search yields no rows', async () => {
      supabase.functions.invoke.mockResolvedValue(createMockEdgeFunctionResponse({ data: [] }));

      const result = await source_hybrid_search(
        mockPaginationParams,
        'en',
        'tg',
        'none',
        mockFilterCondition,
      );

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should return raw result when no session exists for hybrid search', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await source_hybrid_search(
        mockPaginationParams,
        'en',
        'tg',
        'query',
        mockFilterCondition,
      );

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result).toEqual({});
    });

    it('should log edge function errors and return the raw error response', async () => {
      const mockError = { message: 'Hybrid failed' };
      supabase.functions.invoke.mockResolvedValue({ data: null, error: mockError });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await source_hybrid_search(
        mockPaginationParams,
        'en',
        'tg',
        'query',
        mockFilterCondition,
      );

      expect(consoleLogSpy).toHaveBeenCalledWith('error', mockError);
      expect(result).toEqual({ data: null, error: mockError });

      consoleLogSpy.mockRestore();
    });

    it('should fall back to id-only rows when hybrid row mapping throws', async () => {
      const hybridRows: any = [{ ...mockSource }];
      hybridRows.total_count = 1;

      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getLangText.mockImplementation(() => {
        throw new Error('Hybrid transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await source_hybrid_search(
        mockPaginationParams,
        'en',
        'tg',
        'query',
        mockFilterCondition,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });

    it('should fall back to id-only rows when Chinese hybrid row mapping throws', async () => {
      const hybridRows: any = [{ ...mockSource }];
      hybridRows.total_count = 1;

      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementation(() => {
        throw new Error('Chinese hybrid transformation error');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await source_hybrid_search(
        mockPaginationParams,
        'zh',
        'tg',
        'query-zh',
        mockFilterCondition,
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result.data[0]).toEqual({ id: 'source-123' });

      consoleErrorSpy.mockRestore();
    });

    it('should default sparse fields, totals, and bearer token for English hybrid search', async () => {
      const hybridRows: any = [
        {
          id: 'source-hybrid-en',
          version: '02.00.000',
          json: {
            sourceDataSet: {
              sourceInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'en', '#text': 'Sparse Hybrid Source' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
          team_id: 'team-hybrid-en',
        },
      ];

      supabase.auth.getSession.mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-123' },
          },
        },
      });
      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getLangText.mockReturnValue('Sparse Hybrid Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('Sparse Hybrid Classification');

      const result = await source_hybrid_search({}, 'en', 'tg', 'hybrid-sparse', {});

      expect(supabase.functions.invoke).toHaveBeenCalledWith('source_hybrid_search', {
        headers: {
          Authorization: 'Bearer ',
        },
        body: { query: 'hybrid-sparse', filter: {} },
        region: FunctionRegion.UsEast1,
      });
      expect(result).toMatchObject({ page: 1, success: true, total: 0 });
      expect(result.data[0]).toMatchObject({
        id: 'source-hybrid-en',
        sourceCitation: '-',
        publicationType: '-',
      });
    });

    it('should default sparse fields in Chinese hybrid search rows', async () => {
      const hybridRows: any = [
        {
          id: 'source-hybrid-zh',
          version: '02.00.001',
          json: {
            sourceDataSet: {
              sourceInformation: {
                dataSetInformation: {
                  'common:shortName': [{ '@xml:lang': 'zh', '#text': '稀疏混合来源' }],
                  classificationInformation: {
                    'common:classification': {
                      'common:class': [],
                    },
                  },
                },
              },
            },
          },
          team_id: 'team-hybrid-zh',
        },
      ];

      supabase.functions.invoke.mockResolvedValue(
        createMockEdgeFunctionResponse({ data: hybridRows }),
      );
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      genClassificationZH.mockReturnValue(['混合分类']);
      classificationToString.mockReturnValue('混合分类');
      jsonToList.mockReturnValue([]);
      getLangText.mockReturnValue('稀疏混合来源');

      const result = await source_hybrid_search({}, 'zh', 'tg', 'hybrid-zh', {});

      expect(result).toMatchObject({ page: 1, success: true, total: 0 });
      expect(result.data[0]).toMatchObject({
        id: 'source-hybrid-zh',
        sourceCitation: '-',
        publicationType: '-',
      });
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
