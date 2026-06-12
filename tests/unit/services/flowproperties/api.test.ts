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
  createFlowpropertiesVersion,
  deleteFlowproperties,
  getFlowpropertyDetail,
  getFlowpropertyTableAll,
  getFlowpropertyTablePgroongaSearch,
  getFlowpropertyTableUuidMentionSearch,
  getReferenceUnitGroup,
  getReferenceUnitGroups,
  updateFlowproperties,
} from '@/services/flowproperties/api';
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
  invokeDatasetCreateVersion: jest.fn(),
  normalizeLangPayloadForSave: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { genFlowpropertyJsonOrdered } = jest.requireMock('@/services/flowproperties/util');
const { getLangText, classificationToString, jsonToList, genClassificationZH } =
  jest.requireMock('@/services/general/util');
const { getCachedClassificationData } = jest.requireMock('@/services/classifications/cache');
const {
  attachLangNormalizationMetadata,
  buildLangNormalizationMetadata,
  getDataDetail,
  getTeamIdByUserId,
  invokeDatasetCommand,
  invokeDatasetCreateVersion,
  normalizeLangPayloadForSave,
} = jest.requireMock('@/services/general/api');
const { createFlowProperty: mockCreateFlowProperty } = jest.requireMock('@tiangong-lca/tidas-sdk');

