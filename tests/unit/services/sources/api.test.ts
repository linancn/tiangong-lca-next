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
import {
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
  attachLangNormalizationMetadata: jest.fn(),
  buildLangNormalizationMetadata: jest.fn(),
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
const {
  attachLangNormalizationMetadata,
  buildLangNormalizationMetadata,
  getDataDetail,
  getTeamIdByUserId,
  invokeDatasetCommand,
  normalizeLangPayloadForSave,
} = jest.requireMock('@/services/general/api');
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
    buildLangNormalizationMetadata.mockImplementation((normalizedResult: any, rawPayload: any) => ({
      normalizedJsonOrdered: normalizedResult?.payload ?? rawPayload,
      langSupplementedPlaceholderPaths: normalizedResult?.supplementedEnglishPlaceholderPaths ?? [],
      langTranslatedPaths: normalizedResult?.translatedPaths ?? [],
    }));
    attachLangNormalizationMetadata.mockImplementation((result: any) => result);
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
      expect(normalizeLangPayloadForSave).toHaveBeenCalledWith(mockOrderedData, undefined);
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

      expect(normalizeLangPayloadForSave).toHaveBeenCalledWith(mockOrderedData, undefined);
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
    const latestSourceRow = (overrides: any = {}) => ({
      ...mockSource,
      version_count: 2,
      total_count: 1,
      ...overrides,
    });

    it('should fetch latest source versions with pagination and sorting (English)', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
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

      expect(supabase.rpc).toHaveBeenCalledWith('get_latest_source_versions', {
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
        sort_by: 'modified_at',
        sort_direction: 'desc',
      });
      expect(result.success).toBe(true);
      expect(result.data[0].id).toBe('source-123');
      expect(result.data[0].classification).toBe('Publication');
      expect(result.data[0].versionCount).toBe(2);
      expect(result.data[0]).not.toHaveProperty('latestVersion');
      expect('total' in result && result.total).toBe(1);
    });

    it('should fetch sources with Chinese classification', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
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

    it('should normalize camel-case sort fields for latest source versions', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getLangText.mockReturnValue('Sorted Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, { modifiedAt: 'ascend' }, 'en', 'tg', []);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          sort_by: 'modified_at',
          sort_direction: 'asc',
        }),
      );

      supabase.rpc.mockClear();

      await getSourceTableAll(mockPaginationParams, { createdAt: 'descend' }, 'en', 'tg', []);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          sort_by: 'created_at',
          sort_direction: 'desc',
        }),
      );
    });

    it('should filter by team when dataSource is "tg" with team id', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', 'team-123');

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          data_source: 'tg',
          team_id_filter: 'team-123',
        }),
      );
    });

    it('should use an empty user id when the session omits user details', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: {} } });
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getLangText.mockReturnValue('Anonymous Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          this_user_id: '',
        }),
      );
    });

    it('should use collaborative filters and default paging when dataSource is "co"', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getLangText.mockReturnValue('Collaborative Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      const result = await getSourceTableAll({}, {}, 'en', 'co', 'team-co');

      expect(supabase.rpc).toHaveBeenCalledWith('get_latest_source_versions', {
        page_size: 10,
        page_current: 1,
        data_source: 'co',
        this_user_id: 'user-123',
        team_id_filter: 'team-co',
        state_code_filter: null,
        sort_by: 'modified_at',
        sort_direction: 'desc',
      });
      expect(result).toMatchObject({ page: 1, success: true, total: 1 });
    });

    it('should filter by user when dataSource is "my"', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'my', [], 100);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          data_source: 'my',
          this_user_id: 'user-123',
          team_id_filter: null,
          state_code_filter: 100,
        }),
      );
    });

    it('should return empty array when no session for "my" dataSource', async () => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'my', []);

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        success: false,
      });
    });

    it('should filter by team when dataSource is "te"', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
      getTeamIdByUserId.mockResolvedValue('team-123');
      getLangText.mockReturnValue('Test Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'te', [], 100);

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_source_versions',
        expect.objectContaining({
          data_source: 'te',
          team_id_filter: 'team-123',
          state_code_filter: 100,
        }),
      );
    });

    it('should return empty array when no team for "te" dataSource', async () => {
      getTeamIdByUserId.mockResolvedValue(null);

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'te', []);

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle empty results', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([]));

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should handle query errors', async () => {
      const mockError = createMockErrorResponse('Query failed');

      supabase.rpc.mockResolvedValue(mockError);
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

      supabase.rpc.mockResolvedValue(
        createMockRpcResponse([latestSourceRow({ ...invalidSource, total_count: 1 })]),
      );
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
      supabase.rpc.mockResolvedValue(createMockRpcResponse([latestSourceRow()]));
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

    it('should default total to zero when non-empty RPC results omit total_count', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([mockSource]));
      getLangText.mockReturnValue('Countless Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('-');

      const result = await getSourceTableAll(mockPaginationParams, mockSortOrder, 'en', 'tg', []);

      expect(result).toMatchObject({ total: 0 });
    });
  });

  describe('getSourceTablePgroongaSearch', () => {
    const searchSourceRow = (overrides: any = {}) => ({
      ...mockSource,
      version_count: 2,
      total_count: 1,
      ...overrides,
    });

    it('should perform full-text search', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([searchSourceRow()]));
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
      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources_latest', {
        query_text: 'test query',
        filter_condition: mockFilterCondition,
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
      });
      expect(result.data[0].versionCount).toBe(2);
      expect(result.data[0]).not.toHaveProperty('latestVersion');
      expect(result).toEqual({
        data: expect.any(Array),
        page: 1,
        success: true,
        total: 1,
      });
    });

    it('should include state_code_filter when provided', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([searchSourceRow()]));
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
        'pgroonga_search_sources_latest',
        expect.objectContaining({
          state_code_filter: 100,
        }),
      );
    });

    it('should include team filters for searchable public and collaborative sources', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([searchSourceRow()]));
      getLangText.mockReturnValue('Team Source');
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('Publication');

      await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'tg',
        'team query',
        mockFilterCondition,
        undefined,
        'team-123',
      );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'pgroonga_search_sources_latest',
        expect.objectContaining({
          data_source: 'tg',
          team_id_filter: 'team-123',
        }),
      );
    });

    it('should handle empty search results', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([]));

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
      const rpcRows: any = [searchSourceRow({ total_count: 3 })];

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

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources_latest', {
        query_text: '出版物',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
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

    it('should skip team pgroonga searches when no team id is available', async () => {
      const result = await getSourceTablePgroongaSearch(
        mockPaginationParams,
        'en',
        'te',
        'team query',
        mockFilterCondition,
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({
        data: [],
        success: true,
      });
    });

    it('should fall back to id-only rows when pgroonga row mapping throws', async () => {
      supabase.rpc.mockResolvedValue(createMockRpcResponse([searchSourceRow()]));
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
      supabase.rpc.mockResolvedValue(createMockRpcResponse([searchSourceRow()]));
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

      expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search_sources_latest', {
        query_text: 'sparse',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'my',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: 100,
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