describe('FlowProperties API Service (src/services/flowproperties/api.ts)', () => {
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
    invokeDatasetCreateVersion.mockResolvedValue({
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

      invokeDatasetCommand.mockResolvedValue(mockResult);

      const result = await createFlowproperties(mockId, mockData);

      expect(genFlowpropertyJsonOrdered).toHaveBeenCalledWith(mockId, mockData);
      expect(mockCreateFlowProperty).toHaveBeenCalledWith(mockOrderedData);
      expect(mockValidateEnhanced).toHaveBeenCalled();
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        {
          id: mockId,
          table: 'flowproperties',
          jsonOrdered: mockOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle validation failure', async () => {
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: false });
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });

      invokeDatasetCommand.mockResolvedValue({ data: [], error: null });

      await createFlowproperties('test-id', {});

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        expect.objectContaining({
          id: 'test-id',
          table: 'flowproperties',
          ruleVerification: false,
        }),
        expect.objectContaining({
          ruleVerification: false,
        }),
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

      invokeDatasetCommand.mockResolvedValue({ data: [{ id: 'test-id' }], error: null });

      await createFlowproperties('test-id', {});

      expect(mockCreateFlowProperty).toHaveBeenCalledWith({ ordered: true, fallback: 'raw' });
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_create',
        expect.objectContaining({
          id: 'test-id',
          table: 'flowproperties',
          jsonOrdered: { ordered: true, fallback: 'raw' },
          ruleVerification: true,
        }),
        expect.objectContaining({
          ruleVerification: true,
        }),
      );
    });
  });

  describe('createFlowpropertiesVersion', () => {
    it('should create a new flow property version through the create-version command', async () => {
      const mockId = 'flowprop-123';
      const mockData = { flowPropertiesInformation: {} };
      const mockOrderedData = { ordered: true };
      const mockResult = {
        data: [{ id: mockId, version: '01.00.001', rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      invokeDatasetCreateVersion.mockResolvedValue(mockResult);

      const result = await createFlowpropertiesVersion(mockId, '01.00.000', mockData);

      expect(invokeDatasetCreateVersion).toHaveBeenCalledWith(
        {
          id: mockId,
          table: 'flowproperties',
          sourceVersion: '01.00.000',
          jsonOrdered: mockOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual(mockResult);
    });

    it('should return a language validation error before invoking create-version', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true });
      normalizeLangPayloadForSave.mockResolvedValue({
        payload: undefined,
        validationError: 'invalid flow property language payload',
      });

      const result = await createFlowpropertiesVersion('flowprop-123', '01.00.000', {});

      expect(invokeDatasetCreateVersion).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          data: null,
          status: 400,
          statusText: 'LANG_VALIDATION_ERROR',
          error: expect.objectContaining({
            code: 'LANG_VALIDATION_ERROR',
            message: 'invalid flow property language payload',
          }),
        }),
      );
    });
  });

  describe('updateFlowproperties', () => {
    it('should update flow property via edge function', async () => {
      const mockId = 'flowprop-123';
      const mockVersion = '1.0.0';
      const mockData = { flowPropertiesInformation: {} };
      const mockOrderedData = { ordered: true };
      const mockFunctionResult = {
        data: [{ id: mockId, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      };
      const mockValidateEnhanced = jest.fn().mockReturnValue({ success: true });

      genFlowpropertyJsonOrdered.mockReturnValue(mockOrderedData);
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: mockValidateEnhanced,
      });
      invokeDatasetCommand.mockResolvedValue(mockFunctionResult);

      const result = await updateFlowproperties(mockId, mockVersion, mockData);

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        {
          id: mockId,
          version: mockVersion,
          table: 'flowproperties',
          jsonOrdered: mockOrderedData,
          ruleVerification: true,
        },
        {
          ruleVerification: true,
        },
      );
      expect(result).toEqual(mockFunctionResult);
    });

    it('should handle edge function error', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });

      const mockError = { message: 'Update failed', code: 'FUNCTION_ERROR', details: '', hint: '' };
      invokeDatasetCommand.mockResolvedValue({
        data: null,
        error: mockError,
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });

      const result = await updateFlowproperties('id', 'version', {});

      expect(result).toEqual({
        data: null,
        error: mockError,
        count: null,
        status: 500,
        statusText: 'FUNCTION_ERROR',
      });
    });

    it('should return undefined when no session is available', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({});
      mockCreateFlowProperty.mockReturnValue({
        validateEnhanced: jest.fn().mockReturnValue({ success: true }),
      });
      invokeDatasetCommand.mockResolvedValue(undefined);

      const result = await updateFlowproperties('id', 'version', {});

      expect(invokeDatasetCommand).toHaveBeenCalled();
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
      expect(invokeDatasetCommand).not.toHaveBeenCalled();
    });

    it('should invoke update_data with an empty bearer token when the session token is missing', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({});
      invokeDatasetCommand.mockResolvedValue({
        data: [{ success: true, rule_verification: true }],
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      });

      await updateFlowproperties('id', '01.00.000', {});

      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        expect.objectContaining({
          id: 'id',
          version: '01.00.000',
          table: 'flowproperties',
          ruleVerification: true,
        }),
        expect.objectContaining({
          ruleVerification: true,
        }),
      );
    });

    it('should fall back to the raw payload when normalized update data omits a payload', async () => {
      genFlowpropertyJsonOrdered.mockReturnValue({ ordered: true, fallback: 'raw-update' });
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

      await updateFlowproperties('id', '01.00.000', {});

      expect(mockCreateFlowProperty).toHaveBeenCalledWith({
        ordered: true,
        fallback: 'raw-update',
      });
      expect(invokeDatasetCommand).toHaveBeenCalledWith(
        'app_dataset_save_draft',
        expect.objectContaining({
          jsonOrdered: { ordered: true, fallback: 'raw-update' },
          ruleVerification: true,
        }),
        expect.objectContaining({
          ruleVerification: true,
        }),
      );
    });
  });

  describe('deleteFlowproperties', () => {
    it('should delete flow property by ID and version', async () => {
      const mockId = 'flowprop-123';
      const mockVersion = '1.0.0';
      const mockResult = { data: null, error: null };

      invokeDatasetCommand.mockResolvedValue(mockResult);

      const result = await deleteFlowproperties(mockId, mockVersion);

      expect(invokeDatasetCommand).toHaveBeenCalledWith('app_dataset_delete', {
        id: mockId,
        version: mockVersion,
        table: 'flowproperties',
      });
      expect(result).toEqual({
        data: null,
        error: null,
        count: null,
        status: 204,
        statusText: 'No Content',
      });
    });
  });

  describe('getFlowpropertyTableAll', () => {
    const latestFlowpropertyRow = (overrides: Record<string, any> = {}) => ({
      id: 'fp-1',
      version: '01.00.001',
      modified_at: '2024-01-01T00:00:00Z',
      team_id: 'team-1',
      total_count: 7,
      json: {
        flowPropertyDataSet: {
          flowPropertiesInformation: {
            dataSetInformation: {
              'common:name': [
                { '@xml:lang': 'en', '#text': 'Mass' },
                { '@xml:lang': 'zh', '#text': '质量' },
              ],
              classificationInformation: {
                'common:classification': {
                  'common:class': [{ '#text': 'Impact category' }],
                },
              },
              'common:generalComment': [
                { '@xml:lang': 'en', '#text': 'Mass comment' },
                { '@xml:lang': 'zh', '#text': '质量说明' },
              ],
            },
            quantitativeReference: {
              referenceToReferenceUnitGroup: {
                '@refObjectId': 'ug-1',
                'common:shortDescription': [
                  { '@xml:lang': 'en', '#text': 'Reference unit group' },
                  { '@xml:lang': 'zh', '#text': '参考单位组' },
                ],
              },
            },
          },
        },
      },
      ...overrides,
    });

    beforeEach(() => {
      getLangText.mockImplementation((value: any, lang: string) => {
        if (Array.isArray(value)) {
          return value.find((item) => item['@xml:lang'] === lang)?.['#text'] ?? '';
        }
        return typeof value === 'string' ? value : '';
      });
      jsonToList.mockReturnValue([{ '#text': 'Impact category' }]);
      classificationToString.mockReturnValue('Impact category');
    });

    it('should fetch latest flow properties through the RPC with pagination and filters', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [latestFlowpropertyRow()], error: null });

      const result = await getFlowpropertyTableAll(
        { current: 2, pageSize: 5 },
        { modifiedAt: 'ascend' },
        'en',
        'tg',
        'team-9',
        undefined,
      );

      expect(supabase.rpc).toHaveBeenCalledWith('get_latest_flowproperty_versions', {
        page_size: 5,
        page_current: 2,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: 'team-9',
        state_code_filter: null,
        sort_by: 'modified_at',
        sort_direction: 'asc',
      });
      expect(result).toEqual({
        data: [
          {
            key: 'fp-1:01.00.001',
            id: 'fp-1',
            name: 'Mass',
            classification: 'Impact category',
            generalComment: 'Mass comment',
            refUnitGroupId: 'ug-1',
            refUnitGroup: 'Reference unit group',
            version: '01.00.001',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 2,
        success: true,
        total: 7,
      });
    });

    it('should localize flow properties for zh language', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [
          latestFlowpropertyRow({
            id: 'fp-zh',
            version: '01.00.002',
            modified_at: '2024-02-01T00:00:00Z',
          }),
        ],
        error: null,
      });
      jsonToList.mockReturnValue([{ id: 'class-id-1' }]);
      genClassificationZH.mockReturnValue(['第0级分类']);
      classificationToString.mockReturnValue('第0级分类');
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTableAll({}, {}, 'zh', 'tg', [], undefined);

      expect(getCachedClassificationData).toHaveBeenCalledWith('FlowProperty', 'zh', ['all']);
      expect(genClassificationZH).toHaveBeenCalledWith(
        [{ id: 'class-id-1' }],
        mockILCDClassificationResponse.data,
      );
      expect(result.data[0]).toMatchObject({
        id: 'fp-zh',
        name: '质量',
        classification: '第0级分类',
        refUnitGroupId: 'ug-1',
        refUnitGroup: '参考单位组',
      });
      expect(result.data[0].modifiedAt).toBeInstanceOf(Date);
    });

    it('should return empty when session is not available for my data', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'my',
        [],
        100,
      );

      expect(result).toEqual({ data: [], success: false });
      expect(supabase.rpc).not.toHaveBeenCalled();
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

      expect(result).toEqual({ data: [], success: true });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('should apply co source team filters', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        { createdAt: 'descend' },
        'en',
        'co',
        'team-456',
        undefined,
      );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_flowproperty_versions',
        expect.objectContaining({
          data_source: 'co',
          team_id_filter: 'team-456',
          state_code_filter: null,
          sort_by: 'created_at',
          sort_direction: 'desc',
        }),
      );
      expect(result).toEqual({ data: [], success: true });
    });

    it('should apply my source state and user filters when session exists', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'my',
        [],
        100,
      );

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_flowproperty_versions',
        expect.objectContaining({
          data_source: 'my',
          this_user_id: 'user-123',
          state_code_filter: 100,
        }),
      );
      expect(result).toEqual({ data: [], success: true });
    });

    it('should pass an empty user id when the session omits user details', async () => {
      supabase.auth.getSession.mockResolvedValueOnce({ data: { session: {} } });
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });

      await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_flowproperty_versions',
        expect.objectContaining({
          this_user_id: '',
        }),
      );
    });

    it('should apply team scope filter when team id exists', async () => {
      supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
      getTeamIdByUserId.mockResolvedValueOnce('team-789');

      const result = await getFlowpropertyTableAll(
        { current: 1, pageSize: 10 },
        {},
        'en',
        'te',
        [],
        undefined,
      );

      expect(getTeamIdByUserId).toHaveBeenCalled();
      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_flowproperty_versions',
        expect.objectContaining({
          data_source: 'te',
          team_id_filter: 'team-789',
        }),
      );
      expect(result).toEqual({ data: [], success: true });
    });

    it('should return failure when query result does not include data payload', async () => {
      supabase.rpc.mockResolvedValueOnce({ error: null });

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(result).toEqual({ data: [], success: false });
    });

    it('should log query errors and keep transformed response when data is present', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      supabase.rpc.mockResolvedValueOnce({
        data: [latestFlowpropertyRow({ id: 'fp-warning', total_count: 1 })],
        error: { message: 'Query warning' },
      });

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(consoleLogSpy).toHaveBeenCalledWith('error', { message: 'Query warning' });
      expect(result).toEqual(expect.objectContaining({ success: true, total: 1 }));
      consoleLogSpy.mockRestore();
    });

    it('should fallback gracefully when english mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabase.rpc.mockResolvedValueOnce({
        data: [latestFlowpropertyRow({ id: 'fp-error', total_count: 1 })],
        error: null,
      });
      jsonToList.mockImplementationOnce(() => {
        throw new Error('parse error');
      });

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(result).toEqual({
        data: [{ id: 'fp-error' }],
        page: 1,
        success: true,
        total: 1,
      });
      consoleErrorSpy.mockRestore();
    });

    it('should fallback to id-only rows when zh table mapping throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      supabase.rpc.mockResolvedValueOnce({
        data: [latestFlowpropertyRow({ id: 'fp-zh-bad', total_count: 1 })],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);
      jsonToList.mockImplementationOnce(() => {
        throw new Error('zh parse error');
      });

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

    it('should map english rows when the modified timestamp is missing', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [latestFlowpropertyRow({ id: 'fp-no-modified-at', modified_at: undefined })],
        error: null,
      });

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(result.success).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: 'fp-no-modified-at',
        modifiedAt: expect.any(Date),
      });
      expect(Number.isNaN(result.data[0].modifiedAt.getTime())).toBe(true);
    });

    it('should map zh rows when the modified timestamp is missing', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [latestFlowpropertyRow({ id: 'fp-zh-no-modified-at', modified_at: undefined })],
        error: null,
      });
      getCachedClassificationData.mockResolvedValue(mockILCDClassificationResponse.data);

      const result = await getFlowpropertyTableAll({}, {}, 'zh', 'tg', [], undefined);

      expect(result.success).toBe(true);
      expect(result.data[0]).toMatchObject({
        id: 'fp-zh-no-modified-at',
        modifiedAt: expect.any(Date),
      });
      expect(Number.isNaN(result.data[0].modifiedAt.getTime())).toBe(true);
    });

    it('should use default pagination and placeholder reference fields when optional values are missing', async () => {
      supabase.rpc.mockResolvedValueOnce({
        data: [
          latestFlowpropertyRow({
            id: 'fp-defaults',
            total_count: null,
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
          }),
        ],
        error: null,
      });
      jsonToList.mockReturnValue([]);
      classificationToString.mockReturnValue('');
      getLangText.mockReturnValue('');

      const result = await getFlowpropertyTableAll({}, {}, 'en', 'tg', [], undefined);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_latest_flowproperty_versions',
        expect.objectContaining({
          page_size: 10,
          page_current: 1,
        }),
      );
      expect(result).toEqual({
        data: [
          {
            key: 'fp-defaults:01.00.001',
            id: 'fp-defaults',
            name: '',
            classification: '',
            generalComment: '',
            refUnitGroupId: '-',
            refUnitGroup: '',
            version: '01.00.001',
            modifiedAt: new Date('2024-01-01T00:00:00Z'),
            teamId: 'team-1',
          },
        ],
        page: 1,
        success: true,
        total: 0,
      });
    });

    describe('getFlowpropertyTableUuidMentionSearch', () => {
      const mentionRow = (overrides: any = {}) => ({
        matched_by: 'json',
        matched_entity_table: 'flowproperties',
        rank: 1,
        source_entity_kind: 'flowproperty',
        source_id: 'fp-ref',
        source_json: latestFlowpropertyRow().json,
        source_modified_at: '2024-01-01T00:00:00Z',
        source_team_id: 'team-ref',
        source_version: '01.00.000',
        ...overrides,
      });

      it('maps reference lookup rows into flow property table rows', async () => {
        supabase.rpc.mockResolvedValueOnce({
          data: [mentionRow()],
          error: null,
        });
        classificationToString.mockReturnValue('Impact category');

        const result = await getFlowpropertyTableUuidMentionSearch(
          { current: 1, pageSize: 10 },
          'en',
          'tg',
          'd1380000-0000-4000-8000-000000000001',
          '100',
          'team-1',
        );

        expect(supabase.rpc).toHaveBeenCalledWith('search_dataset_json_uuid_mentions', {
          p_data_source: 'tg',
          p_limit: 11,
          p_source_entity_kinds: ['flowproperty'],
          p_state_code_filter: 100,
          p_team_id_filter: 'team-1',
          p_this_user_id: 'user-123',
          p_uuid: 'd1380000-0000-4000-8000-000000000001',
        });
        expect(result).toMatchObject({
          data: [
            expect.objectContaining({
              id: 'fp-ref',
              name: 'Mass',
              classification: 'Impact category',
              refUnitGroupId: 'ug-1',
              refUnitGroup: 'Reference unit group',
              teamId: 'team-ref',
              version: '01.00.000',
            }),
          ],
          success: true,
          total: 1,
        });
      });

      it('returns empty table data when reference lookup fails', async () => {
        supabase.rpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'lookup failed' },
        });

        const result = await getFlowpropertyTableUuidMentionSearch(
          { current: 1, pageSize: 10 },
          'en',
          'tg',
          'd1380000-0000-4000-8000-000000000001',
          undefined,
          [],
        );

        expect(supabase.rpc).toHaveBeenCalledWith(
          'search_dataset_json_uuid_mentions',
          expect.objectContaining({
            p_source_entity_kinds: ['flowproperty'],
            p_team_id_filter: null,
          }),
        );
        expect(result).toEqual({
          capped: false,
          data: [],
          error: 'lookup failed',
          page: 1,
          success: false,
          total: 0,
        });
      });
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

      expect(supabase.rpc).toHaveBeenCalledWith('search_flowproperties_latest', {
        query_text: 'mass',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
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

    it('should return empty success for team pgroonga search when no team id is available', async () => {
      getTeamIdByUserId.mockResolvedValueOnce(null);

      const result = await getFlowpropertyTablePgroongaSearch(
        { current: 1, pageSize: 10 },
        'en',
        'te',
        'team query',
        {},
      );

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual({ data: [], success: true });
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
        'search_flowproperties_latest',
        expect.objectContaining({
          state_code_filter: 100,
        }),
      );
    });

    it('should use default pagination values in the state-code PGroonga search branch', async () => {
      supabase.rpc.mockResolvedValue({ data: [], error: null });

      await getFlowpropertyTablePgroongaSearch({}, 'en', 'my', 'test', {}, 100);

      expect(supabase.rpc).toHaveBeenCalledWith(
        'search_flowproperties_latest',
        expect.objectContaining({
          page_size: 10,
          page_current: 1,
          state_code_filter: 100,
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

      expect(supabase.rpc).toHaveBeenCalledWith('search_flowproperties_latest', {
        query_text: '质量',
        filter_condition: {},
        page_size: 10,
        page_current: 1,
        data_source: 'tg',
        this_user_id: 'user-123',
        team_id_filter: null,
        state_code_filter: null,
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
